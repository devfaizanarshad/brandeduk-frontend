/* Mobile JavaScript - BrandedUK */

document.addEventListener('DOMContentLoaded', function() {
    initMobileMenu();
    initSearch();
    initCategories();
    initBottomNav();
    updateCartCount();
});

// ============================================
// MOBILE MENU
// ============================================
function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const menuOverlay = document.getElementById('menuOverlay');
    const slideMenu = document.getElementById('slideMenu');
    const closeMenu = document.getElementById('closeMenu');

    if (!menuToggle || !slideMenu) return;

    function openMenu() {
        slideMenu.classList.add('active');
        menuOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMenuFn() {
        slideMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    menuToggle.addEventListener('click', openMenu);
    closeMenu?.addEventListener('click', closeMenuFn);
    menuOverlay?.addEventListener('click', closeMenuFn);

    // Handle swipe to close
    let touchStartX = 0;
    slideMenu.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    });

    slideMenu.addEventListener('touchmove', (e) => {
        const touchX = e.touches[0].clientX;
        const diff = touchStartX - touchX;
        if (diff > 50) {
            closeMenuFn();
        }
    });
}

// ============================================
// SEARCH
// ============================================
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchNavBtn = document.getElementById('searchNavBtn');

    if (searchNavBtn) {
        searchNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            searchInput?.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    window.location.href = `shop-mobile.html?search=${encodeURIComponent(query)}`;
                }
            }
        });
    }
}

// ============================================
// CATEGORIES
// ============================================
function initCategories() {
    const categoryItems = document.querySelectorAll('.category-item');

    categoryItems.forEach(item => {
        item.addEventListener('click', () => {
            const category = item.dataset.category;
            if (category) {
                window.location.href = `shop-mobile.html?category=${category}`;
            }
        });
    });
}

// ============================================
// BOTTOM NAVIGATION
// ============================================
function initBottomNav() {
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    const currentPage = window.location.pathname.split('/').pop() || 'home-mobile.html';

    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href && href.includes(currentPage)) {
            item.classList.add('active');
        } else if (item.id !== 'searchNavBtn') {
            item.classList.remove('active');
        }
    });
}

// ============================================
// CART COUNT
// ============================================
function updateCartCount() {
    const cartCountEl = document.getElementById('cartCount');
    if (!cartCountEl) return;

    try {
        const basket = JSON.parse(localStorage.getItem('quoteBasket') || '[]');
        let totalItems = 0;

        basket.forEach(item => {
            if (item.quantities && typeof item.quantities === 'object') {
                Object.values(item.quantities).forEach(qty => {
                    totalItems += parseInt(qty) || 0;
                });
            } else if (item.quantity) {
                totalItems += parseInt(item.quantity) || 0;
            }
        });

        cartCountEl.textContent = totalItems;
        cartCountEl.style.display = totalItems > 0 ? 'flex' : 'none';
    } catch (e) {
        cartCountEl.textContent = '0';
        cartCountEl.style.display = 'none';
    }
}

// Listen for storage changes
window.addEventListener('storage', updateCartCount);

// ============================================
// FILTERS PANEL (for shop page)
// ============================================
function initFilters() {
    const filterBtn = document.querySelector('.filter-btn');
    const filtersOverlay = document.querySelector('.filters-overlay');
    const filtersPanel = document.querySelector('.filters-panel');
    const filtersClose = document.querySelector('.filters-close');
    const filterApply = document.querySelector('.filter-apply-btn');
    const filterClear = document.querySelector('.filter-clear-btn');

    if (!filterBtn || !filtersPanel) return;

    function openFilters() {
        filtersPanel.classList.add('active');
        filtersOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeFilters() {
        filtersPanel.classList.remove('active');
        filtersOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    filterBtn.addEventListener('click', openFilters);
    filtersClose?.addEventListener('click', closeFilters);
    filtersOverlay?.addEventListener('click', closeFilters);
    filterApply?.addEventListener('click', closeFilters);
    filterClear?.addEventListener('click', () => {
        // Clear all filters
        document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = false);
    });
}

// ============================================
// PRODUCT GALLERY (for product page)
// ============================================
function initProductGallery() {
    const mainImage = document.querySelector('.product-main-image');
    const thumbnails = document.querySelectorAll('.thumb-img');

    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', () => {
            thumbnails.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
            if (mainImage) {
                mainImage.src = thumb.src;
            }
        });
    });

    // Swipe for gallery
    let touchStartX = 0;
    let touchEndX = 0;

    mainImage?.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    });

    mainImage?.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].clientX;
        handleSwipe();
    });

    function handleSwipe() {
        const diff = touchStartX - touchEndX;
        const activeThumb = document.querySelector('.thumb-img.active');
        let nextThumb;

        if (Math.abs(diff) < 50) return;

        if (diff > 0) {
            // Swipe left - next image
            nextThumb = activeThumb?.nextElementSibling || thumbnails[0];
        } else {
            // Swipe right - previous image
            nextThumb = activeThumb?.previousElementSibling || thumbnails[thumbnails.length - 1];
        }

        if (nextThumb) {
            nextThumb.click();
        }
    }
}

// ============================================
// COLOR & SIZE SELECTION
// ============================================
function initProductOptions() {
    // Colors
    const colorSwatches = document.querySelectorAll('.color-swatch');
    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            colorSwatches.forEach(s => s.classList.remove('selected'));
            swatch.classList.add('selected');
        });
    });

    // Sizes
    const sizeBtns = document.querySelectorAll('.size-btn');
    sizeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sizeBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });

    // Quantity controls
    const qtyInput = document.querySelector('.qty-input');
    const qtyBtns = document.querySelectorAll('.qty-btn');

    qtyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!qtyInput) return;
            let val = parseInt(qtyInput.value) || 1;
            if (btn.textContent === '+') {
                val++;
            } else if (btn.textContent === '−' || btn.textContent === '-') {
                val = Math.max(1, val - 1);
            }
            qtyInput.value = val;
        });
    });
}

// ============================================
// CUSTOMIZATION PAGE
// ============================================
function initCustomization() {
    // Clipart tabs
    const clipartTabs = document.querySelectorAll('.clipart-tab');
    clipartTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            clipartTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            // Load clipart for this category
            loadClipart(tab.dataset.category);
        });
    });

    // Clipart selection
    const clipartItems = document.querySelectorAll('.clipart-item');
    clipartItems.forEach(item => {
        item.addEventListener('click', () => {
            clipartItems.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
        });
    });

    // Text colors
    const textColors = document.querySelectorAll('.text-color-btn');
    textColors.forEach(color => {
        color.addEventListener('click', () => {
            textColors.forEach(c => c.classList.remove('selected'));
            color.classList.add('selected');
        });
    });

    // Upload area
    const uploadArea = document.querySelector('.upload-area');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    uploadArea?.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });
}

function loadClipart(category) {
    // Placeholder for loading clipart
    console.log('Loading clipart for:', category);
}

function handleFileUpload(file) {
    // Placeholder for file upload handling
    console.log('Uploading:', file.name);
    // Show progress bar, etc.
}

// ============================================
// ADD TO BASKET
// ============================================
function addToBasket(product) {
    try {
        let basket = JSON.parse(localStorage.getItem('quoteBasket') || '[]');
        
        // Check if product already exists
        const existingIndex = basket.findIndex(item => 
            item.code === product.code && item.color === product.color
        );

        if (existingIndex > -1) {
            // Update quantities
            const existing = basket[existingIndex];
            if (product.quantities) {
                Object.keys(product.quantities).forEach(size => {
                    existing.quantities[size] = (existing.quantities[size] || 0) + product.quantities[size];
                });
            }
        } else {
            basket.push(product);
        }

        localStorage.setItem('quoteBasket', JSON.stringify(basket));
        updateCartCount();

        // Show confirmation
        showToast('Added to basket!');
    } catch (e) {
        console.error('Error adding to basket:', e);
    }
}

// ============================================
// TOAST NOTIFICATION
// ============================================
function showToast(message, duration = 2000) {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>${message}</span>
    `;
    
    // Toast styles
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '90px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 20px',
        background: '#1f2937',
        color: '#fff',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '9999',
        animation: 'toastIn 0.3s ease'
    });

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Add toast animations
const style = document.createElement('style');
style.textContent = `
    @keyframes toastIn {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes toastOut {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
`;
document.head.appendChild(style);

// ============================================
// PAGE-SPECIFIC INITIALIZATION
// ============================================
function initPage() {
    const path = window.location.pathname;
    
    if (path.includes('shop')) {
        initFilters();
    }
    
    if (path.includes('product')) {
        initProductGallery();
        initProductOptions();
    }
    
    if (path.includes('customize')) {
        initCustomization();
    }
}

// Run page-specific init
document.addEventListener('DOMContentLoaded', initPage);
