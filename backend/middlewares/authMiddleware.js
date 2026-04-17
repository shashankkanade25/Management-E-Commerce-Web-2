const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ─── verifyToken (protect) ─────────────────────────────────────────────────
// Validates the Bearer token in the Authorization header.
// Attaches req.user if valid; otherwise returns 401.
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized: no token provided',
            data: null
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized: user no longer exists',
                data: null
            });
        }

        req.user = user;
        next();
    } catch (err) {
        // Distinguish expired tokens from malformed ones for frontend UX
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired — please log in again',
                data: null,
                code: 'TOKEN_EXPIRED'
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Not authorized: invalid token',
            data: null
        });
    }
};

// ─── isAdmin ──────────────────────────────────────────────────────────────
// Must be chained after verifyToken. Allows only admin-role users.
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: 'Forbidden: admin access required',
        data: null
    });
};

// Legacy aliases (keep backward compatibility)
const protect = verifyToken;
const admin   = isAdmin;

module.exports = { verifyToken, isAdmin, protect, admin };
