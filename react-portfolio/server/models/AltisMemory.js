const mongoose = require('mongoose');

const altisMemorySchema = new mongoose.Schema({
    source: { type: String, default: 'creator_directive' }, // 'creator_directive' | 'admin_update' | 'learned_fact'
    category: { type: String, default: 'general' }, // 'career', 'project', 'personal', 'directive', 'pricing', 'general'
    content: { type: String, required: true },
    rawUserMessage: { type: String, default: '' },
    authorEmail: { type: String, default: 'shahriyartaufik@gmail.com' },
    authorName: { type: String, default: 'Shahriyar Taufik' },
    confidence: { type: Number, default: 1.0 },
    isActive: { type: Boolean, default: true },
    accessCount: { type: Number, default: 0 },
    lastAccessedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Index for fast active retrieval
altisMemorySchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('AltisMemory', altisMemorySchema);
