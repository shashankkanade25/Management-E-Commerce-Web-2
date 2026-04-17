const express = require('express');
const router  = express.Router();
const { getStats, getActivityLogs, getAllOrders } = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

// All admin routes protected
router.get('/stats',  verifyToken, isAdmin, getStats);
router.get('/orders', verifyToken, isAdmin, getAllOrders);
router.get('/logs',   verifyToken, isAdmin, getActivityLogs);

module.exports = router;
