const mongoose = require('mongoose');

const chatLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: null },
    guestName: { type: String, default: '' },
    messages: [{
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        model: { type: String },
        timestamp: { type: Date, default: Date.now }
    }],
    sessionStart: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('ChatLog', chatLogSchema);

