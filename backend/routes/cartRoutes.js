const express = require('express');
const router = express.Router();
const {
    getCart,
    addToCart,
    updateCart,
    removeFromCart
} = require('../controllers/cartController');

// Using basic userId mapped routes for simplicity in the hackathon without demanding auth token on every cart click
router.get('/:userId', getCart);
router.post('/add', addToCart);
router.patch('/update', updateCart);
router.delete('/remove/:userId/:productId', removeFromCart);

module.exports = router;
