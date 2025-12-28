// INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔵 Quote Basket: DOM Loaded');
    loadBasketData();
    calculateBreakdown();
});

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

function refreshPriceCells() {
    document.querySelectorAll('.price-cell[data-total]').forEach(function (cell) {
        var baseTotal = Number(cell.dataset.total);
        if (!Number.isFinite(baseTotal)) {
            return;
        }
        cell.textContent = formatCurrency(baseTotal) + ' ' + vatSuffix();
    });
}

function refreshBreakdownDisplay() {
    var vatOn = isVatOn();

    var garmentEl = document.getElementById('garmentCosts');
    if (garmentEl) {
        var garmentBase = Number(garmentEl.dataset.base) || 0;
        garmentEl.textContent = formatCurrency(garmentBase) + ' ' + vatSuffix();
    }

    var applicationEl = document.getElementById('applicationCosts');
    if (applicationEl) {
        var applicationBase = Number(applicationEl.dataset.base) || 0;
        applicationEl.textContent = formatCurrency(applicationBase) + ' ' + vatSuffix();
    }

    // Update individual customization cost rows
    const customizationRows = document.querySelectorAll('#customizationCostsBreakdown .breakdown-item[data-vat-row]');
    customizationRows.forEach(row => {
        const baseValue = Number(row.dataset.base) || 0;
        const valueEl = row.querySelector('.breakdown-value');
        if (valueEl) {
            valueEl.textContent = formatCurrency(baseValue) + ' ' + vatSuffix();
        }
    });

    var logoEl = document.getElementById('logoSetupCosts');
    if (logoEl) {
        var logoBase = Number(logoEl.dataset.base) || 0;
        logoEl.textContent = formatCurrency(logoBase) + ' ' + vatSuffix();
    }

    var deliveryEl = document.getElementById('deliveryCosts');
    if (deliveryEl) {
        var deliveryBase = Number(deliveryEl.dataset.base) || 0;
        deliveryEl.textContent = formatCurrency(deliveryBase) + ' ' + vatSuffix();
    }

    var vatEl = document.getElementById('vatCosts');
    if (vatEl) {
        var vatBase = Number(vatEl.dataset.base) || 0;
        var vatDisplay = vatOn ? vatBase : 0;
        vatEl.textContent = formatCurrency(vatDisplay, { includeVat: false });
    }

    var totalEl = document.getElementById('totalCosts');
    if (totalEl) {
        var subtotalBase = Number(totalEl.dataset.base) || 0;
        totalEl.textContent = formatCurrency(subtotalBase) + ' ' + vatSuffix();
    }
}

document.addEventListener('brandeduk:vat-change', function () {
    refreshPriceCells();
    refreshBreakdownDisplay();
});

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

function applyProductPricing(productData) {
    if (!productData) return 0;
    const totalQty = Number(productData.quantity) || 0;
    const fallbackBase = productData.basePrice !== undefined ? Number(productData.basePrice) : Number(productData.price);
    const unitPrice = getDiscountedUnitPrice(productData.code, totalQty, fallbackBase);
    if (PRICING_RULES[productData.code]) {
        productData.basePrice = PRICING_RULES[productData.code].basePrice;
    } else if (productData.basePrice === undefined) {
        productData.basePrice = fallbackBase || unitPrice;
    }
    productData.price = unitPrice.toFixed(2);
    return unitPrice;
}

// LOAD BASKET DATA
function loadBasketData() {
    console.log('🔵 Loading basket data...');
    
    const productDataStr = sessionStorage.getItem('customizingProduct');
    console.log('📦 Product Data String:', productDataStr);
    
    const productData = productDataStr ? JSON.parse(productDataStr) : null;
    console.log('📦 Product Data Parsed:', productData);
    
    const positionCustomizations = JSON.parse(sessionStorage.getItem('positionCustomizations') || '[]');
    const selectedPositions = JSON.parse(sessionStorage.getItem('selectedPositions') || '[]');
    
    console.log('🎯 Positions:', selectedPositions);
    console.log('🎨 Customizations:', positionCustomizations);
    
    if (!productData) {
        console.log('❌ No product data - showing empty basket');
        showEmptyBasket();
        return;
    }
    
    console.log('✅ Product data found - rendering basket');
    applyProductPricing(productData);
    sessionStorage.setItem('customizingProduct', JSON.stringify(productData));
    renderBasketItems(productData, positionCustomizations, selectedPositions);
    renderCustomizationDetails(positionCustomizations);
}

// SHOW EMPTY BASKET
function showEmptyBasket() {
    const tbody = document.getElementById('basketItemsBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 3rem;">
                <p style="font-size: 1.125rem; color: #6b7280; margin-bottom: 1rem;">Your basket is empty</p>
                <a href="home.html" class="btn-primary" style="display: inline-block; padding: 0.75rem 1.5rem; background-color: #0033a0; color: white; text-decoration: none; border-radius: 6px;">Start Shopping</a>
            </td>
        </tr>
    `;
}

// RENDER BASKET ITEMS
function renderBasketItems(productData, positionCustomizations, selectedPositions) {
    const tbody = document.getElementById('basketItemsBody');
    tbody.innerHTML = '';
    
    // Calculate total price (garment + customizations)
        const unitPrice = applyProductPricing(productData);
    const quantity = parseInt(productData.quantity) || 1;
        const totalGarmentCost = unitPrice * quantity;
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>
            <div class="product-cell">
                <img src="${productData.selectedColorUrl || productData.image}" alt="${productData.name}" class="product-image">
                <div class="product-info">
                    <h4>${productData.name}</h4>
                    <p>${productData.code}</p>
                </div>
            </div>
        </td>
        <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div class="colour-swatch" style="background-image: url('${productData.selectedColorUrl}'); background-size: cover;"></div>
                <span>${productData.selectedColorName || productData.color || 'N/A'}</span>
            </div>
        </td>
        <td>Mixed</td>
        <td>
            <div class="qty-toggle">
                <button type="button" class="qty-toggle-btn minus" onclick="decreaseQty()" aria-label="Decrease quantity">-</button>
                <span class="qty-toggle-value">${quantity}</span>
                <button type="button" class="qty-toggle-btn plus" onclick="increaseQty()" aria-label="Increase quantity">+</button>
            </div>
        </td>
        <td class="price-cell" data-total="${totalGarmentCost}">${formatCurrency(totalGarmentCost)} ${vatSuffix()}</td>
        <td>
            <button class="btn-remove" onclick="removeItem()" title="Remove item">×</button>
        </td>
    `;
    
    tbody.appendChild(row);
    refreshPriceCells();
}

// RENDER CUSTOMIZATION DETAILS
function renderCustomizationDetails(positionCustomizations) {
    const container = document.getElementById('customizationSection');
    
    if (!positionCustomizations || positionCustomizations.length === 0) {
        container.innerHTML = `
            <div class="customization-header">No customizations added</div>
            <p style="text-align: center; color: #6b7280; padding: 1rem;">No logos or customizations have been added to this product.</p>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="customization-header">Customization Details (${positionCustomizations.length} position${positionCustomizations.length > 1 ? 's' : ''})</div>
        <div id="positionsList" style="display: grid; gap: 0.75rem; margin-top: 1rem;">
        </div>
    `;
    
    const positionsList = document.getElementById('positionsList');
    
    positionCustomizations.forEach((customization, index) => {
        const positionDiv = document.createElement('div');
        positionDiv.className = 'position-detail';
        
        // Logo preview
        let logoPreviewHtml = '';
        if (customization.uploadedLogo) {
            logoPreviewHtml = `<img src="${customization.uploadedLogo}" alt="Logo" class="logo-preview-small">`;
        }
        
        const methodBadge = customization.method === 'embroidery' 
            ? '<span style="background: #7c3aed; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">EMBROIDERY</span>'
            : '<span style="background: #14b8a6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">PRINT</span>';
        
        positionDiv.innerHTML = `
            <div class="position-name">${customization.position} ${methodBadge}</div>
            <div class="position-method">Type: ${customization.type || 'Logo'}</div>
            ${logoPreviewHtml}
        `;
        
        positionsList.appendChild(positionDiv);
    });
}

// GET POSITION DIAGRAM
function getPositionDiagram(positionName) {
    // Simple hoodie SVG with position dot
    const positions = {
        'Left Breast': { x: '30%', y: '35%' },
        'Right Breast': { x: '70%', y: '35%' },
        'Left Arm': { x: '15%', y: '40%' },
        'Right Arm': { x: '85%', y: '40%' },
        'Small Centre Front': { x: '50%', y: '30%' },
        'Large Centre Front': { x: '50%', y: '45%' },
        'Large Back': { x: '50%', y: '35%' }
    };
    
    const pos = positions[positionName] || { x: '50%', y: '50%' };
    
    return `
        <svg viewBox="0 0 100 120" style="fill: none; stroke: #9ca3af; stroke-width: 2;">
            <!-- Hoodie outline -->
            <path d="M20,30 Q15,35 15,45 L15,100 L35,100 L35,110 L65,110 L65,100 L85,100 L85,45 Q85,35 80,30" />
            <path d="M20,30 L30,20 L35,25 L50,15 L65,25 L70,20 L80,30" />
            <circle cx="25" cy="25" r="8" />
            <circle cx="75" cy="25" r="8" />
            <circle cx="50" cy="20" r="3" fill="#9ca3af" />
        </svg>
        <div class="position-dot" style="left: ${pos.x}; top: ${pos.y};"></div>
    `;
}

// PREVIEW LOGO
function previewLogo(logoData) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        cursor: pointer;
    `;
    
    modal.innerHTML = `
        <img src="${logoData}" style="max-width: 90%; max-height: 90%; border-radius: 8px;" alt="Logo Preview">
    `;
    
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
}

// CALCULATE BREAKDOWN
function calculateBreakdown() {
    const productData = JSON.parse(sessionStorage.getItem('customizingProduct'));
    const positionCustomizations = JSON.parse(sessionStorage.getItem('positionCustomizations')) || [];
    const positionMethods = JSON.parse(sessionStorage.getItem('positionMethods')) || {};
    
    const garmentEl = document.getElementById('garmentCosts');
    const applicationEl = document.getElementById('applicationCosts');
    const logoEl = document.getElementById('logoSetupCosts');
    const deliveryEl = document.getElementById('deliveryCosts');
    const vatEl = document.getElementById('vatCosts');
    const totalEl = document.getElementById('totalCosts');

    if (!productData) {
        if (garmentEl) garmentEl.dataset.base = 0;
        if (applicationEl) applicationEl.dataset.base = 0;
        if (logoEl) logoEl.dataset.base = 0;
        if (deliveryEl) deliveryEl.dataset.base = 0;
        if (vatEl) vatEl.dataset.base = 0;
        if (totalEl) totalEl.dataset.base = 0;
        refreshBreakdownDisplay();
        return;
    }
    
    const appliedUnitPrice = applyProductPricing(productData);
    sessionStorage.setItem('customizingProduct', JSON.stringify(productData));
    
    // Garment cost
    const garmentUnitPrice = appliedUnitPrice;
    const totalQuantity = parseInt(productData.quantity) || 1;
    const garmentTotal = garmentUnitPrice * totalQuantity;
    if (garmentEl) garmentEl.dataset.base = garmentTotal;
    
    // Application costs (sum of all positions) - now rendered as individual rows
    let applicationTotal = 0;
    
    // Position prices
    const positionPrices = {
        'Left Breast': { embroidery: 5, print: 3.50 },
        'Right Breast': { embroidery: 5, print: 3.50 },
        'Left Arm': { embroidery: 5, print: 3.50 },
        'Right Arm': { embroidery: 5, print: 3.50 },
        'Small Centre Front': { embroidery: 5, print: 3.50 },
        'Large Centre Front': { embroidery: 7, print: 5 },
        'Large Back': { embroidery: 7, print: 5 }
    };
    
    // Build individual customization cost rows
    const customizationBreakdownEl = document.getElementById('customizationCostsBreakdown');
    let customizationRowsHTML = '';
    
    positionCustomizations.forEach((customization) => {
        const positionName = customization.position;
        const method = customization.method;
        const customizationType = customization.type || 'logo';
        
        if (positionPrices[positionName]) {
            const price = positionPrices[positionName][method] || 0;
            const positionTotal = price * totalQuantity;
            applicationTotal += positionTotal;
            
            // Create descriptive label
            const methodLabel = method === 'print' ? 'Print' : 'Embroidery';
            const typeLabel = customizationType === 'text' ? 'Text' : methodLabel;
            const label = `${positionName} ${typeLabel}`;
            
            customizationRowsHTML += `
                <div class="breakdown-item" data-vat-row data-base="${positionTotal}">
                    <span>${label}:</span>
                    <span class="breakdown-value"></span>
                </div>
            `;
        }
    });
    
    if (customizationBreakdownEl) {
        customizationBreakdownEl.innerHTML = customizationRowsHTML;
    }
    
    // Keep applicationEl for backward compatibility but hide it
    if (applicationEl) {
        applicationEl.dataset.base = applicationTotal;
        applicationEl.style.display = 'none';
    }
    
    // Logo setup cost
    const hasLogo = positionCustomizations.some(c => c.uploadedLogo);
    const logoSetupCost = hasLogo ? 12.00 : 0;
    if (logoEl) logoEl.dataset.base = logoSetupCost;
    
    // Delivery
    const deliveryCost = 0; // Free delivery
    if (deliveryEl) deliveryEl.dataset.base = deliveryCost;
    
    // Subtotal
    const subtotal = garmentTotal + applicationTotal + logoSetupCost + deliveryCost;
    
    // VAT (20%)
    const vatCost = subtotal * vatRate();
    if (vatEl) vatEl.dataset.base = vatCost;
    
    // Total with VAT
    if (totalEl) totalEl.dataset.base = subtotal;

    refreshBreakdownDisplay();
}

// QUANTITY CONTROLS
function increaseQty() {
    const productData = JSON.parse(sessionStorage.getItem('customizingProduct'));
    if (!productData) return;
    
    productData.quantity = (parseInt(productData.quantity) || 1) + 1;
    applyProductPricing(productData);
    
    sessionStorage.setItem('customizingProduct', JSON.stringify(productData));
    
    loadBasketData();
    calculateBreakdown();
}

function decreaseQty() {
    const productData = JSON.parse(sessionStorage.getItem('customizingProduct'));
    if (!productData) return;
    
    const currentQty = parseInt(productData.quantity) || 1;
    if (currentQty > 1) {
        productData.quantity = currentQty - 1;
        applyProductPricing(productData);
        
        sessionStorage.setItem('customizingProduct', JSON.stringify(productData));
        
        loadBasketData();
        calculateBreakdown();
    }
}

function removeItem() {
    if (confirm('Are you sure you want to remove this item from your basket?')) {
        sessionStorage.removeItem('customizingProduct');
        sessionStorage.removeItem('positionCustomizations');
        sessionStorage.removeItem('selectedPositions');
        sessionStorage.removeItem('currentPositionIndex');
        
        loadBasketData();
        calculateBreakdown();
    }
}

function clearBasket() {
    if (confirm('Are you sure you want to clear your basket?')) {
        sessionStorage.clear();
        loadBasketData();
        calculateBreakdown();
    }
}

// PROCEED TO QUOTE FORM
function proceedToQuoteForm() {
    console.log('📝 Proceeding to Quote Form...');
    window.location.href = 'quote-form.html';
}

function removeItem() {
    if (confirm('Are you sure you want to remove this item from your basket?')) {
        sessionStorage.removeItem('customizingProduct');
        sessionStorage.removeItem('positionCustomizations');
        sessionStorage.removeItem('selectedPositions');
        loadBasketData();
        calculateBreakdown();
    }
}