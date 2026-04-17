const jwt   = require('jsonwebtoken');
const User  = require('../models/User');

// ─── Helpers ───────────────────────────────────────────────────────────────
const generateToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const userPayload = (user, token) => ({
    _id:   user._id,
    name:  user.name,
    email: user.email,
    role:  user.role,
    token
});

// ─── Register ──────────────────────────────────────────────────────────────
// @route  POST /api/auth/signup
// @access Public
exports.signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check duplicate email
        const existing = await User.findOne({ email: email.trim().toLowerCase() });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists',
                data: null
            });
        }

        const user = await User.create({
            name:     name.trim(),
            email:    email.trim().toLowerCase(),
            password
        });

        const token = generateToken(user._id);

        return res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: userPayload(user, token)
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message || 'Server error during registration',
            data: null
        });
    }
};

// ─── Login ─────────────────────────────────────────────────────────────────
// @route  POST /api/auth/login
// @access Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email: email.trim().toLowerCase() });

        // Use a single generic error message to prevent user enumeration
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
                data: null
            });
        }

        const token = generateToken(user._id);

        return res.json({
            success: true,
            message: 'Login successful',
            data: userPayload(user, token)
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message || 'Server error during login',
            data: null
        });
    }
};

// ─── Get Current User ──────────────────────────────────────────────────────
// @route  GET /api/auth/me
// @access Private
exports.getMe = async (req, res) => {
    return res.json({
        success: true,
        message: 'User retrieved',
        data: {
            _id:   req.user._id,
            name:  req.user.name,
            email: req.user.email,
            role:  req.user.role
        }
    });
};
