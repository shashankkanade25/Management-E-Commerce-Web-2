const express = require('express');
const router  = express.Router();
const { createReservation, getActiveReservation } = require('../controllers/reservationController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/reserve', verifyToken, createReservation);
router.get('/active', verifyToken, getActiveReservation);

module.exports = router;
