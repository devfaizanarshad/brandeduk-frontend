/* ===============================
   DATA
=============================== */

const colors = [
    ["Aquatic", "https://i.postimg.cc/fbC2Zn4L/GD067-Aquatic-FT.jpg"],
    ["Ash Grey", "https://i.postimg.cc/fbC2Zn4t/GD067-Ash-Grey-FT.jpg"],
    ["Black", "https://i.postimg.cc/R0ds95rf/GD067-Black-FT.jpg"],
    ["Blue Dusk", "https://i.postimg.cc/QMm4sGLJ/GD067-Blue-Dusk-FT.jpg"],
    ["Brown Savana", "https://i.postimg.cc/wvBWjfHL/GD067-Brown-Savana-FT.jpg"],
    ["Cardinal Red", "https://i.postimg.cc/SsKZxTqV/GD067-Cardinal-Red-FT.jpg"],
    ["Carolina Blue", "https://i.postimg.cc/V6N7kG1D/GD067-Carolina-Blue-FT.jpg"],
    ["Cement", "https://i.postimg.cc/fLbHR2Z2/GD067-Cement-FT.jpg"],
    ["Charcoal", "https://i.postimg.cc/4d38xLZF/GD067-Charcoal-FT.jpg"],
    ["Cobalt", "https://i.postimg.cc/sX2ng6yL/GD067-Cobalt-FT.jpg"],
    ["Cocoa", "https://i.postimg.cc/d10WVHvb/GD067-Cocoa-FT.jpg"],
    ["Daisy", "https://i.postimg.cc/1tzW3Cs1/GD067-Daisy-FT.jpg"],
    ["Dark Heather", "https://i.postimg.cc/j5kMwHdk/GD067-Dark-Heather-FT.jpg"],
    ["Dusty Rose", "https://i.postimg.cc/fLg8tcTP/GD067-Dusty-Rose-FT.jpg"],
    ["Forest Green", "https://i.postimg.cc/FRnTdys8/GD067-Forest-Green-FT.jpg"],
    ["Light Pink", "https://i.postimg.cc/G2SX8FhW/GD067-Light-Pink-FT.jpg"],
    ["Maroon", "https://i.postimg.cc/zBPxbCG1/GD067-Maroon-FT.jpg"],
    ["Military Green", "https://i.postimg.cc/TwHtLV3f/GD067-Military-Green-FT.jpg"],
    ["Mustard", "https://i.postimg.cc/MTr9M7pZ/GD067-Mustard-FT.jpg"],
    ["Navy", "https://i.postimg.cc/MTr9M7pp/GD067-Navy-FT.jpg"],
    ["Off-White", "https://i.postimg.cc/nzw3j4hz/GD067-Off-White-FT.jpg"],
    ["Paragon", "https://i.postimg.cc/j5kMwHSL/GD067-Paragon-FT.jpg"],
    ["Pink Lemonade", "https://i.postimg.cc/zBPxbCGy/GD067-Pink-Lemonade-FT.jpg"],
    ["Pistachio", "https://i.postimg.cc/xCF6Jv1N/GD067-Pistachio-FT.jpg"],
    ["Purple", "https://i.postimg.cc/C5BmjRRx/GD067-Purple-FT.jpg"],
    ["Red", "https://i.postimg.cc/brD3QZZd/GD067-Red-FT.jpg"],
    ["Sport Grey", "https://i.postimg.cc/zvb0nyyg/GD067-Ringspun-Sport-Grey-FT.jpg"],
    ["Royal", "https://i.postimg.cc/VNmG3sVH/GD067-Royal-FT.jpg"],
    ["Sage", "https://i.postimg.cc/tgpSLRcy/GD067-Sage-FT.jpg"],
    ["Sand", "https://i.postimg.cc/Bv4YdZz3/GD067-Sand-FT.jpg"],
    ["Sky", "https://i.postimg.cc/YSMnJ2Pc/GD067-Sky-FT.jpg"],
    ["Smoke", "https://i.postimg.cc/Xv4HTNPb/GD067-Smoke-FT.jpg"],
    ["Stone Blue", "https://i.postimg.cc/g0mSfc72/GD067-Stone-Blue-FT.jpg"],
    ["Tangerine", "https://i.postimg.cc/25GcmRpr/GD067-Tangerine-FT.jpg"],
    ["Texas Orange", "https://i.postimg.cc/TP07GM8x/GD067-Texas-Orange-FT.jpg"],
    ["White", "https://i.postimg.cc/1zBCPhxQ/GD067-White-FT.jpg"],
    ["Yellow Haze", "https://i.postimg.cc/W48WjLRN/GD067-Yellow-Haze-FT.jpg"]
];

const sizes = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

let selectedColor = colors[0];
let quantities = {};
sizes.forEach(s => quantities[s] = 0);

let uploadedLogos = [];
let customText = "";
let quoteBasket = JSON.parse(localStorage.getItem('quoteBasket')) || [];

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

/* ===============================
   INIT
=============================== */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Customization page loaded');
    console.log('Colors available:', colors.length);
    
    renderThumbnails();
    renderColors();
    renderSizes();
    setupTabs();
    setupUpload();
    setupLogoOptions();
    setupTextOptions();
    updateBasketCount();
    updateSummary();
    
    document.getElementById('addToQuoteBtn').addEventListener('click', addToQuote);
    
    console.log('All functions initialized');
});

/* ===============================
   THUMBNAILS
=============================== */

function renderThumbnails() {
    const container = document.getElementById('thumbContainer');
    container.innerHTML = '';
    
    colors.forEach(([name, url], index) => {
        const thumb = document.createElement('div');
        thumb.className = `color-thumb ${index === 0 ? 'active' : ''}`;
        thumb.style.backgroundImage = `url('${url}')`;
        
        // Hover: cambia immagine temporaneamente
        thumb.onmouseenter = () => {
            document.getElementById('previewImage').src = url;
        };
        
        // Click: seleziona permanentemente
        thumb.onclick = () => selectColor(name, url);
        
        container.appendChild(thumb);
    });
}

function selectColor(name, url) {
    selectedColor = [name, url];
    document.getElementById('previewImage').src = url;
    
    // Aggiorna le thumbnail
    document.querySelectorAll('.color-thumb').forEach((t, i) => {
        t.classList.toggle('active', colors[i][0] === name);
    });
    
    // Aggiorna i color swatches nel tab
    document.querySelectorAll('.color-swatch').forEach(s => {
        s.classList.toggle('active', s.dataset.name === name);
    });
}
function renderColors() {
    const grid = document.getElementById('colorGrid');
    grid.innerHTML = '';
    
    colors.forEach(([name, url]) => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundImage = `url('${url}')`;
        swatch.dataset.name = name;
        
        // Hover: cambia immagine temporaneamente
        swatch.onmouseenter = () => {
            document.getElementById('previewImage').src = url;
        };
        
        // Click: seleziona permanentemente
        swatch.onclick = () => selectColor(name, url);
        
        grid.appendChild(swatch);
    });
}

/* ===============================
   SIZES TAB
=============================== */

function renderSizes() {
    const grid = document.getElementById('sizesGrid');
    grid.innerHTML = '';
    
    sizes.forEach(size => {
        const box = document.createElement('div');
        box.className = 'size-box';
        box.innerHTML = `
            <div class="size-label">${size}</div>
            <div class="qty-wrapper">
                <button class="qty-btn minus" data-size="${size}">−</button>
                <input type="number" class="qty-input" data-size="${size}" value="0" min="0">
                <button class="qty-btn plus" data-size="${size}">+</button>
            </div>
        `;
        
        const minusBtn = box.querySelector('.minus');
        const plusBtn = box.querySelector('.plus');
        const input = box.querySelector('.qty-input');
        
        minusBtn.onclick = () => {
            quantities[size] = Math.max(0, quantities[size] - 1);
            input.value = quantities[size];
            updateSizeBox(box, size);
            updateSummary();
        };
        
        plusBtn.onclick = () => {
            quantities[size]++;
            input.value = quantities[size];
            updateSizeBox(box, size);
            updateSummary();
        };
        
        input.oninput = () => {
            quantities[size] = Math.max(0, parseInt(input.value) || 0);
            updateSizeBox(box, size);
            updateSummary();
        };
        
        grid.appendChild(box);
    });
}

function updateSizeBox(box, size) {
    if (quantities[size] > 0) {
        box.classList.add('active');
    } else {
        box.classList.remove('active');
    }
}

/* ===============================
   TABS
=============================== */

function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            contents.forEach(c => c.classList.remove('active'));
            document.getElementById(`tab-${targetId}`).classList.add('active');
        });
    });
}

/* ===============================
   UPLOAD
=============================== */

function setupUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const logoInput = document.getElementById('logoInput');
    
    uploadArea.onclick = () => logoInput.click();
    
    logoInput.onchange = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                uploadedLogos.push(event.target.result);
                renderLogoPreviews();
                document.getElementById('logoOptions').style.display = 'block';
            };
            reader.readAsDataURL(file);
        });
    };
    
    // Drag & Drop
    uploadArea.ondragover = (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#7c3aed';
    };
    
    uploadArea.ondragleave = () => {
        uploadArea.style.borderColor = '#ccc';
    };
    
    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#ccc';
        const files = Array.from(e.dataTransfer.files);
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    uploadedLogos.push(event.target.result);
                    renderLogoPreviews();
                    document.getElementById('logoOptions').style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    };
}

function renderLogoPreviews() {
    const grid = document.getElementById('logoPreview');
    grid.innerHTML = '';
    
    uploadedLogos.forEach((logo, index) => {
        const item = document.createElement('div');
        item.className = 'logo-preview-item';
        item.style.backgroundImage = `url('${logo}')`;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.onclick = () => {
            uploadedLogos.splice(index, 1);
            renderLogoPreviews();
            if (uploadedLogos.length === 0) {
                document.getElementById('logoOptions').style.display = 'none';
            }
        };
        
        item.appendChild(removeBtn);
        grid.appendChild(item);
    });
}

/* ===============================
   LOGO OPTIONS
=============================== */

function setupLogoOptions() {
    const placementBtns = document.querySelectorAll('.placement-btn');
    placementBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            placementBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    const sizeSlider = document.getElementById('logoSize');
    const sizeValue = document.getElementById('logoSizeValue');
    sizeSlider.oninput = () => {
        sizeValue.textContent = sizeSlider.value + '%';
    };
}

/* ===============================
   TEXT OPTIONS
=============================== */

function setupTextOptions() {
    const textInput = document.getElementById('customText');
    textInput.oninput = () => {
        customText = textInput.value;
    };
}

/* ===============================
   SUMMARY
=============================== */

function updateSummary() {
    const total = Object.values(quantities).reduce((a, b) => a + b, 0);
    const unitPrice = 17.58;
    const totalPrice = total * unitPrice;
    
    document.getElementById('totalItems').textContent = total;
    document.getElementById('unitPrice').textContent = `${formatCurrency(unitPrice)} ${vatSuffix()}`;
    document.getElementById('totalPrice').textContent = `${formatCurrency(totalPrice)} ${vatSuffix()}`;
    
    const btn = document.getElementById('addToQuoteBtn');
    btn.disabled = total === 0;
}

document.addEventListener('brandeduk:vat-change', updateSummary);

/* ===============================
   ADD TO QUOTE
=============================== */

function addToQuote() {
    const total = Object.values(quantities).reduce((a, b) => a + b, 0);
    if (total === 0) return;
    
    const activeSizes = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([size, qty]) => ({ size, qty }));
    
    const entry = {
        code: 'GD067',
        name: 'Gildan Softstyle Hoodie',
        color: selectedColor[0],
        colorImage: selectedColor[1],
        sizes: activeSizes,
        totalQuantity: total,
        logos: uploadedLogos,
        customText: customText,
        unitPrice: 17.58,
        totalPrice: (total * 17.58).toFixed(2)
    };
    
    quoteBasket.push(entry);
    localStorage.setItem('quoteBasket', JSON.stringify(quoteBasket));
    updateBasketCount();
    
    alert('Added to quote basket!');
    window.location.href = 'quote-basket.html';
}

function updateBasketCount() {
    const count = quoteBasket.length;
    document.querySelectorAll('.basket-count').forEach(el => {
        el.textContent = count;
    });
}
