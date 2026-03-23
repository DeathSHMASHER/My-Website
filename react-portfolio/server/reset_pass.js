require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = process.env.MONGODB_URI;

async function resetPassword() {
    try {
        await mongoose.connect(MONGO_URI);
        const user = await User.findOne({ email: process.env.EMAIL_USER || 'admin@example.com' });

        if (!user) {
            console.log('Account not found in database.');
            process.exit(1);
        }

        user.password = await bcrypt.hash('Admin123!', 12);
        user.isVerified = true;
        await user.save();

        console.log('Successfully reset password for', user.email);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

resetPassword();

