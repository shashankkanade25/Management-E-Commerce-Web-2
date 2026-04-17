const express = require('express');
const router  = express.Router();
const {
    createOrder,
    getMyOrders,
    getOrderById,
    updateOrderStatus
} = require('../controllers/orderController');
const { verifyToken, isAdmin }         = require('../middlewares/authMiddleware');
const { validateOrder, validateStatusUpdate } = require('../middlewares/validate');
const { orderLimiter }                 = require('../middlewares/rateLimiter');

// All order routes require authentication
router.post('/create', verifyToken, orderLimiter, validateOrder, createOrder);
router.get('/my',      verifyToken, getMyOrders);
router.get('/:id',     verifyToken, getOrderById);

// Admin-only: update order status
router.put('/:id/status', verifyToken, isAdmin, validateStatusUpdate, updateOrderStatus);

module.exports = router;
