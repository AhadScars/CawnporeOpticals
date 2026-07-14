/* Cawnpore Opticals — UI & page logic */
document.addEventListener("DOMContentLoaded", async () => {
  initNav();
  updateCartBadge();
  initQuickAdd();
  try {
    await refreshProducts();
  } catch (err) {
    console.error("Failed to load products from SQLite API:", err);
    showToast("Could not load catalog. Is the server running?");
  }
  const page = document.body.dataset.page;
  if (page === "home") initHome();
  if (page === "shop") initShop();
  if (page === "product") await initProduct();
  if (page === "cart") initCartPage();
  if (page === "contact") initContact();
});

function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav-links");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open);
      document.body.classList.toggle("nav-open", open);
    });
    nav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("open");
        document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }
  // Search
  const searchForm = document.querySelector(".header-search");
  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = searchForm.querySelector("input").value.trim();
      window.location.href = q ? `shop.html?search=${encodeURIComponent(q)}` : "shop.html";
    });
  }
}

function initQuickAdd() {
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    addToCart(btn.dataset.add, 1);
    btn.classList.add("added");
    setTimeout(() => btn.classList.remove("added"), 600);
  });
}

function initHome() {
  const featured = document.getElementById("featured-products");
  if (featured) {
    const top = [...PRODUCTS].sort((a, b) => b.rating - a.rating).slice(0, 4);
    featured.innerHTML = top.map(productCardHTML).join("");
  }
  const bestsellers = document.getElementById("bestsellers");
  if (bestsellers) {
    const list = PRODUCTS.filter((p) => p.badge === "Bestseller" || p.reviews > 80).slice(0, 4);
    bestsellers.innerHTML = (list.length ? list : PRODUCTS.slice(0, 4)).map(productCardHTML).join("");
  }
  // Animate counters
  document.querySelectorAll("[data-count]").forEach((el) => {
    const target = parseInt(el.dataset.count, 10);
    let n = 0;
    const step = Math.ceil(target / 40);
    const t = setInterval(() => {
      n = Math.min(n + step, target);
      el.textContent = n.toLocaleString("en-IN") + (el.dataset.suffix || "");
      if (n >= target) clearInterval(t);
    }, 30);
  });
}

function initShop() {
  const params = new URLSearchParams(window.location.search);
  const state = {
    category: params.get("category") || "all",
    search: params.get("search") || "",
    sort: params.get("sort") || "featured",
    maxPrice: params.get("maxPrice") ? Number(params.get("maxPrice")) : null,
    gender: params.get("gender") || "all",
  };

  const grid = document.getElementById("shop-grid");
  const countEl = document.getElementById("shop-count");
  const searchInput = document.getElementById("shop-search");
  const sortSelect = document.getElementById("shop-sort");
  const priceRange = document.getElementById("price-range");
  const priceLabel = document.getElementById("price-label");

  if (searchInput && state.search) searchInput.value = state.search;
  if (sortSelect) sortSelect.value = state.sort;
  if (priceRange && state.maxPrice) {
    priceRange.value = state.maxPrice;
    if (priceLabel) priceLabel.textContent = formatPrice(state.maxPrice);
  }

  // Category chips
  document.querySelectorAll("[data-category]").forEach((btn) => {
    if (btn.dataset.category === state.category) btn.classList.add("active");
    btn.addEventListener("click", () => {
      state.category = btn.dataset.category;
      document.querySelectorAll("[data-category]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      render();
    });
  });

  document.querySelectorAll("[data-gender]").forEach((btn) => {
    if (btn.dataset.gender === state.gender) btn.classList.add("active");
    btn.addEventListener("click", () => {
      state.gender = btn.dataset.gender;
      document.querySelectorAll("[data-gender]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      render();
    });
  });

  if (searchInput) {
    let debounce;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        state.search = searchInput.value.trim();
        render();
      }, 200);
    });
  }
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      state.sort = sortSelect.value;
      render();
    });
  }
  if (priceRange) {
    priceRange.addEventListener("input", () => {
      state.maxPrice = Number(priceRange.value);
      if (priceLabel) priceLabel.textContent = formatPrice(state.maxPrice);
      render();
    });
  }

  function render() {
    const list = filterProducts(state);
    if (countEl) countEl.textContent = `${list.length} product${list.length !== 1 ? "s" : ""}`;
    if (grid) {
      if (!list.length) {
        grid.innerHTML = `<div class="empty-state">
          <p>No products match your filters.</p>
          <button type="button" class="btn btn-outline" id="clear-filters">Clear filters</button>
        </div>`;
        document.getElementById("clear-filters")?.addEventListener("click", () => {
          state.category = "all";
          state.search = "";
          state.gender = "all";
          state.maxPrice = null;
          state.sort = "featured";
          if (searchInput) searchInput.value = "";
          if (sortSelect) sortSelect.value = "featured";
          if (priceRange) {
            priceRange.value = priceRange.max;
            if (priceLabel) priceLabel.textContent = formatPrice(Number(priceRange.max));
          }
          document.querySelectorAll("[data-category]").forEach((b) => {
            b.classList.toggle("active", b.dataset.category === "all");
          });
          document.querySelectorAll("[data-gender]").forEach((b) => {
            b.classList.toggle("active", b.dataset.gender === "all");
          });
          render();
        });
      } else {
        grid.innerHTML = list.map(productCardHTML).join("");
      }
    }
  }
  render();
}

async function initProduct() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const root = document.getElementById("product-detail");
  if (!root) return;

  let product = getProductById(id);
  if (!product && id) {
    try {
      product = await fetchProductById(id);
    } catch (_) {
      product = null;
    }
  }

  if (!product) {
    root.innerHTML = `<div class="empty-state"><h2>Product not found</h2><a href="shop.html" class="btn btn-primary">Back to Shop</a></div>`;
    return;
  }

  document.title = `${product.name} | Cawnpore Opticals`;
  let selectedColor = product.colors[0];
  let selectedSize = product.sizes[0];
  let qty = 1;
  const disc = discountPercent(product);

  root.innerHTML = `
    <div class="product-detail-grid">
      <div class="product-gallery">
        <div class="gallery-main">
          ${product.badge ? `<span class="badge badge-${product.badge.toLowerCase()}">${product.badge}</span>` : ""}
          <div class="product-svg large">${productSVG(product.image, 320)}</div>
        </div>
      </div>
      <div class="product-detail-info">
        <p class="product-category">${product.category} · ${product.brand}</p>
        <h1>${product.name}</h1>
        <div class="product-rating">
          <span class="stars">${"★".repeat(Math.floor(product.rating))}${"☆".repeat(5 - Math.floor(product.rating))}</span>
          <span class="rating-text">${product.rating} · ${product.reviews} reviews</span>
        </div>
        <div class="product-price large">
          <span class="price-current">${formatPrice(product.price)}</span>
          ${product.originalPrice ? `<span class="price-original">${formatPrice(product.originalPrice)}</span>` : ""}
          ${disc ? `<span class="discount-tag">${disc}% off</span>` : ""}
        </div>
        <p class="product-desc">${product.description}</p>
        <div class="option-group">
          <label>Color</label>
          <div class="option-chips" id="color-options">
            ${product.colors.map((c, i) => `<button type="button" class="chip ${i === 0 ? "active" : ""}" data-color="${c}">${c}</button>`).join("")}
          </div>
        </div>
        <div class="option-group">
          <label>Size</label>
          <div class="option-chips" id="size-options">
            ${product.sizes.map((s, i) => `<button type="button" class="chip ${i === 0 ? "active" : ""}" data-size="${s}">${s}</button>`).join("")}
          </div>
        </div>
        <div class="qty-row">
          <label>Quantity</label>
          <div class="qty-control">
            <button type="button" id="qty-minus" aria-label="Decrease">−</button>
            <span id="qty-val">1</span>
            <button type="button" id="qty-plus" aria-label="Increase">+</button>
          </div>
        </div>
        <div class="product-actions">
          <button type="button" class="btn btn-primary btn-lg" id="add-cart-btn">Add to Cart</button>
          <a href="cart.html" class="btn btn-outline btn-lg">View Cart</a>
        </div>
        <ul class="feature-list">
          ${product.features.map((f) => `<li>✓ ${f}</li>`).join("")}
        </ul>
        <div class="trust-row">
          <span>🚚 Free shipping over ₹999</span>
          <span>↩️ 7-day easy returns</span>
          <span>🛡️ 1-year warranty</span>
        </div>
      </div>
    </div>
    <section class="related-section">
      <h2>You may also like</h2>
      <div class="product-grid" id="related-products"></div>
    </section>
  `;

  document.getElementById("color-options").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-color]");
    if (!chip) return;
    selectedColor = chip.dataset.color;
    document.querySelectorAll("#color-options .chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
  });
  document.getElementById("size-options").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-size]");
    if (!chip) return;
    selectedSize = chip.dataset.size;
    document.querySelectorAll("#size-options .chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
  });
  document.getElementById("qty-minus").addEventListener("click", () => {
    qty = Math.max(1, qty - 1);
    document.getElementById("qty-val").textContent = qty;
  });
  document.getElementById("qty-plus").addEventListener("click", () => {
    qty += 1;
    document.getElementById("qty-val").textContent = qty;
  });
  document.getElementById("add-cart-btn").addEventListener("click", () => {
    addToCart(product.id, qty, { color: selectedColor, size: selectedSize });
  });

  const related = getRelatedProducts(product, 4);
  const relEl = document.getElementById("related-products");
  if (relEl) {
    relEl.innerHTML = related.length
      ? related.map(productCardHTML).join("")
      : PRODUCTS.filter((p) => p.id !== product.id)
          .slice(0, 4)
          .map(productCardHTML)
          .join("");
  }
}

function initCartPage() {
  const root = document.getElementById("cart-content");
  if (!root) return;

  function render() {
    const items = getCartLineItems();
    if (!items.length) {
      root.innerHTML = `
        <div class="empty-state cart-empty">
          <div class="empty-icon">🛒</div>
          <h2>Your cart is empty</h2>
          <p>Discover frames that fit your style.</p>
          <a href="shop.html" class="btn btn-primary">Shop Now</a>
        </div>`;
      return;
    }

    const subtotal = cartSubtotal();
    const shipping = subtotal >= 999 ? 0 : 99;
    const total = subtotal + shipping;

    root.innerHTML = `
      <div class="cart-layout">
        <div class="cart-items">
          <h1>Shopping Cart <span class="muted">(${cartCount()} items)</span></h1>
          ${items
            .map(
              (item) => `
            <div class="cart-item" data-key="${item.key}">
              <div class="cart-item-img">${productSVG(item.product.image, 100)}</div>
              <div class="cart-item-info">
                <a href="product.html?id=${item.product.id}"><h3>${item.product.name}</h3></a>
                <p class="muted">${item.color ? item.color + " · " : ""}${item.size || ""}</p>
                <p class="price-current">${formatPrice(item.product.price)}</p>
              </div>
              <div class="cart-item-qty">
                <div class="qty-control">
                  <button type="button" data-qty-minus="${item.key}">−</button>
                  <span>${item.qty}</span>
                  <button type="button" data-qty-plus="${item.key}">+</button>
                </div>
              </div>
              <div class="cart-item-total">
                <strong>${formatPrice(item.lineTotal)}</strong>
                <button type="button" class="btn-remove" data-remove="${item.key}" aria-label="Remove">✕</button>
              </div>
            </div>`
            )
            .join("")}
        </div>
        <aside class="cart-summary">
          <h2>Order Summary</h2>
          <div class="summary-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
          <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? "FREE" : formatPrice(shipping)}</span></div>
          ${shipping > 0 ? `<p class="shipping-note">Add ${formatPrice(999 - subtotal)} more for free shipping</p>` : `<p class="shipping-note success">You've unlocked free shipping!</p>`}
          <div class="summary-row total"><span>Total</span><span>${formatPrice(total)}</span></div>
          <button type="button" class="btn btn-primary btn-block" id="checkout-btn">Proceed to Checkout</button>
          <a href="shop.html" class="btn btn-outline btn-block">Continue Shopping</a>
          <div class="payment-note">
            <p>We accept UPI, Cards, Net Banking & COD</p>
          </div>
        </aside>
      </div>
      <div id="checkout-modal" class="modal" hidden>
        <div class="modal-backdrop" data-close-modal></div>
        <div class="modal-panel" role="dialog" aria-labelledby="checkout-title">
          <button type="button" class="modal-close" data-close-modal aria-label="Close">✕</button>
          <h2 id="checkout-title">Checkout</h2>
          <form id="checkout-form" class="checkout-form">
            <div class="form-row">
              <div class="form-group">
                <label for="co-name">Full Name</label>
                <input id="co-name" name="name" required placeholder="Your name" />
              </div>
              <div class="form-group">
                <label for="co-phone">Phone</label>
                <input id="co-phone" name="phone" type="tel" required placeholder="10-digit mobile" pattern="[0-9]{10}" />
              </div>
            </div>
            <div class="form-group">
              <label for="co-email">Email</label>
              <input id="co-email" name="email" type="email" required placeholder="you@example.com" />
            </div>
            <div class="form-group">
              <label for="co-address">Delivery Address</label>
              <textarea id="co-address" name="address" required rows="3" placeholder="House no, street, area, city, pincode"></textarea>
            </div>
            <div class="form-group">
              <label for="co-payment">Payment Method</label>
              <select id="co-payment" name="payment" required>
                <option value="upi">UPI</option>
                <option value="card">Credit / Debit Card</option>
                <option value="netbanking">Net Banking</option>
                <option value="cod">Cash on Delivery</option>
              </select>
            </div>
            <div class="summary-row total"><span>Payable</span><span>${formatPrice(total)}</span></div>
            <button type="submit" class="btn btn-primary btn-block">Place Order</button>
          </form>
        </div>
      </div>
      <div id="order-success" class="modal" hidden>
        <div class="modal-backdrop" data-close-success></div>
        <div class="modal-panel success-panel">
          <div class="success-icon">✓</div>
          <h2>Order Placed!</h2>
          <p id="order-id-text"></p>
          <p class="muted">We'll contact you shortly to confirm delivery.</p>
          <a href="shop.html" class="btn btn-primary">Continue Shopping</a>
        </div>
      </div>
    `;

    root.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        removeFromCart(btn.dataset.remove);
        render();
      });
    });
    root.querySelectorAll("[data-qty-minus]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = getCart().find((i) => i.key === btn.dataset.qtyMinus);
        if (item && item.qty > 1) {
          updateQty(item.key, item.qty - 1);
          render();
        }
      });
    });
    root.querySelectorAll("[data-qty-plus]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = getCart().find((i) => i.key === btn.dataset.qtyPlus);
        if (item) {
          updateQty(item.key, item.qty + 1);
          render();
        }
      });
    });

    document.getElementById("checkout-btn")?.addEventListener("click", () => {
      document.getElementById("checkout-modal").hidden = false;
    });
    root.querySelectorAll("[data-close-modal]").forEach((el) => {
      el.addEventListener("click", () => {
        document.getElementById("checkout-modal").hidden = true;
      });
    });
    document.getElementById("checkout-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const fd = new FormData(form);
      const lineItems = getCartLineItems();
      const orderId = "CO" + Date.now().toString().slice(-8);
      const orderPayload = {
        id: orderId,
        status: "pending",
        customer: {
          name: fd.get("name"),
          phone: fd.get("phone"),
          email: fd.get("email"),
          address: fd.get("address"),
        },
        payment: fd.get("payment"),
        items: lineItems.map((i) => ({
          productId: i.id,
          name: i.product.name,
          price: i.product.price,
          qty: i.qty,
          color: i.color,
          size: i.size,
          image: i.product.image,
          lineTotal: i.lineTotal,
        })),
        subtotal,
        shipping,
        total,
      };
      try {
        if (typeof createOrder === "function") {
          const saved = await createOrder(orderPayload);
          if (saved && saved.id) orderPayload.id = saved.id;
        }
      } catch (err) {
        console.error(err);
        showToast("Could not save order. Check server connection.");
        return;
      }
      clearCart();
      document.getElementById("checkout-modal").hidden = true;
      const success = document.getElementById("order-success");
      document.getElementById("order-id-text").textContent = `Order ID: ${orderPayload.id}`;
      success.hidden = false;
      success.querySelector("[data-close-success]")?.addEventListener("click", () => {
        success.hidden = true;
        render();
      });
    });
  }

  render();
  window.addEventListener("cart-updated", () => {
    // avoid double-render during clear
  });
}

function initContact() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    showToast("Message sent! We'll reply soon.");
    form.reset();
  });
}
