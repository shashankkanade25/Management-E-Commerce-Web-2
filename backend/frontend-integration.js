// ==========================================
// FORGECART FRONTEND INTEGRATION SCRIPT
// ==========================================
// Add these functions into your frontend JS files or `<script>` tags to connect to the backend effortlessly!
// Ensure you replace "const userId = '...'" with your actual logged in user (or dummy for the demo).

const API_BASE = 'http://localhost:5000/api';

// 1. Load Products on Homepage
async function fetchAndRenderProducts(search = '', category = '') {
    try {
        const queryParams = new URLSearchParams();
        if (search) queryParams.append('search', search);
        if (category) queryParams.append('category', category);

        const res = await fetch(`${API_BASE}/products?${queryParams.toString()}`);
        const data = await res.json();
        
        console.log('Products:', data.products);
        // Loop over data.products and render HTML here
    } catch (err) {
        console.error('Error fetching products', err);
    }
}

// 2. Add to Cart Button Click
async function addToCartHandler(productId) {
    try {
        // hardcoding userId for the demo if you don't have auth state yet
        const userId = localStorage.getItem('userId') || '640abcdef123456789012345'; 
        const res = await fetch(`${API_BASE}/cart/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, productId, quantity: 1 })
        });
        const cart = await res.json();
        alert('Item added to cart!');
        console.log('Updated Cart:', cart);
    } catch (err) {
        console.error('Add to cart failed', err);
    }
}

// 3. Load Product Details
async function loadProductDetail(productId) {
    try {
        const res = await fetch(`${API_BASE}/products/${productId}`);
        const product = await res.json();
        console.log('Product Details:', product);
        // Bind product data to HTML elements here
    } catch (err) {
        console.error('Failed to load product', err);
    }
}

// 4. Initialize Payment / Checkout
async function handleCheckout() {
    try {
        const userId = localStorage.getItem('userId') || '640abcdef123456789012345'; 
        
        // Fetch current cart 
        const cartRes = await fetch(`${API_BASE}/cart/${userId}`);
        const cart = await cartRes.json();
        
        if (!cart.items || cart.items.length === 0) return alert('Cart is empty!');

        // Init payment payload
        const payRes = await fetch(`${API_BASE}/payment/initialize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: cart.total, currency: 'USD' })
        });
        const paymentData = await payRes.json();
        console.log('Payment Initiated:', paymentData);
        
        // Once payment succeeds, create order
        const orderRes = await fetch(`${API_BASE}/orders/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                items: cart.items,
                total: cart.total,
                paymentStatus: 'completed'
            })
        });
        const order = await orderRes.json();
        console.log('Order created:', order);
        alert(`Checkout complete! Transaction ID: ${paymentData.transactionId}`);
        // Redirect to orders page or refresh
    } catch (err) {
        console.error('Checkout failed', err);
    }
}

// 5. Login User
async function handleLogin(email, password) {
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data._id);
            alert('Login successful');
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (err) {
        console.error(err);
    }
}
