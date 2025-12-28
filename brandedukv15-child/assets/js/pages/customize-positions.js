// Store selected positions with their methods
let selectedPositions = [];
let positionMethods = {}; // Store selected method for each position (embroidery or print)
let positionCustomizationsMap = {}; // Store customization details keyed by position id
let currentModalPosition = null;
let currentModalData = {
    method: 'embroidery',
    type: 'logo',
    logo: null,
    text: '',
    name: ''
};

const CUSTOM_UPLOAD_TEXT_LIMIT = 60;

const customUploadState = {
    file: null,
    progressTimer: null,
    progressValue: 0,
    processing: false,
    text: '',
    textColor: '#1f2937',
    strokeColor: '#1f2937',
    font: 'Arial',
    fontSize: 24,
    selectedClipart: null,
    selectedClipartEmoji: null
};

let customUploadElements = null;

// Pricing configuration shared with product detail page
const PRICING_RULES = {
    GD067: {
        basePrice: 17.58,
        tiers: [
            { min: 250, price: 12.59 },
            { min: 100, price: 13.49 },
            { min: 50, price: 14.94 },
            { min: 25, price: 16.18 },
            { min: 10, price: 16.54 }
        ]
    }
};

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

function formatLinePrice(quantity, unitBase) {
    var qty = Number(quantity) || 0;
    var unit = Number(unitBase) || 0;
    var totalBase = qty * unit;
    return qty + ' x ' + formatCurrency(unit) + ' = <span class="item-total">' + formatCurrency(totalBase) + '</span> ' + vatSuffix();
}

function formatSidebarGarmentCost(unitBase, quantity) {
    var qty = Number(quantity) || 0;
    var unit = Number(unitBase) || 0;
    var total = qty * unit;
    return formatCurrency(total) + ' ' + vatSuffix();
}

function refreshBasketLinePrices() {
    document.querySelectorAll('.basket-line-price').forEach(function (line) {
        var qty = Number(line.dataset.qty) || 0;
        var unit = Number(line.dataset.unit) || 0;
        line.innerHTML = formatLinePrice(qty, unit);
    });
}

function refreshGarmentCostDisplay() {
    var garmentCostEl = document.getElementById('sidebarGarmentCost');
    if (!garmentCostEl) {
        return;
    }
    var unit = Number(garmentCostEl.dataset.unit);
    var qty = Number(garmentCostEl.dataset.qty);
    garmentCostEl.textContent = formatSidebarGarmentCost(unit, qty);
    
    // Update unit price and qty display
    var unitPriceEl = document.getElementById('garmentUnitPrice');
    var qtyEl = document.getElementById('garmentQty');
    if (unitPriceEl) {
        unitPriceEl.textContent = 'Unit Price: ' + formatCurrency(unit);
    }
    if (qtyEl) {
        qtyEl.textContent = 'Qty: ' + qty;
    }
}

function refreshCustomizationCostRows() {
    document.querySelectorAll('[data-vat-row]').forEach(function (row) {
        var price = Number(row.dataset.price) || 0;
        var qty = Number(row.dataset.qty) || 0;
        var total = price * qty;
        var valueEl = row.querySelector('.value');
        if (valueEl) {
            valueEl.textContent = formatCurrency(total) + ' ' + vatSuffix();
        }
    });
}

function refreshSidebarTotal() {
    var totalEl = document.getElementById('sidebarTotalCost');
    if (!totalEl) {
        return;
    }
    var totalBase = Number(totalEl.dataset.total);
    var value = Number.isFinite(totalBase) ? totalBase : 0;
    totalEl.textContent = formatCurrency(value) + ' ' + vatSuffix();
}

function refreshBasketSummaryTotal() {
    // Price display removed - no longer showing total under "Your Order Summary"
    return;
}

function refreshVatDependentUi() {
    refreshBasketLinePrices();
    refreshGarmentCostDisplay();
    refreshCustomizationCostRows();
    refreshSidebarTotal();
    refreshBasketSummaryTotal();
}

document.addEventListener('brandeduk:vat-change', refreshVatDependentUi);

function buildSizeSummaryFromQuantities(qtyMap) {
    const entries = Object.entries(qtyMap || {}).filter(([, qty]) => qty > 0);
    if (!entries.length) return '';
    return entries.map(([size, qty]) => `${qty}x${size}`).join(', ');
}

function getDiscountedUnitPrice(code, totalQty, fallbackBase) {
    const rule = PRICING_RULES[code];
    const base = rule ? rule.basePrice : (Number(fallbackBase) || 0);
    if (!rule) return base;
    for (const tier of rule.tiers) {
        if (totalQty >= tier.min) {
            return tier.price;
        }
    }
    return base;
}

function normalizeItemQuantities(item) {
    let changed = false;
    let quantities = null;

    if (item && typeof item === 'object') {
        if (item.quantities && typeof item.quantities === 'object') {
            quantities = {};
            Object.entries(item.quantities).forEach(([size, qty]) => {
                const numericQty = Number(qty) || 0;
                if (numericQty > 0) {
                    quantities[size] = numericQty;
                }
                if (numericQty !== qty) {
                    changed = true;
                }
            });
            if (Object.keys(quantities).length !== Object.keys(item.quantities).length) {
                changed = true;
            }
        } else if (item.sizes && typeof item.sizes === 'object') {
            quantities = {};
            Object.entries(item.sizes).forEach(([size, qty]) => {
                const numericQty = Number(qty) || 0;
                if (numericQty > 0) {
                    quantities[size] = numericQty;
                }
            });
            changed = true;
        }
    }

    if (quantities) {
        item.quantities = quantities;
        item.sizes = { ...quantities };
        const summary = buildSizeSummaryFromQuantities(quantities);
        if (item.size !== summary) {
            item.size = summary;
            changed = true;
        }
    }

    const fallbackQty = Number(item && item.quantity ? item.quantity : 0) || 0;
    const totalQty = quantities
        ? Object.values(quantities).reduce((sum, qty) => sum + qty, 0)
        : Math.max(0, fallbackQty);

    if (item && item.quantity !== totalQty) {
        item.quantity = totalQty;
        changed = true;
    }

    return { totalQty, changed };
}

function applyPricingAndNormalize(basket) {
    const totalsByCode = {};
    let changed = false;

    basket.forEach(item => {
        const { totalQty, changed: itemChanged } = normalizeItemQuantities(item);
        if (itemChanged) changed = true;
        const code = item && item.code ? item.code : 'UNKNOWN';
        totalsByCode[code] = (totalsByCode[code] || 0) + totalQty;
    });

    basket.forEach(item => {
        const code = item && item.code ? item.code : 'UNKNOWN';
        const totalQty = totalsByCode[code] || 0;
        const fallbackBase = item && item.basePrice !== undefined ? Number(item.basePrice) : Number(item && item.price ? item.price : 0);
        const unitPrice = getDiscountedUnitPrice(code, totalQty, fallbackBase);
        if (item && item.basePrice === undefined && PRICING_RULES[code]) {
            item.basePrice = PRICING_RULES[code].basePrice;
            changed = true;
        }
        const formatted = unitPrice.toFixed(2);
        if (item && item.price !== formatted) {
            item.price = formatted;
            changed = true;
        }
    });

    return { changed, totalsByCode };
}

// Update the Basket Total Box showing all basket items
function updateBasketTotalBox() {
    const basketTotalItems = document.getElementById('basketTotalItems');
    const basketGrandTotal = document.getElementById('basketGrandTotal');
    
    if (!basketTotalItems || !basketGrandTotal) return;
    
    const basket = JSON.parse(localStorage.getItem('quoteBasket')) || [];
    
    if (basket.length === 0) {
        basketTotalItems.innerHTML = `
            <div class="basket-total-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
                No items in basket yet
            </div>
        `;
        basketGrandTotal.textContent = '£0.00 ' + vatSuffix();
        return;
    }
    
    let grandTotal = 0;
    let itemsHTML = '';
    
    basket.forEach(item => {
        // Calculate total quantity for this item
        let totalQty = 0;
        if (item.quantities && Object.keys(item.quantities).length > 0) {
            Object.values(item.quantities).forEach(q => totalQty += Number(q) || 0);
        } else {
            totalQty = Number(item.quantity) || 0;
        }
        
        // Calculate item total (garment + customizations)
        const unitPrice = Number(item.price) || 0;
        let itemTotal = unitPrice * totalQty;
        
        // Add customization costs if available
        let customizationInfo = '';
        if (item.customizations && item.customizations.length > 0) {
            item.customizations.forEach(c => {
                const custPrice = Number(c.price) || 0;
                itemTotal += custPrice * totalQty;
                customizationInfo += ` + ${c.position}`;
            });
        }
        
        grandTotal += itemTotal;
        
        // Format sizes display
        let sizesText = '';
        if (item.quantities && Object.keys(item.quantities).length > 0) {
            const sizeList = Object.entries(item.quantities)
                .filter(([s, q]) => Number(q) > 0)
                .map(([s, q]) => `${s}:${q}`)
                .join(', ');
            sizesText = sizeList ? ` (${sizeList})` : '';
        }
        
        itemsHTML += `
            <div class="basket-total-item">
                <div class="basket-total-item__info">
                    <span class="basket-total-item__name">${item.name || 'Product'}</span>
                    <span class="basket-total-item__details">${item.color || ''} - ${totalQty} pcs${sizesText}${customizationInfo}</span>
                </div>
                <span class="basket-total-item__price">${formatCurrency(itemTotal)}</span>
            </div>
        `;
    });
    
    basketTotalItems.innerHTML = itemsHTML;
    basketGrandTotal.textContent = formatCurrency(grandTotal) + ' ' + vatSuffix();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Initializing customize-positions page...');
        loadBasketData();
        updateBasketTotalBox(); // Load basket total box (safe if elements don't exist)
        loadSavedSelections(); // Load previous selections if coming back
        loadExistingCustomizations();
        initPositionSelection();
        initMethodSelection();
        restorePreviousSelections(); // Restore UI state
        initCustomUploadModal();
        initAddLogoModal();
        initPreviewDeleteButtons();
        initSubmitQuoteButton();
        console.log('Page initialization complete');
    } catch (e) {
        console.error('Error initializing customize-positions:', e);
    }
});

// Initialize Submit Quote button with animation
function initSubmitQuoteButton() {
    const submitBtn = document.getElementById('submitQuoteBtn');
    const popup = document.getElementById('quoteRequestPopup');
    const closeBtn = document.getElementById('closeQuotePopup');
    const form = document.getElementById('quoteRequestForm');
    
    if (!submitBtn) return;
    
    // Open popup when clicking ADD TO QUOTE
    submitBtn.addEventListener('click', function() {
        if (popup) {
            popup.style.display = 'flex';
        }
    });
    
    // Close popup
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            popup.style.display = 'none';
        });
    }
    
    // Close on overlay click (but not on form elements)
    if (popup) {
        popup.addEventListener('click', function(e) {
            // Only close if clicking directly on the overlay background
            if (e.target === popup) {
                popup.style.display = 'none';
            }
        });
        
        // Prevent any key events from bubbling up and causing issues
        popup.addEventListener('keydown', function(e) {
            // Don't close popup on Escape if focus is in an input field
            if (e.key === 'Escape') {
                e.stopPropagation();
                popup.style.display = 'none';
            }
            // Prevent backspace from navigating back
            if (e.key === 'Backspace' && e.target.tagName === 'INPUT') {
                e.stopPropagation();
            }
        });
    }
    
    // Phone input - only allow numbers, spaces, +, -, ()
    const phoneInput = document.getElementById('quotePhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            const originalValue = this.value;
            // Remove any invalid characters (letters, commas, dots, special chars except phone chars)
            const cleanValue = this.value.replace(/[^0-9\s\+\-\(\)]/g, '');
            
            // If we removed something, show it was invalid briefly
            if (cleanValue !== originalValue) {
                this.classList.add('invalid');
                this.value = cleanValue;
                // Remove invalid state after showing feedback
                setTimeout(() => {
                    this.classList.remove('invalid');
                }, 500);
            } else {
                // Numbers are always valid while typing
                this.classList.remove('invalid');
            }
        });
        
        // Prevent pasting invalid characters
        phoneInput.addEventListener('paste', function(e) {
            setTimeout(() => {
                this.value = this.value.replace(/[^0-9\s\+\-\(\)]/g, '');
                this.classList.remove('invalid');
            }, 0);
        });
    }
    
    // Email validation on blur
    const emailInput = document.getElementById('quoteEmail');
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (this.value.length > 0 && !emailRegex.test(this.value)) {
                this.classList.add('invalid');
            } else {
                this.classList.remove('invalid');
            }
        });
        
        emailInput.addEventListener('input', function() {
            // Remove invalid state when user starts typing again
            if (this.classList.contains('invalid')) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (emailRegex.test(this.value)) {
                    this.classList.remove('invalid');
                }
            }
        });
    }
    
    // Handle form submit
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitFormBtn = document.getElementById('quoteSubmitBtn');
            const nameInput = document.getElementById('quoteName');
            const phoneInput = document.getElementById('quotePhone');
            const emailInput = document.getElementById('quoteEmail');
            
            const name = nameInput.value;
            const phone = phoneInput.value;
            const email = emailInput.value;
            
            // Validate phone (numbers only, min 6 chars)
            const phoneRegex = /^[\d\s\+\-\(\)]{6,}$/;
            if (!phoneRegex.test(phone)) {
                phoneInput.classList.add('invalid');
                phoneInput.focus();
                return;
            }
            
            // Validate email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                emailInput.classList.add('invalid');
                emailInput.focus();
                return;
            }
            
            // Show loading state
            submitFormBtn.classList.add('loading');
            submitFormBtn.textContent = 'Sending...';
            
            // Get product data from sessionStorage
            const productData = JSON.parse(sessionStorage.getItem('customizingProduct')) || {};
            const basket = JSON.parse(localStorage.getItem('quoteBasket')) || [];
            
            // Build quote data to send
            const quoteData = {
                customer: {
                    fullName: name,
                    phone: phone,
                    email: email
                },
                product: {
                    name: productData.name || 'Product',
                    code: productData.code || 'N/A',
                    selectedColorName: productData.selectedColorName || 'N/A',
                    quantity: productData.totalQuantity || 0,
                    price: productData.price || 0,
                    sizes: productData.sizes || {}
                },
                customizations: Object.entries(positionCustomizationsMap).map(([position, data]) => ({
                    position: position,
                    method: data.method || 'N/A',
                    type: data.type || 'N/A',
                    uploadedLogo: data.uploadedLogo || null,
                    text: data.text || ''
                })),
                basket: basket,
                timestamp: new Date().toISOString()
            };
            
            // Save to localStorage as backup
            localStorage.setItem('quoteRequest', JSON.stringify(quoteData));
            
            // Check if we're on localhost (dev mode) or production
            const isLocalhost = window.location.hostname === '127.0.0.1' || 
                               window.location.hostname === 'localhost' ||
                               window.location.protocol === 'file:';
            
            try {
                let result = { success: false };
                
                if (isLocalhost) {
                    // Simulate success in dev mode (PHP doesn't work on Live Server)
                    console.log('DEV MODE: Simulating quote send. Data saved to localStorage:', quoteData);
                    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
                    result = { success: true, message: 'Quote saved (dev mode)' };
                } else {
                    // Send to PHP server on production
                    const response = await fetch('brandedukv15-child/includes/send-quote.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(quoteData)
                    });
                    result = await response.json();
                }
                
                if (result.success) {
                    submitFormBtn.classList.remove('loading');
                    submitFormBtn.classList.add('success');
                    submitFormBtn.textContent = '✓ Quote Sent!';
                    
                    // Close popup and show confirmation after 1.5 seconds
                    setTimeout(() => {
                        popup.style.display = 'none';
                        submitFormBtn.classList.remove('success');
                        submitFormBtn.textContent = 'Submit Quote Request';
                        form.reset();
                        
                        // Show success toast
                        if (typeof showToast === 'function') {
                            showToast('✓ Quote request sent! We\'ll contact you shortly.');
                        } else {
                            alert('Quote request sent! We\'ll contact you shortly.');
                        }
                    }, 1500);
                } else {
                    throw new Error(result.message || 'Failed to send quote');
                }
            } catch (error) {
                console.error('Quote send error:', error);
                submitFormBtn.classList.remove('loading');
                submitFormBtn.classList.add('error');
                submitFormBtn.textContent = '✗ Error - Retry';
                
                setTimeout(() => {
                    submitFormBtn.classList.remove('error');
                    submitFormBtn.textContent = 'Submit Quote Request';
                }, 3000);
                
                // Show error message
                if (typeof showToast === 'function') {
                    showToast('Error sending quote. Please try again or email us directly.');
                } else {
                    alert('Error sending quote. Please try again or email info@brandeduk.com directly.');
                }
            }
        });
    }
}

// Save customizations to basket before navigating
function saveCustomizationsToBasket() {
    // This function already exists elsewhere, but we ensure data is persisted
    persistSelections();
    updateSidebarCosts();
}

// Initialize delete buttons in preview content
function initPreviewDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.preview-delete-btn');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const card = btn.closest('.position-card');
            if (!card) return;
            
            const checkbox = card.querySelector('input[type="checkbox"]');
            const position = checkbox?.value;
            
            if (position && positionCustomizationsMap[position]) {
                // Remove customization
                delete positionCustomizationsMap[position];
                
                // Update UI
                updateCustomizationIndicator(card, false);
                
                // Persist changes
                persistSelections();
                updateSidebarCosts();
            }
        });
    });
}

function loadBasketData() {
    let basket = JSON.parse(localStorage.getItem('quoteBasket')) || [];
    const basketListEl = document.getElementById('basketItemsList');

    // If basket is empty, create demo data for testing
    if (basket.length === 0) {
        console.warn('No items in basket - loading demo data for testing');
        basket = [{
            name: 'Slammer oversized brushed sweatshirt',
            code: 'STSU856',
            color: 'White',
            price: 17.58,
            basePrice: 17.58,
            image: 'brandedukv15-child/assets/images/products/hoodie-white.jpg',
            quantities: { 'S': 5, 'M': 5 }
        }];
        localStorage.setItem('quoteBasket', JSON.stringify(basket));
    }

    const { changed, totalsByCode } = applyPricingAndNormalize(basket);
    if (changed) {
        localStorage.setItem('quoteBasket', JSON.stringify(basket));
    }

    let basketHTML = '';
    let totalGarmentCost = 0;
    const grouped = [];

    basket.forEach((item, index) => {
        const qtyMap = item.quantities && Object.keys(item.quantities).length ? item.quantities : null;
        if (qtyMap) {
            Object.entries(qtyMap).forEach(([size, qty]) => {
                const numericQty = Number(qty) || 0;
                if (numericQty > 0) {
                    grouped.push({
                        index,
                        name: item.name,
                        code: item.code,
                        color: item.color,
                        size,
                        qty: numericQty,
                        image: item.image,
                        price: Number(item.price),
                        basePrice: item.basePrice !== undefined ? Number(item.basePrice) : Number(item.price)
                    });
                }
            });
        } else {
            const numericQty = Number(item.quantity) || 0;
            if (numericQty > 0) {
                grouped.push({
                    index,
                    name: item.name,
                    code: item.code,
                    color: item.color,
                    size: item.size || '',
                    qty: numericQty,
                    image: item.image,
                    price: Number(item.price),
                    basePrice: item.basePrice !== undefined ? Number(item.basePrice) : Number(item.price)
                });
            }
        }
    });

    grouped.forEach(g => {
        const safeSizeKey = (g.size || 'all').replace(/[^a-z0-9_-]/gi, '-');
        const tempKey = `${g.index}_${safeSizeKey}`;
        const totalQtyForProduct = totalsByCode[g.code] || g.qty;
        const storedPrice = basket[g.index] && basket[g.index].price ? Number(basket[g.index].price) : NaN;
        const unitPrice = Number.isFinite(storedPrice) ? storedPrice : getDiscountedUnitPrice(g.code, totalQtyForProduct, g.basePrice);
        const itemTotal = unitPrice * g.qty;
        totalGarmentCost += itemTotal;

        basketHTML += `
            <div class="sidebar-basket-item" data-index="${g.index}" data-size="${g.size}">
                <img src="${g.image}" alt="${g.color}">
                <div class="sidebar-basket-details">
                    <strong>${g.name}</strong>
                    <div class="product-code" id="product-code-${tempKey}">${g.code} - ${g.color}</div>
                    <div class="product-sizes" style="font-size:0.98em;font-weight:bold;letter-spacing:0.2px;">${g.qty}x${g.size}</div>
                    <div class="product-price">
                        <div class="qty-toggle">
                            <button type="button" class="qty-toggle-btn minus" data-index="${g.index}" data-size="${g.size}" aria-label="Decrease quantity">-</button>
                            <span class="qty-toggle-value" id="qty-display-${tempKey}">${g.qty}</span>
                            <button type="button" class="qty-toggle-btn plus" data-index="${g.index}" data-size="${g.size}" aria-label="Increase quantity">+</button>
                        </div>
                        <span id="row-total-${tempKey}" class="basket-line-price" data-qty="${g.qty}" data-unit="${unitPrice}">${formatLinePrice(g.qty, unitPrice)}</span>
                    </div>
                </div>
                <button class="remove-item-btn" data-index="${g.index}" data-size="${g.size}" title="Remove item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>
        `;
    });

    basketListEl.innerHTML = basketHTML;

    const basketTotal = totalGarmentCost;

    // Price display removed - total is shown in sidebar-costs section instead

    const proceedBtn = document.getElementById('proceedToCustomizationBtn');
    if (proceedBtn) {
        if (basket.length > 0) {
            proceedBtn.disabled = false;
            proceedBtn.classList.add('active');
            proceedBtn.onclick = () => {
                window.location.href = 'customize-detail.html';
            };
        } else {
            proceedBtn.disabled = true;
            proceedBtn.classList.remove('active');
            proceedBtn.onclick = null;
        }
    }

    document.querySelectorAll('.qty-toggle-btn.plus').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.index, 10);
            const size = btn.dataset.size;
            updateItemQuantity(idx, 1, size);
        };
    });

    document.querySelectorAll('.qty-toggle-btn.minus').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.index, 10);
            const size = btn.dataset.size;
            updateItemQuantity(idx, -1, size);
        };
    });

    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.index, 10);
            const size = btn.dataset.size;
            // Remove directly without confirmation
            const basket = JSON.parse(localStorage.getItem('quoteBasket')) || [];
            if (size && basket[idx] && basket[idx].quantities) {
                delete basket[idx].quantities[size];
                if (Object.keys(basket[idx].quantities).length === 0) {
                    basket.splice(idx, 1);
                }
            } else {
                basket.splice(idx, 1);
            }
            applyPricingAndNormalize(basket);
            localStorage.setItem('quoteBasket', JSON.stringify(basket));
            if (basket.length === 0) {
                sessionStorage.removeItem('selectedPositions');
                sessionStorage.removeItem('positionMethods');
                sessionStorage.removeItem('positionCustomizations');
                sessionStorage.removeItem('currentPositionIndex');
                sessionStorage.removeItem('customizingProduct');
                window.location.href = 'home.html';
            } else {
                loadBasketData();
            }
        };
    });

    const totalQuantity = Object.values(totalsByCode).reduce((sum, qty) => sum + qty, 0);
    const averageUnitPrice = totalQuantity > 0 ? (totalGarmentCost / totalQuantity) : 0;

    const garmentCostEl = document.getElementById('sidebarGarmentCost');
    if (garmentCostEl) {
        garmentCostEl.dataset.unit = averageUnitPrice;
        garmentCostEl.dataset.qty = totalQuantity;
        garmentCostEl.textContent = formatSidebarGarmentCost(averageUnitPrice, totalQuantity);
        
        // Update unit price and qty display
        const unitPriceEl = document.getElementById('garmentUnitPrice');
        const qtyEl = document.getElementById('garmentQty');
        if (unitPriceEl) {
            unitPriceEl.textContent = formatCurrency(averageUnitPrice);
        }
        if (qtyEl) {
            qtyEl.textContent = 'Qty: ' + totalQuantity;
        }
    }

    updateSidebarCosts();
    refreshBasketLinePrices();
    refreshBasketSummaryTotal();
}

function loadSavedSelections() {
    // Load previously selected positions and methods from sessionStorage
    const savedPositions = sessionStorage.getItem('selectedPositions');
    const savedMethods = sessionStorage.getItem('positionMethods');
    
    if (savedPositions) {
        selectedPositions = JSON.parse(savedPositions);
        console.log('Loaded saved positions:', selectedPositions);
    }
    
    if (savedMethods) {
        positionMethods = JSON.parse(savedMethods);
        console.log('Loaded saved methods:', positionMethods);
    }
}

function loadExistingCustomizations() {
    positionCustomizationsMap = {};
    const stored = sessionStorage.getItem('positionCustomizations');
    if (!stored) return;

    try {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) {
            arr.forEach((custom, index) => {
                if (!custom) return;
                const positionEntry = selectedPositions[index];
                if (positionEntry && positionEntry.position) {
                    positionCustomizationsMap[positionEntry.position] = custom;
                }
            });
        }
    } catch (error) {
        console.warn('Unable to parse saved customizations', error);
    }
}

function resetPriceBadge(badge) {
    if (!badge) return;
    badge.classList.remove('active', 'add-logo-btn');
    badge.dataset.role = 'method';
    badge.dataset.activeMethod = '';
    const label = (badge.dataset.defaultLabel || '').toUpperCase();
    const price = badge.dataset.defaultPrice || '';
    badge.innerHTML = `
        <span class="price-label">${label}</span>
        <span class="price-value">${price}</span>
    `;
}

function applyMethodUI(card, method) {
    if (!card) return;
    const position = card.querySelector('input[type="checkbox"]').value;
    const customization = positionCustomizationsMap[position];
    const embBadge = card.querySelector('.price-emb');
    const printBadge = card.querySelector('.price-print');

    resetPriceBadge(embBadge);
    resetPriceBadge(printBadge);

    if (!method) {
        return;
    }

    const methodBadge = method === 'embroidery' ? embBadge : printBadge;
    const addBadge = method === 'embroidery' ? printBadge : embBadge;

    if (methodBadge) {
        methodBadge.classList.add('active');
        methodBadge.dataset.role = 'method';
    }

    if (addBadge) {
        addBadge.classList.remove('active');
        addBadge.classList.add('add-logo-btn');
        addBadge.dataset.role = 'add-logo';
        addBadge.dataset.activeMethod = method;
        addBadge.innerHTML = `
            <span class="add-logo-text">${customization ? 'Edit Customization' : 'Add Logo'}</span>
        `;
    }
}

function updateCustomizationIndicator(card, hasCustomization) {
    if (!card) return;
    const pill = card.querySelector('.customization-pill');
    const previewContent = card.querySelector('.position-preview-content');
    const previewImage = previewContent ? previewContent.querySelector('.preview-image') : null;
    const previewText = previewContent ? previewContent.querySelector('.preview-text') : null;
    if (!pill) return;

    const resetPreview = () => {
        if (previewContent) {
            previewContent.hidden = true;
        }
        if (previewImage) {
            previewImage.hidden = true;
            previewImage.removeAttribute('src');
        }
        if (previewText) {
            previewText.hidden = true;
            previewText.textContent = '';
        }
    };

    resetPreview();

    if (hasCustomization) {
        const position = card.querySelector('input[type="checkbox"]').value;
        const customization = positionCustomizationsMap[position];
        const typeText = customization?.type === 'text' ? 'Text ready' : 'Logo ready';
        pill.textContent = typeText;
        pill.hidden = false;
        card.classList.add('customized');

        if (customization && previewContent) {
            if (customization.type === 'logo') {
                const logoData = customization.uploadedLogo || '';
                const logoName = customization.logoName || customization.name || 'Logo ready';
                const logoType = customization.logoType || '';
                const isImage = (logoType && logoType.startsWith('image')) || logoData.startsWith('data:image');

                if (isImage && previewImage && logoData) {
                    previewImage.src = logoData;
                    previewImage.hidden = false;
                    if (previewText) {
                        previewText.hidden = true;
                        previewText.textContent = '';
                    }
                } else if (previewText) {
                    previewText.textContent = logoName;
                    previewText.hidden = false;
                }
            } else if (customization.type === 'text' && previewText) {
                // Apply text with font styling
                previewText.textContent = customization.text || typeText;
                previewText.style.fontFamily = "'" + (customization.font || 'Arial') + "', sans-serif";
                previewText.style.color = customization.textColor || '#1f2937';
                if (customization.strokeColor && customization.strokeColor !== 'transparent') {
                    previewText.style.textShadow = `-1px -1px 0 ${customization.strokeColor}, 1px -1px 0 ${customization.strokeColor}, -1px 1px 0 ${customization.strokeColor}, 1px 1px 0 ${customization.strokeColor}`;
                } else {
                    previewText.style.textShadow = 'none';
                }
                previewText.hidden = false;
                if (previewImage) {
                    previewImage.hidden = true;
                    previewImage.removeAttribute('src');
                }
            }

            previewContent.hidden = false;
        }
    } else {
        pill.hidden = true;
        card.classList.remove('customized');
    }
    
    // Update step progress bar
    updateStepProgress();
}

// Update step progress bar - make step 3 green when any customization exists
function updateStepProgress() {
    const hasAnyCustomization = Object.keys(positionCustomizationsMap).length > 0;
    const step3 = document.querySelector('.step-item[data-step="3"]');
    const connector23 = document.getElementById('connector-2-3');
    const submitBtn = document.getElementById('submitQuoteBtn');
    
    if (step3) {
        if (hasAnyCustomization) {
            // Animate the connector from 2 to 3 slowly
            if (connector23 && !connector23.classList.contains('completed')) {
                connector23.classList.add('completed', 'animate-slow');
            }
            
            // After connector animation completes, update step 3 and show submit button
            setTimeout(() => {
                step3.classList.remove('active');
                step3.classList.add('completed');
                const stepNum = step3.querySelector('.step-num');
                if (stepNum) stepNum.textContent = '3✓';
                
                // Show the submit button with animation
                if (submitBtn) {
                    submitBtn.style.display = 'block';
                }
            }, 1800); // Wait for 1.8s animation to complete
        } else {
            // Reset connector
            if (connector23) {
                connector23.classList.remove('completed', 'animate-slow');
            }
            step3.classList.remove('completed');
            step3.classList.add('active');
            const stepNum = step3.querySelector('.step-num');
            if (stepNum) stepNum.textContent = '3';
            
            // Hide submit button
            if (submitBtn) {
                submitBtn.style.display = 'none';
                submitBtn.classList.remove('onclic', 'validate');
            }
        }
    }
}

function refreshCardState(position) {
    const checkbox = document.querySelector(`.position-card input[value="${position}"]`);
    if (!checkbox) return;
    const card = checkbox.closest('.position-card');
    applyMethodUI(card, positionMethods[position]);
    updateCustomizationIndicator(card, Boolean(positionCustomizationsMap[position]));
}

function persistSelections() {
    if (selectedPositions.length) {
        sessionStorage.setItem('selectedPositions', JSON.stringify(selectedPositions));
    } else {
        sessionStorage.removeItem('selectedPositions');
    }

    if (Object.keys(positionMethods).length) {
        sessionStorage.setItem('positionMethods', JSON.stringify(positionMethods));
    } else {
        sessionStorage.removeItem('positionMethods');
    }

    syncPositionCustomizationsArray();
}

function syncPositionCustomizationsArray() {
    if (selectedPositions.length) {
        const arrayData = selectedPositions.map(pos => positionCustomizationsMap[pos.position] || null);
        sessionStorage.setItem('positionCustomizations', JSON.stringify(arrayData));
    } else {
        sessionStorage.removeItem('positionCustomizations');
    }
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function restorePreviousSelections() {
    // Restore UI state based on saved data
    const cards = document.querySelectorAll('.position-card');
    
    cards.forEach(card => {
        const checkbox = card.querySelector('input[type="checkbox"]');
        const position = checkbox.value;
        
        // Check if this position was previously selected
        const isSelected = selectedPositions.some(p => p.position === position);
        
        if (isSelected) {
            // Check the checkbox
            checkbox.checked = true;
            card.classList.add('selected');
            
            refreshCardState(position);
        }
    });
    
    // Update sidebar costs with restored selections
    updateSidebarCosts();
}

function updateItemQuantity(index, delta, size) {
    const basket = JSON.parse(localStorage.getItem('quoteBasket')) || [];
    const item = basket[index];
    if (!item) return;

    if (item.quantities && size) {
        const updatedQty = (Number(item.quantities[size]) || 0) + delta;
        if (updatedQty > 0) {
            item.quantities[size] = updatedQty;
        } else {
            delete item.quantities[size];
            if (Object.keys(item.quantities).length === 0) {
                basket.splice(index, 1);
            }
        }
    } else {
        const updatedQty = (Number(item.quantity) || 0) + delta;
        if (updatedQty > 0) {
            item.quantity = updatedQty;
        } else {
            basket.splice(index, 1);
        }
    }

    const { changed } = applyPricingAndNormalize(basket);
    if (changed) {
        localStorage.setItem('quoteBasket', JSON.stringify(basket));
    } else {
        localStorage.setItem('quoteBasket', JSON.stringify(basket));
    }

    if (basket.length === 0) {
        sessionStorage.removeItem('selectedPositions');
        sessionStorage.removeItem('positionMethods');
        sessionStorage.removeItem('positionCustomizations');
        sessionStorage.removeItem('currentPositionIndex');
        sessionStorage.removeItem('customizingProduct');
        window.location.href = 'home.html';
    } else {
        loadBasketData();
    }
}

let itemToRemove = null;
let itemToRemoveSize = null;

function removeItem(index, size) {
    itemToRemove = index;
    itemToRemoveSize = size || null;
    document.getElementById('confirmRemoveModal').style.display = 'flex';
}

function closeRemoveModal() {
    document.getElementById('confirmRemoveModal').style.display = 'none';
    itemToRemove = null;
}

function confirmRemove() {
    if (itemToRemove !== null) {
        const basket = JSON.parse(localStorage.getItem('quoteBasket')) || [];
        if (itemToRemoveSize && basket[itemToRemove] && basket[itemToRemove].quantities) {
            delete basket[itemToRemove].quantities[itemToRemoveSize];
            if (Object.keys(basket[itemToRemove].quantities).length === 0) {
                basket.splice(itemToRemove, 1);
            }
        } else {
            basket.splice(itemToRemove, 1);
        }
        applyPricingAndNormalize(basket);
        localStorage.setItem('quoteBasket', JSON.stringify(basket));
        closeRemoveModal();
        if (basket.length === 0) {
            sessionStorage.removeItem('selectedPositions');
            sessionStorage.removeItem('positionMethods');
            sessionStorage.removeItem('positionCustomizations');
            sessionStorage.removeItem('currentPositionIndex');
            sessionStorage.removeItem('customizingProduct');
            window.location.href = 'home.html';
        } else {
            loadBasketData();
        }
    }
    itemToRemove = null;
    itemToRemoveSize = null;
}


function initPositionSelection() {
    const cards = document.querySelectorAll('.position-card');
    
    cards.forEach(card => {
        const checkbox = card.querySelector('input[type="checkbox"]');
        const position = checkbox.value;
        
        // NO default method - buttons start disabled/grey
        
        // Click on card checks if method is selected
        card.addEventListener('click', (e) => {
            // Don't toggle if clicking on price badges
            if (e.target.closest('.price-badge')) return;
            
            // Don't toggle if clicking on preview area (logo/text preview)
            if (e.target.closest('.position-preview')) return;
            
            // Don't toggle if clicking on the customization pill (informational only)
            if (e.target.closest('.customization-pill')) return;
            
            // Check if method is selected for this position
            if (!positionMethods[position]) {
                showMethodSelectionPopup();
                return;
            }
            
            // Method selected, toggle checkbox
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
        
        // Checkbox change updates card state
        checkbox.addEventListener('change', () => {
            const positionName = card.querySelector('.position-checkbox span').textContent.trim();
            const priceEmb = parseFloat(card.dataset.embroidery || '0');
            const pricePrint = parseFloat(card.dataset.print || '0');
            
            if (checkbox.checked) {
                card.classList.add('selected');
                
                // Check if already in array
                const existingIndex = selectedPositions.findIndex(p => p.position === position);
                if (existingIndex === -1) {
                    selectedPositions.push({
                        position: position,
                        name: positionName,
                        priceEmb: priceEmb,
                        pricePrint: pricePrint,
                        method: positionMethods[position] || 'embroidery'
                    });
                }
                refreshCardState(position);
            } else {
                card.classList.remove('selected');
                selectedPositions = selectedPositions.filter(p => p.position !== position);
                delete positionMethods[position];
                delete positionCustomizationsMap[position];
                card.querySelectorAll('.price-badge').forEach(resetPriceBadge);
                updateCustomizationIndicator(card, false);
            }
            
            // Update costs in sidebar
            persistSelections();
            updateSidebarCosts();
        });
    });
}

function initMethodSelection() {
    const cards = document.querySelectorAll('.position-card');
    
    cards.forEach(card => {
        const position = card.querySelector('input[type="checkbox"]').value;
        const checkbox = card.querySelector('input[type="checkbox"]');
        
        card.querySelectorAll('.price-badge').forEach(badge => {
            badge.addEventListener('click', (e) => {
                e.stopPropagation();

                const role = badge.dataset.role || 'method';
                const wasChecked = checkbox.checked;

                if (role === 'add-logo') {
                    const activeMethod = badge.dataset.activeMethod || positionMethods[position] || badge.dataset.method;
                    if (!activeMethod) {
                        return;
                    }

                    if (!checkbox.checked) {
                        checkbox.checked = true;
                        checkbox.dispatchEvent(new Event('change'));
                    }

                    startLogoUploadFlow(position, activeMethod);
                    return;
                }

                const method = badge.dataset.method;
                if (!method) {
                    return;
                }

                positionMethods[position] = method;

                if (positionCustomizationsMap[position]) {
                    positionCustomizationsMap[position].method = method;
                }

                applyMethodUI(card, method);
                updateCustomizationIndicator(card, Boolean(positionCustomizationsMap[position]));

                if (!wasChecked) {
                    checkbox.checked = true;
                    checkbox.dispatchEvent(new Event('change'));
                } else {
                    const existing = selectedPositions.find(p => p.position === position);
                    if (existing) {
                        existing.method = method;
                    }
                    persistSelections();
                    updateSidebarCosts();
                }
            });
        });
    });
}

function initAddLogoModal() {
    const modal = document.getElementById('addLogoModal');
    if (!modal) {
        return;
    }

    const typeButtons = modal.querySelectorAll('.add-logo-type-buttons .type-btn');
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setAddLogoType(btn.dataset.type || 'logo');
        });
    });

    const textArea = document.getElementById('addLogoText');
    if (textArea) {
        textArea.addEventListener('input', (event) => {
            currentModalData.text = event.target.value;
        });
    }

    const nameInput = document.getElementById('addLogoName');
    if (nameInput) {
        nameInput.addEventListener('input', () => {
            hideAddLogoError();
        });
    }

    const dropzone = document.getElementById('addLogoDropzone');

    if (dropzone) {
        dropzone.addEventListener('click', (event) => {
            event.preventDefault();
            openCustomUploadModal();
        });
    }

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeAddLogoModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.style.display === 'flex') {
            closeAddLogoModal();
        }
    });

    setAddLogoType(currentModalData.type || 'logo');
    updateAddLogoDropzonePreview(currentModalData.logo);
    hideAddLogoError();
}

function initCustomUploadModal() {
    const modal = document.getElementById('customUploadModal');
    if (!modal) {
        return;
    }

    customUploadElements = {
        modal,
        dropArea: document.getElementById('customUploadDropArea'),
        fileInput: document.getElementById('customUploadFile'),
        fileInfo: document.getElementById('customUploadFileInfo'),
        progressBar: document.getElementById('customUploadProgressBar'),
        progressText: document.getElementById('customUploadProgressText'),
        previewBox: document.getElementById('customUploadPreviewBox'),
        previewImage: document.getElementById('customUploadPreview'),
        logoPlaceholder: document.getElementById('logoPlaceholder'),
        logoActions: document.getElementById('logoActions'),
        logoReplaceBtn: document.getElementById('logoReplaceBtn'),
        logoRemoveBtn: document.getElementById('logoRemoveBtn'),
        textField: document.getElementById('customUploadText'),
        continueBtn: document.getElementById('customUploadContinue'),
        errorEl: document.getElementById('customUploadError'),
        backBtn: document.getElementById('designPopupBack'),
        // New elements for enhanced popup
        fontSelector: document.getElementById('fontSelector'),
        textSizeSlider: document.getElementById('textSizeSlider'),
        clipartSearch: document.getElementById('clipartSearch'),
        clipartGrid: document.getElementById('clipartGrid')
    };

    const { dropArea, fileInput, logoReplaceBtn, logoRemoveBtn, continueBtn, textField, backBtn } = customUploadElements;

    if (dropArea && fileInput) {
        dropArea.addEventListener('click', () => {
            hideCustomUploadError();
            fileInput.click();
        });

        ['dragenter', 'dragover'].forEach(evt => {
            dropArea.addEventListener(evt, (event) => {
                event.preventDefault();
                dropArea.classList.add('dragover');
            });
        });

        ['dragleave', 'dragend'].forEach(evt => {
            dropArea.addEventListener(evt, () => {
                dropArea.classList.remove('dragover');
            });
        });

        dropArea.addEventListener('drop', (event) => {
            event.preventDefault();
            dropArea.classList.remove('dragover');
            const file = event.dataTransfer?.files?.[0];
            if (file) {
                handleCustomUploadSelection(file);
            }
        });

        fileInput.addEventListener('change', (event) => {
            const file = event.target?.files?.[0];
            if (file) {
                handleCustomUploadSelection(file);
            }
        });
    }

    // Logo Replace button
    if (logoReplaceBtn && fileInput) {
        logoReplaceBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }

    // Logo Remove button
    if (logoRemoveBtn) {
        logoRemoveBtn.addEventListener('click', () => {
            clearCustomUploadFile();
        });
    }

    // Logo Remove Background button
    const logoRemoveBgBtn = document.getElementById('logoRemoveBgBtn');
    if (logoRemoveBgBtn) {
        logoRemoveBgBtn.addEventListener('click', () => {
            removeImageBackground();
        });
    }

    // Back button (same as close)
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            resetCustomUploadModal();
            closeCustomUploadModal();
        });
    }

    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            handleCustomUploadContinue();
        });
    }

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            resetCustomUploadModal();
            closeCustomUploadModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.style.display === 'flex') {
            resetCustomUploadModal();
            closeCustomUploadModal();
        }
    });

    if (textField) {
        textField.addEventListener('input', handleCustomUploadTextInput);
    }

    // Font selector change - update preview
    const fontSelector = customUploadElements?.fontSelector;
    if (fontSelector) {
        fontSelector.addEventListener('change', handleFontChange);
    }

    // Initialize custom font selector
    initCustomFontSelector();

    // Text size slider - update preview
    const textSizeSlider = document.getElementById('textSizeSlider');
    if (textSizeSlider) {
        textSizeSlider.addEventListener('input', handleTextSizeChange);
    }

    // Initialize color pickers (only if elements exist)
    initColorPickers();

    // Initialize clipart grid (only if element exists)
    initClipartGrid();

    // Initialize category chips (only if elements exist)
    initClipartCategories();
}

// Custom Font Selector with live preview
function initCustomFontSelector() {
    const trigger = document.getElementById('fontSelectorBtn');
    const dropdown = document.getElementById('fontSelectorDropdown');
    const textField = document.getElementById('customUploadText');
    
    if (!trigger || !dropdown) return;

    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains('hidden');
        if (isOpen) {
            closeFontDropdown();
        } else {
            openFontDropdown();
        }
    });

    // Handle option click
    dropdown.querySelectorAll('.font-selector__option').forEach(option => {
        option.addEventListener('click', () => {
            const fontName = option.dataset.font;
            selectFont(fontName);
            closeFontDropdown();
        });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
            closeFontDropdown();
        }
    });

    // Update previews when text changes
    if (textField) {
        textField.addEventListener('input', updateFontSelectorPreviews);
    }

    function openFontDropdown() {
        dropdown.classList.remove('hidden');
        trigger.classList.add('open');
        updateFontSelectorPreviews();
    }

    function closeFontDropdown() {
        dropdown.classList.add('hidden');
        trigger.classList.remove('open');
    }

    function selectFont(fontName) {
        // Update trigger preview
        const triggerPreview = trigger.querySelector('.font-selector__preview');
        const triggerName = trigger.querySelector('.font-selector__name');
        const text = textField?.value || 'Your Text';
        
        if (triggerPreview) {
            triggerPreview.style.fontFamily = `'${fontName}'`;
            triggerPreview.textContent = text;
        }
        if (triggerName) {
            triggerName.textContent = fontName;
        }

        // Mark as active
        dropdown.querySelectorAll('.font-selector__option').forEach(opt => {
            opt.classList.remove('font-selector__option--active');
            if (opt.dataset.font === fontName) {
                opt.classList.add('font-selector__option--active');
            }
        });

        // Update state
        customUploadState.font = fontName;
        
        // Update main preview
        updateTextPreview();
    }
}

// Update all font previews with current text
function updateFontSelectorPreviews() {
    const textField = document.getElementById('customUploadText');
    const trigger = document.getElementById('fontSelectorBtn');
    const dropdown = document.getElementById('fontSelectorDropdown');
    
    const text = textField?.value || 'Your Text';
    
    // Update trigger preview
    const triggerPreview = trigger?.querySelector('.font-selector__preview');
    if (triggerPreview) {
        triggerPreview.textContent = text;
    }
    
    // Update all option previews
    dropdown?.querySelectorAll('.font-selector__option-preview').forEach(preview => {
        preview.textContent = text;
    });
}

// Color Picker functionality
function initColorPickers() {
    try {
        // Text color swatches
        const textSwatches = document.querySelectorAll('.color-picker__swatch:not(.color-picker__swatch--stroke)');
        textSwatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                textSwatches.forEach(s => s.classList.remove('color-picker__swatch--active'));
                swatch.classList.add('color-picker__swatch--active');
                customUploadState.textColor = swatch.dataset.color;
                updateTextPreview();
            });
        });

        // Stroke color swatches
        const strokeSwatches = document.querySelectorAll('.color-picker__swatch--stroke');
        strokeSwatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                strokeSwatches.forEach(s => s.classList.remove('color-picker__swatch--active'));
                swatch.classList.add('color-picker__swatch--active');
                customUploadState.strokeColor = swatch.dataset.color;
                updateTextPreview();
            });
        });
    } catch (e) {
        console.warn('initColorPickers error:', e);
    }
}

// Handle font selection change
function handleFontChange(event) {
    customUploadState.font = event.target.value;
    updateTextPreview();
}

// Handle text size slider change
function handleTextSizeChange(event) {
    customUploadState.fontSize = parseInt(event.target.value, 10);
    updateTextPreview();
}

// Update text preview with current settings
function updateTextPreview() {
    const textField = customUploadElements?.textField;
    const previewBox = document.getElementById('logoPreviewBox');
    
    if (!textField || !previewBox) return;
    
    const text = textField.value || customUploadState.text;
    if (!text || text.trim() === '') {
        // If no text, don't show text preview
        return;
    }
    
    // Get current settings
    const font = customUploadState.font || 'Arial';
    const fontSize = customUploadState.fontSize || 24;
    const textColor = customUploadState.textColor || '#1f2937';
    const strokeColor = customUploadState.strokeColor || 'transparent';
    
    // Check if we already have a text preview element
    let textPreview = previewBox.querySelector('.text-preview-display');
    if (!textPreview) {
        textPreview = document.createElement('div');
        textPreview.className = 'text-preview-display';
        previewBox.appendChild(textPreview);
    }
    
    // Update the preview text
    textPreview.textContent = text;
    textPreview.style.fontFamily = font;
    textPreview.style.fontSize = `${Math.min(fontSize, 36)}px`;
    textPreview.style.color = textColor;
    textPreview.style.textShadow = strokeColor !== 'transparent' ? 
        `-1px -1px 0 ${strokeColor}, 1px -1px 0 ${strokeColor}, -1px 1px 0 ${strokeColor}, 1px 1px 0 ${strokeColor}` : 'none';
    textPreview.style.display = 'block';
    textPreview.style.textAlign = 'center';
    textPreview.style.padding = '10px';
    textPreview.style.wordBreak = 'break-word';
    textPreview.style.maxWidth = '100%';
    
    // Show the preview box
    previewBox.classList.remove('hidden');
    
    // Hide placeholder if visible
    const placeholder = previewBox.querySelector('.logo-preview__placeholder');
    if (placeholder) {
        placeholder.style.display = 'none';
    }
}

// Clipart Grid functionality
function initClipartGrid() {
    try {
        const grid = document.getElementById('clipartGrid');
        if (!grid) return;

        grid.addEventListener('click', (e) => {
            const item = e.target.closest('.clipart-grid__item');
            if (!item) return;

            // Remove active from all
            grid.querySelectorAll('.clipart-grid__item').forEach(i => i.classList.remove('clipart-grid__item--active'));
            
            // Add active to clicked
            item.classList.add('clipart-grid__item--active');
            
            // Store selected clipart
            customUploadState.selectedClipart = item.dataset.clipart;
            customUploadState.selectedClipartEmoji = item.textContent;
            
            updateCustomUploadContinueState();
        });
    } catch (e) {
        console.warn('initClipartGrid error:', e);
    }
}

// Clipart Categories functionality
function initClipartCategories() {
    try {
        const chips = document.querySelectorAll('.clipart-categories__chip');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                chips.forEach(c => c.classList.remove('clipart-categories__chip--active'));
                chip.classList.add('clipart-categories__chip--active');
                // Future: filter clipart grid by category
            });
        });
    } catch (e) {
        console.warn('initClipartCategories error:', e);
    }
}

function handleCustomUploadTextInput(event) {
    if (!customUploadElements) {
        return;
    }

    const { textField } = customUploadElements;
    if (!textField) {
        return;
    }

    let value = event.target.value || '';
    if (value.length > CUSTOM_UPLOAD_TEXT_LIMIT) {
        value = value.slice(0, CUSTOM_UPLOAD_TEXT_LIMIT);
        textField.value = value;
    }

    customUploadState.text = value;
    currentModalData.text = value;
    hideCustomUploadError();
    updateCustomUploadTextCounter();
    updateCustomUploadContinueState();
    
    // Update text preview
    updateTextPreview();
}

function updateCustomUploadTextCounter() {
    // Counter element removed in new design - function kept for compatibility
    return;
}

function updateCustomUploadContinueState() {
    if (!customUploadElements) {
        return;
    }

    const { continueBtn, textField, previewImage } = customUploadElements;
    if (!continueBtn) {
        return;
    }

    if (customUploadState.processing) {
        continueBtn.disabled = true;
        return;
    }

    const textValue = textField ? textField.value.trim() : '';
    const hasText = Boolean(textValue);
    const hasFileReady = Boolean(customUploadState.file) && previewImage && !previewImage.classList.contains('hidden');
    const hasClipart = Boolean(customUploadState.selectedClipart);

    if (hasFileReady || hasText || hasClipart) {
        continueBtn.disabled = false;
    } else {
        continueBtn.disabled = true;
    }
}

function startLogoUploadFlow(position, method) {
    const checkbox = document.querySelector(`.position-card input[value="${position}"]`);
    const card = checkbox ? checkbox.closest('.position-card') : null;
    const existingCustomization = positionCustomizationsMap[position] || null;

    positionMethods[position] = method;
    currentModalPosition = position;
    currentModalData = {
        method,
        type: 'logo',
        logo: null,
        text: '',
        name: existingCustomization?.name || ''
    };

    const prefillLogo = existingCustomization && existingCustomization.type === 'logo' && existingCustomization.uploadedLogo
        ? {
            data: existingCustomization.uploadedLogo,
            name: existingCustomization.logoName || existingCustomization.name || 'Uploaded logo'
        }
        : null;

    const prefillText = existingCustomization && existingCustomization.type === 'text'
        ? existingCustomization.text || ''
        : '';

    if (card && checkbox && !checkbox.checked) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
    }

    openCustomUploadModal({ existingLogo: prefillLogo, existingText: prefillText });
}

function openCustomUploadModal(options = {}) {
    const modal = customUploadElements?.modal;
    if (!modal) {
        initCustomUploadModal();
    }

    if (!customUploadElements?.modal) {
        return;
    }

    resetCustomUploadModal();
    customUploadElements.modal.style.display = 'flex';
    const continueBtn = customUploadElements.continueBtn;
    if (continueBtn) {
        continueBtn.disabled = true;
    }

    if (options.existingLogo) {
        const { data, name } = options.existingLogo;
        const { previewBox, previewImage, logoPlaceholder, logoActions } = customUploadElements;
        const isImageData = typeof data === 'string' && data.startsWith('data:image');

        if (previewImage && data && isImageData) {
            previewImage.src = data;
            previewImage.classList.remove('hidden');
            
            // Hide placeholder, show actions
            if (logoPlaceholder) {
                logoPlaceholder.classList.add('hidden');
            }
            if (logoActions) {
                logoActions.classList.remove('hidden');
            }
            if (previewBox) {
                previewBox.classList.add('logo-preview-box--has-image');
            }
            
            // Mark as having a file
            customUploadState.file = { name: name || 'existing' };
        }
    }

    if (typeof options.existingText === 'string' && customUploadElements.textField) {
        const text = options.existingText.slice(0, CUSTOM_UPLOAD_TEXT_LIMIT);
        customUploadElements.textField.value = text;
        customUploadState.text = text;
        updateCustomUploadContinueState();
    }
}

function closeCustomUploadModal() {
    if (!customUploadElements?.modal) {
        return;
    }
    customUploadElements.modal.style.display = 'none';
    resetCustomUploadModal();
    currentModalPosition = null;
    currentModalData.logo = null;
    currentModalData.name = '';
}

function resetCustomUploadModal() {
    clearInterval(customUploadState.progressTimer);
    customUploadState.progressTimer = null;
    customUploadState.progressValue = 0;
    customUploadState.processing = false;
    customUploadState.file = null;
    customUploadState.text = '';
    customUploadState.selectedClipart = null;
    customUploadState.selectedClipartEmoji = null;

    if (!customUploadElements) {
        return;
    }

    const {
        dropArea,
        fileInput,
        fileInfo,
        progressBar,
        progressText,
        previewBox,
        previewImage,
        continueBtn,
        textField,
        logoPlaceholder,
        logoActions
    } = customUploadElements;

    hideCustomUploadError();

    if (fileInput) {
        fileInput.value = '';
    }

    if (fileInfo) {
        fileInfo.classList.add('hidden');
    }

    if (dropArea) {
        dropArea.classList.remove('dragover');
    }

    if (progressBar) {
        progressBar.style.width = '0%';
    }

    if (progressText) {
        progressText.textContent = '0%';
    }

    // Show placeholder, hide image
    if (logoPlaceholder) {
        logoPlaceholder.classList.remove('hidden');
    }

    if (previewBox) {
        previewBox.classList.remove('logo-preview-box--has-image');
    }

    if (previewImage) {
        previewImage.removeAttribute('src');
        previewImage.classList.add('hidden');
    }

    // Hide actions
    if (logoActions) {
        logoActions.classList.add('hidden');
    }

    if (textField) {
        textField.value = '';
    }

    // Reset clipart selection
    const clipartGrid = document.getElementById('clipartGrid');
    if (clipartGrid) {
        clipartGrid.querySelectorAll('.clipart-grid__item').forEach(i => i.classList.remove('clipart-grid__item--active'));
    }

    if (continueBtn) {
        continueBtn.disabled = true;
    }

    updateCustomUploadContinueState();
}

function clearCustomUploadFile() {
    customUploadState.file = null;
    customUploadState.processing = false;
    customUploadState.progressValue = 0;
    if (customUploadState.progressTimer) {
        clearInterval(customUploadState.progressTimer);
        customUploadState.progressTimer = null;
    }
    if (!customUploadElements) {
        return;
    }

    const { fileInput, previewBox, previewImage, fileInfo, progressBar, progressText, continueBtn, logoPlaceholder, logoActions } = customUploadElements;
    if (fileInput) {
        fileInput.value = '';
    }
    if (previewImage) {
        previewImage.removeAttribute('src');
        previewImage.classList.add('hidden');
    }
    // Show placeholder again
    if (logoPlaceholder) {
        logoPlaceholder.classList.remove('hidden');
    }
    // Remove has-image class from preview box
    if (previewBox) {
        previewBox.classList.remove('logo-preview-box--has-image');
    }
    // Hide actions
    if (logoActions) {
        logoActions.classList.add('hidden');
    }
    if (progressBar) {
        progressBar.style.width = '0%';
    }
    if (progressText) {
        progressText.textContent = '0%';
    }
    if (fileInfo) {
        fileInfo.classList.add('hidden');
    }
    if (continueBtn) {
        continueBtn.disabled = true;
        continueBtn.classList.remove('enabled');
    }
    hideCustomUploadError();
    updateCustomUploadContinueState();
}

/**
 * Remove background from uploaded image using Flood Fill algorithm
 * Only removes pixels connected to the edges (true background)
 * Preserves internal pixels even if same color
 */
function removeImageBackground() {
    if (!customUploadElements || !customUploadState.file) {
        return;
    }

    const { previewImage } = customUploadElements;
    if (!previewImage || !previewImage.src) {
        return;
    }

    const logoRemoveBgBtn = document.getElementById('logoRemoveBgBtn');
    if (logoRemoveBgBtn) {
        logoRemoveBgBtn.classList.add('processing');
        logoRemoveBgBtn.disabled = true;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;

        // Sample corner pixels to detect background color
        const corners = [
            getPixelColor(data, 0, 0, width),
            getPixelColor(data, width - 1, 0, width),
            getPixelColor(data, 0, height - 1, width),
            getPixelColor(data, width - 1, height - 1, width)
        ];

        // Find the most common corner color (likely background)
        const bgColor = findDominantColor(corners);
        
        // Tolerance for color matching
        const tolerance = 45;

        // Track visited pixels
        const visited = new Uint8Array(width * height);

        // Flood fill from all edge pixels
        const queue = [];

        // Add all edge pixels to queue
        for (let x = 0; x < width; x++) {
            queue.push([x, 0]);           // Top edge
            queue.push([x, height - 1]);  // Bottom edge
        }
        for (let y = 1; y < height - 1; y++) {
            queue.push([0, y]);           // Left edge
            queue.push([width - 1, y]);   // Right edge
        }

        // Process queue (Flood Fill)
        while (queue.length > 0) {
            const [x, y] = queue.shift();
            
            // Check bounds
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            
            const idx = y * width + x;
            
            // Skip if already visited
            if (visited[idx]) continue;
            visited[idx] = 1;

            // Get pixel color
            const pixelIdx = idx * 4;
            const r = data[pixelIdx];
            const g = data[pixelIdx + 1];
            const b = data[pixelIdx + 2];

            // Check if pixel matches background color
            if (isColorSimilar(r, g, b, bgColor, tolerance)) {
                // Make transparent
                data[pixelIdx + 3] = 0;

                // Add neighbors to queue
                queue.push([x + 1, y]);
                queue.push([x - 1, y]);
                queue.push([x, y + 1]);
                queue.push([x, y - 1]);
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Convert canvas to blob and update preview
        canvas.toBlob(function(blob) {
            const newFile = new File([blob], customUploadState.file.name.replace(/\.\w+$/, '.png'), {
                type: 'image/png'
            });
            customUploadState.file = newFile;
            
            const newUrl = URL.createObjectURL(blob);
            previewImage.src = newUrl;

            if (logoRemoveBgBtn) {
                logoRemoveBgBtn.classList.remove('processing');
                logoRemoveBgBtn.disabled = false;
            }
        }, 'image/png');
    };

    img.onerror = function() {
        console.error('Failed to load image for background removal');
        if (logoRemoveBgBtn) {
            logoRemoveBgBtn.classList.remove('processing');
            logoRemoveBgBtn.disabled = false;
        }
    };

    img.src = previewImage.src;
}

/**
 * Get pixel color at specific coordinates
 */
function getPixelColor(data, x, y, width) {
    const idx = (y * width + x) * 4;
    return {
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2]
    };
}

/**
 * Find the most common color from an array of colors
 */
function findDominantColor(colors) {
    // For simplicity, average the colors if they're similar
    // Otherwise return the most common one
    const avgR = Math.round(colors.reduce((sum, c) => sum + c.r, 0) / colors.length);
    const avgG = Math.round(colors.reduce((sum, c) => sum + c.g, 0) / colors.length);
    const avgB = Math.round(colors.reduce((sum, c) => sum + c.b, 0) / colors.length);
    
    return { r: avgR, g: avgG, b: avgB };
}

/**
 * Check if two colors are similar within tolerance
 */
function isColorSimilar(r, g, b, target, tolerance) {
    const dr = Math.abs(r - target.r);
    const dg = Math.abs(g - target.g);
    const db = Math.abs(b - target.b);
    
    return dr <= tolerance && dg <= tolerance && db <= tolerance;
}

function handleCustomUploadSelection(file) {
    if (!customUploadElements) {
        return;
    }

    const validationError = validateLogoFile(file);
    if (validationError) {
        showCustomUploadError(validationError);
        return;
    }

    hideCustomUploadError();
    customUploadState.file = file;
    customUploadState.processing = false;

    const { fileInfo, progressBar, progressText, previewImage, continueBtn, logoPlaceholder } = customUploadElements;

    if (fileInfo) {
        fileInfo.classList.remove('hidden');
    }

    // Hide placeholder during upload
    if (logoPlaceholder) {
        logoPlaceholder.classList.add('hidden');
    }

    if (previewImage) {
        previewImage.classList.add('hidden');
        previewImage.removeAttribute('src');
    }

    if (progressBar) {
        progressBar.style.width = '0%';
    }

    if (progressText) {
        progressText.textContent = '0%';
    }

    if (continueBtn) {
        continueBtn.disabled = true;
        continueBtn.classList.remove('enabled');
    }

    simulateCustomUploadProgress(() => showCustomUploadPreview(file));

    if (customUploadElements.fileInput) {
        customUploadElements.fileInput.value = '';
    }
}

function simulateCustomUploadProgress(callback) {
    clearInterval(customUploadState.progressTimer);
    customUploadState.progressValue = 0;

    const progressBar = customUploadElements?.progressBar;
    const progressText = customUploadElements?.progressText;
    if (!progressBar) {
        callback();
        return;
    }

    customUploadState.progressTimer = setInterval(() => {
        customUploadState.progressValue = Math.min(100, customUploadState.progressValue + 2);
        progressBar.style.width = `${customUploadState.progressValue}%`;
        if (progressText) {
            progressText.textContent = `${customUploadState.progressValue}%`;
        }

        if (customUploadState.progressValue >= 100) {
            clearInterval(customUploadState.progressTimer);
            customUploadState.progressTimer = null;
            setTimeout(callback, 600);
        }
    }, 30);
}

function showCustomUploadPreview(file) {
    if (!customUploadElements) {
        return;
    }

    const { previewBox, previewImage, continueBtn, logoPlaceholder, logoActions, fileInfo } = customUploadElements;
    const mimeType = file?.type || '';
    const extension = (file?.name || '').split('.').pop().toLowerCase();
    const isImage = mimeType.startsWith('image') || ['svg'].includes(extension);

    const finalize = () => {
        // Hide progress bar
        if (fileInfo) {
            fileInfo.classList.add('hidden');
        }
        // Hide placeholder
        if (logoPlaceholder) {
            logoPlaceholder.classList.add('hidden');
        }
        // Add has-image class to preview box
        if (previewBox) {
            previewBox.classList.add('logo-preview-box--has-image');
        }
        // Show Replace/Remove buttons
        if (logoActions) {
            logoActions.classList.remove('hidden');
        }
        if (continueBtn) {
            continueBtn.disabled = false;
            continueBtn.classList.add('enabled');
        }
        updateCustomUploadContinueState();
    };

    if (isImage && previewImage) {
        const reader = new FileReader();
        reader.onload = () => {
            previewImage.src = reader.result;
            previewImage.classList.remove('hidden');
            finalize();
        };
        reader.readAsDataURL(file);
    } else {
        if (previewImage) {
            previewImage.removeAttribute('src');
            previewImage.classList.add('hidden');
        }
        finalize();
    }
}

function showCustomUploadError(message) {
    if (!customUploadElements?.errorEl) {
        return;
    }
    customUploadElements.errorEl.textContent = message;
    customUploadElements.errorEl.classList.remove('hidden');
}

function hideCustomUploadError() {
    if (!customUploadElements?.errorEl) {
        return;
    }
    customUploadElements.errorEl.textContent = '';
    customUploadElements.errorEl.classList.add('hidden');
}

function handleCustomUploadContinue() {
    if (!customUploadElements) {
        return;
    }

    if (customUploadState.processing) {
        return;
    }

    const file = customUploadState.file;
    const rawText = customUploadElements.textField ? customUploadElements.textField.value : '';
    const trimmedText = rawText.trim();
    customUploadState.text = rawText;
    const continueBtn = customUploadElements.continueBtn;

    if (!file && !trimmedText) {
        showCustomUploadError('Please upload a logo or enter text to continue.');
        return;
    }

    if (file) {
        const validationError = validateLogoFile(file);
        if (validationError) {
            showCustomUploadError(validationError);
            return;
        }
    }

    hideCustomUploadError();
    customUploadState.processing = true;

    if (continueBtn) {
        continueBtn.disabled = true;
        continueBtn.classList.remove('enabled');
    }

    if (file) {
        readFileAsDataURL(file)
            .then(dataUrl => {
                applyLogoCustomizationFromData({
                    position: currentModalPosition,
                    method: currentModalData.method || positionMethods[currentModalPosition] || 'embroidery',
                    file,
                    dataUrl,
                    text: trimmedText
                });
                closeCustomUploadModal();
            })
            .catch(error => {
                console.error('Logo upload failed', error);
                showCustomUploadError('Unable to process the selected file. Please try again.');
                if (continueBtn) {
                    continueBtn.disabled = false;
                    continueBtn.classList.add('enabled');
                }
            })
            .finally(() => {
                customUploadState.processing = false;
                updateCustomUploadContinueState();
            });
    } else if (trimmedText) {
        applyTextCustomization({
            position: currentModalPosition,
            method: currentModalData.method || positionMethods[currentModalPosition] || 'embroidery',
            text: trimmedText,
            font: customUploadState.font || 'Arial',
            fontSize: customUploadState.fontSize || 24,
            textColor: customUploadState.textColor || '#1f2937',
            strokeColor: customUploadState.strokeColor || 'transparent'
        });
        closeCustomUploadModal();
        customUploadState.processing = false;
        updateCustomUploadContinueState();
    }
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No file provided.'));
            return;
        }

        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('Unable to read file.'));
        reader.readAsDataURL(file);
    });
}

function applyLogoCustomizationFromData({ position, method, file, dataUrl, text = '' }) {
    if (!position || !dataUrl) {
        return;
    }

    const fileName = file?.name || 'Uploaded logo';
    const defaultName = fileName.replace(/\.[^/.]+$/, '') || 'Custom Logo';
    const sanitizedText = typeof text === 'string' ? text.trim().slice(0, CUSTOM_UPLOAD_TEXT_LIMIT) : '';
    const displayName = currentModalData.name?.trim() || sanitizedText || defaultName;

    currentModalData.logo = {
        data: dataUrl,
        name: fileName,
        type: file?.type || ''
    };
    currentModalData.name = displayName;
    currentModalData.text = sanitizedText;
    currentModalData.type = 'logo';

    const checkbox = document.querySelector(`.position-card input[value="${position}"]`);
    const card = checkbox ? checkbox.closest('.position-card') : null;

    if (card) {
        card.classList.add('selected');
    }

    const customization = {
        position,
        name: displayName,
        method,
        type: 'logo',
        uploadedLogo: dataUrl,
        logoName: fileName,
        logoType: file?.type || '',
        logoSize: file?.size || null,
        text: sanitizedText
    };

    positionMethods[position] = method;
    positionCustomizationsMap[position] = customization;

    const existing = selectedPositions.find(item => item.position === position);
    if (existing) {
        existing.method = method;
    } else {
        const positionName = card ? card.querySelector('.position-checkbox span')?.textContent.trim() : capitalize(position.replace(/-/g, ' '));
        const priceEmb = card ? parseFloat(card.dataset.embroidery || '0') : 0;
        const pricePrint = card ? parseFloat(card.dataset.print || '0') : 0;

        selectedPositions.push({
            position,
            name: positionName || capitalize(position.replace(/-/g, ' ')),
            priceEmb,
            pricePrint,
            method
        });

        if (checkbox && !checkbox.checked) {
            checkbox.checked = true;
        }
    }

    persistSelections();
    refreshCardState(position);
    updateSidebarCosts();
    currentModalPosition = null;
}

function applyTextCustomization({ position, method, text, font = 'Arial', fontSize = 24, textColor = '#1f2937', strokeColor = 'transparent' }) {
    if (!position) {
        return;
    }

    const sanitizedText = typeof text === 'string' ? text.trim().slice(0, CUSTOM_UPLOAD_TEXT_LIMIT) : '';
    if (!sanitizedText) {
        return;
    }

    const checkbox = document.querySelector(`.position-card input[value="${position}"]`);
    const card = checkbox ? checkbox.closest('.position-card') : null;
    const displayName = sanitizedText.length > 24 ? `${sanitizedText.slice(0, 24)}...` : sanitizedText;

    currentModalData.logo = null;
    currentModalData.type = 'text';
    currentModalData.text = sanitizedText;
    currentModalData.name = displayName;

    const customization = {
        position,
        name: displayName,
        method,
        type: 'text',
        uploadedLogo: null,
        logoName: null,
        logoType: null,
        logoSize: null,
        text: sanitizedText,
        font: font,
        fontSize: fontSize,
        textColor: textColor,
        strokeColor: strokeColor
    };

    positionMethods[position] = method;
    positionCustomizationsMap[position] = customization;

    if (card) {
        card.classList.add('selected');
    }

    const existing = selectedPositions.find(item => item.position === position);
    if (existing) {
        existing.method = method;
    } else {
        const positionName = card ? card.querySelector('.position-checkbox span')?.textContent.trim() : capitalize(position.replace(/-/g, ' '));
        const priceEmb = card ? parseFloat(card.dataset.embroidery || '0') : 0;
        const pricePrint = card ? parseFloat(card.dataset.print || '0') : 0;

        selectedPositions.push({
            position,
            name: positionName || capitalize(position.replace(/-/g, ' ')),
            priceEmb,
            pricePrint,
            method
        });

        if (checkbox && !checkbox.checked) {
            checkbox.checked = true;
        }
    }

    persistSelections();
    refreshCardState(position);
    updateSidebarCosts();
    currentModalPosition = null;
}

function openAddLogoModal(position, method) {
    const modal = document.getElementById('addLogoModal');
    if (!modal) {
        return;
    }

    const checkbox = document.querySelector(`.position-card input[value="${position}"]`);
    const card = checkbox ? checkbox.closest('.position-card') : null;
    const positionLabel = card ? card.querySelector('.position-checkbox span')?.textContent.trim() : capitalize(position.replace(/-/g, ' '));
    const customization = positionCustomizationsMap[position] || null;

    currentModalPosition = position;
    currentModalData = {
        method: method,
        type: customization?.type || 'logo',
        logo: null,
        text: customization?.text || ''
    };

    if (customization?.uploadedLogo) {
        currentModalData.logo = {
            data: customization.uploadedLogo,
            name: customization.logoName || customization.name || 'Uploaded file',
            type: customization.logoType || ''
        };
    }

    const titleEl = document.getElementById('addLogoModalTitle');
    if (titleEl) {
        titleEl.textContent = customization ? 'Edit Customization' : 'Add Customization';
    }

    const subtitleEl = document.getElementById('addLogoModalSubtitle');
    if (subtitleEl) {
        subtitleEl.textContent = `${positionLabel || capitalize(position)} · ${capitalize(method)}`;
    }

    const methodLabel = document.getElementById('addLogoMethod');
    if (methodLabel) {
        methodLabel.textContent = capitalize(method);
    }

    const nameInput = document.getElementById('addLogoName');
    if (nameInput) {
        nameInput.value = customization?.name || '';
    }

    const textArea = document.getElementById('addLogoText');
    if (textArea) {
        textArea.value = currentModalData.text || '';
    }

    setAddLogoType(currentModalData.type);
    updateAddLogoDropzonePreview(currentModalData.logo);
    hideAddLogoError();

    modal.style.display = 'flex';

    if (nameInput) {
        setTimeout(() => nameInput.focus(), 50);
    }
}

function closeAddLogoModal() {
    const modal = document.getElementById('addLogoModal');
    if (!modal) {
        return;
    }

    modal.style.display = 'none';
    resetAddLogoModalState();
}

function resetAddLogoModalState() {
    currentModalPosition = null;
    currentModalData = {
        method: 'embroidery',
        type: 'logo',
        logo: null,
        text: '',
        name: ''
    };

    const nameInput = document.getElementById('addLogoName');
    if (nameInput) {
        nameInput.value = '';
    }

    const textArea = document.getElementById('addLogoText');
    if (textArea) {
        textArea.value = '';
    }

    setAddLogoType('logo');
    updateAddLogoDropzonePreview(null);
    hideAddLogoError();
}

function setAddLogoType(type) {
    const selectedType = type || 'logo';
    currentModalData.type = selectedType;

    const typeButtons = document.querySelectorAll('.add-logo-type-buttons .type-btn');
    typeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === selectedType);
    });

    const uploadSection = document.getElementById('addLogoUploadSection');
    const textSection = document.getElementById('addLogoTextSection');

    if (uploadSection) {
        uploadSection.style.display = selectedType === 'logo' ? 'block' : 'none';
    }

    if (textSection) {
        textSection.style.display = selectedType === 'text' ? 'block' : 'none';
    }

    if (selectedType === 'text') {
        hideAddLogoError();
    }
}

function validateLogoFile(file) {
    if (!file) {
        return 'Please select a file to upload.';
    }

    const validMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml', 'application/pdf', 'application/postscript'];
    const validExtensions = ['.jpg', '.jpeg', '.png', '.svg', '.eps', '.ai', '.pdf'];
    const extension = file.name ? `.${file.name.split('.').pop().toLowerCase()}` : '';
    const mimeType = file.type || '';

    if (!validMimeTypes.includes(mimeType) && !validExtensions.includes(extension)) {
        return 'Please upload a valid logo file (JPG, PNG, SVG, PDF, AI, EPS).';
    }

    if (file.size > 5 * 1024 * 1024) {
        return 'File size must be below 5MB.';
    }

    return null;
}

function handleAddLogoFile(file) {
    const validationError = validateLogoFile(file);
    if (validationError) {
        showAddLogoError(validationError);
        return false;
    }

    hideAddLogoError();

    const reader = new FileReader();
    const mimeType = file.type || '';
    reader.onload = (event) => {
        currentModalData.logo = {
            data: event.target?.result,
            name: file.name,
            type: mimeType
        };
        updateAddLogoDropzonePreview(currentModalData.logo);
    };
    reader.readAsDataURL(file);

    return true;
}

function updateAddLogoDropzonePreview(logoInfo) {
    const dropzone = document.getElementById('addLogoDropzone');
    const content = document.getElementById('addLogoDropzoneContent');
    const preview = document.getElementById('addLogoPreview');

    if (!dropzone || !content || !preview) {
        return;
    }

    if (logoInfo && logoInfo.data) {
        dropzone.classList.add('has-file');
        const isImage = (logoInfo.type || '').startsWith('image');

        if (isImage) {
            preview.src = logoInfo.data;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }

        content.innerHTML = `
            <strong>${logoInfo.name || 'Uploaded file'}</strong>
            <span>Click to replace</span>
        `;
    } else {
        dropzone.classList.remove('has-file');
        preview.style.display = 'none';
        content.innerHTML = `
            <strong>Upload your logo</strong>
            <span>Drag & drop or click to browse</span>
            <span class="max-size">Max 5MB • JPG, PNG, PDF, AI, EPS</span>
        `;
    }
}

function showAddLogoError(message) {
    const errorEl = document.getElementById('addLogoError');
    if (!errorEl) {
        return;
    }
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function hideAddLogoError() {
    const errorEl = document.getElementById('addLogoError');
    if (!errorEl) {
        return;
    }
    errorEl.style.display = 'none';
}

function saveAddLogoCustomization() {
    if (!currentModalPosition) {
        return;
    }

    const nameInput = document.getElementById('addLogoName');
    const textArea = document.getElementById('addLogoText');

    const customizationName = nameInput ? nameInput.value.trim() : '';
    const customizationText = textArea ? textArea.value.trim() : '';

    if (!customizationName) {
        showAddLogoError('Please provide a customization name.');
        if (nameInput) {
            nameInput.focus();
        }
        return;
    }

    if (currentModalData.type === 'logo' && !currentModalData.logo) {
        showAddLogoError('Please upload a logo file.');
        return;
    }

    if (currentModalData.type === 'text' && !customizationText) {
        showAddLogoError('Please enter the text for this customization.');
        if (textArea) {
            textArea.focus();
        }
        return;
    }

    hideAddLogoError();

    const method = positionMethods[currentModalPosition] || currentModalData.method || 'embroidery';

    const customization = {
        position: currentModalPosition,
        name: customizationName,
        method: method,
        type: currentModalData.type,
        uploadedLogo: currentModalData.type === 'logo' && currentModalData.logo ? currentModalData.logo.data : null,
        logoName: currentModalData.type === 'logo' && currentModalData.logo ? currentModalData.logo.name : null,
        logoType: currentModalData.type === 'logo' && currentModalData.logo ? currentModalData.logo.type : null,
        text: currentModalData.type === 'text' ? customizationText : ''
    };

    currentModalData.text = customizationText;

    positionCustomizationsMap[currentModalPosition] = customization;

    const existing = selectedPositions.find(p => p.position === currentModalPosition);
    if (existing) {
        existing.method = method;
    }

    persistSelections();
    refreshCardState(currentModalPosition);
    updateSidebarCosts();

    closeAddLogoModal();
}

function showMethodSelectionPopup() {
    const modal = document.getElementById('confirmRemoveModal');
    const modalBox = modal.querySelector('.modal-box');
    const h3 = modalBox.querySelector('h3');
    const buttons = modalBox.querySelector('.modal-buttons');
    
    h3.textContent = 'Please select Embroidery or Print method first';
    buttons.innerHTML = '<button class="modal-btn modal-btn-ok" onclick="closeRemoveModal()">OK</button>';
    
    modal.style.display = 'flex';
}

function updateSidebarCosts() {
    // Get ALL products from basket
    const basket = JSON.parse(localStorage.getItem('quoteBasket')) || [];
    if (basket.length === 0) return;
    
    // Calculate total quantity of all items (handle both quantity and quantities formats)
    const totalQuantity = basket.reduce((sum, item) => {
        if (item.quantities && typeof item.quantities === 'object') {
            // Sum all size quantities
            return sum + Object.values(item.quantities).reduce((s, q) => s + (Number(q) || 0), 0);
        }
        return sum + (Number(item.quantity) || 0);
    }, 0);
    
    // Calculate garment cost from basket
    const garmentCost = basket.reduce((sum, item) => {
        let itemQty = 0;
        if (item.quantities && typeof item.quantities === 'object') {
            itemQty = Object.values(item.quantities).reduce((s, q) => s + (Number(q) || 0), 0);
        } else {
            itemQty = Number(item.quantity) || 0;
        }
        return sum + ((Number(item.price) || 0) * itemQty);
    }, 0);
    
    // Calculate application costs and build individual rows
    let totalApplicationCosts = 0;
    let customizationHTML = '';
    
    selectedPositions.forEach((pos, index) => {
        const method = positionMethods[pos.position] || 'embroidery';
        const price = method === 'print' ? pos.pricePrint : pos.priceEmb;
        const positionTotal = price * totalQuantity;
        totalApplicationCosts += positionTotal;
        
        // Get position name from card
        const positionCard = document.querySelector(`[data-position="${pos.position}"]`);
        const positionLabel = positionCard ? positionCard.querySelector('.position-checkbox span').textContent : pos.position;
        
        // Get the customization details to show type (logo/text)
        const customization = positionCustomizationsMap[pos.position];
        const customizationType = customization?.type || 'logo';
        const methodLabel = method === 'print' ? 'Print' : 'Embroidery';
        
        // Show "Text" for text customizations, otherwise show the method
        const typeLabel = customizationType === 'text' ? 'Text' : methodLabel;
        
        // Use different class for print vs embroidery
        const sectionClass = method === 'print' ? 'section print-method' : 'section embroidery';
        
        // Create individual row for each customization - EXACT CodePen structure
        customizationHTML += `
            <div class="${sectionClass}" data-vat-row data-price="${price}" data-qty="${totalQuantity}">
                <div class="row">
                    <span class="label white">${positionLabel} ${typeLabel}</span>
                    <span class="value white"></span>
                </div>
                <div class="row detail white">
                    <span>Unit Price: ${formatCurrency(price)}</span>
                    <span>Qty: ${totalQuantity}</span>
                </div>
            </div>
        `;
    });
    
    const total = garmentCost + totalApplicationCosts;
    
    // Update sidebar with individual customization rows
    const customizationList = document.getElementById('customizationCostsList');
    if (customizationList) {
        if (customizationHTML) {
            customizationList.innerHTML = customizationHTML;
        } else {
            customizationList.innerHTML = '';
        }
    }
    
    const totalEl = document.getElementById('sidebarTotalCost');
    if (totalEl) {
        totalEl.dataset.total = total;
        totalEl.textContent = formatCurrency(total);
    }

    refreshCustomizationCostRows();
    refreshSidebarTotal();
}

function proceedToCustomization() {
    console.log('Selected positions:', selectedPositions);
    
    // Re-check all selected checkboxes in case array is empty
    if (selectedPositions.length === 0) {
        const checkedBoxes = document.querySelectorAll('.position-card input[type="checkbox"]:checked');
        console.log('Checked boxes found:', checkedBoxes.length);
        
        checkedBoxes.forEach(checkbox => {
            const card = checkbox.closest('.position-card');
            const positionName = card.querySelector('.position-checkbox span').textContent.trim();
            const priceEmb = parseFloat(card.dataset.embroidery || '0');
            const pricePrint = parseFloat(card.dataset.print || '0');
            const position = checkbox.value;
            
            selectedPositions.push({
                position: position,
                name: positionName,
                priceEmb: priceEmb,
                pricePrint: pricePrint,
                method: positionMethods[position] || 'embroidery'
            });
        });
    }
    
    if (selectedPositions.length === 0) {
        alert('Please select at least one position');
        return;
    }
    
    console.log('Saving to sessionStorage:', selectedPositions);
    
    // Save selected positions and methods to sessionStorage
    sessionStorage.setItem('selectedPositions', JSON.stringify(selectedPositions));
    sessionStorage.setItem('positionMethods', JSON.stringify(positionMethods));
    sessionStorage.setItem('currentPositionIndex', '0');
    
    // Go to first customization page
    window.location.href = 'customize-detail.html';
}
