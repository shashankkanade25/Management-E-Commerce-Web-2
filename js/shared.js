// ==========================================
// FORGECART SHARED MODULE
// Toast Notifications, Navbar, Cart Badge, Auth State
// ==========================================

const API = 'http://localhost:5000/api';

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
