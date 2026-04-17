const express = require('express');
const router  = express.Router();
const {
    getCart,
    addToCart,
    updateCart,
    removeFromCart,
    clearCart
} = require('../controllers/cartController');
const { verifyToken } = require('../middlewares/authMiddleware');

// All cart routes require authentication
router.get('/',                        verifyToken, getCart);
router.post('/add',                    verifyToken, addToCart);
router.patch('/update',                verifyToken, updateCart);
router.delete('/clear',                verifyToken, clearCart);
router.delete('/remove/:productId',    verifyToken, removeFromCart);

module.exports = router;
