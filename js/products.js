/* Cawnpore Opticals — Products API client (Supabase or local /api) */
const API = "/api";
const IMAGE_STYLES = [
  "aviator", "blueblocker", "round", "cateye", "square", "wayfarer",
  "kids", "clipon", "rimless", "sport", "halfrim", "kit",
];

const CATEGORIES = [
  { id: "all", name: "All Products", icon: "👓" },
  { id: "eyeglasses", name: "Eyeglasses", icon: "🤓" },
  { id: "sunglasses", name: "Sunglasses", icon: "🕶️" },
  { id: "kids", name: "Kids", icon: "🧒" },
  { id: "accessories", name: "Accessories", icon: "✨" },
];

/** In-memory cache of catalog */
let PRODUCTS = [];

async function apiJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = (data && data.error) || res.statusText || "Request failed";
    throw new Error(msg);
  }
  return data;
}

async function refreshProducts() {
  PRODUCTS = await dbListProducts();
  window.dispatchEvent(new CustomEvent("products-updated", { detail: PRODUCTS }));
  return PRODUCTS;
}

async function createProduct(data) {
  const product = await dbCreateProduct(normalizeProduct(data));
  await refreshProducts();
  return product;
}

async function updateProduct(id, data) {
  const product = await dbUpdateProduct(id, normalizeProduct({ ...data, id }));
  await refreshProducts();
  return product;
}

async function deleteProduct(id) {
  await dbDeleteProduct(id);
  await refreshProducts();
  return true;
}

async function resetProductsToSeed() {
  PRODUCTS = await dbResetProducts();
  window.dispatchEvent(new CustomEvent("products-updated", { detail: PRODUCTS }));
  return PRODUCTS;
}

function normalizeProduct(p) {
  const colors = Array.isArray(p.colors)
    ? p.colors
    : String(p.colors || "Black")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  const sizes = Array.isArray(p.sizes)
    ? p.sizes
    : String(p.sizes || "Free Size")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  const features = Array.isArray(p.features)
    ? p.features
    : String(p.features || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  return {
    id: p.id,
    name: String(p.name || "Untitled").trim(),
    category: p.category || "eyeglasses",
    brand: p.brand || "Cawnpore",
    price: Number(p.price) || 0,
    originalPrice: Number(p.originalPrice) || Number(p.price) || 0,
    rating: Math.min(5, Math.max(0, Number(p.rating) || 4.5)),
    reviews: Number(p.reviews) || 0,
    badge: p.badge || null,
    colors: colors.length ? colors : ["Black"],
    sizes: sizes.length ? sizes : ["Free Size"],
    description: String(p.description || "").trim(),
    features: features.length ? features : ["Prescription Ready"],
    image: p.image || "aviator",
    gender: p.gender || "unisex",
    stock: p.stock != null ? Number(p.stock) : 50,
  };
}

function formatPrice(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function getProductById(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}

async function fetchProductById(id) {
  try {
    const p = await dbGetProduct(id);
    const idx = PRODUCTS.findIndex((x) => x.id === id);
    if (idx >= 0) PRODUCTS[idx] = p;
    else PRODUCTS.push(p);
    return p;
  } catch {
    return getProductById(id);
  }
}

function getRelatedProducts(product, limit = 4) {
  return PRODUCTS.filter(
    (p) => p.id !== product.id && p.category === product.category
  ).slice(0, limit);
}

function filterProducts({ category, search, sort, maxPrice, gender } = {}) {
  let list = [...PRODUCTS];
  if (category && category !== "all") {
    list = list.filter((p) => p.category === category);
  }
  if (gender && gender !== "all") {
    list = list.filter((p) => p.gender === gender || p.gender === "unisex");
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
    );
  }
  if (maxPrice) {
    list = list.filter((p) => p.price <= maxPrice);
  }
  switch (sort) {
    case "price-asc":
      list.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      list.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      list.sort((a, b) => b.rating - a.rating);
      break;
    case "name":
      list.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      break;
  }
  return list;
}

function discountPercent(product) {
  if (!product.originalPrice || product.originalPrice <= product.price) return 0;
  return Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );
}

/* SVG frame illustrations by style */
function productSVG(type, size = 200) {
  const colors = {
    aviator: { frame: "#C9A227", lens: "#1a1a2e", accent: "#E8D48B" },
    blueblocker: { frame: "#1a1a1a", lens: "#a8d4f0", accent: "#333" },
    round: { frame: "#B8860B", lens: "#2c3e50", accent: "#DAA520" },
    cateye: { frame: "#1a1a1a", lens: "#4a1942", accent: "#8B0000" },
    square: { frame: "#2c2c2c", lens: "#34495e", accent: "#555" },
    wayfarer: { frame: "#1a1a1a", lens: "#1c2833", accent: "#333" },
    kids: { frame: "#3498db", lens: "#85c1e9", accent: "#e74c3c" },
    clipon: { frame: "#f1c40f", lens: "#f7dc6f", accent: "#333" },
    rimless: { frame: "#95a5a6", lens: "#ecf0f1", accent: "#7f8c8d" },
    sport: { frame: "#1a1a1a", lens: "#e74c3c", accent: "#c0392b" },
    halfrim: { frame: "#2c3e50", lens: "#5d6d7e", accent: "#1a252f" },
    kit: { frame: "#16a085", lens: "#1abc9c", accent: "#0e6655" },
  };
  const c = colors[type] || colors.aviator;
  const w = size;
  const h = Math.round(size * 0.55);

  if (type === "kit") {
    return `<svg viewBox="0 0 200 110" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="40" y="25" width="120" height="60" rx="8" fill="${c.frame}"/>
      <rect x="50" y="35" width="45" height="40" rx="4" fill="${c.lens}"/>
      <circle cx="130" cy="55" r="18" fill="${c.accent}"/>
      <path d="M122 55h16M130 47v16" stroke="#fff" stroke-width="2"/>
    </svg>`;
  }
  if (type === "clipon") {
    return `<svg viewBox="0 0 200 110" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="70" cy="55" rx="32" ry="28" fill="${c.lens}" stroke="${c.frame}" stroke-width="3"/>
      <ellipse cx="130" cy="55" rx="32" ry="28" fill="${c.lens}" stroke="${c.frame}" stroke-width="3"/>
      <path d="M102 55h-4" stroke="${c.frame}" stroke-width="3"/>
      <circle cx="48" cy="40" r="3" fill="${c.accent}"/>
      <circle cx="152" cy="40" r="3" fill="${c.accent}"/>
    </svg>`;
  }

  const isRound = type === "round" || type === "kids";
  const isCat = type === "cateye";
  const isSquare = type === "square" || type === "wayfarer";
  const isSport = type === "sport";
  const isHalf = type === "halfrim";
  const isRimless = type === "rimless";

  let leftLens, rightLens, bridge, temples;

  if (isRound) {
    leftLens = `<circle cx="62" cy="55" r="30" fill="${c.lens}" stroke="${c.frame}" stroke-width="5"/>`;
    rightLens = `<circle cx="138" cy="55" r="30" fill="${c.lens}" stroke="${c.frame}" stroke-width="5"/>`;
    bridge = `<path d="M92 55 Q100 45 108 55" fill="none" stroke="${c.frame}" stroke-width="4"/>`;
  } else if (isCat) {
    leftLens = `<path d="M32 65 Q32 35 55 32 Q75 30 88 45 Q90 60 80 72 Q55 80 32 65Z" fill="${c.lens}" stroke="${c.frame}" stroke-width="4"/>`;
    rightLens = `<path d="M168 65 Q168 35 145 32 Q125 30 112 45 Q110 60 120 72 Q145 80 168 65Z" fill="${c.lens}" stroke="${c.frame}" stroke-width="4"/>`;
    bridge = `<path d="M88 50 Q100 42 112 50" fill="none" stroke="${c.frame}" stroke-width="3"/>`;
  } else if (isSport) {
    leftLens = `<path d="M25 50 Q30 30 60 28 Q90 30 95 50 Q95 75 60 78 Q30 75 25 50Z" fill="${c.lens}" stroke="${c.frame}" stroke-width="4"/>`;
    rightLens = `<path d="M175 50 Q170 30 140 28 Q110 30 105 50 Q105 75 140 78 Q170 75 175 50Z" fill="${c.lens}" stroke="${c.frame}" stroke-width="4"/>`;
    bridge = `<path d="M95 48h10" stroke="${c.frame}" stroke-width="5"/>`;
  } else if (isHalf) {
    leftLens = `<path d="M35 55 Q35 30 65 28 Q95 30 95 55 L95 70 Q95 78 65 78 Q35 78 35 70Z" fill="${c.lens}" stroke="${c.frame}" stroke-width="0"/><path d="M35 55 Q35 30 65 28 Q95 30 95 55" fill="none" stroke="${c.frame}" stroke-width="5"/>`;
    rightLens = `<path d="M105 55 Q105 30 135 28 Q165 30 165 55 L165 70 Q165 78 135 78 Q105 78 105 70Z" fill="${c.lens}" stroke="${c.frame}" stroke-width="0"/><path d="M105 55 Q105 30 135 28 Q165 30 165 55" fill="none" stroke="${c.frame}" stroke-width="5"/>`;
    bridge = `<path d="M95 50h10" stroke="${c.frame}" stroke-width="3"/>`;
  } else if (isRimless) {
    leftLens = `<ellipse cx="62" cy="55" rx="28" ry="24" fill="${c.lens}" stroke="${c.frame}" stroke-width="1.5" opacity="0.7"/>`;
    rightLens = `<ellipse cx="138" cy="55" rx="28" ry="24" fill="${c.lens}" stroke="${c.frame}" stroke-width="1.5" opacity="0.7"/>`;
    bridge = `<line x1="90" y1="55" x2="110" y2="55" stroke="${c.frame}" stroke-width="2"/>`;
  } else if (isSquare) {
    leftLens = `<rect x="32" y="32" width="58" height="46" rx="6" fill="${c.lens}" stroke="${c.frame}" stroke-width="5"/>`;
    rightLens = `<rect x="110" y="32" width="58" height="46" rx="6" fill="${c.lens}" stroke="${c.frame}" stroke-width="5"/>`;
    bridge = `<path d="M90 50 Q100 42 110 50" fill="none" stroke="${c.frame}" stroke-width="4"/>`;
  } else {
    // aviator / blueblocker default
    leftLens = `<ellipse cx="62" cy="58" rx="32" ry="28" fill="${c.lens}" stroke="${c.frame}" stroke-width="4"/>`;
    rightLens = `<ellipse cx="138" cy="58" rx="32" ry="28" fill="${c.lens}" stroke="${c.frame}" stroke-width="4"/>`;
    bridge = `<path d="M94 48 Q100 40 106 48" fill="none" stroke="${c.frame}" stroke-width="3"/><path d="M70 35 L100 28 L130 35" fill="none" stroke="${c.frame}" stroke-width="3"/>`;
  }

  temples = `<path d="M30 50 L8 42" stroke="${c.frame}" stroke-width="3" stroke-linecap="round"/>
    <path d="M170 50 L192 42" stroke="${c.frame}" stroke-width="3" stroke-linecap="round"/>`;

  return `<svg viewBox="0 0 200 110" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${leftLens}${rightLens}${bridge}${temples}
  </svg>`;
}

function productCardHTML(product) {
  const disc = discountPercent(product);
  const badge = product.badge
    ? `<span class="badge badge-${product.badge.toLowerCase()}">${product.badge}</span>`
    : disc
      ? `<span class="badge badge-sale">${disc}% OFF</span>`
      : "";
  return `
    <article class="product-card" data-id="${product.id}">
      <a href="product.html?id=${product.id}" class="product-card-link">
        <div class="product-image">
          ${badge}
          <div class="product-svg">${productSVG(product.image, 180)}</div>
          <button type="button" class="btn-quick-add" data-add="${product.id}" aria-label="Add to cart">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6h15l-1.5 9h-12z"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M6 6L5 3H2"/></svg>
          </button>
        </div>
        <div class="product-info">
          <p class="product-category">${product.category}</p>
          <h3 class="product-name">${product.name}</h3>
          <div class="product-rating">
            <span class="stars">${"★".repeat(Math.floor(product.rating))}${"☆".repeat(5 - Math.floor(product.rating))}</span>
            <span class="rating-text">${product.rating} (${product.reviews})</span>
          </div>
          <div class="product-price">
            <span class="price-current">${formatPrice(product.price)}</span>
            ${product.originalPrice ? `<span class="price-original">${formatPrice(product.originalPrice)}</span>` : ""}
          </div>
        </div>
      </a>
    </article>`;
}
