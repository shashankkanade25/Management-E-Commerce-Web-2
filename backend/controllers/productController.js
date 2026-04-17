const Product     = require('../models/Product');
const ActivityLog = require('../models/ActivityLog');

// ─── Helper: log admin activity ────────────────────────────────────────────
async function logActivity(adminUser, action, targetType, targetId, details = '') {
    try {
        await ActivityLog.create({
            adminId:   adminUser._id,
            adminName: adminUser.name,
            action,
            targetType,
            targetId:  String(targetId),
            details
        });
    } catch (_) {
        // Non-fatal: never let log failure break a request
    }
}

// ─── GET /api/products ─────────────────────────────────────────────────────
// Public. Supports: search, category filter, pagination, SKU search
exports.getProducts = async (req, res) => {
    try {
        const page     = Math.max(1, parseInt(req.query.page)  || 1);
        const limit    = Math.min(50, parseInt(req.query.limit) || 12);
        const search   = req.query.search   || '';
        const category = req.query.category || '';
        const featured = req.query.featured;

        // Build filter — only active products visible to public
        const filter = { isActive: true };

        if (category && category !== 'all') {
            filter.category = category;
        }

        if (featured === 'true') {
            filter.featured = true;
        }

        if (search) {
            // Search across name, SKU, and description with case-insensitive regex
            filter.$or = [
                { name:        { $regex: search, $options: 'i' } },
                { sku:         { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const totalCount = await Product.countDocuments(filter);
        const products   = await Product.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(limit * (page - 1))
            .lean();

        return res.json({
            success: true,
            message: 'Products retrieved',
            data: {
                products,
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages: Math.ceil(totalCount / limit),
                    hasNext: page * limit < totalCount,
                    hasPrev: page > 1
                }
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error', data: null });
    }
};

// ─── GET /api/products/:id ─────────────────────────────────────────────────
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findOne({ _id: req.params.id, isActive: true });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found', data: null });
        }
        return res.json({ success: true, message: 'Product retrieved', data: product });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid product ID', data: null });
        }
        return res.status(500).json({ success: false, message: 'Server error', data: null });
    }
};

// ─── POST /api/products ────────────────────────────────────────────────────
// Admin only — validation middleware applied at route level
exports.createProduct = async (req, res) => {
    try {
        const { name, sku, category, price, image, description, stock, featured } = req.body;

        // Check unique SKU before insert
        const existing = await Product.findOne({ sku: sku.toUpperCase() });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: `A product with SKU "${sku.toUpperCase()}" already exists`,
                data: null
            });
        }

        const product = await Product.create({
            name, sku, category, price, image, description,
            stock: Math.floor(Number(stock)),
            featured: featured === true || featured === 'true'
        });

        // Log admin action
        await logActivity(req.user, 'product_created', 'Product', product._id,
            `Created product "${product.name}" (SKU: ${product.sku})`);

        return res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'SKU already exists — must be unique',
                data: null
            });
        }
        return res.status(500).json({ success: false, message: err.message, data: null });
    }
};

// ─── PUT /api/products/:id ─────────────────────────────────────────────────
// Admin only
exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findOne({ _id: req.params.id, isActive: true });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found', data: null });
        }

        // If SKU is being changed, ensure no collision with another product
        if (req.body.sku && req.body.sku.toUpperCase() !== product.sku) {
            const skuConflict = await Product.findOne({
                sku: req.body.sku.toUpperCase(),
                _id: { $ne: product._id }
            });
            if (skuConflict) {
                return res.status(409).json({
                    success: false,
                    message: `SKU "${req.body.sku.toUpperCase()}" is already in use`,
                    data: null
                });
            }
        }

        const before = { name: product.name, price: product.price, stock: product.stock };

        // Apply allowed fields
        const fields = ['name', 'sku', 'category', 'price', 'image', 'description', 'stock', 'featured'];
        fields.forEach(f => {
            if (req.body[f] !== undefined) product[f] = req.body[f];
        });

        // Auto-deactivate if stock reaches 0
        if (product.stock === 0) product.isActive = false;
        else if (product.stock > 0 && !product.isActive) product.isActive = true;

        const updated = await product.save();

        await logActivity(req.user, 'product_updated', 'Product', product._id,
            `Updated product "${product.name}" — before: price=$${before.price} stock=${before.stock}`);

        return res.json({ success: true, message: 'Product updated', data: updated });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid product ID', data: null });
        }
        return res.status(500).json({ success: false, message: err.message, data: null });
    }
};

// ─── DELETE /api/products/:id ──────────────────────────────────────────────
// Admin only — SOFT DELETE (set isActive = false)
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found', data: null });
        }
        if (!product.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Product is already inactive',
                data: null
            });
        }

        product.isActive = false;
        await product.save();

        await logActivity(req.user, 'product_deleted', 'Product', product._id,
            `Soft-deleted product "${product.name}" (SKU: ${product.sku})`);

        return res.json({
            success: true,
            message: 'Product deactivated (soft deleted)',
            data: { _id: product._id, name: product.name, isActive: false }
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid product ID', data: null });
        }
        return res.status(500).json({ success: false, message: err.message, data: null });
    }
};

// ─── GET /api/products/admin/all ───────────────────────────────────────────
// Admin only — includes inactive products
exports.getAllProductsAdmin = async (req, res) => {
    try {
        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(50, parseInt(req.query.limit) || 20);
        const search = req.query.search || '';

        const filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku:  { $regex: search, $options: 'i' } }
            ];
        }

        const totalCount = await Product.countDocuments(filter);
        const products   = await Product.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(limit * (page - 1))
            .lean();

        return res.json({
            success: true,
            message: 'All products retrieved (admin)',
            data: {
                products,
                pagination: { page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) }
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error', data: null });
    }
};
