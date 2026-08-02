const serverless = require('serverless-http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// Correct relative paths to models
const User = require('../../server/models/User');
const ChatLog = require('../../server/models/ChatLog');
const ContactMessage = require('../../server/models/ContactMessage');

const app = express();
app.use(cors());
app.use(express.json());

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

const ADMIN_EMAILS = (process.env.ADMIN_EMAIL || '').toLowerCase().split(',').map(e => e.trim());

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
    tls: {
        rejectUnauthorized: false
    }
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

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTPEmail = async (to, otp, subject = '🔐 Your Verification OTP Code') => {
    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: linear-gradient(135deg, #0a0a1e 0%, #1a1a3e 100%); border-radius: 16px; padding: 40px; color: #fff;">
            <h2 style="text-align: center; background: linear-gradient(135deg, #6C63FF, #00D4FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;">Shahriyar's Portfolio</h2>
            <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 28px; text-align: center; margin-bottom: 24px;">
                <h1 style="letter-spacing: 12px; font-size: 36px; margin: 0; color: #fff;"><b>${otp}</b></h1>
            </div>
            <p style="text-align: center; color: #888; font-size: 13px;">This code expires in <strong style="color: #00d4ff;">10 minutes</strong>.</p>
        </div>
    `;
    await sendMailHelper({ to, subject, html, fromName: "Shahriyar's Portfolio" });
};

// Create Express Router for robust path matching across all Netlify redirects
const router = express.Router();

// Health Check / Warm-up ping route
router.get('/ping', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ==================== AUTH ROUTES ====================

// Step 1: Send OTP
router.post('/send-otp', async (req, res) => {
    try {
        const { name, username, email } = req.body;

        if (!name || !username || !email) {
            return res.status(400).json({ error: 'Name, Username, and Email are required' });
        }

        const emailCheck = await isGenuineEmail(email);
        if (!emailCheck.valid) {
            return res.status(400).json({ error: emailCheck.reason });
        }

        const existingUser = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
        });

        if (existingUser) {
            if (existingUser.isVerified) {
                if (existingUser.email === email.toLowerCase()) return res.status(400).json({ error: 'Email already registered' });
                return res.status(400).json({ error: 'Username already taken' });
            }
            existingUser.name = name;
            existingUser.username = username.toLowerCase();
            existingUser.email = email.toLowerCase();
            existingUser.otp = generateOTP();
            existingUser.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
            await existingUser.save();
            await sendOTPEmail(email, existingUser.otp);
            return res.json({ message: 'OTP sent to your email', userId: existingUser._id });
        }

        const otp = generateOTP();
        const user = new User({
            name,
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            otp,
            otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
            isVerified: false,
        });
        await user.save();
        await sendOTPEmail(email, otp);

        res.json({ message: 'OTP sent to your email', userId: user._id });
    } catch (error) {
        console.error('Send OTP Error:', error.message);
        res.status(500).json({ error: 'Failed to send OTP: ' + error.message });
    }
});

// Step 2: Verify Email OTP
router.post('/verify-email', async (req, res) => {
    try {
        const { userId, otp } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
        if (new Date() > user.otpExpiry) return res.status(400).json({ error: 'OTP has expired' });

        user.otp = null;
        user.otpExpiry = null;
        user.emailVerified = true;
        await user.save();

        res.json({ message: 'Email verified successfully!' });
    } catch (error) {
        console.error('Verify Email Error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Step 3: Complete Registration
router.post('/complete-registration', async (req, res) => {
    try {
        const { userId, phone, password } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.phone = phone;
        user.password = await bcrypt.hash(password, 12);
        user.isVerified = true;
        await user.save();

        const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
        res.json({
            message: 'Registration complete!',
            user: { id: user._id, name: user.name, username: user.username, email: user.email, isAdmin },
        });
    } catch (error) {
        console.error('Complete Registration Error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        if (!identifier || !password) {
            return res.status(400).json({ error: 'Email/Username and password are required' });
        }
        const user = await User.findOne({
            $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!user.isVerified) return res.status(403).json({ error: 'Please complete registration first' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid password' });

        user.lastLogin = new Date();
        await user.save();

        const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
        res.json({
            message: 'Login successful',
            user: { id: user._id, name: user.name, username: user.username, email: user.email, isAdmin },
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Login failed: ' + error.message });
    }
});

// ==================== FORGOT PASSWORD ====================

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase(), isVerified: true });
        if (!user) return res.status(404).json({ error: 'No account found with this email' });

        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();
        await sendOTPEmail(email, otp, '🔑 Password Reset OTP');

        res.json({ message: 'OTP sent to your email', userId: user._id });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ error: 'Failed to send reset OTP' });
    }
});

router.post('/verify-forgot-otp', async (req, res) => {
    try {
        const { userId, otp } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
        if (new Date() > user.otpExpiry) return res.status(400).json({ error: 'OTP has expired' });

        user.otp = null;
        user.otpExpiry = null;
        await user.save();

        res.json({ message: 'OTP verified' });
    } catch (error) {
        console.error('Verify Forgot OTP Error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { userId, password } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.password = await bcrypt.hash(password, 12);
        await user.save();

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ error: 'Password reset failed' });
    }
});

// ==================== CHAT LOG & AI ROUTES ====================

router.post('/chat/save', async (req, res) => {
    try {
        const { userId, messages } = req.body;
        if (!userId || !messages || !messages.length) {
            return res.status(400).json({ error: 'Missing userId or messages' });
        }
        const chatLog = new ChatLog({
            userId,
            messages: messages.map(m => ({
                role: m.role, content: m.content, model: m.model, timestamp: m.timestamp || new Date(),
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
const RESUME_URL = process.env.RESUME_URL || 'https://drive.google.com/file/d/1HhX534tO8exquYUH4rBA5l80MiG7tH1F/view';

function getGoogleDriveId(url) {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
}

let cachedResumeData = null;
let lastResumeFetchTime = 0;
const RESUME_CACHE_TTL = 5 * 60 * 1000;

async function getResumeInlineData() {
    const now = Date.now();
    if (cachedResumeData && (now - lastResumeFetchTime < RESUME_CACHE_TTL)) {
        return cachedResumeData;
    }

    const fileId = getGoogleDriveId(RESUME_URL);
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
        return cachedResumeData;
    } catch (err) {
        console.error('❌ [Netlify Resume Service] Error fetching resume:', err.message);
        return null;
    }
}

router.post('/chat/generate', async (req, res) => {
    try {
        let { historyForAPI, SYSTEM_PROMPT } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;

        if (!API_KEY) {
            return res.status(500).json({ error: 'Server configuration error: Gemini API key missing' });
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
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
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

router.post('/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate if email is genuine via MX lookup and format check
        const emailCheck = await isGenuineEmail(email);
        if (!emailCheck.valid) {
            return res.status(400).json({ error: emailCheck.reason });
        }

        // 1. Save to MongoDB database
        const contactMsg = new ContactMessage({ name: name.trim(), email: email.trim(), message: message.trim() });
        await contactMsg.save();

        // 2. Send email notification (do not fail API if notification fails)
        try {
            const recipientEmail = process.env.ADMIN_NOTIFY_EMAIL || 'shahriyartaufik@gmail.com';
            await sendMailHelper({
                to: recipientEmail,
                subject: `New Portfolio Message from ${name}`,
                replyTo: email,
                fromName: `${name} (Portfolio)`,
                html: `
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 600px; background: #0a0a1e; color: #fff; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                        <h2 style="color: #6C63FF; margin-top: 0;">New Contact Message</h2>
                        <p style="color: #ccc;"><strong>Name:</strong> ${name}</p>
                        <p style="color: #ccc;"><strong>Email:</strong> ${email}</p>
                        <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); margin-top: 20px;">
                            <p style="margin: 0; white-space: pre-wrap; color: #fff;">${message}</p>
                        </div>
                    </div>
                `,
            });
        } catch (emailErr) {
            console.error('Contact Email Notification Error (Message saved to DB regardless):', emailErr.message);
        }

        res.json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Contact Form Error:', error);
        res.status(500).json({ error: 'Failed to send message: ' + error.message });
    }
});

// ==================== ADMIN ROUTES ====================

const requireAdmin = async (req, res, next) => {
    const adminEmail = req.headers['x-admin-email'];
    if (!adminEmail || !ADMIN_EMAILS.includes(adminEmail.toLowerCase())) {
        return res.status(403).json({ error: 'Admin access denied' });
    }
    next();
};

router.get('/admin/users', requireAdmin, async (req, res) => {
    try {
        const users = await User.find({ isVerified: true })
            .select('-password -otp -otpExpiry')
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
        const user = await User.findById(req.params.userId).select('-password -otp -otpExpiry');
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