const Cart        = require('../models/Cart');
const Product     = require('../models/Product');
const Reservation = require('../models/Reservation');
const mongoose    = require('mongoose');

// ─── POST /api/reservations/reserve ────────────────────────────────────────
// @access Private
exports.createReservation = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;

        // 1. Get the user's cart
        const cart = await Cart.findOne({ userId }).session(session);
        if (!cart || cart.items.length === 0) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Cart is empty', data: null });
        }

        // 2. Clear any existing active reservations for this user and refund stock
        const existingActive = await Reservation.find({ userId, status: 'active' }).session(session);
        for (const resv of existingActive) {
            for (const item of resv.items) {
                await Product.updateOne(
                    { _id: item.productId },
                    { $inc: { reservedStock: -item.quantity } },
                    { session }
                );
            }
            resv.status = 'cancelled';
            await resv.save({ session });
        }

        // 3. Verify stock logic for all items in the current cart
        const itemsToReserve = [];
        
        for (const item of cart.items) {
            const product = await Product.findOne({ _id: item.productId, isActive: true }).session(session);
            
            if (!product) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: `Product ${item.name} not found or inactive`, data: null });
            }

            const availableStock = product.stock - product.reservedStock;
            
            if (availableStock < item.quantity) {
                await session.abortTransaction();
                return res.status(400).json({ 
                    success: false, 
                    message: `Insufficient available stock for ${product.name}. Available: ${availableStock}, Requested: ${item.quantity}`, 
                    data: null 
                });
            }

            // Reserve the stock
            const updated = await Product.findOneAndUpdate(
                { _id: product._id, stock: { $gte: product.reservedStock + item.quantity } },
                { $inc: { reservedStock: item.quantity } },
                { new: true, session }
            );

            if (!updated) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: `Concurrency issue. Cannot reserve ${item.name}.`, data: null });
            }

            itemsToReserve.push({ productId: product._id, quantity: item.quantity });
        }

        // 4. Create new reservation for 5 minutes
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
        
        const [reservation] = await Reservation.create([{
            userId,
            items: itemsToReserve,
            expiresAt
        }], { session });

        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: 'Stock reserved successfully for 5 minutes',
            data: {
                reservationId: reservation._id,
                expiresAt: reservation.expiresAt
            }
        });

    } catch (err) {
        await session.abortTransaction();
        return res.status(500).json({ success: false, message: err.message, data: null });
    } finally {
        session.endSession();
    }
};

// ─── GET /api/reservations/active ──────────────────────────────────────────
// @access Private
exports.getActiveReservation = async (req, res) => {
    try {
        const userId = req.user._id;
        const active = await Reservation.findOne({ 
            userId, 
            status: 'active', 
            expiresAt: { $gt: new Date() } 
        });

        if (!active) {
            return res.json({ success: true, message: 'No active reservations', data: null });
        }

        return res.json({ success: true, message: 'Active reservation retrieved', data: active });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message, data: null });
    }
};
