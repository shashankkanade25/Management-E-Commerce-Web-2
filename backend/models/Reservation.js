const mongoose = require('mongoose');

const reservationItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 }
});

const reservationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [reservationItemSchema],
    expiresAt: { type: Date, required: true, index: true },
    status: { 
        type: String, 
        enum: ['active', 'completed', 'expired', 'cancelled'], 
        default: 'active' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Reservation', reservationSchema);
