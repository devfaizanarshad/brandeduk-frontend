// STATE MANAGEMENT
let selectedPositions = [];
let currentPositionIndex = 0;
let positionCustomizations = [];
let uploadedLogo = null;

// Pricing rules aligned with product detail page
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
    if (qty > 0 && Number.isFinite(unit)) {
        return formatCurrency(unit) + ' ' + vatSuffix() + ' x ' + qty;
    }
    return formatCurrency(0) + ' ' + vatSuffix();
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

function refreshVatDependentUi() {
    refreshBasketLinePrices();
    refreshGarmentCostDisplay();
    refreshCustomizationCostRows();
    refreshSidebarTotal();
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

// INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
    loadSelectedPositions();
    loadBasketData(); // Changed from loadProductData
    initializeForm();
    updateSidebarCosts();
});

// LOAD SELECTED POSITIONS FROM STEP 1
function loadSelectedPositions() {
    const stored = sessionStorage.getItem('selectedPositions');
    if (!stored) {
        window.location.href = 'customize-positions.html';
        return;
    }
    
    selectedPositions = JSON.parse(stored);
    currentPositionIndex = parseInt(sessionStorage.getItem('currentPositionIndex') || '0');
    
    // Load existing customizations
    const storedCustomizations = sessionStorage.getItem('positionCustomizations');
    if (storedCustomizations) {
        positionCustomizations = JSON.parse(storedCustomizations);
    }
    
    updatePositionHeader();
}

// UPDATE POSITION HEADER
function updatePositionHeader() {
    const currentPosition = selectedPositions[currentPositionIndex];
    document.getElementById('currentPositionName').textContent = currentPosition.name;
    document.getElementById('positionCounter').textContent = 
        `(${currentPositionIndex + 1} of ${selectedPositions.length})`;
}

// LOAD BASKET DATA (same as customize-positions.js)
function loadBasketData() {
    const basket = JSON.parse(localStorage.getItem('quoteBasket')) || [];
    const basketListEl = document.getElementById('basketItemsList');

    if (basket.length === 0) {
        alert('No items in basket. Please add products first.');
        window.location.href = 'home.html';
        return;
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
                    <div class="product-code">${g.code} - ${g.color}</div>
                    <div class="product-sizes">${g.qty}x${g.size}</div>
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
                    ❌
                </button>
            </div>
        `;
    });

    basketListEl.innerHTML = basketHTML;

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
            removeItem(idx, size);
        };
    });

    const totalQuantity = Object.values(totalsByCode).reduce((sum, qty) => sum + qty, 0);
    const averageUnitPrice = totalQuantity > 0 ? (totalGarmentCost / totalQuantity) : 0;

    const garmentCostEl = document.getElementById('sidebarGarmentCost');
    if (garmentCostEl) {
        garmentCostEl.dataset.unit = averageUnitPrice;
        garmentCostEl.dataset.qty = totalQuantity;
        garmentCostEl.textContent = formatSidebarGarmentCost(averageUnitPrice, totalQuantity);
    }

    updateSidebarCosts();
    refreshBasketLinePrices();
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
}

let itemToRemove = null;
let itemToRemoveSize = null;

function removeItem(index, size) {
    itemToRemove = index;
    itemToRemoveSize = size || null;
    showRemoveModal();
}

function showRemoveModal() {
    // Create modal if doesn't exist
    let modal = document.getElementById('confirmRemoveModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirmRemoveModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-box">
                <h3>Remove this item from basket?</h3>
                <div class="modal-buttons">
                    <button class="modal-btn modal-btn-cancel" onclick="closeRemoveModal()">Cancel</button>
                    <button class="modal-btn modal-btn-ok" onclick="confirmRemove()">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
}

function closeRemoveModal() {
    const modal = document.getElementById('confirmRemoveModal');
    if (modal) {
        modal.style.display = 'none';
    }
    itemToRemove = null;
    itemToRemoveSize = null;
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
}

// INITIALIZE FORM
function initializeForm() {
    // Load existing customization for this position if any
    const existingCustomization = positionCustomizations[currentPositionIndex];
    if (existingCustomization) {
        console.log('Loading existing customization:', existingCustomization);
        document.getElementById('customisationName').value = existingCustomization.name || '';
        
        // Set method
        document.querySelectorAll('.method-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.method === existingCustomization.method);
        });
        
        // Set type
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === existingCustomization.type);
        });
        
        // Restore uploaded logo
        if (existingCustomization.logo) {
            console.log('Restoring logo:', existingCustomization.logo.name);
            uploadedLogo = existingCustomization.logo;
            showLogoPreview(existingCustomization.logo);
        }
    } else {
        console.log('No existing customization for position', currentPositionIndex);
    }
    
    // Method selection
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateSidebarCosts();
        });
    });
    
    // Type selection
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Always show upload section
    const logoSection = document.getElementById('logoUploadSection');
    if (logoSection) {
        logoSection.style.display = 'block';
    }
    
    // Upload tabs
    document.querySelectorAll('.upload-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.upload-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });
    
    // File upload
    initializeFileUpload();
}

// FILE UPLOAD
function initializeFileUpload() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('logoInput');
    
    console.log('Initializing file upload...');
    console.log('Dropzone:', dropzone);
    console.log('FileInput:', fileInput);
    
    if (!dropzone || !fileInput) {
        console.error('Dropzone or file input not found!');
        return;
    }
    
    // Click to upload
    dropzone.addEventListener('click', () => {
        console.log('Dropzone clicked!');
        fileInput.click();
    });
    
    // File selected
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        console.log('File selected:', file);
        if (file) {
            handleFileUpload(file);
        }
    });
    
    // Drag and drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });
}

function handleFileUpload(file) {
    console.log('File uploaded:', file.name, file.type, file.size);
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/postscript'];
    const validExtensions = ['.jpg', '.jpeg', '.png', '.eps', '.ai', '.pdf'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        alert('Please upload a valid file: .jpg, .png, .eps, .ai, or .pdf');
        return;
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
    }
    
    // Read file
    const reader = new FileReader();
    reader.onload = (e) => {
        console.log('File loaded successfully');
        uploadedLogo = {
            name: file.name,
            data: e.target.result,
            type: file.type
        };
        showLogoPreview(uploadedLogo);
        updateSidebarCosts();
    };
    reader.readAsDataURL(file);
}

function showLogoPreview(logo) {
    console.log('Showing preview for:', logo.name);
    // Show copyright modal first
    showCopyrightModal(logo);
}

// SHOW COPYRIGHT PERMISSION MODAL
function showCopyrightModal(logo) {
    const modal = document.createElement('div');
    modal.className = 'copyright-modal';
    modal.id = 'copyrightModal';
    modal.innerHTML = `
        <div class="copyright-content">
            <div class="copyright-header">
                <h2>Confirm Copyright Permission</h2>
            </div>
            
            <div class="copyright-body">
                <div class="logo-preview-copyright">
                    <img src="${logo.data}" alt="Uploaded Logo">
                </div>
                
                <div class="copyright-text">
                    <p>In order to use a design you must have the full rights to it. If you are unsure or have any doubts, please confirm your ownership or seek permission from the copyright owner.</p>
                    
                    <p><strong>When you save a design, you are agreeing to the following terms:</strong></p>
                    
                    <ul>
                        <li>I hold commercial rights to reproduce the design.</li>
                        <li>If for any reason the legal owner of this design contacts fulfillment house, they will be directed to me.</li>
                        <li>I understand illegal use of third-party copyright content is a serious offence and can lead to penalties.</li>
                    </ul>
                    
                    <div class="copyright-checkbox">
                        <input type="checkbox" id="copyrightAgree">
                        <label for="copyrightAgree"><strong>I hereby declare I own the rights to print this image.</strong></label>
                    </div>
                </div>
            </div>
            
            <div class="copyright-footer">
                <button class="btn-cancel" onclick="cancelCopyright()">Cancel</button>
                <button class="btn-confirm" id="confirmCopyright" disabled>OK</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Enable/disable OK button based on checkbox
    const checkbox = document.getElementById('copyrightAgree');
    const confirmBtn = document.getElementById('confirmCopyright');
    
    checkbox.addEventListener('change', () => {
        confirmBtn.disabled = !checkbox.checked;
    });
    
    // Confirm button action
    confirmBtn.addEventListener('click', () => {
        acceptCopyright(logo);
    });
}

// ACCEPT COPYRIGHT AND SHOW PREVIEW
function acceptCopyright(logo) {
    const modal = document.getElementById('copyrightModal');
    if (modal) {
        modal.remove();
    }
    
    const preview = document.getElementById('logoPreview');
    const previewImage = document.getElementById('logoPreviewImage');
    const dropzone = document.getElementById('dropzone');
    
    if (logo.type.startsWith('image/')) {
        previewImage.src = logo.data;
        preview.style.display = 'block';
        dropzone.style.display = 'none';
        
        // Add delete button if not exists
        let deleteBtn = preview.querySelector('.delete-logo-btn');
        if (!deleteBtn) {
            deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-logo-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                width: 32px;
                height: 32px;
                background: #dc2626;
                color: white;
                border: none;
                border-radius: 50%;
                font-size: 24px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
                transition: all 0.2s;
                z-index: 10;
            `;
            deleteBtn.onmouseover = () => {
                deleteBtn.style.background = '#991b1b';
                deleteBtn.style.transform = 'scale(1.1)';
            };
            deleteBtn.onmouseout = () => {
                deleteBtn.style.background = '#dc2626';
                deleteBtn.style.transform = 'scale(1)';
            };
            deleteBtn.onclick = (e) => {
                e.preventDefault();
                deleteLogo();
            };
            preview.appendChild(deleteBtn);
        }
        console.log('Preview shown with delete button');
    }
}

// CANCEL COPYRIGHT
function cancelCopyright() {
    const modal = document.getElementById('copyrightModal');
    if (modal) {
        modal.remove();
    }
    
    // Clear the file input
    const fileInput = document.getElementById('logoUpload');
    if (fileInput) {
        fileInput.value = '';
    }
    
    uploadedLogo = null;
}

// DELETE LOGO
function deleteLogo() {
    console.log('Deleting logo...');
    uploadedLogo = null;
    
    const preview = document.getElementById('logoPreview');
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('logoFileInput');
    
    if (preview) preview.style.display = 'none';
    if (dropzone) dropzone.style.display = 'flex';
    if (fileInput) fileInput.value = '';
    
    updateSidebarCosts();
    console.log('Logo deleted');
}

// UPDATE SIDEBAR COSTS
function updateSidebarCosts() {
    // Get ALL products from basket
    const basket = JSON.parse(localStorage.getItem('quoteBasket')) || [];
    if (basket.length === 0) return;
    
    // Calculate total quantity of all items
    const totalQuantity = basket.reduce((sum, item) => sum + item.quantity, 0);
    
    // Calculate garment cost from basket
    const garmentCost = basket.reduce((sum, item) => sum + ((Number(item.price) || 0) * ((Number(item.quantity) || 0))), 0);
    
    // Get position methods from sessionStorage
    const positionMethods = JSON.parse(sessionStorage.getItem('positionMethods')) || {};
    
    // Calculate application costs and build individual rows
    let totalApplicationCosts = 0;
    let customizationHTML = '';
    
    selectedPositions.forEach((pos, index) => {
        const method = positionMethods[pos.position] || 'embroidery';
        const price = method === 'print' ? pos.pricePrint : pos.priceEmb;
        const positionTotal = price * totalQuantity;
        totalApplicationCosts += positionTotal;
        
        // Get the customization details to show type (logo/text)
        const customization = positionCustomizations[index];
        const customizationType = customization?.type || 'logo';
        const methodLabel = method === 'print' ? 'Print' : 'Embroidery';
        
        // Create descriptive label: "Left Chest Embroidery" or "Left Chest Text"
        const typeLabel = customizationType === 'text' ? 'Text' : methodLabel;
        const positionName = pos.name || pos.position;
        const label = `${positionName} ${typeLabel}`;
        
        customizationHTML += `
            <div class="section embroidery" data-vat-row data-price="${price}" data-qty="${totalQuantity}">
                <div class="row">
                    <span class="label white">${label}</span>
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
        totalEl.textContent = formatCurrency(total) + ' ' + vatSuffix();
    }

    refreshCustomizationCostRows();
    refreshSidebarTotal();
}

// VALIDATION AND NAVIGATION
function validateAndNext() {
    const customisationName = document.getElementById('customisationName').value.trim();
    const nameError = document.getElementById('nameError');
    
    if (!customisationName) {
        nameError.style.display = 'block';
        document.getElementById('customisationName').focus();
        return;
    }
    
    nameError.style.display = 'none';
    
    // Save current position customization
    const selectedMethod = document.querySelector('.method-btn.active')?.dataset.method || 'embroidery';
    const selectedType = document.querySelector('.type-btn.active')?.dataset.type || 'logo';
    
    const customization = {
        position: selectedPositions[currentPositionIndex].name,
        name: customisationName,
        method: selectedMethod,
        type: selectedType,
        uploadedLogo: uploadedLogo ? uploadedLogo.data : null
    };
    
    console.log('Saving customization:', customization);
    
    positionCustomizations[currentPositionIndex] = customization;
    sessionStorage.setItem('positionCustomizations', JSON.stringify(positionCustomizations));
    
    console.log('All customizations saved:', positionCustomizations);
    
    // Check if there are more positions
    if (currentPositionIndex < selectedPositions.length - 1) {
        // Go to next position
        currentPositionIndex++;
        sessionStorage.setItem('currentPositionIndex', currentPositionIndex.toString());
        console.log('Moving to position', currentPositionIndex);
        window.location.reload();
    } else {
        // Go to basket
        console.log('All positions done, going to basket');
        window.location.href = 'quote-basket.html';
    }
}

function goBackToPositions() {
    // Save current work before going back (if there's any input)
    const customisationName = document.getElementById('customisationName').value.trim();
    if (customisationName) {
        const selectedMethod = document.querySelector('.method-btn.active')?.dataset.method || 'embroidery';
        const selectedType = document.querySelector('.type-btn.active')?.dataset.type || 'logo';
        
        const customization = {
            position: selectedPositions[currentPositionIndex].name,
            name: customisationName,
            method: selectedMethod,
            type: selectedType,
            uploadedLogo: uploadedLogo ? uploadedLogo.data : null
        };
        
        positionCustomizations[currentPositionIndex] = customization;
        sessionStorage.setItem('positionCustomizations', JSON.stringify(positionCustomizations));
    }
    
    // Keep selectedPositions and positionMethods in sessionStorage - DON'T remove them
    // Just go back to positions page
    window.location.href = 'customize-positions.html';
}
