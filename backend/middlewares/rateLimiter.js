const rateLimit = require('express-rate-limit');

// ─── Global rate limiter ───────────────────────────────────────────────────
// 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests from this IP. Please try again after 15 minutes.',
        data: null
    }
});

// ─── Auth rate limiter ────────────────────────────────────────────────────
// 10 requests per 15 minutes — stricter for login/signup (brute-force mitigation)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again after 15 minutes.',
        data: null
    }
});

// ─── Order rate limiter ───────────────────────────────────────────────────
// 20 orders per 15 minutes — prevents order spam
const orderLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many order requests. Please slow down.',
        data: null
    }
});

module.exports = { globalLimiter, authLimiter, orderLimiter };
