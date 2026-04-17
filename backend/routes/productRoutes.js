const express = require('express');
const router  = express.Router();
const {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getAllProductsAdmin
} = require('../controllers/productController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
const { validateProduct, validateProductUpdate } = require('../middlewares/validate');

// Public routes
router.get('/',    getProducts);
router.get('/admin/all', verifyToken, isAdmin, getAllProductsAdmin);  // admin: includes inactive
router.get('/:id', getProductById);

// Admin-protected routes with validation
router.post('/',    verifyToken, isAdmin, validateProduct,       createProduct);
router.put('/:id',  verifyToken, isAdmin, validateProductUpdate, updateProduct);
router.delete('/:id', verifyToken, isAdmin, deleteProduct);

module.exports = router;
