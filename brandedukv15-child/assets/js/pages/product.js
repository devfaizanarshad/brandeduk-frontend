/* ---------------------------------------------------
   CONFIG
--------------------------------------------------- */

// Product data will be loaded from API or sessionStorage
let PRODUCT_CODE = null;
let PRODUCT_NAME = null;
let BASE_PRICE = null;
let PRODUCT_DATA = null;
let DISCOUNTS = [];

// API Configuration
const API_BASE_URL = 'https://brandeduk-backend.onrender.com/api';

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
    return vat && typeof vat.suffix === 'function'
        ? vat.suffix()
        : (isVatOn() ? 'inc VAT' : 'ex VAT');
}

function vatAmount(baseAmount) {
    if (!isVatOn()) {
        return 0;
    }
    return (Number(baseAmount) || 0) * vatRate();
}

// Update all pricing displays when VAT changes
function updateAllPricing() {
    // Update main price
    const mainPriceEl = document.getElementById('mainPrice');
    if (mainPriceEl) {
        const priceValue = formatCurrency(BASE_PRICE);
        const suffix = ' <span>each ' + vatSuffix() + '</span>';
        mainPriceEl.innerHTML = priceValue + suffix;
    }

    // Update discount boxes (old class .disc-box)
    const discountBoxes = document.querySelectorAll('.disc-box');
    discountBoxes.forEach(box => {
        const basePrice = parseFloat(box.dataset.basePrice);
        if (!isNaN(basePrice)) {
            const priceEl = box.querySelector('.price');
            if (priceEl) {
                priceEl.textContent = formatCurrency(basePrice);
            }
        }
    });

    // Update tier pricing boxes (new class .tier-item)
    const tierItems = document.querySelectorAll('.tier-item');
    tierItems.forEach(item => {
        const basePrice = parseFloat(item.dataset.basePrice);
        if (!isNaN(basePrice)) {
            const priceEl = item.querySelector('.tier-price');
            if (priceEl) {
                priceEl.textContent = formatCurrency(basePrice);
            }
        }
    });

    // Trigger refresh of any basket/summary displays
    if (typeof updateTotals === 'function') {
        updateTotals();
    }
}

// Listen for VAT toggle changes
document.addEventListener('brandeduk:vat-change', function(event) {
    updateAllPricing();
    updateBasketTotalBox(); // Refresh basket box on VAT change
});

// ===== LOAD PRODUCT DATA =====
async function loadProductData() {
    // Try to get product code from sessionStorage first
    const savedProductCode = sessionStorage.getItem('selectedProduct');
    const savedProductData = sessionStorage.getItem('selectedProductData');
    
    let productData = null;
    
    // Try to parse saved product data
    if (savedProductData) {
        try {
            productData = JSON.parse(savedProductData);
            console.log('✅ Loaded product from sessionStorage:', productData);
        } catch (e) {
            console.warn('Failed to parse saved product data:', e);
        }
    }
    
    // If we have a product code but no data, or data doesn't match, fetch from API
    const productCode = savedProductCode || (productData && productData.code);
    
    if (productCode && (!productData || productData.code !== productCode)) {
        console.log('Fetching product from API...', productCode);
        try {
            const response = await fetch(`${API_BASE_URL}/products/${productCode}`);
            if (response.ok) {
                productData = await response.json();
                console.log('✅ Loaded product from API:', productData);
                // Save to sessionStorage for next time
                sessionStorage.setItem('selectedProductData', JSON.stringify(productData));
            } else {
                console.error('❌ API returned error:', response.status);
            }
        } catch (error) {
            console.error('❌ Failed to fetch product from API:', error);
        }
    }
    
    if (!productData) {
        console.error('❌ No product data available!');
        alert('Product not found. Please go back and select a product.');
        return false;
    }
    
    // Initialize product variables
    PRODUCT_DATA = productData;
    PRODUCT_CODE = productData.code;
    PRODUCT_NAME = productData.name;
    BASE_PRICE = productData.price;
    
    // Convert priceBreaks to DISCOUNTS format
    if (productData.priceBreaks && productData.priceBreaks.length > 0) {
        DISCOUNTS = productData.priceBreaks.map((breakItem, index) => {
            const prevPrice = index > 0 ? productData.priceBreaks[index - 1].price : BASE_PRICE;
            const save = prevPrice > 0 ? Math.round(((prevPrice - breakItem.price) / prevPrice) * 100) : 0;
            return {
                min: breakItem.min,
                max: breakItem.max,
                price: breakItem.price,
                save: save
            };
        });
    } else {
        // Fallback: single price tier
        DISCOUNTS = [{ min: 1, max: 99999, price: BASE_PRICE, save: 0 }];
    }
    
    console.log('✅ Product initialized:', {
        code: PRODUCT_CODE,
        name: PRODUCT_NAME,
        price: BASE_PRICE,
        discounts: DISCOUNTS
    });
    
    return true;
}

// Initialize tier pricing from API data
function initTierPricing() {
    const tierPricingContainer = document.getElementById('tierPricingContainer');
    if (!tierPricingContainer || !DISCOUNTS || DISCOUNTS.length === 0) {
        return;
    }
    
    // Clear existing tier items
    tierPricingContainer.innerHTML = '';
    
    // Create tier items from DISCOUNTS array
    DISCOUNTS.forEach((tier, index) => {
        const tierItem = document.createElement('div');
        tierItem.className = 'tier-item';
        tierItem.setAttribute('data-min', tier.min);
        tierItem.setAttribute('data-max', tier.max);
        tierItem.setAttribute('data-base-price', tier.price);
        
        // Format quantity range
        let qtyText = '';
        if (tier.max >= 99999) {
            qtyText = `${tier.min}+`;
        } else {
            qtyText = `${tier.min}-${tier.max}`;
        }
        
        // Calculate save percentage (compared to first tier/base price)
        const firstTierPrice = DISCOUNTS[0].price;
        const savePercent = firstTierPrice > 0 && tier.price < firstTierPrice 
            ? Math.round(((firstTierPrice - tier.price) / firstTierPrice) * 100) 
            : 0;
        
        tierItem.innerHTML = `
            <span class="tier-qty">${qtyText}</span>
            <span class="tier-price">£${tier.price.toFixed(2)}</span>
            ${savePercent > 0 ? `<span class="tier-save">-${savePercent}%</span>` : ''}
        `;
        
        tierPricingContainer.appendChild(tierItem);
    });
}

// Initialize product data and then update page
document.addEventListener('DOMContentLoaded', async function() {
    const loaded = await loadProductData();
    if (loaded) {
        // Update page title
        if (PRODUCT_NAME) {
            document.title = `${PRODUCT_NAME} - Branded UK`;
        }
        
        // Update product name and code in the page (if elements exist)
        const productNameEl = document.querySelector('.product-name, h1, [data-product-name], .garment-main-title');
        if (productNameEl && PRODUCT_NAME) {
            productNameEl.textContent = PRODUCT_NAME;
        }
        
        const productCodeEl = document.querySelector('.product-code, [data-product-code], .prod-code-value');
        if (productCodeEl && PRODUCT_CODE) {
            productCodeEl.textContent = PRODUCT_CODE;
        }
        
        // Update description box title (h2)
        const descTitleEl = document.querySelector('.description-box h2');
        if (descTitleEl && PRODUCT_NAME) {
            descTitleEl.textContent = PRODUCT_NAME;
        }
        
        // Update sidebar product name and code
        const sidebarProductName = document.getElementById('sidebarProductName');
        if (sidebarProductName && PRODUCT_NAME) {
            sidebarProductName.textContent = PRODUCT_NAME;
        }
        
        const sidebarProductCode = document.getElementById('sidebarProductCode');
        if (sidebarProductCode && PRODUCT_CODE) {
            sidebarProductCode.textContent = 'EE-' + PRODUCT_CODE;
        }
        
        // Set initial main image from images array or top-level image field
        if (mainImage && PRODUCT_DATA) {
            if (PRODUCT_DATA.images && Array.isArray(PRODUCT_DATA.images)) {
                const mainImageData = PRODUCT_DATA.images.find(img => img.type === 'main');
                if (mainImageData && mainImageData.url) {
                    mainImage.src = mainImageData.url;
                } else if (PRODUCT_DATA.colors && PRODUCT_DATA.colors.length > 0) {
                    // Fallback to first color's main image
                    mainImage.src = PRODUCT_DATA.colors[0].main;
                }
            } else if (PRODUCT_DATA.image) {
                // Use top-level image field if images array is not available
                mainImage.src = PRODUCT_DATA.image;
            } else if (PRODUCT_DATA.colors && PRODUCT_DATA.colors.length > 0) {
                // Final fallback to first color's main image
                mainImage.src = PRODUCT_DATA.colors[0].main;
            }
        }
        
        // Update description if available
        if (PRODUCT_DATA && PRODUCT_DATA.description) {
            const descEl = document.querySelector('.description-box');
            if (descEl) {
                // Find or create paragraph element
                let descText = descEl.querySelector('p');
                if (!descText) {
                    descText = document.createElement('p');
                    descEl.appendChild(descText);
                }
                // Use innerHTML to preserve any HTML formatting from API
                descText.innerHTML = PRODUCT_DATA.description;
            }
        }
        
        // Update product details (fabric, fit, weight, care)
        if (PRODUCT_DATA && PRODUCT_DATA.details) {
            const details = PRODUCT_DATA.details;
            const detailsHTML = [];
            
            if (details.fabric) detailsHTML.push(`<b>Fabric:</b> ${details.fabric}`);
            if (details.weight) detailsHTML.push(`<b>Weight:</b> ${details.weight}`);
            if (details.fit) detailsHTML.push(`<b>Fit:</b> ${details.fit}`);
            if (details.care) detailsHTML.push(`<b>Care:</b> ${details.care}`);
            
            if (detailsHTML.length > 0) {
                const detailsEl = document.querySelector('.description-box, [data-details]');
                if (detailsEl) {
                    // Find or create details section
                    let detailsSection = detailsEl.querySelector('.product-details');
                    if (!detailsSection) {
                        detailsSection = document.createElement('div');
                        detailsSection.className = 'product-details';
                        detailsEl.appendChild(detailsSection);
                    }
                    detailsSection.innerHTML = detailsHTML.join('<br>');
                }
            }
        }
        
        // Initialize thumbnail column from API data
        if (PRODUCT_DATA && PRODUCT_DATA.colors) {
            initThumbnailColumn(PRODUCT_DATA.colors);
        }
        
        // Initialize colors from API data
        if (PRODUCT_DATA && PRODUCT_DATA.colors) {
            initColors(PRODUCT_DATA.colors);
        }
        
        // Initialize sizes from API data
        if (PRODUCT_DATA && PRODUCT_DATA.sizes) {
            initSizes(PRODUCT_DATA.sizes);
        }
        
        // Initialize tier pricing from API data
        initTierPricing();
    }
    
    updateAllPricing();
    updateBasketTotalBox(); // Load basket total box
});

// Update the Basket Total Box showing all basket items
function updateBasketTotalBox() {
    const basketTotalItems = document.getElementById('basketTotalItems');
    const basketGrandTotal = document.getElementById('basketGrandTotal');
    const basketTotalBox = document.getElementById('basketTotalBox');
    
    if (!basketTotalItems || !basketGrandTotal) return;
    
    const basket = JSON.parse(localStorage.getItem('quoteBasket')) || [];
    
    // Hide box if basket is empty
    if (basket.length === 0) {
        if (basketTotalBox) basketTotalBox.style.display = 'none';
        return;
    }
    
    // Show box if there are items
    if (basketTotalBox) basketTotalBox.style.display = 'block';
    
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

// Listen for storage changes (cross-tab sync)
window.addEventListener('storage', function(e) {
    if (e.key === 'quoteBasket') {
        updateBasketTotalBox();
    }
});

// Selected customization method (will be set in customize-positions)
let selectedCustomizationMethod = null; // 'embroidery' or 'print'

// Track if basket has items
let hasBasketItems = false;

let clearBasketResolver = null;
let clearBasketModalInitialized = false;

function hideClearBasketPrompt(result = false) {
    const overlay = document.getElementById('clearBasketModal');
    if (overlay) {
        overlay.classList.remove('is-visible');
        overlay.setAttribute('aria-hidden', 'true');
    }
    if (typeof clearBasketResolver === 'function') {
        clearBasketResolver(result);
        clearBasketResolver = null;
    }
}

function initClearBasketModal() {
    if (clearBasketModalInitialized) return;
    const overlay = document.getElementById('clearBasketModal');
    if (!overlay) return;

    const confirmBtn = overlay.querySelector('[data-confirm]');
    const cancelButtons = overlay.querySelectorAll('[data-cancel]');

    confirmBtn?.addEventListener('click', () => hideClearBasketPrompt(true));
    cancelButtons.forEach(btn => btn.addEventListener('click', () => hideClearBasketPrompt(false)));

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            hideClearBasketPrompt(false);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && overlay.classList.contains('is-visible')) {
            hideClearBasketPrompt(false);
        }
    });

    clearBasketModalInitialized = true;
}

function showClearBasketPrompt() {
    const overlay = document.getElementById('clearBasketModal');

    if (!overlay) {
        const fallback = window.confirm('Are you sure you want to clear the entire basket?');
        return Promise.resolve(fallback);
    }

    initClearBasketModal();

    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden', 'false');

    const confirmBtn = overlay.querySelector('[data-confirm]');
    setTimeout(() => confirmBtn?.focus(), 10);

    return new Promise(resolve => {
        clearBasketResolver = resolve;
    });
}

class DeleteButton {
    constructor(el, { onClear } = {}) {
        this.el = typeof el === 'string' ? document.querySelector(el) : el;
        this.onClear = onClear;
        this.isRunning = false;
        this.animationHandled = false;

        if (!this.el) return;

        this.letters = this.el.querySelector('[data-anim]');
        this.handleClick = this.handleClick.bind(this);
        this.handleAnimationEnd = this.handleAnimationEnd.bind(this);

        this.el.setAttribute('data-running', 'false');
        this.el.addEventListener('click', this.handleClick);
        this.letters?.addEventListener('animationend', this.handleAnimationEnd);
    }

    handleClick(evt) {
        if (this.isRunning || !this.el) return;
        
        // Execute clear directly without confirmation
        this.beginClearSequence();
    }

    beginClearSequence() {
        this.isRunning = true;
        this.animationHandled = false;
        if (this.el) {
            this.el.disabled = true;
            this.el.setAttribute('data-running', 'true');
        }
    }

    handleAnimationEnd(event) {
        if (!this.isRunning || this.animationHandled) return;
        const target = event.target;
        if (!target || !target.classList || !target.classList.contains('del-btn__letter')) {
            return;
        }

        const boxes = this.el ? Array.from(this.el.querySelectorAll('.del-btn__letter-box')) : [];
        if (!boxes.length) return;
        const lastBox = boxes[boxes.length - 1];
        if (target.parentElement !== lastBox) {
            return;
        }

        this.animationHandled = true;

        setTimeout(() => {
            this.isRunning = false;
            if (this.el) {
                this.el.setAttribute('data-running', 'false');
            }

            if (typeof this.onClear === 'function') {
                this.onClear();
            }
        }, 1000);
    }
}

/* ---------------------------------------------------
   ELEMENTS
--------------------------------------------------- */

const mainImage    = document.getElementById("mainImage");
const mainPriceEl  = document.getElementById("mainPrice");
const addContinueButton = document.getElementById("addContinueButton");
const addCustomizeButton = document.getElementById("addCustomizeButton");
const belowSummary = document.getElementById("belowBtnSummary");
const productThumbColumn = document.getElementById("productThumbColumn");

const sizesGrid = document.getElementById("sizesGrid");
const colorGrid = document.getElementById("colorGrid");

/* POPUP */
const popup        = document.getElementById("quotePopup");
const popupContent = document.getElementById("popupContent");
const popupSummary = document.getElementById("popupSummary");
const closePopup   = document.getElementById("closePopup");

const uploadBtnPopup   = document.getElementById("uploadLogoBtn");
const logoInputHidden  = document.getElementById("logoInput");
const logoPreviewPopup = document.getElementById("logoPreview");

/* ---------------------------------------------------
   COLORS
--------------------------------------------------- */

// Colors will be loaded dynamically from PRODUCT_DATA
let colors = [];

// No color selected by default - user must click to select
let selectedColorName = null;
let selectedColorURL  = null;

function initThumbnailGallery() {
    if (!productThumbColumn) return;
    
    // Find thumbnails in the slider inner container or directly in column
    const thumbInner = productThumbColumn.querySelector('.thumb-slider-inner');
    const thumbContainer = thumbInner || productThumbColumn;
    const thumbButtons = Array.from(thumbContainer.querySelectorAll('.thumb-item'));
    if (!thumbButtons.length) return;

    const setActive = (button) => {
        thumbButtons.forEach(btn => btn.classList.toggle('active', btn === button));
    };

    thumbButtons.forEach(button => {
        // Remove existing listeners to avoid duplicates
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', () => {
            const imgSrc = newButton.dataset.image;
            const colorName = newButton.dataset.colorName || newButton.getAttribute('aria-label')?.replace(/^View /, '').split(' ')[0] || '';
            
            if (!imgSrc) return;
            
            // Update main image
            if (mainImage) {
                mainImage.src = imgSrc;
            }
            
            // Find matching color in color grid and select it
            if (colorName && colors.length > 0) {
                const matchingColor = colors.find(([name]) => name === colorName);
                if (matchingColor) {
                    const [name, url] = matchingColor;
                    const colorThumb = document.querySelector(`.color-thumb[data-color-name="${name}"]`);
                    if (colorThumb) {
                        // Check if there are unsaved items
                        const currentTotal = Object.values(qty).reduce((a,b)=>a+b,0);
                        
                        if (currentTotal > 0) {
                            // Show confirmation modal
                            showColorChangeModal(name, url, colorThumb);
                        } else {
                            // No unsaved items, change color directly
                            changeColor(name, url, colorThumb);
                        }
                    }
                }
            }
            
            setActive(newButton);
        });
    });

    const initialActive = thumbButtons.find(btn => btn.classList.contains('active')) || thumbButtons[0];
    if (initialActive) {
        setActive(initialActive);
        if (mainImage && initialActive.dataset.image) {
            mainImage.src = initialActive.dataset.image;
        }
    }

    window.setGalleryActiveBySrc = (src) => {
        const thumbInner = productThumbColumn.querySelector('.thumb-slider-inner');
        const thumbContainer = thumbInner || productThumbColumn;
        const thumbButtons = Array.from(thumbContainer.querySelectorAll('.thumb-item'));
        const match = thumbButtons.find(btn => btn.dataset.image === src);
        if (match) {
            thumbButtons.forEach(btn => btn.classList.remove('active'));
            match.classList.add('active');
            
            // Scroll to active thumbnail if it's not visible
            if (thumbInner && productThumbColumn.querySelectorAll('.thumb-item').length > 5) {
                const matchIndex = parseInt(match.dataset.index || '0');
                const itemHeight = 80;
                const itemsPerView = 5;
                
                // Calculate if we need to scroll
                const currentStart = thumbnailSliderState.currentIndex;
                const currentEnd = currentStart + itemsPerView - 1;
                
                if (matchIndex < currentStart) {
                    // Scroll up to show the active item
                    thumbnailSliderState.currentIndex = Math.max(0, matchIndex);
                } else if (matchIndex > currentEnd) {
                    // Scroll down to show the active item
                    const maxIndex = Math.max(0, thumbnailSliderState.totalItems - itemsPerView);
                    thumbnailSliderState.currentIndex = Math.min(maxIndex, matchIndex - itemsPerView + 1);
                }
                
                const translateY = -thumbnailSliderState.currentIndex * itemHeight;
                thumbInner.style.transform = `translateY(${translateY}px)`;
                updateThumbnailSliderButtons();
            }
        } else {
            thumbButtons.forEach(btn => btn.classList.remove('active'));
        }
    };
}

// Thumbnail slider state
let thumbnailSliderState = {
    currentIndex: 0,
    itemsPerView: 5,
    totalItems: 0
};

/* Initialize thumbnail column dynamically from product colors with slider */
function initThumbnailColumn(productColors) {
    if (!productThumbColumn) {
        console.warn('Thumbnail column element not found');
        return;
    }
    
    if (!productColors || !Array.isArray(productColors) || productColors.length === 0) {
        console.warn('No colors available for thumbnail column');
        productThumbColumn.innerHTML = '';
        return;
    }
    
    // Clear existing thumbnails and wrapper
    productThumbColumn.innerHTML = '';
    
    // Create wrapper for slider
    const sliderWrapper = document.createElement('div');
    sliderWrapper.className = 'thumb-slider-wrapper';
    sliderWrapper.style.cssText = 'position: relative; display: flex; flex-direction: column; gap: 8px;';
    
    // Create container for thumbnails
    const thumbContainer = document.createElement('div');
    thumbContainer.className = 'thumb-slider-container';
    thumbContainer.style.cssText = 'position: relative; overflow: hidden; max-height: 400px;';
    
    // Create inner container for all thumbnails
    const thumbInner = document.createElement('div');
    thumbInner.className = 'thumb-slider-inner';
    thumbInner.style.cssText = 'display: flex; flex-direction: column; gap: 8px; transition: transform 0.3s ease;';
    
    // Create all thumbnail buttons
    productColors.forEach((color, index) => {
        const colorName = color.name || 'Unknown';
        const thumbUrl = color.thumb || color.main || color.url || '';
        const mainUrl = color.main || color.thumb || color.url || '';
        
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'thumb-item';
        button.setAttribute('data-image', mainUrl);
        button.setAttribute('data-color-name', colorName);
        button.setAttribute('data-index', index);
        button.setAttribute('aria-label', `View ${colorName} ${PRODUCT_NAME || 'product'}`);
        button.style.cssText = 'width: 72px; height: 72px; flex-shrink: 0;';
        
        // Set first thumbnail as active by default (only if no color is already selected)
        const savedColorName = sessionStorage.getItem('selectedColorName');
        if (index === 0 && !savedColorName) {
            button.classList.add('active');
        } else if (savedColorName === colorName) {
            button.classList.add('active');
        }
        
        const img = document.createElement('img');
        img.src = thumbUrl;
        img.alt = `${colorName} thumbnail`;
        img.style.cssText = 'width: 100%; height: 100%; object-fit: contain; border-radius: 8px;';
        
        button.appendChild(img);
        thumbInner.appendChild(button);
    });
    
    thumbContainer.appendChild(thumbInner);
    
    // Add navigation buttons if more than 5 colors
    if (productColors.length > 5) {
        // Previous button - positioned at top
        const prevBtn = document.createElement('button');
        prevBtn.className = 'thumb-slider-btn thumb-slider-prev';
        prevBtn.setAttribute('aria-label', 'Previous colors');
        prevBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 12L4 8L8 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        prevBtn.style.cssText = `
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 32px;
            height: 32px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 50%;
            cursor: pointer;
            z-index: 20;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
            color: #374151;
        `;
        prevBtn.onmouseenter = () => {
            if (!prevBtn.disabled) {
                prevBtn.style.background = '#f9fafb';
                prevBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                prevBtn.style.borderColor = '#d1d5db';
            }
        };
        prevBtn.onmouseleave = () => {
            prevBtn.style.background = 'white';
            prevBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            prevBtn.style.borderColor = '#e5e7eb';
        };
        prevBtn.onclick = (e) => {
            e.stopPropagation();
            slideThumbnails('prev');
        };
        
        // Next button - positioned at bottom
        const nextBtn = document.createElement('button');
        nextBtn.className = 'thumb-slider-btn thumb-slider-next';
        nextBtn.setAttribute('aria-label', 'Next colors');
        nextBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 4L12 8L8 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        nextBtn.style.cssText = `
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 32px;
            height: 32px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 50%;
            cursor: pointer;
            z-index: 20;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
            color: #374151;
        `;
        nextBtn.onmouseenter = () => {
            if (!nextBtn.disabled) {
                nextBtn.style.background = '#f9fafb';
                nextBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                nextBtn.style.borderColor = '#d1d5db';
            }
        };
        nextBtn.onmouseleave = () => {
            nextBtn.style.background = 'white';
            nextBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            nextBtn.style.borderColor = '#e5e7eb';
        };
        nextBtn.onclick = (e) => {
            e.stopPropagation();
            slideThumbnails('next');
        };
        
        sliderWrapper.appendChild(thumbContainer);
        sliderWrapper.appendChild(prevBtn);
        sliderWrapper.appendChild(nextBtn);
        
        // Initialize slider state
        thumbnailSliderState.totalItems = productColors.length;
        thumbnailSliderState.currentIndex = 0;
        updateThumbnailSliderButtons();
    } else {
        sliderWrapper.appendChild(thumbContainer);
    }
    
    productThumbColumn.appendChild(sliderWrapper);
    
    // Initialize gallery functionality
    initThumbnailGallery();
    
    // Set initial main image from first color if main image not already set
    const savedColorName = sessionStorage.getItem('selectedColorName');
    if (productColors.length > 0 && mainImage) {
        if (savedColorName) {
            // Use saved color
            const savedColor = productColors.find(c => c.name === savedColorName);
            if (savedColor) {
                const savedMainUrl = savedColor.main || savedColor.thumb || savedColor.url;
                if (savedMainUrl) {
                    mainImage.src = savedMainUrl;
                }
            }
        } else {
            // Use first color
            const firstColor = productColors[0];
            const firstMainUrl = firstColor.main || firstColor.thumb || firstColor.url;
            if (firstMainUrl && (!mainImage.src || mainImage.src.includes('GD067'))) {
                mainImage.src = firstMainUrl;
            }
        }
    }
    
    console.log('✅ Thumbnail column initialized with', productColors.length, 'colors (slider enabled)');
}

function slideThumbnails(direction) {
    const thumbInner = document.querySelector('.thumb-slider-inner');
    if (!thumbInner) return;
    
    const itemHeight = 80; // 72px height + 8px gap
    const maxIndex = Math.max(0, thumbnailSliderState.totalItems - thumbnailSliderState.itemsPerView);
    
    if (direction === 'next') {
        thumbnailSliderState.currentIndex = Math.min(
            thumbnailSliderState.currentIndex + 1,
            maxIndex
        );
    } else {
        thumbnailSliderState.currentIndex = Math.max(
            thumbnailSliderState.currentIndex - 1,
            0
        );
    }
    
    const translateY = -thumbnailSliderState.currentIndex * itemHeight;
    thumbInner.style.transform = `translateY(${translateY}px)`;
    
    updateThumbnailSliderButtons();
}

function updateThumbnailSliderButtons() {
    const prevBtn = document.querySelector('.thumb-slider-prev');
    const nextBtn = document.querySelector('.thumb-slider-next');
    
    if (prevBtn) {
        const isDisabled = thumbnailSliderState.currentIndex === 0;
        prevBtn.disabled = isDisabled;
        prevBtn.style.opacity = isDisabled ? '0.3' : '1';
        prevBtn.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
        prevBtn.style.pointerEvents = isDisabled ? 'none' : 'auto';
        if (isDisabled) {
            prevBtn.style.background = '#f3f4f6';
            prevBtn.style.color = '#9ca3af';
        } else {
            prevBtn.style.background = 'white';
            prevBtn.style.color = '#374151';
        }
    }
    
    if (nextBtn) {
        const maxIndex = Math.max(0, thumbnailSliderState.totalItems - thumbnailSliderState.itemsPerView);
        const isDisabled = thumbnailSliderState.currentIndex >= maxIndex;
        nextBtn.disabled = isDisabled;
        nextBtn.style.opacity = isDisabled ? '0.3' : '1';
        nextBtn.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
        nextBtn.style.pointerEvents = isDisabled ? 'none' : 'auto';
        if (isDisabled) {
            nextBtn.style.background = '#f3f4f6';
            nextBtn.style.color = '#9ca3af';
        } else {
            nextBtn.style.background = 'white';
            nextBtn.style.color = '#374151';
        }
    }
}

/* BUILD COLOR GRID - Dynamic from API */
function initColors(productColors) {
    if (!productColors || !Array.isArray(productColors) || productColors.length === 0) {
        console.warn('No colors available for this product');
        return;
    }
    
    // Clear existing colors
    colorGrid.innerHTML = '';
    colors = [];
    
    // Convert API colors format to internal format: [name, url]
    productColors.forEach(color => {
        const name = color.name || 'Unknown';
        const url = color.main || color.thumb || color.url || '';
        colors.push([name, url]);
    });
    
    // Check for color filter from home page
    const filterColorName = sessionStorage.getItem('filterColorName');
    const savedColorName = sessionStorage.getItem('selectedColorName');
    const basket = JSON.parse(localStorage.getItem('quoteBasket') || '[]');
    
    // Priority: 1. Saved color with basket items, 2. Filter color, 3. Saved color
    let colorToSelect = null;
    let colorToSelectUrl = null;
    
    if (savedColorName) {
        const hasItemsForColor = basket.some(item => item.color === savedColorName);
        if (hasItemsForColor) {
            // Priority 1: Saved color with basket items
            const savedColor = colors.find(([name]) => name === savedColorName);
            if (savedColor) {
                colorToSelect = savedColorName;
                colorToSelectUrl = savedColor[1];
            }
        }
    }
    
    // If no saved color with basket items, check filter color
    if (!colorToSelect && filterColorName) {
        // Try to find matching color (case-insensitive, partial match)
        const matchingColor = colors.find(([name]) => {
            const nameLower = name.toLowerCase();
            const filterLower = filterColorName.toLowerCase();
            return nameLower === filterLower || nameLower.includes(filterLower) || filterLower.includes(nameLower);
        });
        if (matchingColor) {
            colorToSelect = matchingColor[0];
            colorToSelectUrl = matchingColor[1];
        }
    }
    
    // If still no color, use saved color (without basket items requirement)
    if (!colorToSelect && savedColorName) {
        const savedColor = colors.find(([name]) => name === savedColorName);
        if (savedColor) {
            colorToSelect = savedColorName;
            colorToSelectUrl = savedColor[1];
        }
    }
    
    // Build color grid
    colors.forEach(([name, url], i) => {
        const div = document.createElement("div");
        div.className = "color-thumb";
        div.style.backgroundImage = `url('${url}')`;
        div.setAttribute('data-color-name', name);
        div.setAttribute('title', name);

        // Select color if it matches the color to select
        if (colorToSelect && colorToSelect === name) {
            div.classList.add("active");
            selectedColorName = name;
            selectedColorURL = url;
            if (mainImage) mainImage.src = url;
            
            // Update thumbnail gallery to show this color's image (use setTimeout to ensure gallery is initialized)
            setTimeout(() => {
                if (typeof window.setGalleryActiveBySrc === 'function') {
                    window.setGalleryActiveBySrc(url);
                }
            }, 100);
            
            // Update step progress and clear filter if color was auto-selected from filter
            if (filterColorName && filterColorName === colorToSelect) {
                setTimeout(() => {
                    updateStepProgress(1);
                    // Clear filter color after using it
                    sessionStorage.removeItem('filterColorName');
                }, 150);
            }
        }

        div.onclick = () => {
            // Check if there are unsaved items
            const currentTotal = Object.values(qty).reduce((a,b)=>a+b,0);
            
            if (currentTotal > 0) {
                // Show confirmation modal
                showColorChangeModal(name, url, div);
            } else {
                // No unsaved items, change color directly
                changeColor(name, url, div);
            }
        };

        colorGrid.appendChild(div);
    });
    
    console.log('✅ Colors initialized:', colors.length);
}

// Click outside color grid deselects color if no quantities added
document.addEventListener('click', (e) => {
    const colorGrid = document.getElementById('colorGrid');
    const sizesSection = document.querySelector('.size-grid');
    const currentTotal = Object.values(qty).reduce((a,b)=>a+b,0);
    
    // If clicked outside color grid and sizes, and no items selected, deselect color
    if (colorGrid && !colorGrid.contains(e.target) && 
        sizesSection && !sizesSection.contains(e.target) &&
        currentTotal === 0 && selectedColorName) {
        
        // Check if basket has items for current color
        const basket = JSON.parse(localStorage.getItem('quoteBasket') || '[]');
        const hasItemsInBasket = basket.some(item => item.color === selectedColorName);
        
        if (!hasItemsInBasket) {
            resetColorSelection();
            selectedColorName = null;
            selectedColorURL = null;
        }
    }
});

/* ---------------------------------------------------
   SIZES
--------------------------------------------------- */

// Sizes will be loaded dynamically from PRODUCT_DATA
let sizeList = [];
let qty = {};

function initSizes(productSizes) {
    if (!productSizes || !Array.isArray(productSizes)) {
        console.warn('No sizes available for this product');
        sizeList = [];
        qty = {};
        renderSizes();
        return;
    }
    
    // Set size list from API
    sizeList = productSizes;
    qty = {};
    sizeList.forEach(s => qty[s] = 0);
    
    // Render sizes
    renderSizes();
    
    console.log('✅ Sizes initialized:', sizeList);
}

function renderSizes() {
    if (!sizesGrid) return;
    
    sizesGrid.innerHTML = "";
    
    // Check if color is selected
    const colorSelected = selectedColorName !== null;

    sizeList.forEach(size => {
        const box = document.createElement("div");
        box.className = "size-box" + (colorSelected ? "" : " disabled");

        box.innerHTML = `
            <div class="size-header">${size}</div>
            <div class="qty-controls">
                <button class="qty-btn minus" data-size="${size}" ${colorSelected ? "" : "disabled"}>−</button>
                <input 
                    type="number"
                    class="qty-input"
                    data-size="${size}"
                    min="0"
                    value="0"
                    ${colorSelected ? "" : "disabled"}
                >
                <button class="qty-btn plus" data-size="${size}" ${colorSelected ? "" : "disabled"}>+</button>
            </div>
        `;

        sizesGrid.appendChild(box);
    });
    
    // Show message if no color selected
    updateSizesMessage();

    attachSizeEvents();
}

// Don't render sizes on page load - wait for product data
// renderSizes(); // Removed - will be called by initSizes()

function updateSizesMessage() {
    let msg = document.getElementById('selectColorMessage');
    const colorSelected = selectedColorName !== null;
    
    if (!colorSelected) {
        if (!msg) {
            msg = document.createElement('div');
            msg.id = 'selectColorMessage';
            msg.className = 'select-color-message';
            msg.innerHTML = '⬆️ Please select a colour first';
            sizesGrid.parentNode.insertBefore(msg, sizesGrid);
        }
        msg.style.display = 'block';
    } else if (msg) {
        msg.style.display = 'none';
    }
}

renderSizes();

// Track if step 2 progress was already triggered
let step2ProgressTriggered = false;

function attachSizeEvents() {
    document.querySelectorAll(".qty-btn.plus").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const s = btn.dataset.size;
            if (qty[s] !== undefined) {
                qty[s]++;
                updateInput(s);
                
                // Trigger step 2 progress on first size selection
                if (!step2ProgressTriggered) {
                    step2ProgressTriggered = true;
                    updateStepProgress(2);
                }
            }
        };
    });

    document.querySelectorAll(".qty-btn.minus").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const s = btn.dataset.size;
            if (qty[s] !== undefined) {
                qty[s] = Math.max(0, qty[s] - 1);
                updateInput(s);
            }
        };
    });

    document.querySelectorAll(".qty-input").forEach(inp => {
        inp.oninput = () => {
            const s = inp.dataset.size;
            qty[s] = Math.max(0, parseInt(inp.value) || 0);
            updateTotals();
            updateSizeBoxState(s);
        };
    });
}

function updateInput(size) {
    const input = document.querySelector(`.qty-input[data-size="${size}"]`);
    input.value = qty[size];
    updateSizeBoxState(size);
    updateTotals();
}

function updateSizeBoxState(size) {
    const input = document.querySelector(`.qty-input[data-size="${size}"]`);
    if (!input) return;
    const box = input.closest(".size-box");
    if (!box) return;

    if (qty[size] > 0) box.classList.add("active");
    else box.classList.remove("active");
}

function resetSizes() {
    Object.keys(qty).forEach(s => qty[s] = 0);
    step2ProgressTriggered = false; // Reset the flag
    renderSizes();
    updateTotals();
}

function resetColorSelection() {
    // Remove active class from all color thumbs
    document.querySelectorAll(".color-thumb").forEach(c => c.classList.remove("active"));
    
    // Clear session storage
    sessionStorage.removeItem('selectedColorName');
    sessionStorage.removeItem('selectedColorUrl');
    
    // Reset selected color variables
    selectedColorName = null;
    selectedColorURL = null;
    
    // Reset step progress bar
    resetStepProgress();
    
    // Re-render sizes to disable them
    renderSizes();
}

// Step Progress Management - using inline styles
function updateStepProgress(stepCompleted) {
    const stepNum1 = document.getElementById('stepNum1');
    const stepNum2 = document.getElementById('stepNum2');
    const stepNum3 = document.getElementById('stepNum3');
    const stepLabel1 = document.getElementById('stepLabel1');
    const stepLabel2 = document.getElementById('stepLabel2');
    const stepLabel3 = document.getElementById('stepLabel3');
    const connector12 = document.getElementById('connector-1-2');
    const connector23 = document.getElementById('connector-2-3');
    
    const greenStyle = 'width:44px; height:44px; border-radius:50%; background:#10b981; color:white; font-size:1.1rem; font-weight:700; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(16,185,129,0.3);';
    const greenLabelStyle = 'font-size:0.9rem; font-weight:600; color:#10b981;';
    
    if (stepCompleted === 1) {
        // Color selected - make step 1 green immediately
        if (stepNum1 && !stepNum1.dataset.completed) {
            stepNum1.style.cssText = greenStyle;
            stepNum1.textContent = '1✓';
            stepNum1.dataset.completed = 'true';
            if (stepLabel1) stepLabel1.style.cssText = greenLabelStyle;
        }
    } else if (stepCompleted === 2) {
        // Size selected - animate connector 1-2, then make step 2 green
        if (connector12 && !connector12.dataset.completed) {
            // Start loading animation
            connector12.innerHTML = '<div style="height:100%; width:0; background:#10b981; border-radius:2px; animation:loadBar 2s ease-out forwards;"></div>';
            
            // Add keyframes if not exists
            if (!document.getElementById('loadBarKeyframes')) {
                const style = document.createElement('style');
                style.id = 'loadBarKeyframes';
                style.textContent = '@keyframes loadBar { 0% { width: 0; } 100% { width: 100%; } }';
                document.head.appendChild(style);
            }
            
            // After 2 seconds, complete step 2
            setTimeout(() => {
                connector12.style.background = '#10b981';
                connector12.innerHTML = '';
                connector12.dataset.completed = 'true';
                
                if (stepNum2) {
                    stepNum2.style.cssText = greenStyle;
                    stepNum2.textContent = '2✓';
                    stepNum2.dataset.completed = 'true';
                }
                if (stepLabel2) stepLabel2.style.cssText = greenLabelStyle;
            }, 2000);
        }
    } else if (stepCompleted === 3) {
        // Logo added - animate connector 2-3, then make step 3 green
        if (connector23 && !connector23.dataset.completed) {
            connector23.innerHTML = '<div style="height:100%; width:0; background:#10b981; border-radius:2px; animation:loadBar 2s ease-out forwards;"></div>';
            
            setTimeout(() => {
                connector23.style.background = '#10b981';
                connector23.innerHTML = '';
                connector23.dataset.completed = 'true';
                
                if (stepNum3) {
                    stepNum3.style.cssText = greenStyle;
                    stepNum3.textContent = '3✓';
                    stepNum3.dataset.completed = 'true';
                }
                if (stepLabel3) stepLabel3.style.cssText = greenLabelStyle;
            }, 2000);
        }
    }
}

// Reset step progress
function resetStepProgress() {
    const purpleStyle = 'width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg,#8b5cf6,#7c3aed); color:white; font-size:1.1rem; font-weight:700; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(124,58,237,0.3);';
    const purpleLabelStyle = 'font-size:0.9rem; font-weight:600; color:#7c3aed;';
    const connectorStyle = 'width:60px; height:4px; background:#e5e7eb; margin:0 16px; margin-bottom:28px; border-radius:2px;';
    
    for (let i = 1; i <= 3; i++) {
        const stepNum = document.getElementById('stepNum' + i);
        const stepLabel = document.getElementById('stepLabel' + i);
        if (stepNum) {
            stepNum.style.cssText = purpleStyle;
            stepNum.textContent = i.toString();
            delete stepNum.dataset.completed;
        }
        if (stepLabel) {
            stepLabel.style.cssText = purpleLabelStyle;
        }
    }
    
    const connector12 = document.getElementById('connector-1-2');
    const connector23 = document.getElementById('connector-2-3');
    if (connector12) {
        connector12.style.cssText = connectorStyle;
        connector12.innerHTML = '';
        delete connector12.dataset.completed;
    }
    if (connector23) {
        connector23.style.cssText = connectorStyle;
        connector23.innerHTML = '';
        delete connector23.dataset.completed;
    }
}

function changeColor(name, url, colorDiv) {
    document.querySelectorAll(".color-thumb").forEach(c => c.classList.remove("active"));
    if (colorDiv) colorDiv.classList.add("active");

    selectedColorName = name;
    selectedColorURL  = url;

    if (mainImage) mainImage.src = url;
    
    // Update thumbnail gallery active state
    if (typeof window.setGalleryActiveBySrc === 'function') {
        window.setGalleryActiveBySrc(url);
    }
    
    // Save selection to sessionStorage
    sessionStorage.setItem('selectedColorName', name);
    sessionStorage.setItem('selectedColorUrl', url);

    resetSizes();
    
    // Update step progress - step 1 completed
    updateStepProgress(1);
    
    // Natural scroll to color section
    const colorSection = document.querySelector('.color-grid');
    if (colorSection) {
        const rect = colorSection.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetY = rect.top + scrollTop - 150;
        window.scrollTo({
            top: targetY,
            behavior: 'smooth'
        });
    }
}

function showColorChangeModal(newColorName, newColorUrl, newColorDiv) {
    const modal = document.getElementById('colorChangeModal');
    modal.style.display = 'flex';
    
    // Save button - add current selection to basket then change color
    document.getElementById('colorChangeSaveBtn').onclick = () => {
        try {
            const total = Object.values(qty).reduce((a,b)=>a+b,0);
            
            if (total > 0) {
                // Get existing basket
                let basket = JSON.parse(localStorage.getItem('quoteBasket')) || [];
                
                // Calculate TOTAL quantity of THIS PRODUCT across ALL colors
                const currentProductTotal = basket
                    .filter(item => item.name === PRODUCT_NAME && item.code === PRODUCT_CODE)
                    .reduce((sum, item) => sum + item.quantity, 0);
                
                const newTotal = currentProductTotal + total;
                const newUnitPrice = getUnitPrice(newTotal);
                
                // Check if same product with same color already exists
                const existingIndex = basket.findIndex(item => 
                    item.name === PRODUCT_NAME && 
                    item.code === PRODUCT_CODE && 
                    item.color === selectedColorName
                );
                
                if (existingIndex !== -1) {
                    // Merge sizes with existing item
                    Object.keys(qty).forEach(size => {
                        if (qty[size] > 0) {
                            basket[existingIndex].sizes[size] = (basket[existingIndex].sizes[size] || 0) + qty[size];
                        }
                    });
                    
                    // Recalculate total quantity and size summary
                    basket[existingIndex].quantity = Object.values(basket[existingIndex].sizes).reduce((a,b)=>a+b,0);
                    basket[existingIndex].size = getSizesSummaryFromSizes(basket[existingIndex].sizes);
                    basket[existingIndex].price = newUnitPrice.toFixed(2);
                } else {
                    // Create new item
                    const productData = {
                        name: PRODUCT_NAME,
                        code: PRODUCT_CODE,
                        color: selectedColorName,
                        image: selectedColorURL,
                        quantity: total,
                        size: getSizesSummary(),
                        price: newUnitPrice.toFixed(2),
                        sizes: {...qty}
                    };
                    basket.push(productData);
                }
                
                // Update price for ALL items of the SAME PRODUCT (all colors)
                basket.forEach(item => {
                    if (item.name === PRODUCT_NAME && item.code === PRODUCT_CODE) {
                        item.price = newUnitPrice.toFixed(2);
                    }
                });
                
                localStorage.setItem('quoteBasket', JSON.stringify(basket));
                
                // Update cart badge and basket total box
                if (window.brandedukv15 && window.brandedukv15.updateCartBadge) {
                    window.brandedukv15.updateCartBadge();
                }
                updateBasketTotalBox();
                
                hasBasketItems = true;
                
                showToast(`✓ ${total} items saved to basket!`);
            }
            
            // Change color and close modal
            changeColor(newColorName, newColorUrl, newColorDiv);
        } catch (error) {
            console.error('Error saving selection:', error);
        } finally {
            modal.style.display = 'none';
        }
    };
    
    // Discard button - just change color without saving
    document.getElementById('colorChangeDiscardBtn').onclick = () => {
        changeColor(newColorName, newColorUrl, newColorDiv);
        modal.style.display = 'none';
    };
}

/* ---------------------------------------------------
   MINI SUMMARY
--------------------------------------------------- */

function updateBelowSummary(total, unit) {
    // Safety check
    if (!belowSummary) {
        console.warn('belowSummary element not found');
        return;
    }
    
    // Show ONLY current selection (not basket)
    const currentTotal = total;
    const currentPrice = currentTotal > 0 ? (unit * currentTotal) : 0;
    
    const perItemLabel = currentTotal > 0 ? ` · ${formatCurrency(unit)} each ${vatSuffix()}` : '';
    const summaryMarkup = `
        <div class="summary-text">
            <span class="summary-items"><b>${currentTotal} items</b>${perItemLabel}</span>
            <span class="summary-total">Total: <span class="total-green">${formatCurrency(currentPrice)}</span> ${vatSuffix()}</span>
        </div>
    `;

    // Always show Delete button (visible but disabled if no items)
    const deleteButtonHtml = `
        <button id="delete" class="del-btn${currentTotal === 0 ? ' del-btn--disabled' : ''}" type="button" aria-label="Delete" data-running="false"${currentTotal === 0 ? ' disabled' : ''}>
            <svg class="del-btn__icon" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
                <clipPath id="can-clip">
                    <rect class="del-btn__icon-can-fill" x="5" y="24" width="14" height="11"></rect>
                </clipPath>
                <g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" transform="translate(12,12)">
                    <g class="del-btn__icon-lid">
                        <polyline points="9,5 9,1 15,1 15,5"></polyline>
                        <polyline points="4,5 20,5"></polyline>
                    </g>
                    <g class="del-btn__icon-can">
                        <g stroke-width="0">
                            <polyline id="can-fill" points="6,10 7,23 17,23 18,10"></polyline>
                            <use clip-path="url(#can-clip)" href="#can-fill" fill="#fff"></use>
                        </g>
                        <polyline points="6,10 7,23 17,23 18,10"></polyline>
                    </g>
                </g>
            </svg>
            <span class="del-btn__letters" aria-hidden="true" data-anim>
                <span class="del-btn__letter-box"><span class="del-btn__letter">D</span></span>
                <span class="del-btn__letter-box"><span class="del-btn__letter">e</span></span>
                <span class="del-btn__letter-box"><span class="del-btn__letter">l</span></span>
                <span class="del-btn__letter-box"><span class="del-btn__letter">e</span></span>
                <span class="del-btn__letter-box"><span class="del-btn__letter">t</span></span>
                <span class="del-btn__letter-box"><span class="del-btn__letter">e</span></span>
            </span>
        </button>
    `;

    belowSummary.innerHTML = `
        ${currentTotal === 0 ? `
            <div class="summary-text">
                <span class="summary-items"><b>0 items</b></span>
                <span class="summary-total">Total: <span class="total-green">${formatCurrency(0)}</span> ${vatSuffix()}</span>
            </div>
        ` : summaryMarkup}
        ${deleteButtonHtml}
    `;

    const deleteBtn = document.getElementById('delete');
    if (deleteBtn) {
        new DeleteButton(deleteBtn, {
            onClear: () => {
                localStorage.removeItem('quoteBasket');
                sessionStorage.removeItem('customizingProduct');
                sessionStorage.removeItem('selectedPositions');
                sessionStorage.removeItem('positionMethods');
                sessionStorage.removeItem('positionCustomizations');
                sessionStorage.removeItem('currentPositionIndex');
                hasBasketItems = false;

                resetSizes();
                resetColorSelection();
                setTimeout(() => {
                    updateTotals();
                    // Update cart badge after clearing
                    if (window.brandedukv15 && window.brandedukv15.updateCartBadge) {
                        window.brandedukv15.updateCartBadge();
                    }
                    showToast('✓ Basket cleared successfully!');
                }, 0);
            }
        });
    }
}

/* ---------------------------------------------------
   DISCOUNT BOX
--------------------------------------------------- */

function updateDiscountBox(total) {
    // Support both old .disc-box and new .tier-item classes
    const boxes = document.querySelectorAll(".disc-box");
    const tierItems = document.querySelectorAll(".tier-item");
    
    boxes.forEach(b => b.classList.remove("active"));
    tierItems.forEach(t => t.classList.remove("active"));

    let appliedIndex = 0;

    DISCOUNTS.forEach((tier,i)=>{
        if(total >= tier.min && total <= tier.max) appliedIndex = i;
    });

    if (boxes[appliedIndex]) boxes[appliedIndex].classList.add("active");
    if (tierItems[appliedIndex]) tierItems[appliedIndex].classList.add("active");
}

/* ---------------------------------------------------
   TOTALS
--------------------------------------------------- */

function getUnitPrice(totalItems) {
    if (totalItems === 0) return BASE_PRICE;
    const tier = DISCOUNTS.find(t => totalItems >= t.min && totalItems <= t.max);
    return tier ? tier.price : BASE_PRICE;
}

function getCurrentTier(totalItems) {
    if (totalItems === 0) return DISCOUNTS[0];
    return DISCOUNTS.find(t => totalItems >= t.min && totalItems <= t.max) || DISCOUNTS[0];
}

function updateTotals() {
    const total = Object.values(qty).reduce((a,b)=>a+b,0);
    
    // Check if basket has items
    const basket = JSON.parse(localStorage.getItem('quoteBasket')) || [];
    hasBasketItems = basket.length > 0;
    
    // Calculate TOTAL quantity of THIS PRODUCT in basket (all colors)
    const basketProductTotal = basket
        .filter(item => item.name === PRODUCT_NAME && item.code === PRODUCT_CODE)
        .reduce((sum, item) => sum + item.quantity, 0);
    
    // Grand total = basket quantity + current selection
    const grandProductTotal = basketProductTotal + total;

    updateDiscountBox(grandProductTotal);
    updateTierPricing(grandProductTotal);

    const unit = getUnitPrice(grandProductTotal);

    // Update main price (with safety check)
    if (mainPriceEl) {
        mainPriceEl.innerHTML = `${formatCurrency(unit)} <span>each ${vatSuffix()}</span>`;
    }

    const priceInfoEl = document.getElementById("priceInfo");
    const tier = getCurrentTier(grandProductTotal);
    if (priceInfoEl) {
        if (grandProductTotal === 0) {
            priceInfoEl.innerHTML = `Price listed for 1–9 units`;
        } else {
            priceInfoEl.innerHTML =
                `<b>Bulk price applied:</b> ${formatCurrency(tier.price)} ${vatSuffix()} (${tier.min}+ units)`;
        }
    }

    // Save Selection: enabled if basket has items OR current selection exists
    const buttonsDisabled = total === 0 && !hasBasketItems;
    if (addContinueButton) addContinueButton.disabled = buttonsDisabled;
    if (addCustomizeButton) addCustomizeButton.disabled = buttonsDisabled;
    
    // Sync mobile sticky bar
    const mobileAddCustomize = document.getElementById("mobileAddCustomize");
    const stickyItemCount = document.getElementById("stickyItemCount");
    const stickyTotal = document.getElementById("stickyTotal");
    
    if (mobileAddCustomize) mobileAddCustomize.disabled = buttonsDisabled;
    
    // Update sticky bar summary
    if (stickyItemCount) {
        const displayTotal = grandProductTotal > 0 ? grandProductTotal : total;
        stickyItemCount.textContent = `${displayTotal} item${displayTotal !== 1 ? 's' : ''}`;
    }
    if (stickyTotal) {
        const lineTotal = unit * grandProductTotal;
        stickyTotal.textContent = formatCurrency(lineTotal);
    }

    updateBelowSummary(total, unit);
}

// Update tier pricing highlight
function updateTierPricing(total) {
    const tierItems = document.querySelectorAll('.tier-item');
    tierItems.forEach(item => {
        const min = parseInt(item.dataset.min);
        const max = parseInt(item.dataset.max);
        item.classList.remove('active');
        if (total >= min && total <= max) {
            item.classList.add('active');
        }
    });
}

/* ---------------------------------------------------
   ADD TO QUOTE BUTTON (sinistra)
--------------------------------------------------- */

addContinueButton.onclick = () => {
    const total = Object.values(qty).reduce((a,b)=>a+b,0);
    if (total === 0) return;
    
    // Get existing basket
    let basket = JSON.parse(localStorage.getItem('quoteBasket')) || [];
    
    // Calculate TOTAL quantity of THIS PRODUCT across ALL colors
    const currentProductTotal = basket
        .filter(item => item.name === PRODUCT_NAME && item.code === PRODUCT_CODE)
        .reduce((sum, item) => sum + item.quantity, 0);
    
    const newTotal = currentProductTotal + total;
    const newUnitPrice = getUnitPrice(newTotal);
    
    // Check if same product with same color already exists
    const existingIndex = basket.findIndex(item => 
        item.name === PRODUCT_NAME && 
        item.code === PRODUCT_CODE && 
        item.color === selectedColorName
    );
    
    if (existingIndex !== -1) {
        // Merge sizes with existing item
        Object.keys(qty).forEach(size => {
            if (qty[size] > 0) {
                basket[existingIndex].sizes[size] = (basket[existingIndex].sizes[size] || 0) + qty[size];
            }
        });
        
        // Recalculate total quantity and size summary
        basket[existingIndex].quantity = Object.values(basket[existingIndex].sizes).reduce((a,b)=>a+b,0);
        basket[existingIndex].size = getSizesSummaryFromSizes(basket[existingIndex].sizes);
        basket[existingIndex].price = newUnitPrice.toFixed(2);
    } else {
        // Create new item
        const productData = {
            name: PRODUCT_NAME,
            code: PRODUCT_CODE,
            color: selectedColorName,
            image: selectedColorURL,
            quantity: total,
            size: getSizesSummary(),
            price: newUnitPrice.toFixed(2),
            sizes: {...qty}
        };
        basket.push(productData);
    }
    
    // Update price for ALL items of the SAME PRODUCT (all colors)
    basket.forEach(item => {
        if (item.name === PRODUCT_NAME && item.code === PRODUCT_CODE) {
            item.price = newUnitPrice.toFixed(2);
        }
    });
    
    localStorage.setItem('quoteBasket', JSON.stringify(basket));
    
    // Update cart badge and basket total box
    if (window.brandedukv15 && window.brandedukv15.updateCartBadge) {
        window.brandedukv15.updateCartBadge();
    }
    updateBasketTotalBox();
    
    // Show success toast (non alert)
    showToast(`✓ ${total} items added to basket! Continue choosing more colors or sizes.`);
    
    // Update hasBasketItems flag
    hasBasketItems = true;
    
    // Reset sizes per nuova selezione
    resetSizes();
};

/* ---------------------------------------------------
   ADD & CUSTOMIZE BUTTON (destra)
--------------------------------------------------- */

addCustomizeButton.onclick = () => {
    const total = Object.values(qty).reduce((a,b)=>a+b,0);
    
    // If there's a current selection, save it to basket
    if (total > 0) {
        // Get existing basket
        let basket = JSON.parse(localStorage.getItem('quoteBasket')) || [];
        
        // Calculate TOTAL quantity of THIS PRODUCT across ALL colors
        const currentProductTotal = basket
            .filter(item => item.name === PRODUCT_NAME && item.code === PRODUCT_CODE)
            .reduce((sum, item) => sum + item.quantity, 0);
        
        const newTotal = currentProductTotal + total;
        const newUnitPrice = getUnitPrice(newTotal);
        
        // Check if same product with same color already exists
        const existingIndex = basket.findIndex(item => 
            item.name === PRODUCT_NAME && 
            item.code === PRODUCT_CODE && 
            item.color === selectedColorName
        );
        
        if (existingIndex !== -1) {
            // Merge sizes with existing item
            Object.keys(qty).forEach(size => {
                if (qty[size] > 0) {
                    basket[existingIndex].sizes[size] = (basket[existingIndex].sizes[size] || 0) + qty[size];
                }
            });
            
            // Recalculate total quantity and size summary
            basket[existingIndex].quantity = Object.values(basket[existingIndex].sizes).reduce((a,b)=>a+b,0);
            basket[existingIndex].size = getSizesSummaryFromSizes(basket[existingIndex].sizes);
            basket[existingIndex].price = newUnitPrice.toFixed(2);
        } else {
            // Create new item
            const productData = {
                name: PRODUCT_NAME,
                code: PRODUCT_CODE,
                color: selectedColorName,
                image: selectedColorURL,
                quantity: total,
                size: getSizesSummary(),
                price: newUnitPrice.toFixed(2),
                sizes: {...qty}
            };
            basket.push(productData);
        }
        
        // Update price for ALL items of the SAME PRODUCT (all colors)
        basket.forEach(item => {
            if (item.name === PRODUCT_NAME && item.code === PRODUCT_CODE) {
                item.price = newUnitPrice.toFixed(2);
            }
        });
        
        localStorage.setItem('quoteBasket', JSON.stringify(basket));
        updateBasketTotalBox();
    }
    
    // Navigate to customization positions page (works even if total === 0 but basket has items)
    window.location.href = 'customize-positions.html';
};

function getSizesSummary() {
    const sizeEntries = Object.entries(qty).filter(([s,q]) => q > 0);
    if (sizeEntries.length === 1) {
        return sizeEntries[0][0];
    }
    return sizeEntries.map(([s,q]) => `${q}x${s}`).join(', ');
}

function getSizesSummaryFromSizes(sizes) {
    const sizeEntries = Object.entries(sizes).filter(([s,q]) => q > 0);
    if (sizeEntries.length === 1) {
        return sizeEntries[0][0];
    }
    return sizeEntries.map(([s,q]) => `${q}x${s}`).join(', ');
}

/* ---------------------------------------------------
   MOBILE STICKY BAR BUTTON
--------------------------------------------------- */

const mobileAddCustomize = document.getElementById("mobileAddCustomize");

if (mobileAddCustomize) {
    mobileAddCustomize.onclick = () => {
        addCustomizeButton.click();
    };
}

function openPopup() {
    const total = Object.values(qty).reduce((a,b)=>a+b,0);
    const unit  = getUnitPrice(total);
    const lineTotal = unit * total;

    const sizeLines = Object.entries(qty)
        .filter(([s,q]) => q > 0)
        .map(([s,q]) => `${selectedColorName}, ${s}: ${q}`)
        .join("<br>");

    popupContent.innerHTML = `
        <div class="popup-content-fixed">
            <img src="${selectedColorURL}" alt="Product preview">
            <div>
                <h2>${PRODUCT_NAME}</h2>
                <div class="pc-small">
                    <b>${PRODUCT_CODE}</b> — ${selectedColorName}<br>
                    ${sizeLines}
                </div>
            </div>
        </div>
    `;

    popupSummary.innerHTML = `
        <div>
            <b>${total} items</b><br>
            ${formatCurrency(unit)} per item ${vatSuffix()}
        </div>
        <div>
            Total: <span class="green">${formatCurrency(lineTotal)}</span> ${vatSuffix()}
        </div>
    `;

    popup.style.display = "flex";
}

closePopup.onclick = () => {
    popup.style.display = "none";
};

window.addEventListener("click", (e) => {
    if (e.target === popup) {
        popup.style.display = "none";
    }
});

/* ---------------------------------------------------
   LOGO UPLOAD
--------------------------------------------------- */

uploadBtnPopup.onclick = () => {
    logoInputHidden.click();
};

logoInputHidden.onchange = () => {
    [...logoInputHidden.files].forEach((file) => {
        const reader = new FileReader();
        reader.onload = e => {
            const div = document.createElement("div");
            div.className = "logo-thumb";
            div.style.backgroundImage = `url('${e.target.result}')`;
            logoPreviewPopup.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
};

/* ---------------------------------------------------
   CUSTOMIZATION MODAL
--------------------------------------------------- */

let customizationData = {
    selectedColor: null,
    selectedColorUrl: null,
    selectedPositions: [],
    currentPositionIndex: 0,
    positionsData: []
};

function openCustomizationModal() {
    const modal = document.getElementById('customizationModal');
    modal.style.display = 'block';
    
    // Reset to step 1
    goToStep(1);
    
    // Render color selection grid
    renderColorSelection();
    
    // Set product info in sidebar
    updateSidebarProductInfo();
}

function closeCustomizationModal() {
    const modal = document.getElementById('customizationModal');
    modal.style.display = 'none';
    
    // Reset customization data
    customizationData = {
        selectedColor: null,
        selectedColorUrl: null,
        selectedPositions: [],
        currentPositionIndex: 0,
        positionsData: []
    };
}

function renderColorSelection() {
    const grid = document.getElementById('colorSelectionGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (!colors || colors.length === 0) {
        console.warn('No colors available for color selection');
        return;
    }
    
    colors.forEach(([name, url]) => {
        const circle = document.createElement('div');
        circle.className = 'color-circle';
        circle.style.background = `url('${url}') center/cover`;
        circle.title = name;
        
        circle.onclick = () => {
            // Remove previous selection
            document.querySelectorAll('.color-circle').forEach(c => c.classList.remove('selected'));
            
            // Select this color
            circle.classList.add('selected');
            customizationData.selectedColor = name;
            customizationData.selectedColorUrl = url;
            
            // Update main image
            mainImage.src = url;
        };
        
        grid.appendChild(circle);
    });
}

function goToStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.cust-step').forEach(step => {
        step.classList.remove('active-step');
    });
    
    // Show selected step
    const targetStep = document.getElementById(`step${stepNumber}`);
    if (targetStep) {
        targetStep.classList.add('active-step');
    }
    
    // Update step indicators
    document.querySelectorAll('.step-circle').forEach(circle => {
        const circleStep = parseInt(circle.dataset.step);
        if (circleStep === stepNumber) {
            circle.classList.add('active');
        } else {
            circle.classList.remove('active');
        }
    });
}

function validateAndGoToStep3() {
    // Check if at least one position is selected
    const checkedPositions = document.querySelectorAll('input[name="position"]:checked');
    
    if (checkedPositions.length === 0) {
        showValidationError('Please select at least one position');
        return;
    }
    
    // Store selected positions
    customizationData.selectedPositions = Array.from(checkedPositions).map(cb => {
        const card = cb.closest('.position-card');
        return {
            value: cb.value,
            name: cb.nextElementSibling.textContent,
            embroideryPrice: card.dataset.embroidery,
            printPrice: card.dataset.print
        };
    });
    
    customizationData.currentPositionIndex = 0;
    
    // Go to first position customization
    showPositionCustomization(0);
    goToStep(3);
}

function showPositionCustomization(index) {
    const position = customizationData.selectedPositions[index];
    const total = customizationData.selectedPositions.length;
    
    // Update position title
    document.getElementById('positionCounter').textContent = `(${index + 1} of ${total})`;
    document.getElementById('currentPositionName').textContent = position.name;
    
    // Update preview image
    document.getElementById('previewHoodieImage').src = customizationData.selectedColorUrl || mainImage.src;
    document.getElementById('sidebarProductImage').src = customizationData.selectedColorUrl || mainImage.src;
}

function validateAndNextPosition() {
    // Validate customisation name
    const nameInput = document.getElementById('customisationName');
    const nameError = document.getElementById('nameError');
    
    if (!nameInput.value.trim()) {
        nameError.style.display = 'block';
        nameInput.focus();
        return;
    } else {
        nameError.style.display = 'none';
    }
    
    // Store current position data
    const currentPosition = customizationData.selectedPositions[customizationData.currentPositionIndex];
    const positionData = {
        position: currentPosition.value,
        name: nameInput.value.trim(),
        method: document.querySelector('.method-btn.active').dataset.method,
        type: document.querySelector('.type-btn.active').dataset.type
    };
    
    customizationData.positionsData[customizationData.currentPositionIndex] = positionData;
    
    // Check if there are more positions
    if (customizationData.currentPositionIndex < customizationData.selectedPositions.length - 1) {
        customizationData.currentPositionIndex++;
        showPositionCustomization(customizationData.currentPositionIndex);
        
        // Clear form for next position
        nameInput.value = '';
    } else {
        // All positions done, add to basket
        addCustomizedItemToBasket();
    }
}

function goBackFromStep3() {
    goToStep(2);
}

function addCustomizedItemToBasket() {
    // Get quote basket from localStorage
    let basket = JSON.parse(localStorage.getItem('quoteBasket') || '[]');
    
    // Prepare item
    const item = {
        code: PRODUCT_CODE,
        name: PRODUCT_NAME,
        color: customizationData.selectedColor,
        image: customizationData.selectedColorUrl,
        sizes: sizeQuantities,
        price: BASE_PRICE,
        customization: customizationData.positionsData
    };
    
    basket.push(item);
    localStorage.setItem('quoteBasket', JSON.stringify(basket));
    
    // Close modal and redirect to basket
    closeCustomizationModal();
    window.location.href = 'quote-basket.html';
}

function showValidationError(message) {
    const errorModal = document.getElementById('validationError');
    const errorMessage = document.getElementById('validationErrorMessage');
    
    errorMessage.textContent = message;
    errorModal.style.display = 'block';
}

function closeValidationError() {
    document.getElementById('validationError').style.display = 'none';
}

function updateSidebarProductInfo() {
    const nameEl = document.getElementById('sidebarProductName');
    const codeEl = document.getElementById('sidebarProductCode');
    const garmentCostEl = document.getElementById('sidebarGarmentCost');
    const totalCostEl = document.getElementById('sidebarTotalCost');

    if (!nameEl || !codeEl || !garmentCostEl || !totalCostEl) {
        return;
    }

    nameEl.textContent = PRODUCT_NAME;
    codeEl.textContent = 'EE-' + PRODUCT_CODE;

    const totalQty = typeof sizeQuantities !== 'undefined'
        ? Object.values(sizeQuantities).reduce((sum, qty) => sum + qty, 0)
        : 0;

    const pricePerUnit = typeof getCurrentPriceForQty === 'function'
        ? getCurrentPriceForQty(totalQty)
        : BASE_PRICE;

    const garmentTotal = totalQty * pricePerUnit;

    garmentCostEl.textContent = `${formatCurrency(garmentTotal)} ${vatSuffix()} x ${totalQty}`;
    totalCostEl.textContent = `${formatCurrency(garmentTotal)} ${vatSuffix()}`;
}

// Method and Type button toggles
document.addEventListener('DOMContentLoaded', () => {
    // Method buttons
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Type buttons
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show/hide sections based on type
            if (btn.dataset.type === 'logo') {
                document.getElementById('logoUploadSection').style.display = 'block';
                document.getElementById('textInputSection').style.display = 'none';
            } else {
                document.getElementById('logoUploadSection').style.display = 'none';
                document.getElementById('textInputSection').style.display = 'block';
            }
        });
    });
    
    // Upload tabs
    document.querySelectorAll('.upload-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.upload-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });
    
    // Dropzone click
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('positionLogoInput');
    
    if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    document.getElementById('logoPreviewImage').src = event.target.result;
                    document.getElementById('uploadArea').style.display = 'none';
                    document.getElementById('logoPreviewArea').style.display = 'block';
                };
                
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Position checkboxes
    document.querySelectorAll('.position-card').forEach(card => {
        const checkbox = card.querySelector('input[type="checkbox"]');
        
        card.addEventListener('click', (e) => {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
            }
            
            if (checkbox.checked) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
        
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    });
});

document.addEventListener('brandeduk:vat-change', () => {
    updateTotals();
    updateSidebarProductInfo();
    if (popup && popup.style.display === 'flex') {
        openPopup();
    }
});

/* ---------------------------------------------------
   TOAST NOTIFICATION
--------------------------------------------------- */

function showToast(message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Hide and remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
