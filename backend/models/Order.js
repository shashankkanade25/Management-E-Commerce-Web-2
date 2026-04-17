const mongoose = require('mongoose');

// Valid status transitions map — only these moves are allowed
const STATUS_TRANSITIONS = {
    pending:   ['shipped', 'cancelled'],
    shipped:   ['delivered', 'cancelled'],
    delivered: [],          // terminal state
    cancelled: []           // terminal state
};

const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name:      { type: String, required: true },
    sku:       { type: String, default: '' },
    price:     { type: Number, required: true },
    image:     { type: String, required: true },
    quantity:  { type: Number, required: true, min: [1, 'Quantity must be at least 1'] }
}, { _id: false });

const shippingAddressSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email:    { type: String, required: true },
    address:  { type: String, required: true }
}, { _id: false });

const statusTimestampsSchema = new mongoose.Schema({
    pendingAt:   { type: Date },
    shippedAt:   { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    items:           { type: [orderItemSchema], required: true },
    total:           { type: Number, required: true },
    shippingAddress: { type: shippingAddressSchema, required: true },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    orderStatus: {
        type: String,
        enum: ['pending', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    statusTimestamps: {
        type: statusTimestampsSchema,
        default: () => ({ pendingAt: new Date() })
    }
}, { timestamps: true });

// Static helper — checks if a transition is valid
orderSchema.statics.isValidTransition = function(from, to) {
    const allowed = STATUS_TRANSITIONS[from] || [];
    return allowed.includes(to);
};

// Performance index on recent orders
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
