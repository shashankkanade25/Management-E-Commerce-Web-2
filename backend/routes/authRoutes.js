const express = require('express');
const router  = express.Router();
const { signup, login, getMe } = require('../controllers/authController');
const { verifyToken }          = require('../middlewares/authMiddleware');
const { validateSignup, validateLogin } = require('../middlewares/validate');
const { authLimiter }          = require('../middlewares/rateLimiter');

// Apply strict rate limiting to auth endpoints
router.post('/signup', authLimiter, validateSignup, signup);
router.post('/login',  authLimiter, validateLogin,  login);
router.get('/me',      verifyToken, getMe);

module.exports = router;
