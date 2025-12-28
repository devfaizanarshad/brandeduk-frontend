/* ===================================
   PRODUCT DETAIL - COMPLETE REWRITE
   =================================== */

const PRODUCT_CODE = "GD067";
const PRODUCT_NAME = "Gildan Softstyle midweight fleece adult hoodie";
const BASE_PRICE = 17.58;

// ALL 37 COLORS
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

const DISCOUNTS = [
    { min: 1,   max: 9,     price: BASE_PRICE, save: 0  },
    { min: 10,  max: 24,    price: 16.54,      save: 8  },
    { min: 25,  max: 49,    price: 16.18,      save: 10 },
    { min: 50,  max: 99,    price: 14.94,      save: 15 },
    { min: 100, max: 249,   price: 13.49,      save: 25 },
    { min: 250, max: 99999, price: 12.59,      save: 30 }
];

// STATE
let selectedColorName = colors[0][0];
let selectedColorURL  = colors[0][1];
let selectedCustomizationMethod = null; // 'embroidery' or 'print'
const sizeList = ["S","M","L","XL","2XL","3XL","4XL","5XL"];
let qty = {};
sizeList.forEach(s => qty[s] = 0);

// ELEMENTS
const mainImage = document.getElementById("mainImage");
const mainPriceEl = document.getElementById("mainPrice");
const priceInfoEl = document.getElementById("priceInfo");
const quoteButton = document.getElementById("quoteButton");
const belowSummary = document.getElementById("belowBtnSummary");
const sizesGrid = document.getElementById("sizesGrid");
const colorGrid = document.getElementById("colorGrid");

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
    loadSavedColorSelection();
    buildColorGrid();
    renderSizes();
    updateTotals();
});

// ===== LOAD SAVED COLOR =====
function loadSavedColorSelection() {
    const savedColorName = sessionStorage.getItem('selectedColorName');
    const savedColorUrl = sessionStorage.getItem('selectedColorUrl');
    
    if (savedColorName && savedColorUrl) {
        selectedColorName = savedColorName;
        selectedColorURL = savedColorUrl;
        mainImage.src = savedColorUrl;
    }
}

// ===== BUILD COLOR GRID =====
function buildColorGrid() {
    colorGrid.innerHTML = '';
    
    colors.forEach(([name, url], i) => {
        const div = document.createElement("div");
        div.className = "color-thumb";
        div.style.backgroundImage = `url('${url}')`;
        
        // Mark as active if it's the saved color
        if (name === selectedColorName) {
            div.classList.add("active");
        } else if (i === 0 && !sessionStorage.getItem('selectedColorName')) {
            div.classList.add("active");
        }
        
        div.onclick = () => {
            document.querySelectorAll(".color-thumb").forEach(c => c.classList.remove("active"));
            div.classList.add("active");
            
            selectedColorName = name;
            selectedColorURL  = url;
            mainImage.src = url;
            
            // Save to sessionStorage
            sessionStorage.setItem('selectedColorName', name);
            sessionStorage.setItem('selectedColorUrl', url);
            
            resetSizes();
            updateTotals();
        };
        
        colorGrid.appendChild(div);
    });
}

// ===== SIZES =====
function renderSizes() {
    sizesGrid.innerHTML = "";
    
    sizeList.forEach(size => {
        const box = document.createElement("div");
        box.className = "size-box";
        
        box.innerHTML = `
            <div class="size-label">${size}</div>
            <div class="qty-wrapper">
                <button class="qty-btn minus" data-size="${size}">−</button>
                <input 
                    type="number"
                    class="qty-input"
                    data-size="${size}"
                    min="0"
                    value="${qty[size]}"
                >
                <button class="qty-btn plus" data-size="${size}">+</button>
            </div>
        `;
        
        sizesGrid.appendChild(box);
    });
    
    attachSizeEvents();
}

function attachSizeEvents() {
    document.querySelectorAll(".qty-btn.plus").forEach(btn => {
        btn.onclick = () => {
            const s = btn.dataset.size;
            qty[s]++;
            updateInput(s);
        };
    });
    
    document.querySelectorAll(".qty-btn.minus").forEach(btn => {
        btn.onclick = () => {
            const s = btn.dataset.size;
            qty[s] = Math.max(0, qty[s] - 1);
            updateInput(s);
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
    renderSizes();
    updateTotals();
}

// ===== PRICING =====
function getUnitPrice(totalItems) {
    if (totalItems === 0) return BASE_PRICE;
    const tier = DISCOUNTS.find(t => totalItems >= t.min && totalItems <= t.max);
    return tier ? tier.price : BASE_PRICE;
}

function getCurrentTier(totalItems) {
    if (totalItems === 0) return DISCOUNTS[0];
    return DISCOUNTS.find(t => totalItems >= t.min && totalItems <= t.max) || DISCOUNTS[0];
}

function updateDiscountBox(total) {
    const boxes = document.querySelectorAll(".disc-box");
    boxes.forEach(b => b.classList.remove("active"));
    
    let appliedIndex = 0;
    DISCOUNTS.forEach((tier,i)=>{
        if(total >= tier.min && total <= tier.max) appliedIndex = i;
    });
    
    boxes[appliedIndex]?.classList.add("active");
}

function updateTotals() {
    const total = Object.values(qty).reduce((a,b)=>a+b,0);
    
    updateDiscountBox(total);
    
    const unit = getUnitPrice(total);
    
    mainPriceEl.innerHTML = `£${unit.toFixed(2)} <span>each ex VAT</span>`;
    
    const tier = getCurrentTier(total);
    if (total === 0) {
        priceInfoEl.innerHTML = "Price listed for 1–9 units";
    } else {
        priceInfoEl.innerHTML =
            `<b>Bulk price applied:</b> £${tier.price.toFixed(2)} ex VAT (${tier.min}+ units)`;
    }
    
    quoteButton.disabled = total === 0;
    quoteButton.textContent = `Add ${total} Items to Quote`;
    
    if (total > 0) quoteButton.classList.add("active");
    else quoteButton.classList.remove("active");
    
    updateBelowSummary(total, unit);
}

function updateBelowSummary(total, unit) {
    if (total === 0) {
        belowSummary.innerHTML = "";
        return;
    }
    
    belowSummary.innerHTML = `
        <div class="left-part">
            <b>${total} items</b><br>
            £${unit.toFixed(2)} per item
        </div>
        <div class="right-part">
            Total: <span class="total-amount">£${(unit * total).toFixed(2)}</span> ex VAT
        </div>
    `;
}

// ===== NAVIGATE TO CUSTOMIZATION =====
quoteButton.onclick = () => {
    const total = Object.values(qty).reduce((a,b)=>a+b,0);
    if (total === 0) return;
    
    // Save product data
    const productData = {
        name: PRODUCT_NAME,
        code: PRODUCT_CODE,
        color: selectedColorName,
        image: selectedColorURL,
        quantity: total,
        size: getSizesSummary(),
        price: getUnitPrice(total).toFixed(2),
        sizes: {...qty}
    };
    
    sessionStorage.setItem('customizingProduct', JSON.stringify(productData));
    
    // Navigate to positions
    window.location.href = 'customize-positions.html';
};

function getSizesSummary() {
    const sizeEntries = Object.entries(qty).filter(([s,q]) => q > 0);
    if (sizeEntries.length === 1) {
        return sizeEntries[0][0];
    }
    return sizeEntries.map(([s,q]) => `${q}x${s}`).join(', ');
}
