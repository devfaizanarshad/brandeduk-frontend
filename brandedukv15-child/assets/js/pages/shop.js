// ===== PRODUCTS DATABASE =====
const PRODUCTS_DB = [
    {
        code: "GD067",
        name: "Heavy-Blend Hoodie",
        price: "13.15",
        image: "👕",
        colors: ["black", "white", "grey", "navy", "red", "blue"],
        sizes: ["s", "m", "l", "xl", "xxl"],
        customization: ["embroidery", "print"],
        brand: "Gildan"
    },
    {
        code: "GD067-ZIP",
        name: "Heavy-Blend Full Zip Hoodie",
        price: "14.50",
        image: "👕",
        colors: ["black", "grey", "navy", "blue"],
        sizes: ["s", "m", "l", "xl"],
        customization: ["embroidery", "print"],
        brand: "Gildan"
    },
    {
        code: "GD067-PREMIUM",
        name: "Premium Fleece Hoodie",
        price: "16.99",
        image: "👕",
        colors: ["black", "white", "grey", "navy", "burgundy"],
        sizes: ["xs", "s", "m", "l", "xl", "xxl"],
        customization: ["embroidery", "print"],
        brand: "Gildan"
    },
    {
        code: "GD067-KIDS",
        name: "Kids Hoodie",
        price: "9.99",
        image: "👕",
        colors: ["black", "red", "blue", "green"],
        sizes: ["4-6", "6-8", "8-10", "10-12"],
        customization: ["print"],
        brand: "Gildan"
    }
];

// ===== STATE =====
let filteredProducts = [...PRODUCTS_DB];
let quoteBasket = JSON.parse(localStorage.getItem('quoteBasket')) || [];
const colorMap = {
    black: "#1a1a1a",
    white: "#ffffff",
    grey: "#808080",
    navy: "#000080",
    red: "#ff0000",
    blue: "#0000ff",
    green: "#008000",
    burgundy: "#800020"
};

// ===== VAT HELPERS =====
const VAT_STORAGE_KEY = 'brandeduk-vat-mode';
const VAT_FALLBACK_RATE = 0.20;

function getVatApi() {
    return window.brandedukv15 && window.brandedukv15.vat;
}

function fallbackVatOn() {
    try {
        return window.localStorage && window.localStorage.getItem(VAT_STORAGE_KEY) === 'on';
    } catch (error) {
        return false;
    }
}

function isVatOn() {
    var vat = getVatApi();
    return vat ? vat.isOn() : fallbackVatOn();
}

function vatRate() {
    var vat = getVatApi();
    return vat && typeof vat.rate === 'number' ? vat.rate : VAT_FALLBACK_RATE;
}

function formatCurrency(baseAmount, options) {
    var vat = getVatApi();
    if (vat && typeof vat.format === 'function') {
        return vat.format(baseAmount, options);
    }

    options = options || {};
    var currency = options.currency || '£';
    var decimals = Number.isFinite(options.decimals) ? options.decimals : 2;
    var includeVat = options.includeVat !== false;
    var value = Number(baseAmount) || 0;

    if (includeVat && isVatOn()) {
        value = value * (1 + vatRate());
    }

    return currency + value.toFixed(decimals);
}

function vatSuffix() {
    var vat = getVatApi();
    if (vat && typeof vat.suffix === 'function') {
        return vat.suffix();
    }
    return isVatOn() ? 'inc VAT' : 'ex VAT';
}

function updateListingPrices() {
    document.querySelectorAll('.product-card .product-price').forEach(function (priceEl) {
        var basePrice = Number(priceEl.dataset.price);
        var valueEl = priceEl.querySelector('.product-price-value');
        if (valueEl && Number.isFinite(basePrice)) {
            valueEl.textContent = formatCurrency(basePrice);
        }
        var suffixEl = priceEl.querySelector('.product-price-suffix');
        if (suffixEl) {
            suffixEl.textContent = vatSuffix();
        }
    });

    updatePriceRangeLabel();
}

document.addEventListener('brandeduk:vat-change', updateListingPrices);

function updatePriceRangeLabel() {
    const slider = document.querySelector('.price-range');
    const label = document.querySelector('.price-display');
    if (!slider || !label) {
        return;
    }
    const upper = Number(slider.value) || 0;
    label.textContent = `${formatCurrency(0)} - ${formatCurrency(upper)}`;
}

// ===== RENDER PRODUCTS =====
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';

    if (filteredProducts.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">No products found</p>';
        document.getElementById('resultCount').textContent = '0 products found';
        return;
    }

    document.getElementById('resultCount').textContent = `${filteredProducts.length} products found`;

    filteredProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';

        const badges = product.customization.map(c =>
            `<span class="badge ${c}">${c.toUpperCase()}</span>`
        ).join('');

        const colors = product.colors.map(c =>
            `<button type="button" class="color-dot" data-color="${c}" style="background-color: ${colorMap[c] || '#999'}" title="${c}"></button>`
        ).join('');

        card.innerHTML = `
            <div class="product-media">
                <div class="product-badges">${badges}</div>
                <div class="product-figure" style="background:${colorMap[product.colors[0]] || '#f4f4f4'}">
                    <span class="product-emoji">${product.image}</span>
                </div>
            </div>
            <div class="product-info">
                <div class="product-code">${product.code}</div>
                <div class="product-name">${product.name}</div>
                <div class="product-price" data-price="${Number(product.price)}">
                    <span class="product-price-value">${formatCurrency(product.price)}</span>
                    <span class="product-price-suffix">${vatSuffix()}</span>
                </div>
                <div class="product-colors">${colors}</div>
                <div class="product-actions">
                    <button class="btn-secondary" onclick="goToProduct('${product.code}')">View Product</button>
                    <button class="btn-primary" onclick="goToProduct('${product.code}')">Add Logo</button>
                </div>
            </div>
        `;

        // Change swatch preview background without losing navigation wiring
        card.querySelectorAll('.color-dot').forEach(dot => {
            dot.addEventListener('click', (event) => {
                event.stopPropagation();
                const bg = colorMap[dot.dataset.color] || '#f4f4f4';
                card.querySelector('.product-figure').style.background = bg;
                card.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
            });
        });

        // Prevent double navigation when clicking CTA buttons
        card.querySelectorAll('.product-actions button').forEach(btn => {
            btn.addEventListener('click', (event) => {
                event.stopPropagation();
            });
        });

        // Route the entire card to product page
        card.addEventListener('click', () => goToProduct(product.code));

        grid.appendChild(card);
    });

    updateListingPrices();
}

// ===== NAVIGATION =====
function goToProduct(code) {
    const product = PRODUCTS_DB.find(p => p.code === code);
    if (product) {
        sessionStorage.setItem('selectedProduct', code);
        sessionStorage.setItem('selectedProductData', JSON.stringify(product));
    }
    window.location.href = 'product-detail.html';
}

// ===== SEARCH & FILTER =====
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const priceMax = parseInt(document.querySelector('.price-range').value);

    const colorChecked = Array.from(document.querySelectorAll('.color-filters input:checked'))
        .map(el => el.value);
    const sizeChecked = Array.from(document.querySelectorAll('.size-filters input:checked'))
        .map(el => el.value);
    const customChecked = Array.from(document.querySelectorAll('.filter-group:nth-child(3) input:checked'))
        .map(el => el.value);

    filteredProducts = PRODUCTS_DB.filter(p => {
        // Search
        if (searchTerm && !p.name.toLowerCase().includes(searchTerm) && !p.code.toLowerCase().includes(searchTerm)) {
            return false;
        }

        // Price
        if (parseFloat(p.price) > priceMax) return false;

        // Color
        if (colorChecked.length > 0 && !colorChecked.some(c => p.colors.includes(c))) {
            return false;
        }

        // Size
        if (sizeChecked.length > 0 && !sizeChecked.some(s => p.sizes.includes(s))) {
            return false;
        }

        // Customization
        if (customChecked.length > 0 && !customChecked.some(c => p.customization.includes(c))) {
            return false;
        }

        return true;
    });

    renderProducts();
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    // Get search term from URL
    const params = new URLSearchParams(window.location.search);
    const search = params.get('q') || '';
    if (search) {
        document.getElementById('searchInput').value = search;
        document.getElementById('resultsTitle').textContent = `Results for "${search}"`;
    }

    renderProducts();
    updateBasketCount();

    // Search input
    document.getElementById('searchInput').addEventListener('input', applyFilters);

    // Filter checkboxes
    document.querySelectorAll('.filter-group input[type="checkbox"]').forEach(el => {
        el.addEventListener('change', applyFilters);
    });

    // Price range
    document.querySelector('.price-range').addEventListener('input', () => {
        updatePriceRangeLabel();
        applyFilters();
    });

    // Reset button
    document.querySelector('.btn-reset').addEventListener('click', () => {
        document.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = false);
        document.querySelector('.price-range').value = 100;
        updatePriceRangeLabel();
        document.getElementById('searchInput').value = '';
        applyFilters();
    });

    // Apply initial filters
    applyFilters();
    updatePriceRangeLabel();
});

// ===== BASKET =====
function updateBasketCount() {
    document.querySelectorAll('.basket-count').forEach(el => {
        el.textContent = quoteBasket.length;
    });
}
