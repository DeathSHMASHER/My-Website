const serverless = require('serverless-http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Correct relative paths to models
const User = require('../../server/models/User');
const ChatLog = require('../../server/models/ChatLog');
const ContactMessage = require('../../server/models/ContactMessage');

const app = express();

// Security Headers
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Robust CORS Configuration
const allowedOrigins = [
    'https://shahriyartaufik.in',
    'http://localhost:5173',
    'http://localhost:5000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5000'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.some(o => origin.startsWith(o)) || origin.includes('netlify.app')) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// --- DATABASE CONNECTION CACHING ---
let cachedDb = null;
const connectToDatabase = async () => {
    if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is not defined');
    }
    cachedDb = await mongoose.connect(process.env.MONGODB_URI);
    return cachedDb;
};

// --- DB CONNECTION MIDDLEWARE ---
app.use(async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (err) {
        console.error('Database connection failed:', err);
        res.status(500).json({ error: 'Database connection failed: ' + err.message });
    }
});

const JWT_SECRET = process.env.JWT_SECRET || 'jwt-secret-portfolio-taufik-prod-2026-secure-key';
const ADMIN_EMAILS = (process.env.ADMIN_EMAIL || 'shahriyartaufik@gmail.com').toLowerCase().split(',').map(e => e.trim());

// Rate Limiters for Serverless
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP. Please try again in 15 minutes.' }
});

const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'AI request limit reached. Please wait a moment before sending more messages.' }
});

const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many contact messages sent from this IP. Please try again later.' }
});

const dnsPromises = require('dns').promises;

// Force Node.js to resolve IPv4 addresses to prevent Netlify IPv6 ENETUNREACH errors
try {
    require('dns').setDefaultResultOrder('ipv4first');
} catch (e) {
    // Ignore if unsupported
}

const DISPOSABLE_DOMAINS = new Set([
    'tempmail.com', 'mailinator.com', '10minutemail.com', 'guerrillamail.com',
    'dispostable.com', 'trashmail.com', 'yopmail.com', 'sharklasers.com',
    'getnada.com', 'temp-mail.org', 'throwawaymail.com', 'maildrop.cc', 'fakeinbox.com',
    'mailnesia.com', 'nada.ltd', 'mohmal.com', 'generator.email'
]);

async function isGenuineEmail(email) {
    if (!email || typeof email !== 'string') return { valid: false, reason: 'Email is required' };

    const cleanEmail = email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
        return { valid: false, reason: 'Invalid email format' };
    }

    const parts = cleanEmail.split('@');
    if (parts.length !== 2) return { valid: false, reason: 'Invalid email format' };
    const domain = parts[1].toLowerCase().trim();

    if (DISPOSABLE_DOMAINS.has(domain)) {
        return { valid: false, reason: 'Disposable emails not allowed' };
    }

    try {
        const mxPromise = dnsPromises.resolveMx(domain);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DNS Timeout')), 1000));
        const mxRecords = await Promise.race([mxPromise, timeoutPromise]);
        if (mxRecords && mxRecords.length > 0) {
            return { valid: true };
        }
        return { valid: true };
    } catch (err) {
        return { valid: true };
    }
}

const { Resend } = require('resend');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '',
        pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : '',
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
});

// Unified Email Helper for Netlify Functions: Uses Resend API when RESEND_API_KEY is configured
const sendMailHelper = async ({ to, subject, html, replyTo, fromName }) => {
    const resendApiKey = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim() : '';

    if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        let fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const senderName = fromName || "Shahriyar's Portfolio";

        let payload = {
            from: `${senderName} <${fromEmail}>`,
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
        };
        if (replyTo) {
            payload.reply_to = replyTo;
        }

        let { data, error } = await resend.emails.send(payload);

        // Automatic fallback to onboarding@resend.dev if custom domain is not yet verified
        if (error && (error.message || '').toLowerCase().includes('not verified') && fromEmail !== 'onboarding@resend.dev') {
            console.warn(`⚠️ Custom domain ${fromEmail} is unverified. Falling back to onboarding@resend.dev...`);
            payload.from = `${senderName} <onboarding@resend.dev>`;
            const fallbackRes = await resend.emails.send(payload);
            data = fallbackRes.data;
            error = fallbackRes.error;
        }

        if (error) {
            console.error('❌ Resend API Error:', error);
            throw new Error(`Resend API Error: ${error.message || JSON.stringify(error)}`);
        }
        console.log('✅ Email sent via Resend API:', data?.id);
        return data;
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('Email credentials (RESEND_API_KEY or EMAIL_USER & EMAIL_PASS) are not configured in Netlify Environment Variables');
    }

    const mailOptions = {
        from: `"${fromName || "Shahriyar's Portfolio"}" <${process.env.EMAIL_USER.trim()}>`,
        to,
        subject,
        html,
    };
    if (replyTo) mailOptions.replyTo = replyTo;

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent via Nodemailer SMTP:', info?.messageId);
    return info;
};

// Cryptographically secure 6-digit OTP & Hash Helpers
const generateOTP = () => crypto.randomInt(100000, 1000000).toString();
const hashData = (data) => crypto.createHash('sha256').update(String(data)).digest('hex');

const sendOTPEmail = async (to, otp, subject = '🔐 Your Verification OTP Code') => {
    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: linear-gradient(135deg, #0a0a1e 0%, #1a1a3e 100%); border-radius: 16px; padding: 40px; color: #fff;">
            <h2 style="text-align: center; background: linear-gradient(135deg, #6C63FF, #00D4FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;">Shahriyar's Portfolio</h2>
            <p style="text-align: center; color: #aaa; font-size: 14px; margin-bottom: 30px;">Verification Code</p>
            <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 28px; text-align: center; margin-bottom: 24px;">
                <p style="color: #ccc; margin: 0 0 12px 0;">Your OTP code is:</p>
                <h1 style="letter-spacing: 12px; font-size: 36px; margin: 0; color: #fff;"><b>${otp}</b></h1>
            </div>
            <p style="text-align: center; color: #888; font-size: 13px;">This code expires in <strong style="color: #00d4ff;">10 minutes</strong>.</p>
            <p style="text-align: center; color: #666; font-size: 12px; margin-top: 24px;">If you didn't request this, please ignore this email.</p>
        </div>
    `;
    await sendMailHelper({ to, subject, html, fromName: "Shahriyar's Portfolio" });
};

// JWT Authentication Middleware
const verifyAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired session token. Please log in again.' });
    }
};

const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (token) {
        try {
            req.user = jwt.verify(token, JWT_SECRET);
        } catch (e) {
            // Non-blocking
        }
    }
    next();
};

const requireAdmin = (req, res, next) => {
    verifyAuth(req, res, () => {
        if (!req.user || !req.user.email || !ADMIN_EMAILS.includes(req.user.email.toLowerCase())) {
            return res.status(403).json({ error: 'Admin access denied. Insufficient privileges.' });
        }
        next();
    });
};

// Create Express Router for robust path matching across all Netlify redirects
const router = express.Router();

// Health Check / Warm-up ping route
router.get('/ping', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ==================== AUTH ROUTES ====================

// Step 1: Send OTP
router.post('/send-otp', authLimiter, async (req, res) => {
    try {
        const { name, username, email } = req.body;

        if (!name || !username || !email) {
            return res.status(400).json({ error: 'Name, Username, and Email are required' });
        }

        const emailCheck = await isGenuineEmail(email);
        if (!emailCheck.valid) {
            return res.status(400).json({ error: emailCheck.reason });
        }

        const rawOtp = generateOTP();
        const hashedOtp = hashData(rawOtp);
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        let existingUser = await User.findOne({
            $or: [{ email: email.toLowerCase().trim() }, { username: username.toLowerCase().trim() }]
        });

        if (existingUser) {
            if (existingUser.isVerified) {
                if (existingUser.email === email.toLowerCase().trim()) return res.status(400).json({ error: 'Email already registered' });
                return res.status(400).json({ error: 'Username already taken' });
            }
            existingUser.name = name.trim();
            existingUser.username = username.toLowerCase().trim();
            existingUser.email = email.toLowerCase().trim();
            existingUser.otp = hashedOtp;
            existingUser.otpExpiry = otpExpiry;
            existingUser.otpAttempts = 0;
            existingUser.emailVerified = false;
            await existingUser.save();

            await sendOTPEmail(email, rawOtp);
            return res.json({ message: 'OTP sent to your email', userId: existingUser._id });
        }

        const user = new User({
            name: name.trim(),
            username: username.toLowerCase().trim(),
            email: email.toLowerCase().trim(),
            otp: hashedOtp,
            otpExpiry,
            otpAttempts: 0,
            isVerified: false,
            emailVerified: false,
        });
        await user.save();
        await sendOTPEmail(email, rawOtp);

        res.json({ message: 'OTP sent to your email', userId: user._id });
    } catch (error) {
        console.error('Send OTP Error:', error.message);
        res.status(500).json({ error: 'Failed to send OTP: ' + error.message });
    }
});

// Step 2: Verify Email OTP with attempt limit
router.post('/verify-email', authLimiter, async (req, res) => {
    try {
        const { userId, otp } = req.body;
        if (!userId || !otp) return res.status(400).json({ error: 'Missing userId or OTP' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.otpAttempts >= 5) {
            user.otp = null;
            user.otpExpiry = null;
            await user.save();
            return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new OTP.' });
        }

        if (new Date() > user.otpExpiry) return res.status(400).json({ error: 'OTP has expired' });

        if (user.otp !== hashData(otp.trim())) {
            user.otpAttempts += 1;
            await user.save();
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        user.otp = null;
        user.otpExpiry = null;
        user.otpAttempts = 0;
        user.emailVerified = true;
        await user.save();

        res.json({ message: 'Email verified successfully!' });
    } catch (error) {
        console.error('Verify Email Error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Step 3: Complete Registration (enforce email verification & issue JWT)
router.post('/complete-registration', authLimiter, async (req, res) => {
    try {
        const { userId, phone, password } = req.body;
        if (!userId || !password) return res.status(400).json({ error: 'User ID and password are required' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!user.emailVerified) {
            return res.status(403).json({ error: 'Email must be verified before completing registration' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        user.phone = phone ? phone.trim() : '';
        user.password = await bcrypt.hash(password, 12);
        user.isVerified = true;
        user.lastLogin = new Date();
        await user.save();

        const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
        const token = jwt.sign(
            { id: user._id, name: user.name, username: user.username, email: user.email, isAdmin },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Registration complete!',
            token,
            user: { id: user._id, name: user.name, username: user.username, email: user.email, isAdmin, token },
        });
    } catch (error) {
        console.error('Complete Registration Error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login (issues signed JWT)
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { identifier, password } = req.body;
        if (!identifier || !password) {
            return res.status(400).json({ error: 'Email/Username and password are required' });
        }
        const user = await User.findOne({
            $or: [{ email: identifier.toLowerCase().trim() }, { username: identifier.toLowerCase().trim() }],
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!user.isVerified) return res.status(403).json({ error: 'Please complete registration first' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid password' });

        user.lastLogin = new Date();
        await user.save();

        const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
        const token = jwt.sign(
            { id: user._id, name: user.name, username: user.username, email: user.email, isAdmin },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user._id, name: user.name, username: user.username, email: user.email, isAdmin, token },
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Login failed: ' + error.message });
    }
});

// ==================== FORGOT PASSWORD ====================

// Step 1: Send OTP
router.post('/forgot-password', authLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const user = await User.findOne({ email: email.toLowerCase().trim(), isVerified: true });
        if (!user) return res.status(404).json({ error: 'No account found with this email' });

        const rawOtp = generateOTP();
        user.otp = hashData(rawOtp);
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        user.otpAttempts = 0;
        user.resetToken = null;
        user.resetTokenExpiry = null;
        await user.save();

        await sendOTPEmail(email, rawOtp, '🔑 Password Reset OTP');

        res.json({ message: 'OTP sent to your email', userId: user._id });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ error: 'Failed to send reset OTP' });
    }
});

// Step 2: Verify OTP & issue single-use secure resetToken
router.post('/verify-forgot-otp', authLimiter, async (req, res) => {
    try {
        const { userId, otp } = req.body;
        if (!userId || !otp) return res.status(400).json({ error: 'User ID and OTP are required' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.otpAttempts >= 5) {
            user.otp = null;
            user.otpExpiry = null;
            await user.save();
            return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new OTP.' });
        }

        if (new Date() > user.otpExpiry) return res.status(400).json({ error: 'OTP has expired' });

        if (user.otp !== hashData(otp.trim())) {
            user.otpAttempts += 1;
            await user.save();
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        const rawResetToken = crypto.randomBytes(32).toString('hex');
        user.otp = null;
        user.otpExpiry = null;
        user.otpAttempts = 0;
        user.resetToken = hashData(rawResetToken);
        user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        res.json({ message: 'OTP verified', resetToken: rawResetToken });
    } catch (error) {
        console.error('Verify Forgot OTP Error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Step 3: Reset password with verified resetToken
router.post('/reset-password', authLimiter, async (req, res) => {
    try {
        const { userId, resetToken, password } = req.body;
        if (!userId || !password) return res.status(400).json({ error: 'User ID and password are required' });
        if (!resetToken) return res.status(400).json({ error: 'Reset token is required to reset password' });

        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!user.resetToken || !user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
            return res.status(400).json({ error: 'Reset token has expired or is invalid. Please start again.' });
        }

        if (user.resetToken !== hashData(resetToken)) {
            return res.status(400).json({ error: 'Invalid reset token' });
        }

        user.password = await bcrypt.hash(password, 12);
        user.resetToken = null;
        user.resetTokenExpiry = null;
        await user.save();

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ error: 'Password reset failed' });
    }
});

// ==================== CHAT LOG & AI ROUTES ====================

router.post('/chat/save', optionalAuth, async (req, res) => {
    try {
        const { userId, messages } = req.body;
        if (!userId || !messages || !messages.length) {
            return res.status(400).json({ error: 'Missing userId or messages' });
        }

        if (req.user && String(req.user.id) !== String(userId)) {
            return res.status(403).json({ error: 'Unauthorized chat persistence' });
        }

        const chatLog = new ChatLog({
            userId,
            messages: messages.map(m => ({
                role: m.role, content: String(m.content).slice(0, 5000), model: m.model, timestamp: m.timestamp || new Date(),
            })),
            sessionStart: new Date(),
        });
        await chatLog.save();
        res.json({ message: 'Chat saved', chatLogId: chatLog._id });
    } catch (error) {
        console.error('Chat Save Error:', error);
        res.status(500).json({ error: 'Failed to save chat' });
    }
});

// Dynamic Resume Fetching & Caching
const RESUME_URL = process.env.RESUME_URL || 'https://tinyurl.com/ms236yfb';
const DEFAULT_RESUME_DRIVE_ID = '1YqizTdSutOQHYIVAh-9eEewB_9acoiad';

async function getGoogleDriveId(url) {
    if (!url) return DEFAULT_RESUME_DRIVE_ID;
    let match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    try {
        const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        const finalUrl = response.url;
        match = finalUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || finalUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (match) return match[1];
    } catch (e) {
        console.error('Error resolving resume short URL redirect:', e.message);
    }

    return DEFAULT_RESUME_DRIVE_ID;
}

let cachedResumeData = null;
let lastResumeFetchTime = 0;
const RESUME_CACHE_TTL = 5 * 60 * 1000;

async function getResumeInlineData() {
    const now = Date.now();
    if (cachedResumeData && (now - lastResumeFetchTime < RESUME_CACHE_TTL)) {
        return cachedResumeData;
    }

    const fileId = await getGoogleDriveId(RESUME_URL);
    if (!fileId) return null;

    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    try {
        const res = await fetch(downloadUrl);
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        cachedResumeData = {
            inlineData: {
                mimeType: 'application/pdf',
                data: buf.toString('base64')
            }
        };
        lastResumeFetchTime = now;
        console.log('✅ [Resume Service] Dynamically fetched latest resume PDF from link! ID:', fileId);
        return cachedResumeData;
    } catch (err) {
        console.error('❌ [Resume Service] Error fetching resume:', err.message);
        return null;
    }
}

const DEFAULT_RESUME_KNOWLEDGE = `
SHAHRIYAR TAUFIK'S OFFICIAL & VERIFIED RESUME KNOWLEDGE BASE:
- Full Name: Shahriyar Taufik
- Contact & Links: Phone (+91) 8420545898 | Email: shahriyartaufik@gmail.com | Portfolio: shahriyartaufik.in
- Location: Kolkata / Bhubaneswar | GitHub: github.com/DeathSHMASHER | LinkedIn: linkedin.com/in/shahriyar-taufik-19662b287
- Education:
  * KIIT University (Bhubaneswar, Odisha): B.Tech in Electronics and Computer Science Engineering (ECSE), 2023 - 2027. CGPA: 8.36 / 10.0. Coursework: Data Structures & Algorithms, Computer Networks, IoT Architecture, Software Development.
  * Pathfinder Higher Secondary Public School (Class XII): 76.2% (2023)
  * Blooming Dale Academy (Class X): 85.0% (2021)
- Professional Experience:
  1. KIIT University – ECSE Innovation Lab (Jan 2025 – Present) | Lead Software & Embedded Systems Developer
     - Leading technical development & prototyping for AI-driven solutions and IoT embedded systems.
     - Architecting custom C++/Python firmware for ESP32 microcontrollers & integrating ML inference models for real-time edge processing.
     - Directing cross-functional hardware-software integration, system design reviews & sensor calibration.
  2. AICTE EduSkills & AWS Academy (Oct 2025 – Dec 2025) | Generative AI Virtual Intern
     - Specialized in enterprise LLMs, prompt engineering, and AWS Bedrock cloud services.
     - Formulated end-to-end generative AI workflows & evaluated foundation models for enterprise optimization.
  3. Cognifyz Technologies (Aug 2025 – Sep 2025) | Front-End Development Intern
     - Architected responsive web pages using React.js, HTML5, CSS3, enhancing page rendering speed by 15%.
     - Developed reusable component libraries and modular UI patterns.
- Key Technical Projects:
  1. Neuro-Scribe: Brain-Computer Interface (BCI) (Python, ML, Signal Processing | Jan 2025 – Jan 2026)
     - Built real-time signal decoding pipeline translating EEG telemetry into text commands, achieving 91.5% classification accuracy and 35% noise reduction.
  2. Wireless Air Mouse & Radar System (ESP32, MPU6050, Embedded C, Python | Jan 2026 – Mar 2026)
     - Engineered gesture-driven input device utilizing IMU sensor fusion on ESP32 microcontroller with under 12ms response latency.
  3. Personal Developer Platform (React.js, Vite, Tailwind CSS, Netlify | Apr 2026 – May 2026)
     - Live portfolio platform (shahriyartaufik.in) with custom DNS, SSL security, and 98+ Google Lighthouse score.
- Technical Skills:
  * Core Competencies: Full-Stack Web Development, IoT Embedded Systems, AI-Driven Solutions, Data Structures & Algorithms, OOPs.
  * Languages & DBs: C, C++, Java, Python, JavaScript, SQL (MySQL), HTML5/CSS3.
  * Web & Frameworks: React.js, Vite, Tailwind CSS, REST APIs, Scikit-learn, TensorFlow, OpenCV.
  * Hardware & IoT: ESP32 Microcontrollers, MPU6050 Sensor Fusion, Embedded C, Circuit Design, Arduino IDE.
  * Tools & Cloud: AWS AI Services, Git, GitHub, Netlify, Hostinger, Postman, Figma, VS Code.
- Certifications & Leadership:
  * HackerRank React.js Certificate, Google AI/ML Virtual Internship, AWS Generative AI Academy, Postman API Certified Student Expert, UI Designing & Website Development, Graphics Designing Certification.
  * Participant in Microsoft AI-MCP session & IoT Industry 4.0 workshops.
`;

router.post('/chat/generate', chatLimiter, async (req, res) => {
    try {
        let { historyForAPI, SYSTEM_PROMPT } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;

        if (!API_KEY) {
            return res.status(500).json({ error: 'Server configuration error: Gemini API key missing' });
        }

        // Ensure SYSTEM_PROMPT always contains full resume knowledge base
        if (!SYSTEM_PROMPT || !SYSTEM_PROMPT.includes('SHAHRIYAR TAUFIK')) {
            SYSTEM_PROMPT = `${SYSTEM_PROMPT || "You are Altis, Shahriyar Taufik's AI assistant."}\n\n${DEFAULT_RESUME_KNOWLEDGE}`;
        } else {
            SYSTEM_PROMPT = `${SYSTEM_PROMPT}\n\n${DEFAULT_RESUME_KNOWLEDGE}`;
        }

        const resumeData = await getResumeInlineData();
        if (resumeData && historyForAPI && historyForAPI.length > 0) {
            const firstUserMsgIndex = historyForAPI.findIndex(m => m.role === 'user');
            if (firstUserMsgIndex !== -1) {
                const existingParts = historyForAPI[firstUserMsgIndex].parts || [];
                const hasPdfAlready = existingParts.some(p => p.inlineData && p.inlineData.mimeType === 'application/pdf');
                if (!hasPdfAlready) {
                    historyForAPI[firstUserMsgIndex].parts = [resumeData, ...existingParts];
                }
            }
        }

        const safetySettings = [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ];

        const requestBody = JSON.stringify({
            contents: historyForAPI,
            systemInstruction: {
                parts: [{ text: SYSTEM_PROMPT }]
            },
            generationConfig: {
                temperature: 0.85,
                maxOutputTokens: 2500,
            },
            safetySettings
        });

        let usedModel = 'gemma-4-31b-it';
        let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody
        });

        if (response.status === 429 || response.status === 503) {
            usedModel = 'gemini-3.5-flash-lite';
            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: requestBody
            });
        }

        if (response.status === 429 || response.status === 503) {
            usedModel = 'gemini-3.1-flash-lite';
            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: requestBody
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Gemini API error: ${response.status}`, errorText);
            return res.status(response.status).json({ error: `Gemini API error: ${response.status}`, details: errorText });
        }

        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts) {
            const nonThought = data.candidates[0].content.parts.filter(p => !p.thought);
            if (nonThought.length > 0) {
                data.candidates[0].content.parts = nonThought;
            }
        }
        data.modelUsed = usedModel;
        res.json(data);

    } catch (error) {
        console.error('Chat Generate Error:', error);
        res.status(500).json({ error: 'Failed to generate AI response' });
    }
});

// ==================== CONTACT FORM ====================

router.post('/contact', contactLimiter, async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const emailCheck = await isGenuineEmail(email);
        if (!emailCheck.valid) {
            return res.status(400).json({ error: emailCheck.reason });
        }

        // 1. Save to MongoDB database
        const contactMsg = new ContactMessage({
            name: name.trim().slice(0, 100),
            email: email.trim().slice(0, 150),
            message: message.trim().slice(0, 5000)
        });
        await contactMsg.save();

        // 2. Send email notification (do not fail API if notification fails)
        try {
            const recipientEmail = process.env.ADMIN_NOTIFY_EMAIL || 'shahriyartaufik@gmail.com';
            await sendMailHelper({
                to: recipientEmail,
                subject: `New Portfolio Message from ${name.trim()}`,
                replyTo: email.trim(),
                fromName: `${name.trim()} (Portfolio)`,
                html: `
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 600px; background: #0a0a1e; color: #fff; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                        <h2 style="color: #6C63FF; margin-top: 0;">New Contact Message</h2>
                        <p style="color: #ccc;"><strong>Name:</strong> ${name.trim()}</p>
                        <p style="color: #ccc;"><strong>Email:</strong> ${email.trim()}</p>
                        <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); margin-top: 20px;">
                            <p style="margin: 0; white-space: pre-wrap; color: #fff;">${message.trim()}</p>
                        </div>
                    </div>
                `,
            });
        } catch (emailErr) {
            console.error('Contact Email Notification Error:', emailErr.message);
        }

        res.json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Contact Form Error:', error);
        res.status(500).json({ error: 'Failed to send message: ' + error.message });
    }
});

// ==================== ADMIN ROUTES (Cryptographically Protected) ====================

router.get('/admin/users', requireAdmin, async (req, res) => {
    try {
        const users = await User.find({ isVerified: true })
            .select('-password -otp -otpExpiry -otpAttempts -resetToken -resetTokenExpiry')
            .sort({ createdAt: -1 });

        const usersWithStats = await Promise.all(users.map(async (user) => {
            const chatLogs = await ChatLog.find({ userId: user._id }).sort({ createdAt: -1 });
            const totalMessages = chatLogs.reduce((sum, log) => sum + log.messages.length, 0);
            return {
                ...user.toObject(),
                totalChats: chatLogs.length,
                totalMessages,
                lastChat: chatLogs.length > 0 ? chatLogs[0].createdAt : null,
            };
        }));

        res.json({ users: usersWithStats, totalUsers: usersWithStats.length });
    } catch (error) {
        console.error('Admin Users Error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

router.get('/admin/users/:userId/chats', requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password -otp -otpExpiry -otpAttempts -resetToken -resetTokenExpiry');
        if (!user) return res.status(404).json({ error: 'User not found' });
        const chatLogs = await ChatLog.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        res.json({ user, chatLogs });
    } catch (error) {
        console.error('Admin User Chats Error:', error);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

router.get('/admin/contact-messages', requireAdmin, async (req, res) => {
    try {
        const messages = await ContactMessage.find().sort({ createdAt: -1 });
        res.json({ messages, totalMessages: messages.length });
    } catch (error) {
        console.error('Admin Contact Messages Error:', error);
        res.status(500).json({ error: 'Failed to fetch contact messages' });
    }
});

router.patch('/admin/contact-messages/:id/read', requireAdmin, async (req, res) => {
    try {
        const msg = await ContactMessage.findById(req.params.id);
        if (!msg) return res.status(404).json({ error: 'Message not found' });
        msg.read = true;
        await msg.save();
        res.json({ message: 'Marked as read' });
    } catch (error) {
        console.error('Mark Read Error:', error);
        res.status(500).json({ error: 'Failed to update message' });
    }
});

router.delete('/admin/users/:userId/chats/:chatId', requireAdmin, async (req, res) => {
    try {
        const result = await ChatLog.findOneAndDelete({ _id: req.params.chatId, userId: req.params.userId });
        if (!result) return res.status(404).json({ error: 'Chat session not found' });
        res.json({ message: 'Chat session deleted successfully' });
    } catch (error) {
        console.error('Admin Delete Chat Error:', error);
        res.status(500).json({ error: 'Failed to delete chat session' });
    }
});

router.delete('/admin/contact-messages/:id', requireAdmin, async (req, res) => {
    try {
        const result = await ContactMessage.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: 'Message not found' });
        res.json({ message: 'Contact message deleted successfully' });
    } catch (error) {
        console.error('Admin Delete Contact Message Error:', error);
        res.status(500).json({ error: 'Failed to delete contact message' });
    }
});

// Mount router on all path prefixes
app.use('/api', router);
app.use('/.netlify/functions/api', router);
app.use('/', router);

// --- SERVERLESS EXPORT ---
const handler = serverless(app);
module.exports.handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    return await handler(event, context);
};