// ==========================================
// FORGECART SHARED MODULE
// Toast Notifications, Navbar, Cart Badge, Auth State
// ==========================================

const API = 'http://localhost:5000/api';

// ==========================================
// OFFLINE HACKATHON DEMO MODE (Serverless)
// Because Node/MongoDB is missing on this PC, 
// we intercept all fetch() calls and simulate the backend!
// ==========================================
const originalFetch = window.fetch;
window.fetch = async function (url, options) {
    if (typeof url === 'string' && url.includes('/api/')) {
        console.log(`[Mock Backend] Intercepting: ${options?.method || 'GET'} ${url}`);

        // Helper to fake a network delay and response
        const mockResponse = (data, status = 200) => new Promise(resolve =>
            setTimeout(() => resolve({
                ok: status >= 200 && status < 300,
                status,
                json: async () => data
            }), 400) // 400ms fake network delay
        );

        // Parse body if present
        let body = {};
        if (options && options.body) {
            try { body = JSON.parse(options.body); } catch (e) { }
        }

        // 1. PRODUCTS
        if (url.includes('/api/products') && (!options || options.method === 'GET')) {
            // Check if asking for specific product
            const match = url.match(/\/api\/products\/([a-zA-Z0-9]+)$/);
            const mockProducts = [
                { _id: 'p1', name: 'BackForge Neural Hoodie', price: 65, category: 'clothing', image: 'https://via.placeholder.com/400x300/1e293b/f97316?text=Neural+Hoodie', stock: 150, description: 'Premium developer hoodie with EMF shielding.' },
                { _id: 'p2', name: 'Mechanical Keyboard Switch Tester', price: 25, category: 'accessories', image: 'https://via.placeholder.com/400x300/1e293b/3b82f6?text=Switch+Tester', stock: 45, description: 'Test 72 different mechanical switches before you build.' },
                { _id: 'p3', name: 'UI Component Kit (React)', price: 49, category: 'digital', image: 'https://via.placeholder.com/400x300/1e293b/10b981?text=UI+Kit', stock: 999, description: 'Over 500 premium UI components for your next SaaS.' },
                { _id: 'p4', name: 'Ergonomic Desk Mat', price: 35, category: 'accessories', image: 'https://via.placeholder.com/400x300/1e293b/f43f5e?text=Desk+Mat', stock: 0, description: 'Ultra-wide smooth desk mat for maximum mouse glide.' }
            ];

            if (match) {
                const p = mockProducts.find(p => p._id === match[1]);
                return mockResponse(p ? p : { message: 'Not found' }, p ? 200 : 404);
            }
            return mockResponse({ products: mockProducts });
        }

        // 2. AUTHENTICATION
        if (url.includes('/api/auth/login')) {
            if (body.email === 'demo@backforge.com' && body.password === 'demo1234') {
                return mockResponse({ _id: 'u1', name: 'Demo User', email: 'demo@backforge.com', role: 'user', token: 'mock-jwt-token' });
            }
            if (body.email === 'admin@backforge.com' && body.password === 'admin1234') {
                return mockResponse({ _id: 'admin1', name: 'Root Admin', email: 'admin@backforge.com', role: 'admin', token: 'mock-jwt-token' });
            }
            return mockResponse({ message: 'Invalid credentials. Try demo@backforge.com / demo1234' }, 401);
        }

        if (url.includes('/api/auth/signup')) {
            return mockResponse({ _id: 'u_new', name: body.name, email: body.email, role: 'user', token: 'mock-jwt-token-new' });
        }

        // 3. CART MANAGEMENT
        // Use localStorage as the "database" for the cart
        const getLocalCart = () => JSON.parse(localStorage.getItem('mockCart') || '{"items":[],"total":0}');
        const saveLocalCart = (cart) => localStorage.setItem('mockCart', JSON.stringify(cart));

        if (url.includes('/api/cart/add') && options.method === 'POST') {
            const cart = getLocalCart();
            const existing = cart.items.find(i => i.productId === body.productId);
            // Mock prices
            const prices = { p1: 65, p2: 25, p3: 49, p4: 35 };
            const names = { p1: 'Neural Hoodie', p2: 'Switch Tester', p3: 'UI Component Kit', p4: 'Desk Mat' };

            if (existing) {
                existing.quantity += body.quantity;
            } else {
                cart.items.push({
                    productId: body.productId,
                    name: names[body.productId] || 'Unknown',
                    price: prices[body.productId] || 0,
                    quantity: body.quantity,
                    image: `https://via.placeholder.com/100x100/1e293b/f97316?text=Item`
                });
            }
            cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            saveLocalCart(cart);
            return mockResponse(cart);
        }

        if (url.includes('/api/cart/update') && options.method === 'PATCH') {
            const cart = getLocalCart();
            const item = cart.items.find(i => i.productId === body.productId);
            if (item) {
                item.quantity = body.quantity;
                cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                saveLocalCart(cart);
            }
            return mockResponse(cart);
        }

        if (url.includes('/api/cart/remove') && options.method === 'DELETE') {
            const cart = getLocalCart();
            const productId = url.split('/').pop();
            cart.items = cart.items.filter(i => i.productId !== productId);
            cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            saveLocalCart(cart);
            return mockResponse(cart);
        }

        if (url.includes('/api/cart/') && (!options || options.method === 'GET')) {
            return mockResponse(getLocalCart());
        }

        // 4. ORDERS & PAYMENT
        if (url.includes('/api/payment/initialize') && options.method === 'POST') {
            return mockResponse({ transactionId: 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase(), status: 'SUCCESS' });
        }

        if (url.includes('/api/orders/create') && options.method === 'POST') {
            let orders = JSON.parse(localStorage.getItem('mockOrders') || '[]');
            const newOrder = {
                _id: 'ord_' + Math.random().toString(36).substring(2, 10),
                userId: body.userId,
                items: body.items,
                total: body.total,
                paymentStatus: body.paymentStatus,
                orderStatus: 'Processing',
                createdAt: new Date().toISOString()
            };
            orders.unshift(newOrder); // add to top
            localStorage.setItem('mockOrders', JSON.stringify(orders));
            localStorage.setItem('mockCart', '{"items":[],"total":0}'); // clear cart
            return mockResponse(newOrder, 201);
        }

        if (url.includes('/api/orders/') && (!options || options.method === 'GET')) {
            const orders = JSON.parse(localStorage.getItem('mockOrders') || '[]');
            return mockResponse(orders);
        }

        // 5. ADMIN
        if (url.includes('/api/admin/stats') && (!options || options.method === 'GET')) {
            const orders = JSON.parse(localStorage.getItem('mockOrders') || '[]');
            return mockResponse({
                success: true,
                stats: {
                    totalUsers: 42,
                    totalProducts: 4,
                    totalOrders: orders.length + 15, // fake existing orders
                    totalRevenue: orders.reduce((sum, o) => sum + o.total, 0) + 4200,
                    lowStockProducts: [
                        { _id: 'p4', name: 'Ergonomic Desk Mat', stock: 0 },
                        { _id: 'p2', name: 'Mechanical Keyboard Switch Tester', stock: 45 }
                    ],
                    recentOrders: orders.slice(0, 5)
                }
            });
        }
    }

    // Fallback to normal fetch if not intercepted
    return originalFetch(url, options);
};

// ==========================================
// TOAST NOTIFICATION SYSTEM
// ==========================================
(function initToastContainer() {
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
})();

function showToast(message, type = 'success', duration = 3200) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const iconMap = {
        success: 'fa-check',
        error: 'fa-times',
        info: 'fa-info',
        warning: 'fa-exclamation'
    };

    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${iconMap[type] || iconMap.info}"></i></div>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

// ==========================================
// NAVBAR SCROLL EFFECT
// ==========================================
(function initNavbarScroll() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    function checkScroll() {
        if (window.scrollY > 30) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }

    window.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();
})();

// ==========================================
// AUTH STATE MANAGEMENT
// ==========================================
function getUser() {
    return JSON.parse(localStorage.getItem('forgeUser') || 'null');
}

function updateNavAuth() {
    const user = getUser();
    const signinLink = document.getElementById('nav-signin');
    const signupLink = document.getElementById('nav-signup');

    if (user && signinLink && signupLink) {
        signinLink.textContent = user.name.split(' ')[0];
        signinLink.href = 'profile.html';
        signinLink.title = 'Logged in as ' + user.email;

        signupLink.textContent = 'Logout';
        signupLink.href = '#';
        signupLink.className = 'btn btn-outline';
        signupLink.onclick = (e) => {
            e.preventDefault();
            localStorage.removeItem('forgeUser');
            showToast('Logged out successfully', 'info');
            setTimeout(() => window.location.href = 'index.html', 800);
        };

        // Show admin link if user is admin
        if (user.role === 'admin') {
            const adminLink = document.getElementById('nav-admin-link');
            if (adminLink) adminLink.style.display = 'inline-flex';
        }
    }
}

// ==========================================
// CART BADGE (live item count)
// ==========================================
async function updateCartBadge() {
    const user = getUser();
    const badgeEl = document.getElementById('cart-badge-count');
    if (!badgeEl) return;

    if (!user) {
        badgeEl.style.display = 'none';
        return;
    }

    try {
        const res = await fetch(`${API}/cart/${user._id}`);
        const cart = await res.json();
        const count = (cart.items || []).reduce((acc, item) => acc + item.quantity, 0);
        if (count > 0) {
            badgeEl.textContent = count > 99 ? '99+' : count;
            badgeEl.style.display = 'flex';
        } else {
            badgeEl.style.display = 'none';
        }
    } catch {
        badgeEl.style.display = 'none';
    }
}

// ==========================================
// ADD TO CART (shared across pages)
// ==========================================
async function addToCart(productId) {
    const user = getUser();
    if (!user) {
        showToast('Please sign in to add items to cart', 'warning');
        setTimeout(() => window.location.href = 'login.html', 1200);
        return;
    }

    // Find the button that triggered this and show loading state
    const btns = document.querySelectorAll(`[onclick*="addToCart('${productId}')"]`);
    btns.forEach(btn => {
        btn.disabled = true;
        btn._originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    });

    try {
        const res = await fetch(`${API}/cart/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user._id, productId, quantity: 1 })
        });
        const data = await res.json();

        if (res.ok) {
            showToast('Item deployed to cart!', 'success');
            updateCartBadge();

            // Show success animation on button
            btns.forEach(btn => {
                btn.innerHTML = '<i class="fas fa-check"></i>';
                btn.classList.add('btn-success-flash');
                setTimeout(() => {
                    btn.innerHTML = btn._originalHTML;
                    btn.disabled = false;
                    btn.classList.remove('btn-success-flash');
                }, 1500);
            });
        } else {
            showToast(data.message || 'Failed to add to cart', 'error');
            btns.forEach(btn => {
                btn.innerHTML = btn._originalHTML;
                btn.disabled = false;
            });
        }
    } catch (err) {
        console.error('Add to cart error:', err);
        showToast('Connection error. Is the server running?', 'error');
        btns.forEach(btn => {
            btn.innerHTML = btn._originalHTML;
            btn.disabled = false;
        });
    }
}

// ==========================================
// INIT ON PAGE LOAD
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    updateNavAuth();
    updateCartBadge();
});
