const express = require('express');
const router = express.Router();
const {
    createOrder,
    getUserOrders,
    updateOrderStatus
} = require('../controllers/orderController');
const { protect } = require('../middlewares/authMiddleware');

// For simplicity, create and view by userId
router.post('/create', createOrder);
router.get('/:userId', getUserOrders);

// Admin route
router.patch('/:id/status', protect, updateOrderStatus);

module.exports = router;
