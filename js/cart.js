/* Cawnpore Opticals — Cart (localStorage) */
const CART_KEY = "cawnpore_cart";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
  window.dispatchEvent(new CustomEvent("cart-updated", { detail: cart }));
}

function addToCart(productId, qty = 1, options = {}) {
  const cart = getCart();
  const color = options.color || "";
  const size = options.size || "";
  const key = `${productId}__${color}__${size}`;
  const existing = cart.find((i) => i.key === key);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      key,
      id: productId,
      qty,
      color,
      size,
    });
  }
  saveCart(cart);
  showToast("Added to cart");
  return cart;
}

function removeFromCart(key) {
  const cart = getCart().filter((i) => i.key !== key);
  saveCart(cart);
  showToast("Removed from cart");
  return cart;
}

function updateQty(key, qty) {
  const cart = getCart();
  const item = cart.find((i) => i.key === key);
  if (!item) return cart;
  item.qty = Math.max(1, qty);
  saveCart(cart);
  return cart;
}

function clearCart() {
  saveCart([]);
}

function cartCount() {
  return getCart().reduce((n, i) => n + i.qty, 0);
}

function cartSubtotal() {
  return getCart().reduce((sum, item) => {
    const p = getProductById(item.id);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);
}

function updateCartBadge() {
  const count = cartCount();
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = count;
    el.hidden = count === 0;
  });
}

function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove("show"), 2200);
}

function getCartLineItems() {
  return getCart()
    .map((item) => {
      const product = getProductById(item.id);
      if (!product) return null;
      return { ...item, product, lineTotal: product.price * item.qty };
    })
    .filter(Boolean);
}
