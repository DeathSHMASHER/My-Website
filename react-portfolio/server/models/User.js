const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, lowercase: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, default: '' },
    password: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
    lastLogin: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

