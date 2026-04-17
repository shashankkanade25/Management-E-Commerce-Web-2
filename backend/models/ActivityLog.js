const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    adminName: { type: String, required: true },
    action: {
        type: String,
        required: true,
        enum: [
            'product_created',
            'product_updated',
            'product_deleted',  // soft delete
            'order_status_changed',
            'user_role_changed'
        ]
    },
    targetType: {
        type: String,
        required: true,
        enum: ['Product', 'Order', 'User']
    },
    targetId:  { type: String, required: true },
    details:   { type: String, default: '' },
}, { timestamps: true });

// Index for paginated retrieval, most recent first
activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
