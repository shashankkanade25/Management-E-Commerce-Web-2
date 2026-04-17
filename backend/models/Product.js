const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        maxlength: [200, 'Product name cannot exceed 200 characters']
    },
    sku: {
        type: String,
        required: [true, 'SKU is required'],
        unique: true,
        trim: true,
        uppercase: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        index: true
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0.01, 'Price must be greater than 0']
    },
    image: {
        type: String,
        required: [true, 'Product image URL is required']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    stock: {
        type: Number,
        required: [true, 'Stock is required'],
        min: [0, 'Stock cannot be negative'],
        default: 0
    },
    reservedStock: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Reserved stock cannot be negative']
    },
    featured: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, { timestamps: true });

// Compound text index for fast full-text search on name, description, SKU
productSchema.index({ name: 'text', description: 'text', sku: 'text' });
// Explicit SKU index for fast unique lookups
productSchema.index({ sku: 1 }, { unique: true });
// Category + isActive compound for filtered listing
productSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
