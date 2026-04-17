const Order       = require('../models/Order');
const Product     = require('../models/Product');
const User        = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// ─── GET /api/admin/stats ──────────────────────────────────────────────────
// @access Admin
exports.getStats = async (req, res) => {
    try {
        const [totalUsers, totalProducts, totalOrders, revenue, lowStock, recentOrders] =
            await Promise.all([
                User.countDocuments({}),
                Product.countDocuments({ isActive: true }),
                Order.countDocuments({}),
                Order.aggregate([
                    { $match: { paymentStatus: 'completed' } },
                    { $group: { _id: null, total: { $sum: '$total' } } }
                ]),
                Product.find({ stock: { $lt: 5 }, isActive: true })
                    .select('name sku stock')
                    .sort({ stock: 1 })
                    .limit(10)
                    .lean(),
                Order.find({})
                    .populate('userId', 'name email')
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .lean()
            ]);

        const totalRevenue = revenue.length > 0 ? revenue[0].total : 0;

        // Order counts by status
        const statusCounts = await Order.aggregate([
            { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
        ]);
        const ordersByStatus = { pending: 0, shipped: 0, delivered: 0, cancelled: 0 };
        statusCounts.forEach(s => { if (s._id) ordersByStatus[s._id] = s.count; });

        return res.json({
            success: true,
            message: 'Admin stats retrieved',
            data: {
                totalUsers,
                totalProducts,
                totalOrders,
                totalRevenue: parseFloat(totalRevenue.toFixed(2)),
                lowStockProducts: lowStock,
                recentOrders,
                ordersByStatus
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message, data: null });
    }
};

// ─── GET /api/admin/orders ─────────────────────────────────────────────────
// Re-export from orderController for route convenience
const { getAllOrders } = require('./orderController');
exports.getAllOrders = getAllOrders;

// ─── GET /api/admin/logs ───────────────────────────────────────────────────
// @access Admin
exports.getActivityLogs = async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);

        const totalCount = await ActivityLog.countDocuments({});
        const logs       = await ActivityLog.find({})
            .populate('adminId', 'name email')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(limit * (page - 1))
            .lean();

        return res.json({
            success: true,
            message: 'Activity logs retrieved',
            data: {
                logs,
                pagination: {
                    page, limit, totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message, data: null });
    }
};
