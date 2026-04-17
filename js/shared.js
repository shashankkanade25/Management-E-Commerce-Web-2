// ==========================================
// FORGECART SHARED MODULE — PRODUCTION
// Auth, Toast, Navbar, Cart Badge, API helpers
// ==========================================

const API = 'http://localhost:5000/api';

// ─── Auth Helpers ──────────────────────────────────────────────────────────

function getUser() {
    try {
        return JSON.parse(localStorage.getItem('forgeUser') || 'null');
    } catch {
        return null;
    }
}

function getToken() {
    const user = getUser();
    return user ? user.token : null;
}

// Auth headers for protected API calls
function authHeaders(extra = {}) {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...extra
    };
}

// Check if token is expired (JWT exp claim is in seconds)
function isTokenExpired() {
    const token = getToken();
    if (!token) return true;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return Date.now() >= payload.exp * 1000;
    } catch {
        return true;
    }
}

function logout(reason = '') {
    localStorage.removeItem('forgeUser');
    if (reason) showToast(reason, 'warning');
    setTimeout(() => { window.location.href = 'login.html'; }, 800);
}

// Auto-logout on page load if token is expired (except on login/register pages)
(function checkTokenOnLoad() {
    const onAuthPage = ['login.html', 'register.html'].some(p => window.location.pathname.includes(p));
    if (!onAuthPage && getUser() && isTokenExpired()) {
        logout('Session expired — please sign in again');
    }
})();

// ─── API call wrapper — handles 401/token-expired automatically ────────────
async function apiFetch(url, options = {}) {
    const response = await fetch(url, options);

    // Auto-logout on token expiry or unauthorized
    if (response.status === 401) {
        const data = await response.json().catch(() => ({}));
        if (data.code === 'TOKEN_EXPIRED' || (getUser() && isTokenExpired())) {
            logout('Session expired — please sign in again');
            throw new Error('Session expired');
        }
        throw new Error(data.message || 'Unauthorized');
    }

    return response;
}

// ─── Toast Notification System ─────────────────────────────────────────────
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
        error:   'fa-times',
        info:    'fa-info',
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

// ─── Navbar Scroll Effect ──────────────────────────────────────────────────
(function initNavbarScroll() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    function checkScroll() {
        navbar.classList.toggle('scrolled', window.scrollY > 30);
    }

    window.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();
})();

// ─── Auth State → Navbar ───────────────────────────────────────────────────
function updateNavAuth() {
    const user       = getUser();
    const signinLink = document.getElementById('nav-signin');
    const signupLink = document.getElementById('nav-signup');
    const adminLink  = document.getElementById('nav-admin-link');

    if (adminLink) adminLink.style.display = 'none';  // hidden by default

    if (user && signinLink && signupLink) {
        signinLink.textContent = user.name.split(' ')[0];
        signinLink.href        = 'profile.html';
        signinLink.title       = `Logged in as ${user.email}`;

        signupLink.textContent = 'Logout';
        signupLink.href        = '#';
        signupLink.className   = 'btn btn-outline';
        signupLink.onclick     = (e) => {
            e.preventDefault();
            logout('Logged out successfully');
        };

        if (user.role === 'admin' && adminLink) {
            adminLink.style.display = 'inline-flex';
        }
    }
}

// ─── Cart Badge (live count) ───────────────────────────────────────────────
async function updateCartBadge() {
    const user    = getUser();
    const badgeEl = document.getElementById('cart-badge-count');
    if (!badgeEl) return;

    if (!user || isTokenExpired()) {
        badgeEl.style.display = 'none';
        return;
    }

    try {
        const res  = await apiFetch(`${API}/cart`, { headers: authHeaders() });
        const body = await res.json();
        const cart = body.data || body;
        const count = (cart.items || []).reduce((acc, item) => acc + item.quantity, 0);

        if (count > 0) {
            badgeEl.textContent   = count > 99 ? '99+' : count;
            badgeEl.style.display = 'flex';
        } else {
            badgeEl.style.display = 'none';
        }
    } catch {
        badgeEl.style.display = 'none';
    }
}

// ─── Add to Cart (shared across pages) ────────────────────────────────────
async function addToCart(productId) {
    const user = getUser();
    if (!user) {
        showToast('Please sign in to add items to cart', 'warning');
        setTimeout(() => { window.location.href = 'login.html'; }, 1200);
        return;
    }

    if (isTokenExpired()) {
        logout('Session expired — please sign in again');
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
        const res  = await apiFetch(`${API}/cart/add`, {
            method:  'POST',
            headers: authHeaders(),
            body:    JSON.stringify({ productId, quantity: 1 })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast('Item added to cart!', 'success');
            updateCartBadge();

            btns.forEach(btn => {
                btn.innerHTML = '<i class="fas fa-check"></i>';
                btn.classList.add('btn-success-flash');
                setTimeout(() => {
                    btn.innerHTML = btn._originalHTML;
                    btn.disabled  = false;
                    btn.classList.remove('btn-success-flash');
                }, 1500);
            });
        } else {
            showToast(data.message || 'Failed to add to cart', 'error');
            btns.forEach(btn => {
                btn.innerHTML = btn._originalHTML;
                btn.disabled  = false;
            });
        }
    } catch (err) {
        if (err.message !== 'Session expired') {
            showToast('Connection error. Is the server running?', 'error');
        }
        btns.forEach(btn => {
            btn.innerHTML = btn._originalHTML || btn.innerHTML;
            btn.disabled  = false;
        });
    }
}

// ─── Status Badge Helper (shared) ─────────────────────────────────────────
function getStatusBadge(status) {
    const map = {
        pending:   { label: 'Pending',   className: 'badge-pending',   icon: 'fa-clock' },
        shipped:   { label: 'Shipped',   className: 'badge-shipped',   icon: 'fa-shipping-fast' },
        delivered: { label: 'Delivered', className: 'badge-delivered', icon: 'fa-check-circle' },
        cancelled: { label: 'Cancelled', className: 'badge-cancelled', icon: 'fa-times-circle' }
    };
    const s = map[status] || map.pending;
    return `<span class="order-badge ${s.className}"><i class="fas ${s.icon}"></i> ${s.label}</span>`;
}

// ─── Init on Page Load ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    updateNavAuth();
    updateCartBadge();
});
