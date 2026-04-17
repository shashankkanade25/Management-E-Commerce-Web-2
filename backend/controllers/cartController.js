const Cart        = require('../models/Cart');
const Product     = require('../models/Product');
const Reservation = require('../models/Reservation');

// Helper to clear active reservations if user modifies their cart
async function clearUserReservations(userId) {
    const activeRes = await Reservation.find({ userId, status: 'active' });
    for (const resv of activeRes) {
        for (const item of resv.items) {
            await Product.updateOne(
                { _id: item.productId },
                { $inc: { reservedStock: -item.quantity } }
            );
        }
        resv.status = 'cancelled';
        await resv.save();
    }
}

// ─── GET /api/cart ─────────────────────────────────────────────────────────
// @access Private
exports.getCart = async (req, res) => {
    try {
        const userId = req.user._id;
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = await Cart.create({ userId, items: [], total: 0 });
        }
        return res.json({ success: true, message: 'Cart retrieved', data: cart });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message, data: null });
    }
};

// ─── POST /api/cart/add ────────────────────────────────────────────────────
// @access Private
exports.addToCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId, quantity = 1 } = req.body;

        const qty = parseInt(quantity, 10);
        if (!qty || qty < 1) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be a positive integer',
                data: null
            });
        }

        // Validate product exists and has stock
        const product = await Product.findOne({ _id: productId, isActive: true });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found or is unavailable',
                data: null
            });
        }
        
        const availableStock = product.stock - product.reservedStock;
        if (availableStock <= 0) {
            return res.status(400).json({
                success: false,
                message: `"${product.name}" is currently out of stock or reserved`,
                data: null
            });
        }

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [], total: 0 });
        }

        const existingIndex = cart.items.findIndex(
            item => item.productId.toString() === String(productId)
        );

        if (existingIndex > -1) {
            const newQty = cart.items[existingIndex].quantity + qty;
            // Cap at actual physical stock (since user hasn't reserved yet)
            if (newQty > product.stock) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot add ${qty} more. Insufficient stock.`,
                    data: null
                });
            }
            cart.items[existingIndex].quantity = newQty;
        } else {
            if (qty > product.stock) {
                return res.status(400).json({
                    success: false,
                    message: `Only ${product.stock} units available for "${product.name}"`,
                    data: null
                });
            }
            cart.items.push({
                productId: product._id,
                name:      product.name,
                price:     product.price,
                image:     product.image,
                quantity:  qty
            });
        }

        cart.total = cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        await cart.save();

        // Adding to cart voids any active checkout holds
        await clearUserReservations(userId);

        return res.json({ success: true, message: 'Item added to cart', data: cart });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid product ID', data: null });
        }
        return res.status(500).json({ success: false, message: err.message, data: null });
    }
};

// ─── PATCH /api/cart/update ────────────────────────────────────────────────
// @access Private
exports.updateCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId, quantity } = req.body;

        const qty = parseInt(quantity, 10);
        if (isNaN(qty) || qty < 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be 0 or greater',
                data: null
            });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found', data: null });
        }

        if (qty === 0) {
            // Remove item
            cart.items = cart.items.filter(item => item.productId.toString() !== String(productId));
        } else {
            const idx = cart.items.findIndex(item => item.productId.toString() === String(productId));
            if (idx === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Item not found in cart',
                    data: null
                });
            }

            // Validate quantity doesn't exceed physical stock
            const product = await Product.findById(productId);
            if (product && qty > product.stock) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for "${product.name}"`,
                    data: null
                });
            }

            cart.items[idx].quantity = qty;
        }

        cart.total = cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        await cart.save();

        // Updating cart voids any active checkout holds
        await clearUserReservations(userId);

        return res.json({ success: true, message: 'Cart updated', data: cart });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message, data: null });
    }
};

// ─── DELETE /api/cart/remove/:productId ────────────────────────────────────
// @access Private
exports.removeFromCart = async (req, res) => {
    try {
        const userId    = req.user._id;
        const productId = req.params.productId;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found', data: null });
        }

        cart.items = cart.items.filter(item => item.productId.toString() !== String(productId));
        cart.total = cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0);

        await cart.save();

        // Modifying cart voids active checkout holds
        await clearUserReservations(userId);

        return res.json({ success: true, message: 'Item removed from cart', data: cart });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message, data: null });
    }
};

// ─── DELETE /api/cart/clear ────────────────────────────────────────────────
// @access Private
exports.clearCart = async (req, res) => {
    try {
        const userId = req.user._id;
        await Cart.findOneAndUpdate({ userId }, { items: [], total: 0 }, { upsert: true });
        
        await clearUserReservations(userId);

        return res.json({ success: true, message: 'Cart cleared', data: null });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message, data: null });
    }
};
