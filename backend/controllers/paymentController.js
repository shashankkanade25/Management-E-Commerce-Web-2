// @desc    Initialize a mock payment payload
// @route   POST /api/payment/initialize
exports.initializePayment = async (req, res) => {
    try {
        const { amount, currency } = req.body;
        
        // Mocking a payment gateway integration
        setTimeout(() => {
            res.json({
                success: true,
                transactionId: 'txn_' + Math.random().toString(36).substr(2, 9),
                amount,
                currency: currency || 'USD',
                message: 'Payment mock payload initialized successfully'
            });
        }, 800); // simulate network latency
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
