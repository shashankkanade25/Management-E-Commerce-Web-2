const express    = require('express');
const dotenv     = require('dotenv');
const cors       = require('cors');
const path       = require('path');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB  = require('./config/db');
const { globalLimiter } = require('./middlewares/rateLimiter');
const Reservation = require('./models/Reservation');
const Product = require('./models/Product');

// Load env vars
dotenv.config();

const app = express();

// ─── Background Sweep: Stock Reservations ──────────────────────────────────
const startReservationSweep = () => setInterval(async () => {
    try {
        const expired = await Reservation.find({ 
            status: 'active', 
            expiresAt: { $lt: new Date() } 
        });

        if (expired.length > 0) {
            console.log(`[SYS] Found ¹${expired.length} expired stock reservations. Sweeping...`);
            
            for (const res of expired) {
                // Return stock
                for (const item of res.items) {
                    await Product.updateOne(
                        { _id: item.productId },
                        { $inc: { reservedStock: -item.quantity } }
                    );
                }
                res.status = 'expired';
                await res.save();
            }
        }
    } catch (err) {
        console.error('[SYS] Stock sweep failed:', err.message);
    }
}, 60000); // 1-minute interval


// ─── Security Headers ──────────────────────────────────────────────────────
app.disable('x-powered-by');  // Don't leak Express version

// ─── Core Middleware ───────────────────────────────────────────────────────
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10kb' }));        // Limit body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// MongoDB sanitizer — strips $ and . from user inputs to prevent NoSQL injection
app.use(mongoSanitize());

// Keep DB connection lazy so Vercel function boot does not crash on cold start.
app.use('/api', async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error('[DB]', err.message);
        next(err);
    }
});

// Global rate limiter — 100 req/15min per IP
app.use('/api', globalLimiter);

// Serve the frontend static files
app.use(express.static(path.join(__dirname, '..')));

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'ForgeCart backend is running',
        data: { status: 'ok' }
    });
});

app.get('/api/health', (req, res) => {
    const dbReady = Reservation.db.readyState === 1;
    res.status(dbReady ? 200 : 503).json({
        success: dbReady,
        message: dbReady ? 'API healthy' : 'API up, database disconnected',
        data: {
            uptime: process.uptime(),
            dbState: Reservation.db.readyState
        }
    });
});

// ─── API Routes ────────────────────────────────────────────────────────────
const authRoutes    = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes    = require('./routes/cartRoutes');
const orderRoutes   = require('./routes/orderRoutes');
const adminRoutes   = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reservationRoutes = require('./routes/reservationRoutes');

app.use('/api/auth',         authRoutes);
app.use('/api/products',     productRoutes);
app.use('/api/cart',         cartRoutes);
app.use('/api/orders',       orderRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/payment',      paymentRoutes);
app.use('/api/reservations', reservationRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
        data: null
    });
});

// ─── Global Error Handler ─────────────────────────────────────────────────
// Must have 4 parameters to be recognized as error middleware by Express
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message, err.stack);

    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

    // Handle specific Mongoose errors
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            message: messages[0],
            errors: messages,
            data: null
        });
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        return res.status(409).json({
            success: false,
            message: `Duplicate value for ${field} — must be unique`,
            data: null
        });
    }

    return res.status(statusCode).json({
        success: false,
        message: err.message || 'An unexpected server error occurred',
        data: null,
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
    connectDB()
        .then(() => {
            startReservationSweep();
            app.listen(PORT, () => {
                console.log(`✅ ForgeCart server running on http://localhost:${PORT}`);
                console.log('Security middleware active: mongo-sanitize, rate-limiting, body-size limit');
            });
        })
        .catch((err) => {
            console.error('Failed to start server:', err.message);
            process.exit(1);
        });
}

module.exports = app;
