// ===== PRODUCTS DATABASE (loaded from API) =====
let PRODUCTS_DB = [];
let CURRENT_PRODUCTS = []; // Current filtered/displayed products
let API_BASE_URL = 'https://brandeduk-backend.onrender.com/api';
let isLoadingProducts = false;

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

const PRICE_BREAKS_BY_CODE = {
    GD067: [
        { min: 1,   max: 9,     price: 17.58 },
        { min: 10,  max: 24,    price: 16.54 },
        { min: 25,  max: 49,    price: 16.18 },
        { min: 50,  max: 99,    price: 14.94 },
        { min: 100, max: 249,   price: 13.49 },
        { min: 250, max: 99999, price: 12.59 }
    ]
};

let quoteBasket = JSON.parse(localStorage.getItem('quoteBasket')) || [];

// ===== PAGINATION STATE =====
let currentPage = 1;
let totalPages = 1;
let totalProducts = 0;
const PRODUCTS_PER_PAGE = 28;

// ===== API FUNCTIONS =====
async function fetchProducts(filters = {}, page = 1, limit = 28) {
    if (isLoadingProducts) {
        console.log('Already loading products, skipping...');
        return null;
    }
    
    isLoadingProducts = true;
    console.log('Fetching products from API...', { filters, page, limit });
    
    try {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', limit);
        
        // Handle text search (map 'text' to 'q' for backend)
        const searchText = filters.q || filters.text;
        if (searchText) {
            params.append('q', searchText);
        }
        
        // Price filters - only send when user explicitly sets them
        if (filters.priceMin !== null && filters.priceMin !== undefined && filters.priceMax !== null && filters.priceMax !== undefined) {
            params.append('priceMin', filters.priceMin);
            params.append('priceMax', filters.priceMax);
        }
        
        // Handle special flags (sent as flag[] parameter)
        if (filters.flags && Array.isArray(filters.flags) && filters.flags.length > 0) {
            console.log("flags", filters.flags);
            
            filters.flags.forEach(flag => {
                params.append('flag[]', flag);
            });
        }
        
        // Map frontend plural names to backend singular names
        const filterMap = {
            'genders': 'gender',
            'ageGroups': 'ageGroup',
            'sleeves': 'sleeve',
            'necklines': 'neckline',
            'primaryColours': 'primaryColour',
            'colourShades': 'colourShade',
            'styles': 'style',
            'features': 'feature',
            'sizes': 'size',
            'fabrics': 'fabric',
            'weights': 'weight',
            'fits': 'fit',
            'sectors': 'sector',
            'sports': 'sport',
            'tags': 'tag',
            'effects': 'effect',
            'accreditations': 'accreditations',
            'cmyk': 'cmyk',
            'pantone': 'pantone'
        };
        
        // Add array filters with correct mapping
        Object.keys(filterMap).forEach(frontendKey => {
            if (filters[frontendKey] && Array.isArray(filters[frontendKey]) && filters[frontendKey].length > 0) {
                const backendKey = filterMap[frontendKey];
                filters[frontendKey].forEach(val => {
                    params.append(`${backendKey}[]`, val);
                });
            }
        });
        
        const url = `${API_BASE_URL}/products?${params.toString()}`;
        console.log('API URL:', url);
        console.log('Request params - page:', page, 'limit:', limit);
        
        let response;
        try {
            console.log('Attempting fetch...');
            response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Fetch completed!');
            console.log('API Response status:', response.status, response.statusText);
            console.log('Response headers:', response.headers);
        } catch (fetchError) {
            console.error('❌ Fetch failed:', fetchError);
            console.error('Error name:', fetchError.name);
            console.error('Error message:', fetchError.message);
            console.error('This is likely a CORS issue or the server is not running.');
            console.error('Make sure your backend server is running on https://brandeduk-backend.onrender.com');
            throw fetchError;
        }
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unable to read error');
            console.error('❌ API Error Response:', response.status, errorText);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        console.log('Parsing JSON response...');
        const data = await response.json();
        console.log('✅ API Response data:', data);
        console.log('✅ Products received:', data.items?.length || 0);
        console.log('✅ Price range:', data.priceRange);
        
        // Store pagination data
        totalProducts = data.total || 0;
        totalPages = Math.ceil(totalProducts / limit);
        currentPage = page;
        
        console.log('✅ Pagination - Page:', currentPage, 'of', totalPages, 'Total products:', totalProducts);
        
        PRODUCTS_DB = data.items || [];
        CURRENT_PRODUCTS = data.items || [];
        
        return data;
    } catch (error) {
        console.error('Error fetching products:', error);
        console.error('Error details:', error.message);
        PRODUCTS_DB = [];
        CURRENT_PRODUCTS = [];
        return null;
    } finally {
        isLoadingProducts = false;
    }
}

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

function formatPriceRange(minPrice, maxPrice) {
    var minVal = Number(minPrice) || 0;
    var maxVal = Number(maxPrice) || 0;
    if (Math.abs(minVal - maxVal) < 0.005) {
        return formatCurrency(minVal);
    }
    return formatCurrency(minVal) + ' - ' + formatCurrency(maxVal);
}

function updateCardPriceRanges() {
    document.querySelectorAll('.product-card .product-price').forEach(function (priceEl) {
        var min = Number(priceEl.dataset.priceMin);
        var max = Number(priceEl.dataset.priceMax);
        var valueEl = priceEl.querySelector('.product-price-value');
        if (valueEl && Number.isFinite(min) && Number.isFinite(max)) {
            valueEl.textContent = formatPriceRange(min, max);
        }
        var suffixEl = priceEl.querySelector('.product-price-suffix');
        if (suffixEl) {
            suffixEl.textContent = vatSuffix();
        }
    });
}

document.addEventListener('brandeduk:vat-change', updateCardPriceRanges);

// ===== PRICE HELPERS =====
function toPriceNumber(val) {
    const n = typeof val === 'number' ? val : parseFloat(val);
    return Number.isFinite(n) ? n : 0;
}

function getRangeFromProducts(list) {
    if (!list.length) return { min: 0, max: 0 };
    const prices = list.map(p => toPriceNumber(p.price));
    return {
        min: Math.min(...prices),
        max: Math.max(...prices)
    };
}

function getProductPriceRange(product) {
    // Check product.priceBreaks first (from API), then fallback to lookup
    const breaks = product.priceBreaks || PRICE_BREAKS_BY_CODE[product.code];
    if (!breaks || !breaks.length) {
        const base = toPriceNumber(product.price);
        return { min: base, max: base };
    }
    const values = breaks.map(step => toPriceNumber(step.price)).filter(price => price > 0);
    if (!values.length) {
        const fallback = toPriceNumber(product.price);
        return { min: fallback, max: fallback };
    }
    return {
        min: Math.min(...values),
        max: Math.max(...values)
    };
}

// ===== RENDER PRODUCTS =====
function renderProducts(productsToRender = PRODUCTS_DB, showLoading = false) {
    console.log('Rendering products...', productsToRender.length, 'showLoading:', showLoading);
    const grid = document.getElementById('productsGrid');
    
    if (!grid) {
        console.error('Products grid element not found! Looking for #productsGrid');
        return;
    }
    
    // Show skeleton loading state immediately
    if (showLoading) {
        grid.innerHTML = '';
        // Create skeleton cards (28 to match PRODUCTS_PER_PAGE)
        for (let i = 0; i < PRODUCTS_PER_PAGE; i++) {
            const skeletonCard = document.createElement('div');
            skeletonCard.className = 'product-card skeleton-card';
            skeletonCard.innerHTML = `
                <div class="product-media">
                    <div class="product-figure skeleton-image"></div>
                </div>
                <div class="product-info">
                    <div class="product-code skeleton-text skeleton-text-small"></div>
                    <div class="product-name skeleton-text skeleton-text-medium"></div>
                    <div class="product-name skeleton-text skeleton-text-medium" style="width: 70%; margin-top: 4px;"></div>
                    <div class="product-price skeleton-text skeleton-text-large"></div>
                    <div class="product-colors skeleton-colors">
                        <div class="skeleton-color-dot"></div>
                        <div class="skeleton-color-dot"></div>
                        <div class="skeleton-color-dot"></div>
                        <div class="skeleton-color-dot"></div>
                        <div class="skeleton-color-dot"></div>
                        <div class="skeleton-color-dot"></div>
                    </div>
                </div>
            `;
            grid.appendChild(skeletonCard);
        }
        // Add skeleton styles if not already added
        if (!document.getElementById('skeleton-styles')) {
            const style = document.createElement('style');
            style.id = 'skeleton-styles';
            style.textContent = `
                .skeleton-card {
                    pointer-events: none;
                    opacity: 0.8;
                }
                .skeleton-image {
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                }
                .skeleton-text {
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                    border-radius: 4px;
                    height: 1em;
                    margin-bottom: 8px;
                }
                .skeleton-text-small {
                    width: 60px;
                    height: 12px;
                }
                .skeleton-text-medium {
                    width: 85%;
                    height: 16px;
                }
                .skeleton-text-large {
                    width: 100px;
                    height: 20px;
                    margin-top: 4px;
                }
                .skeleton-colors {
                    display: flex;
                    gap: 8px;
                    margin-top: 8px;
                    padding: 10px 8px;
                }
                .skeleton-color-dot {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                    flex-shrink: 0;
                }
                @keyframes shimmer {
                    0% {
                        background-position: -200% 0;
                    }
                    100% {
                        background-position: 200% 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        return;
    }
    
    grid.innerHTML = '';

    if (!productsToRender.length) {
        console.log('No products to render');
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">No products found. Try adjusting your filters or search terms.</p>';
        return;
    }
    
    console.log('Rendering', productsToRender.length, 'products');

    productsToRender.forEach((product, index) => {
        const card = document.createElement('div');
        card.className = 'product-card';

        const badgesLeft = product.customization.filter(c => c === 'print').map(c =>
            `<span class="badge ${c}">PRINT</span>`
        ).join('');
        
        const badgesRight = product.customization.filter(c => c === 'embroidery').map(c =>
            `<span class="badge ${c}">EMBROIDERY</span>`
        ).join('');

        // Use different color for each card (cycle through available colors)
        const colorIndex = index % product.colors.length;
        const colorData = product.colors[colorIndex];
        const displayColor = typeof colorData === 'object' 
            ? {
                name: colorData.name,
                main: colorData.main || colorData.url || product.image,
                thumb: colorData.thumb || colorData.url || product.image
              }
            : {name: colorData, main: product.image, thumb: product.image};
        
        const colors = product.colors.map(c => {
            const color = typeof c === 'object' 
                ? {
                    name: c.name,
                    main: c.main || c.url || product.image,
                    thumb: c.thumb || c.url || product.image
                  }
                : {name: c, main: product.image, thumb: product.image};
            return `<button type="button" class="color-dot" data-color="${color.name}" data-main="${color.main}" style="background-image: url('${color.thumb}')" title="${color.name}"></button>`;
        }).join('');

        const { min: minPrice, max: maxPrice } = getProductPriceRange(product);

        card.innerHTML = `
            <div class="product-media">
                <div class="product-badges-top">
                    ${badgesLeft}
                    ${badgesRight}
                </div>
                <div class="product-figure">
                    <img src="${displayColor.main}" alt="${product.name}" class="product-main-img">
                </div>
            </div>
            <div class="product-info">
                <div class="product-code">
                    ${product.code}
                    ${product.brand ? `<span class="brand-name">${product.brand}</span>` : ''}
                </div>
                <div class="product-name">${product.name}</div>
                <div class="product-price" data-price-min="${minPrice}" data-price-max="${maxPrice}">
                    <span class="product-price-label">Start From</span>
                    <span class="product-price-value">${formatPriceRange(minPrice, maxPrice)}</span>
                    <span class="product-price-suffix">${vatSuffix()}</span>
                </div>
                <div class="product-colors">${colors}</div>
            </div>
        `;

        // Store selected color for this card
        let selectedColorForCard = null;
        
        card.querySelectorAll('.color-dot').forEach(dot => {
            dot.addEventListener('mouseenter', (event) => {
                // Only change on hover if no color is selected
                if (!selectedColorForCard) {
                    const img = card.querySelector('.product-main-img');
                    if (img) img.src = dot.dataset.main;
                }
            });
            
            dot.addEventListener('mouseleave', (event) => {
                // Restore selected color when mouse leaves
                if (selectedColorForCard && !event.currentTarget.classList.contains('active')) {
                    const img = card.querySelector('.product-main-img');
                    const activeDot = card.querySelector('.color-dot.active');
                    if (img && activeDot) img.src = activeDot.dataset.main;
                }
            });
            
            dot.addEventListener('click', (event) => {
                event.stopPropagation();
                const img = card.querySelector('.product-main-img');
                if (img) img.src = dot.dataset.main;
                card.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                // Save selected color
                selectedColorForCard = {
                    name: dot.dataset.color,
                    url: dot.dataset.main
                };
            });
        });

        card.addEventListener('click', (evt) => goToProduct(product.code, evt));

        grid.appendChild(card);
    });

    updateCardPriceRanges();
}

// ===== PAGINATION =====
function renderPagination() {
    const container = document.getElementById('paginationContainer');
    const numbersContainer = document.getElementById('paginationNumbers');
    const prevBtn = document.getElementById('paginationPrev');
    const nextBtn = document.getElementById('paginationNext');
    const infoEl = document.getElementById('paginationInfo');
    
    if (!container || !numbersContainer) return;
    
    // Hide pagination if only 1 page or no products
    if (totalPages <= 1 || totalProducts === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    
    // Update prev/next buttons
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
    }
    
    // Clear existing page numbers
    numbersContainer.innerHTML = '';
    
    // Calculate which pages to show (up to 9 pages)
    const maxVisiblePages = 9;
    let startPage = 1;
    let endPage = totalPages;
    
    if (totalPages > maxVisiblePages) {
        // Show pages around current page
        const halfVisible = Math.floor(maxVisiblePages / 2);
        
        if (currentPage <= halfVisible) {
            // Near the beginning
            startPage = 1;
            endPage = maxVisiblePages;
        } else if (currentPage >= totalPages - halfVisible) {
            // Near the end
            startPage = totalPages - maxVisiblePages + 1;
            endPage = totalPages;
        } else {
            // In the middle
            startPage = currentPage - halfVisible;
            endPage = currentPage + halfVisible;
        }
    }
    
    // Add first page if not in range
    if (startPage > 1) {
        addPageNumber(numbersContainer, 1);
        if (startPage > 2) {
            addEllipsis(numbersContainer);
        }
    }
    
    // Add visible page numbers
    for (let i = startPage; i <= endPage; i++) {
        addPageNumber(numbersContainer, i);
    }
    
    // Add last page if not in range
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            addEllipsis(numbersContainer);
        }
        addPageNumber(numbersContainer, totalPages);
    }
    
    // Update info text
    if (infoEl) {
        const start = (currentPage - 1) * PRODUCTS_PER_PAGE + 1;
        const end = Math.min(currentPage * PRODUCTS_PER_PAGE, totalProducts);
        infoEl.textContent = `Showing ${start}-${end} of ${totalProducts} products`;
    }
}

function addPageNumber(container, pageNum) {
    const btn = document.createElement('button');
    btn.className = 'pagination-number';
    btn.textContent = pageNum;
    btn.setAttribute('aria-label', `Go to page ${pageNum}`);
    
    if (pageNum === currentPage) {
        btn.classList.add('active');
        btn.setAttribute('aria-current', 'page');
    }
    
    btn.addEventListener('click', () => goToPage(pageNum));
    container.appendChild(btn);
}

function addEllipsis(container) {
    const ellipsis = document.createElement('span');
    ellipsis.className = 'pagination-number ellipsis';
    ellipsis.textContent = '...';
    container.appendChild(ellipsis);
}

async function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    
    currentPage = page;
    
    // Show loading state
    renderProducts([], true);
    
    // Get current filters
    const filters = getCurrentFilters();
    
    // Fetch products for the new page
    const data = await fetchProducts(filters, currentPage, PRODUCTS_PER_PAGE);
    
    if (data) {
        renderProducts(data.items || [], false);
        renderPagination();
        
        // Scroll to top of products grid
        const grid = document.getElementById('productsGrid');
        if (grid) {
            grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    } else {
        renderProducts([], false);
        renderPagination();
    }
}

function getCurrentFilters() {
    // Reuse the filter collection logic from applyFilters
    const filters = {
        genders: [],
        ageGroups: [],
        sleeves: [],
        necklines: [],
        accreditations: [],
        primaryColours: [],
        colourShades: [],
        cmyk: [],
        pantone: [],
        styles: [],
        features: [],
        sizes: [],
        fabrics: [],
        weights: [],
        fits: [],
        sectors: [],
        sports: [],
        tags: [],
        effects: [],
        flags: [], // Special flags: new-in, bradeal, offers, in-stock, recycled
        priceMin: 0,
        priceMax: undefined,
        text: document.querySelector('.text-search-input')?.value || ''
    };
    
    // Collect special flags (quick filters)
    const flagNameMap = {
        'new-in': 'new-in',
        'bradeal': 'raladeal', // Note: HTML uses "bradeal" but backend expects "RalaDeal"
        'offers': 'offers',
        'in-stock': 'in-stock',
        'recycled': 'recycled-organic'
    };
    
    document.querySelectorAll('input[name="quick-filter"]:checked').forEach(cb => {
        const flagValue = cb.value;
        const mappedName = flagNameMap[flagValue] || flagValue;
        filters.flags.push(mappedName);
        console.log("selected flag", mappedName);
        
    });
    
    // Map gender values to proper names for backend
    const genderNameMap = {
        'male': 'male',
        'female': 'female',
        'unisex': 'Unisex'
    };
    
    document.querySelectorAll('input[name="gender"]:checked').forEach(cb => {
        const genderValue = cb.value;
        const mappedName = genderNameMap[genderValue] || genderValue;
        filters.genders.push(mappedName);
    });
    
    // Map age group values to proper names for backend
    const ageGroupNameMap = {
        'adult': 'adult',
        'kids': 'kids',
        'infant': 'infant'
    };
    
    document.querySelectorAll('input[name="age-group"]:checked').forEach(cb => {
        const ageGroupValue = cb.value;
        const mappedName = ageGroupNameMap[ageGroupValue] || ageGroupValue;
        filters.ageGroups.push(mappedName);
    });
    document.querySelectorAll('input[name="sleeve"]:checked').forEach(cb => {
        filters.sleeves.push(cb.value);
    });
    document.querySelectorAll('input[name="neckline"]:checked').forEach(cb => {
        filters.necklines.push(cb.value);
    });
    document.querySelectorAll('input[name="accreditations"]:checked').forEach(cb => {
        filters.accreditations.push(cb.value);
    });
    // Map primary colours to ensure correct names are sent to backend
    const primaryColourNameMap = {
        'black': 'black',
        'blue': 'blue',
        'grey': 'grey',
        'green': 'green',
        'white': 'white',
        'red': 'red',
        'pink': 'pink',
        'yellow': 'yellow',
        'neutral': 'neutral',
        'purple': 'purple',
        'orange': 'orange',
        'brown': 'brown',
        'pattern': 'pattern',
        'other': 'other'
    };
    
    document.querySelectorAll('.filter-colour-swatch.is-active').forEach(btn => {
        const colour = btn.dataset.colour;
        if (colour) {
            // Map to correct name if mapping exists, otherwise use original value
            const mappedColour = primaryColourNameMap[colour] || colour;
            filters.primaryColours.push(mappedColour);
        }
    });
    document.querySelectorAll('input[name="colour-shade"]:checked').forEach(cb => {
        filters.colourShades.push(cb.value);
    });
    document.querySelectorAll('input[name="cmyk"]:checked').forEach(cb => {
        filters.cmyk.push(cb.value);
    });
    document.querySelectorAll('input[name="pantone"]:checked').forEach(cb => {
        filters.pantone.push(cb.value);
    });
    document.querySelectorAll('input[name="style"]:checked').forEach(cb => {
        filters.styles.push(cb.value);
    });
    document.querySelectorAll('input[name="features"]:checked').forEach(cb => {
        filters.features.push(cb.value);
    });
    document.querySelectorAll('input[name="size"]:checked').forEach(cb => {
        filters.sizes.push(cb.value);
    });
    // Send fabric slug values directly to backend (no mapping needed)
    document.querySelectorAll('input[name="fabric"]:checked').forEach(cb => {
        filters.fabrics.push(cb.value);
    });
    document.querySelectorAll('input[name="weight"]:checked').forEach(cb => {
        filters.weights.push(cb.value);
    });
    document.querySelectorAll('input[name="fit"]:checked').forEach(cb => {
        filters.fits.push(cb.value);
    });
    document.querySelectorAll('input[name="related-sector"]:checked').forEach(cb => {
        filters.sectors.push(cb.value);
    });
    document.querySelectorAll('input[name="related-sport"]:checked').forEach(cb => {
        filters.sports.push(cb.value);
    });
    
    // Send tag slug values directly to backend (no mapping needed)
    document.querySelectorAll('input[name="tag"]:checked').forEach(cb => {
        filters.tags.push(cb.value);
    });
    
    // Send effect slug values directly to backend (no mapping needed)
    document.querySelectorAll('input[name="effect"]:checked').forEach(cb => {
        filters.effects.push(cb.value);
    });

    // Get price range (only if user has actually interacted with slider)
    const slider = document.getElementById('priceRangeSlider');
    if (slider && priceFilterApplied) {
        filters.priceMin = toPriceNumber(slider.min) || 0;
        filters.priceMax = toPriceNumber(slider.value);
    }
    // Otherwise, don't include price filters
    
    return filters;
}

// ===== NAVIGATION =====
function goToProduct(code, evt = null, selectedColor = null) {
    // Try to find product in current products first, then in PRODUCTS_DB
    const product = CURRENT_PRODUCTS.find(p => p.code === code) || PRODUCTS_DB.find(p => p.code === code);
    if (product) {
        sessionStorage.setItem('selectedProduct', code);
        sessionStorage.setItem('selectedProductData', JSON.stringify(product));
        
        // Save selected color if any
        const eventSource = evt?.currentTarget || evt?.target || event?.target;
        const activeColorDot = eventSource?.closest('.product-card')?.querySelector('.color-dot.active');
        if (activeColorDot) {
            sessionStorage.setItem('selectedColorName', activeColorDot.dataset.color);
            sessionStorage.setItem('selectedColorUrl', activeColorDot.dataset.main);
        }
    }
    window.location.href = 'product-detail.html';
}

// ===== BASKET COUNT =====
function updateBasketCount() {
    document.querySelectorAll('.basket-count').forEach(el => {
        el.textContent = quoteBasket.length;
    });
}

function initBrowseCategories() {
    const dropdown = document.querySelector('.header-bottom .category-dropdown');

    if (!dropdown) {
        return;
    }

    const toggle = dropdown.querySelector('.category-toggle');
    const menuItems = dropdown.querySelectorAll('.category-menu > li.has-children');
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const hoverQuery = window.matchMedia('(hover: hover)');
    let isOpen = false;

    const resetExpanded = () => {
        menuItems.forEach(item => {
            item.classList.remove('is-expanded');
        });
    };

    const expandMenuItem = (item) => {
        if (!item) {
            return;
        }
        menuItems.forEach(other => {
            if (other !== item) {
                other.classList.remove('is-expanded');
            }
        });
        item.classList.add('is-expanded');
    };

    const setOpenState = (open) => {
        isOpen = open;
        dropdown.classList.toggle('show', open);
        dropdown.setAttribute('data-visible', open ? 'true' : 'false');
        if (toggle) {
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
        if (!open) {
            resetExpanded();
        }
    };

    const openDropdown = () => {
        if (!isOpen) {
            setOpenState(true);
        }
    };

    const closeDropdown = () => {
        if (isOpen) {
            setOpenState(false);
        }
    };

    const handleDocumentClick = (event) => {
        if (!isOpen) {
            return;
        }

        if (!dropdown.contains(event.target) && event.target !== toggle) {
            closeDropdown();
        }
    };

    const handleToggleClick = (event) => {
        if (event) {
            event.preventDefault();
        }

        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    };

    const handleMenuItemClick = (item, event) => {
        if (desktopQuery.matches && hoverQuery.matches) {
            return;
        }

        event.preventDefault();
        const alreadyExpanded = item.classList.contains('is-expanded');
        menuItems.forEach(other => {
            if (other !== item) {
                other.classList.remove('is-expanded');
            }
        });
        item.classList.toggle('is-expanded', !alreadyExpanded);
    };

    if (toggle) {
        toggle.addEventListener('click', handleToggleClick);
        toggle.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                handleToggleClick(event);
            }
        });
        toggle.addEventListener('focus', () => {
            if (desktopQuery.matches && hoverQuery.matches) {
                openDropdown();
            }
        });
    }

    if (hoverQuery.matches) {
        dropdown.addEventListener('mouseenter', () => {
            if (desktopQuery.matches) {
                openDropdown();
            }
        });

        dropdown.addEventListener('mouseleave', () => {
            if (desktopQuery.matches) {
                closeDropdown();
            }
        });
    }

    menuItems.forEach(item => {
        const link = item.querySelector(':scope > a');
        if (!link) {
            return;
        }

            item.addEventListener('mouseenter', () => {
                if (desktopQuery.matches && hoverQuery.matches) {
                    expandMenuItem(item);
                }
            });

            item.addEventListener('mouseleave', () => {
                if (desktopQuery.matches && hoverQuery.matches) {
                    item.classList.remove('is-expanded');
                }
            });

        link.addEventListener('click', (event) => handleMenuItemClick(item, event));

        link.addEventListener('focus', () => {
            if (desktopQuery.matches && hoverQuery.matches) {
                    expandMenuItem(item);
            }
        });

        link.addEventListener('blur', () => {
            if (desktopQuery.matches && hoverQuery.matches) {
                setTimeout(() => {
                    if (!item.contains(document.activeElement)) {
                        item.classList.remove('is-expanded');
                    }
                }, 0);
            }
        });
    });

    if (typeof desktopQuery.addEventListener === 'function') {
        desktopQuery.addEventListener('change', () => {
            closeDropdown();
        });
    } else if (typeof desktopQuery.addListener === 'function') {
        desktopQuery.addListener(() => {
            closeDropdown();
        });
    }

    if (typeof hoverQuery.addEventListener === 'function') {
        hoverQuery.addEventListener('change', () => {
            closeDropdown();
        });
    }

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeDropdown();
        }
    });

    setOpenState(false);
}

// ===== SEARCH & INIT =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded - Initializing...');
    const searchInput = document.getElementById('searchInput');
    const headerSearchForm = document.querySelector('.header-search');

    updateBasketCount();
    initFilters();
    initBrowseCategories();
    
    // Check if products grid exists
    const grid = document.getElementById('productsGrid');
    if (!grid) {
        console.error('CRITICAL: productsGrid element not found in HTML!');
    } else {
        console.log('Products grid found');
    }
    
    // Pagination event listeners
    const prevBtn = document.getElementById('paginationPrev');
    const nextBtn = document.getElementById('paginationNext');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => goToPage(currentPage + 1));
    }
    
    // Fetch initial products from API (applyFilters will handle the initial load)
    console.log('Calling applyFilters for initial load...');
    await applyFilters({ initialLoad: true });
    console.log('Initial load complete');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            applyFilters();
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const q = searchInput.value.trim();
                window.location.href = `search-results.html${q ? `?q=${encodeURIComponent(q)}` : ''}`;
            }
        });
    }

    if (headerSearchForm) {
        headerSearchForm.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!searchInput) {
                return;
            }
            const query = searchInput.value.trim();
            window.location.href = `search-results.html${query ? `?q=${encodeURIComponent(query)}` : ''}`;
        });
    }
});

// ===== FILTER FUNCTIONALITY =====
function initFilters() {
    // Category expand/collapse
    const categoryItems = document.querySelectorAll('.category-item');
    categoryItems.forEach(item => {
        item.addEventListener('click', () => {
            const category = item.dataset.category;
            const isExpanded = item.classList.contains('expanded');
            
            // Find subcategories container
            const subcategories = document.querySelector(`.subcategories[data-parent="${category}"]`);

            // Ensure container is measurable for smooth CSS transitions.
            if (subcategories && subcategories.style.display === 'none') {
                subcategories.style.display = 'block';
            }
            
            // Toggle expansion
            if (isExpanded) {
                item.classList.remove('expanded');
            } else {
                item.classList.add('expanded');
            }
        });
    });

    // Subcategory expandable items
    const subcategoryExpandables = document.querySelectorAll('.subcategory-expandable');
    subcategoryExpandables.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = item.classList.contains('expanded');
            const text = item.querySelector('span:last-child').textContent.toLowerCase();
            
            // Find sub-subcategories if they exist
            const subSubcategories = item.nextElementSibling;
            const isSubSubContainer = subSubcategories && subSubcategories.classList.contains('sub-subcategories');

            // Ensure container is measurable for smooth CSS transitions.
            if (isSubSubContainer && subSubcategories.style.display === 'none') {
                subSubcategories.style.display = 'block';
            }
            
            if (isExpanded) {
                item.classList.remove('expanded');
            } else {
                item.classList.add('expanded');
            }
        });
    });

    // Filter accordion sections
    const filterSections = document.querySelectorAll('.filter-section');
    filterSections.forEach(section => {
        const toggle = section.querySelector('.filter-section-toggle');
        const body = section.querySelector('.filter-section-body');
        if (!toggle || !body) {
            return;
        }

        const setExpanded = (state) => {
            section.classList.toggle('is-expanded', state);
            body.style.display = state ? 'block' : 'none';
            toggle.setAttribute('aria-expanded', state ? 'true' : 'false');
        };

        const initialState = section.classList.contains('is-expanded') || toggle.getAttribute('aria-expanded') === 'true';
        setExpanded(initialState);

        toggle.addEventListener('click', () => {
            const nextState = !section.classList.contains('is-expanded');
            setExpanded(nextState);
        });
    });

    // Quick filters toggle state helper
    const quickFilterInputs = Array.from(document.querySelectorAll('.filter-toggle input[type="checkbox"]'));
    const quickTargetMap = new Map();

    quickFilterInputs.forEach(input => {
        const parent = input.closest('.filter-toggle');
        if (!parent) {
            return;
        }

        const targetId = input.dataset.target;
        const targetCheckbox = targetId ? document.getElementById(targetId) : null;
        if (targetCheckbox) {
            quickTargetMap.set(targetId, input);
            if (targetCheckbox.checked !== input.checked) {
                targetCheckbox.checked = input.checked;
            }
        }

        parent.classList.toggle('is-active', input.checked);

        input.addEventListener('change', () => {
            parent.classList.toggle('is-active', input.checked);

            if (targetCheckbox) {
                targetCheckbox.checked = input.checked;
                targetCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                applyFilters();
            }
        });
    });

    const colourSwatches = document.querySelectorAll('.filter-colour-swatch');
    colourSwatches.forEach(button => {
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => {
            const nextState = !button.classList.contains('is-active');
            button.classList.toggle('is-active', nextState);
            button.setAttribute('aria-pressed', nextState ? 'true' : 'false');
            applyFilters();
        });
    });

    // Filter checkboxes
    const filterCheckboxes = document.querySelectorAll('.filter-option input[type="checkbox"]');
    filterCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const quickSource = quickTargetMap.get(checkbox.id);
            if (quickSource) {
                quickSource.checked = checkbox.checked;
                const quickLabel = quickSource.closest('.filter-toggle');
                if (quickLabel) {
                    quickLabel.classList.toggle('is-active', quickSource.checked);
                }
            }

            applyFilters();
        });
    });

    // Clear all filters action
    const clearFiltersButton = document.querySelector('.filter-clear-action');
    if (clearFiltersButton) {
        clearFiltersButton.addEventListener('click', () => {
            filterCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });

            quickFilterInputs.forEach(input => {
                input.checked = false;
                const quickLabel = input.closest('.filter-toggle');
                if (quickLabel) {
                    quickLabel.classList.remove('is-active');
                }
            });

            const textSearch = document.querySelector('.text-search-input');
            if (textSearch) {
                textSearch.value = '';
            }

            const sliderElement = document.getElementById('priceRangeSlider');
            const priceLabelElement = document.getElementById('priceRangeLabel');
            if (sliderElement) {
                sliderElement.value = sliderElement.max;
                if (priceLabelElement) {
                    priceLabelElement.textContent = `£${sliderElement.min} - £${Number(sliderElement.value).toFixed(2)}`;
                }
            }
            
            // Reset price filter flag when clearing filters
            priceFilterApplied = false;

            applyFilters();
        });
    }

    // Price range slider - static 0 to 200
    const priceSlider = document.getElementById('priceRangeSlider');
    const priceLabel = document.getElementById('priceRangeLabel');
    if (priceSlider && priceLabel) {
        // Set static range: 0 to 200
        priceSlider.min = 0;
        priceSlider.max = 200;
        priceSlider.value = 200;
        priceSlider.step = 0.01;
        priceLabel.textContent = `£${priceSlider.min} - £${Number(priceSlider.value).toFixed(2)}`;
        
        // Update label immediately on input (for smooth UI feedback)
        priceSlider.addEventListener('input', () => {
            priceLabel.textContent = `£${priceSlider.min} - £${Number(priceSlider.value).toFixed(2)}`;
            priceFilterApplied = true; // Mark that user has interacted with slider
            
            // Clear previous debounce timer
            if (priceSliderDebounceTimer) {
                clearTimeout(priceSliderDebounceTimer);
            }
            
            // Show skeleton loading immediately while user is dragging
            renderProducts([], true);
            
            // Debounce the API call - only fire after user stops dragging
            priceSliderDebounceTimer = setTimeout(() => {
                applyFilters({ fromSlider: true });
            }, PRICE_SLIDER_DEBOUNCE_MS);
        });
        
        // Also handle change event (when user releases slider)
        priceSlider.addEventListener('change', () => {
            // Clear any pending debounce timer
            if (priceSliderDebounceTimer) {
                clearTimeout(priceSliderDebounceTimer);
            }
            // Immediately apply filters when slider is released
            priceFilterApplied = true;
            applyFilters({ fromSlider: true });
        });
    }

    // Text search
    const textSearch = document.querySelector('.text-search-input');
    if (textSearch) {
        textSearch.addEventListener('input', applyFilters);
    }
}

// Track if user has actually interacted with price slider
let priceFilterApplied = false;
// Debounce timer for price slider
let priceSliderDebounceTimer = null;
const PRICE_SLIDER_DEBOUNCE_MS = 500; // Wait 500ms after user stops dragging

async function applyFilters(options = {}) {
    const { fromSlider = false, initialLoad = false } = options;
    
    // Show loading state IMMEDIATELY when filter is applied
    renderProducts([], true);

    // Get all selected filters
    const filters = {
        genders: [],
        ageGroups: [],
        sleeves: [],
        necklines: [],
        accreditations: [],
        primaryColours: [],
        colourShades: [],
        cmyk: [],
        pantone: [],
        styles: [],
        features: [],
        sizes: [],
        fabrics: [],
        weights: [],
        fits: [],
        sectors: [],
        sports: [],
        tags: [],
        effects: [],
        flags: [], // Special flags: new-in, bradeal, offers, in-stock, recycled
        // Don't set priceMin/priceMax by default - only when user drags slider
        text: document.querySelector('.text-search-input')?.value || ''
    };

    // Collect special flags (quick filters)
    const flagNameMap = {
        'new-in': 'new-in',
        'bradeal': 'raladeal', // Note: HTML uses "bradeal" but backend expects "RalaDeal"
        'offers': 'offers',
        'in-stock': 'in-stock',
        'recycled': 'recycled-organic'
    };
    
    document.querySelectorAll('input[name="quick-filter"]:checked').forEach(cb => {
        const flagValue = cb.value;
        const mappedName = flagNameMap[flagValue] || flagValue;
        filters.flags.push(mappedName);
        console.log("selected flag", mappedName);
    });

    // Map gender values to proper names for backend
    const genderNameMap = {
        'male': 'male',
        'female': 'female',
        'unisex': 'unisex'
    };
    
    document.querySelectorAll('input[name="gender"]:checked').forEach(cb => {
        const genderValue = cb.value;
        const mappedName = genderNameMap[genderValue] || genderValue;
        filters.genders.push(mappedName);
    });
    
    // Map age group values to proper names for backend
    const ageGroupNameMap = {
        'adult': 'adult',
        'kids': 'kids',
        'infant': 'infant'
    };
    
    document.querySelectorAll('input[name="age-group"]:checked').forEach(cb => {
        const ageGroupValue = cb.value;
        const mappedName = ageGroupNameMap[ageGroupValue] || ageGroupValue;
        filters.ageGroups.push(mappedName);
    });
    document.querySelectorAll('input[name="sleeve"]:checked').forEach(cb => {
        filters.sleeves.push(cb.value);
    });
    document.querySelectorAll('input[name="neckline"]:checked').forEach(cb => {
        filters.necklines.push(cb.value);
    });
    document.querySelectorAll('input[name="accreditations"]:checked').forEach(cb => {
        filters.accreditations.push(cb.value);
    });
    // Map primary colours to ensure correct names are sent to backend
    const primaryColourNameMap = {
        'black': 'black',
        'blue': 'blue',
        'grey': 'grey',
        'green': 'green',
        'white': 'white',
        'red': 'red',
        'pink': 'pink',
        'yellow': 'yellow',
        'neutral': 'neutral',
        'purple': 'purple',
        'orange': 'orange',
        'brown': 'brown',
        'pattern': 'pattern',
        'other': 'other'
    };
    
    document.querySelectorAll('.filter-colour-swatch.is-active').forEach(btn => {
        const colour = btn.dataset.colour;
        if (colour) {
            // Map to correct name if mapping exists, otherwise use original value
            const mappedColour = primaryColourNameMap[colour] || colour;
            filters.primaryColours.push(mappedColour);
        }
    });
    document.querySelectorAll('input[name="colour-shade"]:checked').forEach(cb => {
        filters.colourShades.push(cb.value);
    });
    document.querySelectorAll('input[name="cmyk"]:checked').forEach(cb => {
        filters.cmyk.push(cb.value);
    });
    document.querySelectorAll('input[name="pantone"]:checked').forEach(cb => {
        filters.pantone.push(cb.value);
    });
    document.querySelectorAll('input[name="style"]:checked').forEach(cb => {
        filters.styles.push(cb.value);
    });
    document.querySelectorAll('input[name="features"]:checked').forEach(cb => {
        filters.features.push(cb.value);
    });
    document.querySelectorAll('input[name="size"]:checked').forEach(cb => {
        filters.sizes.push(cb.value);
    });
    // Send fabric slug values directly to backend (no mapping needed)
    document.querySelectorAll('input[name="fabric"]:checked').forEach(cb => {
        filters.fabrics.push(cb.value);
    });
    document.querySelectorAll('input[name="weight"]:checked').forEach(cb => {
        filters.weights.push(cb.value);
    });
    document.querySelectorAll('input[name="fit"]:checked').forEach(cb => {
        filters.fits.push(cb.value);
    });
    document.querySelectorAll('input[name="related-sector"]:checked').forEach(cb => {
        filters.sectors.push(cb.value);
    });
    document.querySelectorAll('input[name="related-sport"]:checked').forEach(cb => {
        filters.sports.push(cb.value);
    });
    
    // Send tag slug values directly to backend (no mapping needed)
    document.querySelectorAll('input[name="tag"]:checked').forEach(cb => {
        filters.tags.push(cb.value);
    });
    
    // Send effect slug values directly to backend (no mapping needed)
    document.querySelectorAll('input[name="effect"]:checked').forEach(cb => {
        filters.effects.push(cb.value);
    });
    
    // Get price range from slider (only if user has actually interacted with it)
    const slider = document.getElementById('priceRangeSlider');
    const label = document.getElementById('priceRangeLabel');
    if (fromSlider || priceFilterApplied) {
        // Only apply price filters if user has interacted with slider
        if (slider) {
            filters.priceMin = toPriceNumber(slider.min) || 0;
            filters.priceMax = toPriceNumber(slider.value);
        }
    }
    // Otherwise, don't include price filters - let API return all products

    // Fetch products from API with filters
    console.log('applyFilters called with filters:', filters);
    
    // Reset to page 1 when filters change
    currentPage = 1;
    
    const data = await fetchProducts(filters, currentPage, PRODUCTS_PER_PAGE);
    
    if (data) {
        console.log('Products fetched successfully:', data.items?.length || 0);
        
        // Render products from API (even if empty array - that's valid)
        renderProducts(data.items || [], false);
        
        // Render pagination
        renderPagination();
    } else {
        // fetchProducts returns null if another request is in progress
        // In that case, don't show "No products" - keep skeleton visible
        // The actual request will complete and render products
        console.log('Request skipped (another in progress) or failed - keeping skeleton visible');
        // Don't render anything - skeleton cards are already showing from line 1306
        // The actual request that's in progress will complete and render products
    }
}
