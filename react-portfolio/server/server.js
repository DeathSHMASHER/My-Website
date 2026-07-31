require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('./models/User');
const ChatLog = require('./models/ChatLog');
const ContactMessage = require('./models/ContactMessage');

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_EMAILS = (process.env.ADMIN_EMAIL || '').toLowerCase().split(',').map(e => e.trim());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Error:', err));

const dnsPromises = require('dns').promises;

// Force Node.js to resolve IPv4 addresses to prevent Netlify IPv6 ENETUNREACH errors
try {
    require('dns').setDefaultResultOrder('ipv4first');
} catch (e) {
    // Ignore
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
        const mxRecords = await dnsPromises.resolveMx(domain);
        if (mxRecords && mxRecords.length > 0) {
            return { valid: true };
        }
        return { valid: false, reason: 'Email domain cannot receive messages' };
    } catch (err) {
        try {
            const aRecords = await dnsPromises.resolve4(domain);
            if (aRecords && aRecords.length > 0) {
                return { valid: true };
            }
            return { valid: false, reason: 'Email domain does not exist' };
        } catch (aErr) {
            return { valid: false, reason: 'Invalid or non-existent email domain' };
        }
    }
}

// Email Transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 6000,
    greetingTimeout: 6000,
    socketTimeout: 6000,
    tls: {
        rejectUnauthorized: false
    }
});

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// OTP Email Template
const sendOTPEmail = async (to, otp, subject = '🔐 Your Verification OTP Code') => {
    await transporter.sendMail({
        from: `"Shahriyar's Portfolio" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html: `
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
        `,
    });
};

// Health Check / Warm-up ping route
app.get('/api/ping', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ==================== AUTH ROUTES ====================

// Step 1: Send OTP (Registration — creates unverified user with name, username, email)
app.post('/api/send-otp', async (req, res) => {
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
            // If unverified, update info and resend OTP
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
        console.error('Full Error:', error);
        res.status(500).json({ error: 'Failed to send OTP: ' + error.message });
    }
});

// Step 2: Verify Email OTP (registration)
app.post('/api/verify-email', async (req, res) => {
    try {
        const { userId, otp } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
        if (new Date() > user.otpExpiry) return res.status(400).json({ error: 'OTP has expired' });

        user.otp = null;
        user.otpExpiry = null;
        user.emailVerified = true; // email is confirmed, but registration not complete
        await user.save();

        res.json({ message: 'Email verified successfully!' });
    } catch (error) {
        console.error('Verify Email Error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Step 3: Complete Registration (phone + password)
app.post('/api/complete-registration', async (req, res) => {
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
app.post('/api/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
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
        res.status(500).json({ error: 'Login failed' });
    }
});

// ==================== FORGOT PASSWORD ====================

// Send forgot password OTP
app.post('/api/forgot-password', async (req, res) => {
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

// Verify forgot password OTP
app.post('/api/verify-forgot-otp', async (req, res) => {
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

// Reset password
app.post('/api/reset-password', async (req, res) => {
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

app.post('/api/chat/save', async (req, res) => {
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
const RESUME_CACHE_TTL = 5 * 60 * 1000; // 5 mins cache TTL

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
        console.log('✅ [Resume Service] Dynamically fetched latest resume PDF from link!');
        return cachedResumeData;
    } catch (err) {
        console.error('❌ [Resume Service] Error fetching resume:', err.message);
        return null;
    }
}

app.post('/api/chat/generate', async (req, res) => {
    try {
        let { historyForAPI, SYSTEM_PROMPT } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;

        if (!API_KEY) {
            return res.status(500).json({ error: 'Server configuration error: Gemini API key missing' });
        }

        // Dynamically attach the latest live resume PDF as inline data if available
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

        // Silent fallback to gemini-3.5-flash-lite if 429 / 503
        if (response.status === 429 || response.status === 503) {
            usedModel = 'gemini-3.5-flash-lite';
            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: requestBody
            });
        }

        // Secondary fallback to gemini-3.1-flash-lite
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
        // Filter out internal thinking/reasoning parts
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

app.post('/api/contact', async (req, res) => {
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

        // Save to database
        const contactMsg = new ContactMessage({ name: name.trim(), email: email.trim(), message: message.trim() });
        await contactMsg.save();

        // Send email notification (do not fail API if SMTP fails)
        try {
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                const mailOptions = {
                    from: `"${name} (Portfolio)" <${process.env.EMAIL_USER}>`,
                    replyTo: email,
                    to: 'shahriyartaufik@gmail.com',
                    subject: `New Portfolio Message from ${name}`,
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
                };
                await transporter.sendMail(mailOptions);
            }
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

app.get('/api/admin/users', requireAdmin, async (req, res) => {
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

app.get('/api/admin/users/:userId/chats', requireAdmin, async (req, res) => {
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

// Admin: Get all contact messages
app.get('/api/admin/contact-messages', requireAdmin, async (req, res) => {
    try {
        const messages = await ContactMessage.find().sort({ createdAt: -1 });
        res.json({ messages, totalMessages: messages.length });
    } catch (error) {
        console.error('Admin Contact Messages Error:', error);
        res.status(500).json({ error: 'Failed to fetch contact messages' });
    }
});

// Admin: Mark contact message as read
app.patch('/api/admin/contact-messages/:id/read', requireAdmin, async (req, res) => {
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

// Admin: Delete a specific chat session
app.delete('/api/admin/users/:userId/chats/:chatId', requireAdmin, async (req, res) => {
    try {
        const result = await ChatLog.findOneAndDelete({ _id: req.params.chatId, userId: req.params.userId });
        if (!result) return res.status(404).json({ error: 'Chat session not found' });
        res.json({ message: 'Chat session deleted successfully' });
    } catch (error) {
        console.error('Admin Delete Chat Error:', error);
        res.status(500).json({ error: 'Failed to delete chat session' });
    }
});

// Admin: Delete a contact message
app.delete('/api/admin/contact-messages/:id', requireAdmin, async (req, res) => {
    try {
        const result = await ContactMessage.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: 'Message not found' });
        res.json({ message: 'Contact message deleted successfully' });
    } catch (error) {
        console.error('Admin Delete Contact Message Error:', error);
        res.status(500).json({ error: 'Failed to delete contact message' });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
