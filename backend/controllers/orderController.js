const mongoose    = require('mongoose');
const Order       = require('../models/Order');
const Product     = require('../models/Product');
const Cart        = require('../models/Cart');
const ActivityLog = require('../models/ActivityLog');
const Reservation = require('../models/Reservation');

// ─── ORD-XXXX ID generator ─────────────────────────────────────────────────
function generateOrderId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'ORD-';
    for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
}

// Retry if collision (extremely rare but handled for production correctness)
async function uniqueOrderId() {
    let id, exists = true, attempts = 0;
    while (exists && attempts < 10) {
        id = generateOrderId();
        exists = await Order.exists({ orderId: id });
        attempts++;
    }
    return id;
}

// ─── POST /api/orders/create ───────────────────────────────────────────────
// @access Private (verifyToken)
exports.createOrder = async (req, res) => {
    // Use a Mongoose session for atomic stock deduction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { items, shippingAddress } = req.body;
        const userId = req.user._id;

        // ── 0. Validate Active Reservation ──────────────────────────────────
        const reservation = await Reservation.findOne({ 
            userId, 
            status: 'active', 
            expiresAt: { $gt: new Date() } 
        }).session(session);

        if (!reservation) {
            await session.abortTransaction();
            return res.status(400).json({ 
                success: false, 
                message: 'Stock reservation expired or not found. Please return to your cart and checkout again.', 
                data: null 
            });
        }

        // ── 1. Validate each item: product exists, is active, sufficient stock ──
        const enrichedItems = [];
        let calculatedTotal = 0;

        for (const item of items) {
            if (!mongoose.Types.ObjectId.isValid(item.productId)) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: `Invalid product ID: ${item.productId}`,
                    data: null
                });
            }

            const qty = parseInt(item.quantity, 10);
            if (!qty || qty < 1) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: `Invalid quantity for product ${item.productId}`,
                    data: null
                });
            }

            // Fetch fresh product data from DB (never trust client prices)
            const product = await Product.findOne({
                _id: item.productId,
                isActive: true
            }).session(session);

            if (!product) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: `Product "${item.productId}" not found or is inactive`,
                    data: null
                });
            }

            if (product.stock < qty) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${qty}`,
                    data: null
                });
            }

            // ── 2. Atomically deduct stock ──────────────────────────────────
            const updated = await Product.findOneAndUpdate(
                { _id: product._id, stock: { $gte: qty }, reservedStock: { $gte: qty } },  // race condition guard
                {
                    $inc: { stock: -qty, reservedStock: -qty },
                    // Auto-deactivate if stock reaches 0 after deduction
                    $set: {
                        isActive: product.stock - qty > 0 ? true : false
                    }
                },
                { new: true, session }
            );

            if (!updated) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: `"${product.name}" just sold out. Please refresh your cart.`,
                    data: null
                });
            }

            enrichedItems.push({
                productId: product._id,
                name:      product.name,
                sku:       product.sku || '',
                price:     product.price,  // price from DB — never client
                image:     product.image,
                quantity:  qty
            });

            calculatedTotal += product.price * qty;
        }

        // ── 3. Generate unique order ID ─────────────────────────────────────
        const orderId = await uniqueOrderId();
        const now = new Date();

        // ── 4. Create the order ─────────────────────────────────────────────
        const [order] = await Order.create([{
            orderId,
            userId,
            items:           enrichedItems,
            total:           parseFloat(calculatedTotal.toFixed(2)),
            shippingAddress: {
                fullName: shippingAddress.fullName.trim(),
                email:    shippingAddress.email.trim().toLowerCase(),
                address:  shippingAddress.address.trim()
            },
            paymentStatus:     'completed',
            orderStatus:       'pending',
            statusTimestamps:  { pendingAt: now }
        }], { session });

        // ── 5. Clear user cart & complete reservation ───────────────────────
        await Cart.findOneAndUpdate(
            { userId },
            { items: [], total: 0 },
            { session }
        );

        reservation.status = 'completed';
        await reservation.save({ session });

        await session.commitTransaction();

        return res.status(201).json({
            success: true,
            message: `Order ${orderId} placed successfully`,
            data: order
        });

    } catch (err) {
        await session.abortTransaction();
        return res.status(500).json({
            success: false,
            message: err.message || 'Order creation failed',
            data: null
        });
    } finally {
        session.endSession();
    }
};

// ─── GET /api/orders/my ────────────────────────────────────────────────────
// @access Private — returns only the logged-in user's orders
exports.getMyOrders = async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 20);

        const orders = await Order.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(limit * (page - 1))
            .lean();

        return res.json({
            success: true,
            message: 'Orders retrieved',
            data: {
                orders,
                pagination: { page, limit }
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message, data: null });
    }
};

// ─── GET /api/orders/:id ───────────────────────────────────────────────────
// @access Private — user can view their own order; admin can view any
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('userId', 'name email')
            .lean();

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found', data: null });
        }

        // Non-admin users may only view their own orders
        if (req.user.role !== 'admin' && String(order.userId._id) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Access denied', data: null });
        }

        return res.json({ success: true, message: 'Order retrieved', data: order });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid order ID', data: null });
        }
        return res.status(500).json({ success: false, message: err.message, data: null });
    }
};

// ─── PUT /api/orders/:id/status ────────────────────────────────────────────
// @access Admin only
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderStatus } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found', data: null });
        }

        // Validate transition
        if (!Order.isValidTransition(order.orderStatus, orderStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid transition: cannot move from "${order.orderStatus}" to "${orderStatus}"`,
                data: {
                    current: order.orderStatus,
                    attempted: orderStatus,
                    allowedNext: order.orderStatus === 'pending'   ? ['shipped', 'cancelled'] :
                                 order.orderStatus === 'shipped'   ? ['delivered', 'cancelled'] : []
                }
            });
        }

        const prevStatus = order.orderStatus;
        order.orderStatus = orderStatus;

        // Set stage timestamp
        const ts = order.statusTimestamps || {};
        const now = new Date();
        if (orderStatus === 'shipped')   ts.shippedAt   = now;
        if (orderStatus === 'delivered') ts.deliveredAt = now;
        if (orderStatus === 'cancelled') ts.cancelledAt = now;
        order.statusTimestamps = ts;

        await order.save();

        // Log admin action
        await ActivityLog.create({
            adminId:    req.user._id,
            adminName:  req.user.name,
            action:     'order_status_changed',
            targetType: 'Order',
            targetId:   order.orderId || String(order._id),
            details:    `Status changed from "${prevStatus}" to "${orderStatus}"`
        });

        return res.json({
            success: true,
            message: `Order status updated to "${orderStatus}"`,
            data: order
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid order ID', data: null });
        }
        return res.status(500).json({ success: false, message: err.message, data: null });
    }
};

// ─── GET /api/admin/orders ─────────────────────────────────────────────────
// @access Admin only — all orders with filters
exports.getAllOrders = async (req, res) => {
    try {
        const page     = Math.max(1, parseInt(req.query.page)  || 1);
        const limit    = Math.min(100, parseInt(req.query.limit) || 20);
        const status   = req.query.status   || '';
        const search   = req.query.search   || '';

        const filter = {};
        if (status && ['pending','shipped','delivered','cancelled'].includes(status)) {
            filter.orderStatus = status;
        }
        if (search) {
            filter.$or = [
                { orderId: { $regex: search, $options: 'i' } }
            ];
        }

        const totalCount = await Order.countDocuments(filter);
        const orders     = await Order.find(filter)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(limit * (page - 1))
            .lean();

        return res.json({
            success: true,
            message: 'All orders retrieved',
            data: {
                orders,
                pagination: {
                    page, limit, totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message, data: null });
    }
};
