// ─── Validation Middleware ─────────────────────────────────────────────────
// Pure-JS validators, no extra dependencies.
// Each function returns express middleware.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SKU_REGEX   = /^[A-Z0-9\-_]{2,50}$/;

// Helper: collect errors and send 400 if any exist
function validationError(res, errors) {
    return res.status(400).json({
        success: false,
        message: errors[0],  // first error as primary message
        errors,
        data: null
    });
}

// ─── Auth Validators ───────────────────────────────────────────────────────
const validateSignup = (req, res, next) => {
    const { name, email, password } = req.body;
    const errors = [];

    if (!name || name.trim().length < 2)
        errors.push('Name must be at least 2 characters');

    if (!email || !EMAIL_REGEX.test(email.trim()))
        errors.push('A valid email address is required');

    if (!password || password.length < 6)
        errors.push('Password must be at least 6 characters');

    if (errors.length) return validationError(res, errors);
    next();
};

const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    const errors = [];

    if (!email || !EMAIL_REGEX.test(email.trim()))
        errors.push('A valid email address is required');

    if (!password || password.length < 1)
        errors.push('Password is required');

    if (errors.length) return validationError(res, errors);
    next();
};

// ─── Product Validators ────────────────────────────────────────────────────
const validateProduct = (req, res, next) => {
    const { name, sku, price, stock, category, image, description } = req.body;
    const errors = [];

    if (!name || name.trim().length < 2)
        errors.push('Product name must be at least 2 characters');

    if (!sku)
        errors.push('SKU is required');
    else if (!SKU_REGEX.test(sku.trim().toUpperCase()))
        errors.push('SKU must be 2–50 uppercase alphanumeric characters (hyphens/underscores allowed)');

    if (price === undefined || price === null || price === '')
        errors.push('Price is required');
    else if (isNaN(Number(price)) || Number(price) <= 0)
        errors.push('Price must be a positive number greater than 0');

    if (stock === undefined || stock === null || stock === '')
        errors.push('Stock is required');
    else if (isNaN(Number(stock)) || Number(stock) < 0)
        errors.push('Stock must be 0 or greater');

    if (!category || category.trim().length < 1)
        errors.push('Category is required');

    if (!image || image.trim().length < 1)
        errors.push('Image URL is required');

    if (!description || description.trim().length < 10)
        errors.push('Description must be at least 10 characters');

    if (errors.length) return validationError(res, errors);

    // Normalize: uppercase SKU
    req.body.sku = sku.trim().toUpperCase();
    req.body.price = Number(price);
    req.body.stock = Math.floor(Number(stock));
    next();
};

// Partial product validator for updates (all fields optional, but validated if present)
const validateProductUpdate = (req, res, next) => {
    const { name, sku, price, stock } = req.body;
    const errors = [];

    if (name !== undefined && name.trim().length < 2)
        errors.push('Product name must be at least 2 characters');

    if (sku !== undefined) {
        if (!SKU_REGEX.test(sku.trim().toUpperCase()))
            errors.push('SKU must be 2–50 uppercase alphanumeric characters');
        else
            req.body.sku = sku.trim().toUpperCase();
    }

    if (price !== undefined) {
        if (isNaN(Number(price)) || Number(price) <= 0)
            errors.push('Price must be a positive number greater than 0');
        else
            req.body.price = Number(price);
    }

    if (stock !== undefined) {
        if (isNaN(Number(stock)) || Number(stock) < 0)
            errors.push('Stock must be 0 or greater');
        else
            req.body.stock = Math.floor(Number(stock));
    }

    if (errors.length) return validationError(res, errors);
    next();
};

// ─── Order validators ──────────────────────────────────────────────────────
const validateOrder = (req, res, next) => {
    const { items, shippingAddress } = req.body;
    const errors = [];

    if (!items || !Array.isArray(items) || items.length === 0)
        errors.push('Order must contain at least one item');
    else {
        items.forEach((item, idx) => {
            if (!item.productId)
                errors.push(`Item ${idx + 1}: productId is required`);
            if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) < 1)
                errors.push(`Item ${idx + 1}: quantity must be a positive integer`);
        });
    }

    if (!shippingAddress)
        errors.push('Shipping address is required');
    else {
        if (!shippingAddress.fullName || shippingAddress.fullName.trim().length < 2)
            errors.push('Shipping address: full name is required');
        if (!shippingAddress.email || !EMAIL_REGEX.test(shippingAddress.email.trim()))
            errors.push('Shipping address: valid email is required');
        if (!shippingAddress.address || shippingAddress.address.trim().length < 5)
            errors.push('Shipping address: address must be at least 5 characters');
    }

    if (errors.length) return validationError(res, errors);
    next();
};

const validateStatusUpdate = (req, res, next) => {
    const { orderStatus } = req.body;
    const validStatuses = ['pending', 'shipped', 'delivered', 'cancelled'];
    const errors = [];

    if (!orderStatus)
        errors.push('orderStatus is required');
    else if (!validStatuses.includes(orderStatus))
        errors.push(`orderStatus must be one of: ${validStatuses.join(', ')}`);

    if (errors.length) return validationError(res, errors);
    next();
};

module.exports = {
    validateSignup,
    validateLogin,
    validateProduct,
    validateProductUpdate,
    validateOrder,
    validateStatusUpdate
};
