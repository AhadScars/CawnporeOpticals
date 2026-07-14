/* Cawnpore Opticals — Admin panel */
const ADMIN_SESSION_KEY = "cawnpore_admin_session";
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";

const titles = {
  dashboard: "Dashboard",
  products: "Glasses / Products",
  orders: "Orders",
};

document.addEventListener("DOMContentLoaded", () => {
  const session = localStorage.getItem(ADMIN_SESSION_KEY);
  if (session === "1") showApp();
  else showLogin();

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopPropagation();
      attemptLogin();
    });
  }

  document.getElementById("login-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    attemptLogin();
  });

  document.getElementById("logout-btn")?.addEventListener("click", () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    showLogin();
  });

  document.getElementById("admin-menu-toggle")?.addEventListener("click", () => {
    document.querySelector(".admin-sidebar")?.classList.toggle("open");
    document.body.classList.toggle("admin-sidebar-open");
  });

  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchView(btn.dataset.view);
      document.querySelector(".admin-sidebar")?.classList.remove("open");
      document.body.classList.remove("admin-sidebar-open");
    });
  });

  // Product form
  document.getElementById("btn-add-product")?.addEventListener("click", () => openProductModal());
  document.getElementById("qa-add-product")?.addEventListener("click", () => {
    switchView("products");
    openProductModal();
  });
  document.getElementById("qa-reset-products")?.addEventListener("click", async () => {
    if (confirm("Reset all products to default catalog? This cannot be undone.")) {
      try {
        await resetProductsToSeed();
        showToast("Products reset to defaults");
        await renderDashboard();
        await renderProductsTable();
      } catch (err) {
        console.error(err);
        showToast("Reset failed — is the server running?");
      }
    }
  });

  document.querySelectorAll("[data-close-product-modal]").forEach((el) => {
    el.addEventListener("click", () => closeModal("product-modal"));
  });
  document.querySelectorAll("[data-close-order-modal]").forEach((el) => {
    el.addEventListener("click", () => closeModal("order-modal"));
  });
  document.querySelectorAll("[data-close-manual-order]").forEach((el) => {
    el.addEventListener("click", () => closeModal("manual-order-modal"));
  });

  document.getElementById("product-form")?.addEventListener("submit", onSaveProduct);
  document.getElementById("product-search")?.addEventListener("input", () => renderProductsTable());
  document.getElementById("product-filter-cat")?.addEventListener("change", () => renderProductsTable());

  document.getElementById("order-search")?.addEventListener("input", () => renderOrdersTable());
  document.getElementById("order-filter-status")?.addEventListener("change", () => renderOrdersTable());
  document.getElementById("btn-create-order")?.addEventListener("click", openManualOrderModal);
  document.getElementById("manual-order-form")?.addEventListener("submit", onCreateManualOrder);

  // Populate image styles
  const imgSelect = document.getElementById("pf-image");
  if (imgSelect && typeof IMAGE_STYLES !== "undefined") {
    imgSelect.innerHTML = IMAGE_STYLES.map(
      (s) => `<option value="${s}">${s}</option>`
    ).join("");
  }
});

function attemptLogin() {
  const userEl = document.getElementById("login-user");
  const passEl = document.getElementById("login-pass");
  const err = document.getElementById("login-error");
  const user = (userEl?.value || "").trim().toLowerCase();
  const pass = (passEl?.value || "").trim();

  if (user === ADMIN_USER.toLowerCase() && pass === ADMIN_PASS) {
    try {
      localStorage.setItem(ADMIN_SESSION_KEY, "1");
    } catch (_) {
      /* private mode — still allow session for this page load */
    }
    if (err) {
      err.hidden = true;
      err.classList.add("is-hidden");
    }
    showApp();
  } else {
    if (err) {
      err.hidden = false;
      err.classList.remove("is-hidden");
      err.textContent = "Invalid username or password. Use admin / admin123";
    }
    if (passEl) passEl.focus();
  }
}

function setVisible(el, visible) {
  if (!el) return;
  if (visible) {
    el.hidden = false;
    el.classList.remove("is-hidden");
    el.style.display = "";
  } else {
    el.hidden = true;
    el.classList.add("is-hidden");
    el.style.display = "none";
  }
}

function showLogin() {
  setVisible(document.getElementById("login-screen"), true);
  setVisible(document.getElementById("admin-app"), false);
  document.body.classList.remove("admin-logged-in");
}

function showApp() {
  setVisible(document.getElementById("login-screen"), false);
  setVisible(document.getElementById("admin-app"), true);
  document.body.classList.add("admin-logged-in");
  // Load dashboard without blocking UI
  Promise.resolve()
    .then(() => switchView("dashboard"))
    .catch((err) => {
      console.error("Dashboard load error:", err);
      if (typeof showToast === "function") {
        showToast("Logged in, but data failed to load. Is server.py running?");
      }
    });
}

async function switchView(name) {
  document.querySelectorAll(".admin-view").forEach((v) => (v.hidden = true));
  document.querySelectorAll(".admin-nav-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === name);
  });
  const view = document.getElementById("view-" + name);
  if (view) view.hidden = false;
  document.getElementById("admin-page-title").textContent = titles[name] || name;

  try {
    if (name === "dashboard") await renderDashboard();
    if (name === "products") await renderProductsTable();
    if (name === "orders") await renderOrdersTable();
  } catch (err) {
    console.error(err);
    showToast("Failed to load data from database");
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = false;
}

/* ---------- Dashboard ---------- */
async function renderDashboard() {
  await refreshProducts();
  const stats = await orderStats();
  const products = PRODUCTS;
  const grid = document.getElementById("stat-grid");
  if (grid) {
    grid.innerHTML = `
      <div class="stat-card accent-teal">
        <div class="label">Products</div>
        <div class="value">${products.length}</div>
      </div>
      <div class="stat-card accent-gold">
        <div class="label">Total orders</div>
        <div class="value">${stats.total}</div>
      </div>
      <div class="stat-card accent-warn">
        <div class="label">Pending</div>
        <div class="value">${stats.pending}</div>
      </div>
      <div class="stat-card">
        <div class="label">Revenue</div>
        <div class="value" style="font-size:1.35rem">${formatPrice(stats.revenue)}</div>
      </div>
    `;
  }

  const orders = await getOrders();
  const recent = orders.slice(0, 5);
  const box = document.getElementById("recent-orders");
  if (!box) return;
  if (!recent.length) {
    box.innerHTML = `<p class="empty-table">No orders yet. Place an order from the store or create one manually.</p>`;
    return;
  }
  box.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>ID</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
      <tbody>
        ${recent
          .map(
            (o) => `
          <tr>
            <td><strong>${o.id}</strong><br><small>${formatDate(o.createdAt)}</small></td>
            <td>${esc(o.customer.name)}<br><small>${esc(o.customer.phone)}</small></td>
            <td>${formatPrice(o.total)}</td>
            <td><span class="status-pill status-${o.status}">${o.status}</span></td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

/* ---------- Products CRUD ---------- */
async function renderProductsTable() {
  await refreshProducts();
  const q = (document.getElementById("product-search")?.value || "").toLowerCase();
  const cat = document.getElementById("product-filter-cat")?.value || "all";
  let list = [...PRODUCTS];
  if (cat !== "all") list = list.filter((p) => p.category === cat);
  if (q) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }

  const tbody = document.querySelector("#products-table tbody");
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-table">No products found</td></tr>`;
    return;
  }

  tbody.innerHTML = list
    .map(
      (p) => `
    <tr>
      <td>
        <div class="prod-cell">
          <div class="prod-thumb">${productSVG(p.image, 48)}</div>
          <div>
            <strong>${esc(p.name)}</strong>
            <small>${esc(p.id)} · ${esc(p.brand)}</small>
          </div>
        </div>
      </td>
      <td><span class="badge-pill">${esc(p.category)}</span></td>
      <td>
        <strong>${formatPrice(p.price)}</strong>
        ${p.originalPrice > p.price ? `<br><small style="text-decoration:line-through;color:var(--text-muted)">${formatPrice(p.originalPrice)}</small>` : ""}
      </td>
      <td>${p.stock != null ? p.stock : "—"}</td>
      <td>${p.badge ? `<span class="badge-pill">${esc(p.badge)}</span>` : "—"}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn-icon" data-edit-product="${p.id}">Edit</button>
          <button type="button" class="btn-icon danger" data-delete-product="${p.id}">Delete</button>
        </div>
      </td>
    </tr>`
    )
    .join("");

  tbody.querySelectorAll("[data-edit-product]").forEach((btn) => {
    btn.addEventListener("click", () => openProductModal(btn.dataset.editProduct));
  });
  tbody.querySelectorAll("[data-delete-product]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.deleteProduct;
      const prod = getProductById(id);
      if (prod && confirm(`Delete "${prod.name}"?`)) {
        try {
          await deleteProduct(id);
          showToast("Product deleted");
          await renderProductsTable();
          await renderDashboard();
        } catch (err) {
          console.error(err);
          showToast("Delete failed");
        }
      }
    });
  });
}

function openProductModal(id) {
  const form = document.getElementById("product-form");
  form.reset();
  document.getElementById("pf-id").value = "";
  document.getElementById("product-modal-title").textContent = id ? "Edit product" : "Add product";

  if (id) {
    const p = getProductById(id);
    if (!p) return;
    document.getElementById("pf-id").value = p.id;
    document.getElementById("pf-name").value = p.name;
    document.getElementById("pf-brand").value = p.brand || "Cawnpore";
    document.getElementById("pf-category").value = p.category;
    document.getElementById("pf-gender").value = p.gender || "unisex";
    document.getElementById("pf-price").value = p.price;
    document.getElementById("pf-original").value = p.originalPrice || "";
    document.getElementById("pf-stock").value = p.stock != null ? p.stock : 50;
    document.getElementById("pf-badge").value = p.badge || "";
    document.getElementById("pf-image").value = p.image || "aviator";
    document.getElementById("pf-rating").value = p.rating || 4.5;
    document.getElementById("pf-colors").value = (p.colors || []).join(", ");
    document.getElementById("pf-sizes").value = (p.sizes || []).join(", ");
    document.getElementById("pf-features").value = (p.features || []).join(", ");
    document.getElementById("pf-desc").value = p.description || "";
  } else {
    document.getElementById("pf-brand").value = "Cawnpore";
    document.getElementById("pf-stock").value = 50;
    document.getElementById("pf-rating").value = 4.5;
    document.getElementById("pf-image").value = "aviator";
  }
  openModal("product-modal");
}

async function onSaveProduct(e) {
  e.preventDefault();
  const id = document.getElementById("pf-id").value;
  const data = {
    name: document.getElementById("pf-name").value,
    brand: document.getElementById("pf-brand").value,
    category: document.getElementById("pf-category").value,
    gender: document.getElementById("pf-gender").value,
    price: Number(document.getElementById("pf-price").value),
    originalPrice: Number(document.getElementById("pf-original").value) || Number(document.getElementById("pf-price").value),
    stock: Number(document.getElementById("pf-stock").value),
    badge: document.getElementById("pf-badge").value || null,
    image: document.getElementById("pf-image").value,
    rating: Number(document.getElementById("pf-rating").value),
    colors: document.getElementById("pf-colors").value,
    sizes: document.getElementById("pf-sizes").value,
    features: document.getElementById("pf-features").value,
    description: document.getElementById("pf-desc").value,
    reviews: id ? getProductById(id)?.reviews || 0 : 0,
  };

  try {
    if (id) {
      await updateProduct(id, data);
      showToast("Product updated");
    } else {
      await createProduct(data);
      showToast("Product created");
    }
    closeModal("product-modal");
    await renderProductsTable();
    await renderDashboard();
  } catch (err) {
    console.error(err);
    showToast("Save failed — check server");
  }
}

/* ---------- Orders ---------- */
async function renderOrdersTable() {
  const q = (document.getElementById("order-search")?.value || "").toLowerCase();
  const status = document.getElementById("order-filter-status")?.value || "all";
  let list = await getOrders();
  if (status !== "all") list = list.filter((o) => o.status === status);
  if (q) {
    list = list.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        (o.customer.name || "").toLowerCase().includes(q) ||
        (o.customer.phone || "").toLowerCase().includes(q) ||
        (o.customer.email || "").toLowerCase().includes(q)
    );
  }

  const tbody = document.querySelector("#orders-table tbody");
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-table">No orders found</td></tr>`;
    return;
  }

  tbody.innerHTML = list
    .map((o) => {
      const itemCount = (o.items || []).reduce((n, i) => n + (i.qty || 0), 0);
      return `
    <tr>
      <td>
        <strong>${esc(o.id)}</strong><br>
        <small>${formatDate(o.createdAt)}</small>
      </td>
      <td>
        ${esc(o.customer.name)}<br>
        <small>${esc(o.customer.phone)}</small>
      </td>
      <td>${itemCount} item${itemCount !== 1 ? "s" : ""}</td>
      <td><strong>${formatPrice(o.total)}</strong></td>
      <td><span class="status-pill status-${o.status}">${o.status}</span></td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn-icon" data-view-order="${o.id}">View</button>
          <button type="button" class="btn-icon danger" data-delete-order="${o.id}">Delete</button>
        </div>
      </td>
    </tr>`;
    })
    .join("");

  tbody.querySelectorAll("[data-view-order]").forEach((btn) => {
    btn.addEventListener("click", () => openOrderDetail(btn.dataset.viewOrder));
  });
  tbody.querySelectorAll("[data-delete-order]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (confirm("Delete this order permanently?")) {
        try {
          await deleteOrder(btn.dataset.deleteOrder);
          showToast("Order deleted");
          await renderOrdersTable();
          await renderDashboard();
        } catch (err) {
          console.error(err);
          showToast("Delete failed");
        }
      }
    });
  });
}

async function openOrderDetail(id) {
  let o = getOrderById(id);
  if (!o) {
    try {
      o = await fetchOrderById(id);
    } catch {
      return;
    }
  }
  if (!o) return;
  document.getElementById("order-modal-title").textContent = `Order ${o.id}`;
  const body = document.getElementById("order-detail-body");
  body.innerHTML = `
    <dl class="order-meta">
      <div><dt>Date</dt><dd>${formatDate(o.createdAt)}</dd></div>
      <div><dt>Payment</dt><dd>${esc(o.payment)}</dd></div>
      <div><dt>Customer</dt><dd>${esc(o.customer.name)}</dd></div>
      <div><dt>Phone</dt><dd>${esc(o.customer.phone)}</dd></div>
      <div><dt>Email</dt><dd>${esc(o.customer.email || "—")}</dd></div>
      <div><dt>Status</dt><dd><span class="status-pill status-${o.status}">${o.status}</span></dd></div>
    </dl>
    <p style="font-size:0.9rem;margin-bottom:1rem"><strong>Address:</strong> ${esc(o.customer.address)}</p>
    ${o.notes ? `<p style="font-size:0.9rem;margin-bottom:1rem"><strong>Notes:</strong> ${esc(o.notes)}</p>` : ""}
    <div class="order-items-list">
      ${(o.items || [])
        .map(
          (i) => `
        <div class="order-item-row">
          <div>
            <strong>${esc(i.name)}</strong><br>
            <small>${i.color || ""} ${i.size ? "· " + i.size : ""} × ${i.qty}</small>
          </div>
          <div>${formatPrice(i.lineTotal || i.price * i.qty)}</div>
        </div>`
        )
        .join("")}
    </div>
    <div class="summary-row"><span>Subtotal</span><span>${formatPrice(o.subtotal)}</span></div>
    <div class="summary-row"><span>Shipping</span><span>${o.shipping === 0 ? "FREE" : formatPrice(o.shipping)}</span></div>
    <div class="summary-row total"><span>Total</span><span>${formatPrice(o.total)}</span></div>
    <div class="order-status-row">
      <div class="form-group">
        <label for="od-status">Update status</label>
        <select id="od-status">
          ${ORDER_STATUSES.map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
      <button type="button" class="btn btn-primary" id="od-save-status">Save status</button>
    </div>
  `;
  document.getElementById("od-save-status").addEventListener("click", async () => {
    const status = document.getElementById("od-status").value;
    try {
      await updateOrderStatus(id, status);
      showToast("Order status updated");
      await openOrderDetail(id);
      await renderOrdersTable();
      await renderDashboard();
    } catch (err) {
      console.error(err);
      showToast("Status update failed");
    }
  });
  openModal("order-modal");
}

async function openManualOrderModal() {
  await refreshProducts();
  const sel = document.getElementById("mo-product");
  sel.innerHTML = PRODUCTS.map(
    (p) => `<option value="${p.id}">${esc(p.name)} — ${formatPrice(p.price)}</option>`
  ).join("");
  document.getElementById("manual-order-form").reset();
  document.getElementById("mo-qty").value = 1;
  document.getElementById("mo-status").value = "pending";
  openModal("manual-order-modal");
}

async function onCreateManualOrder(e) {
  e.preventDefault();
  const productId = document.getElementById("mo-product").value;
  const product = getProductById(productId);
  if (!product) return;
  const qty = Math.max(1, Number(document.getElementById("mo-qty").value) || 1);
  const subtotal = product.price * qty;
  const shipping = subtotal >= 999 ? 0 : 99;
  try {
    await createOrder({
      status: document.getElementById("mo-status").value,
      customer: {
        name: document.getElementById("mo-name").value,
        phone: document.getElementById("mo-phone").value,
        email: document.getElementById("mo-email").value,
        address: document.getElementById("mo-address").value,
      },
      payment: document.getElementById("mo-payment").value,
      items: [
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          qty,
          color: (product.colors && product.colors[0]) || "",
          size: (product.sizes && product.sizes[0]) || "",
          image: product.image,
          lineTotal: subtotal,
        },
      ],
      subtotal,
      shipping,
      total: subtotal + shipping,
      notes: document.getElementById("mo-notes").value,
    });
    showToast("Order created");
    closeModal("manual-order-modal");
    await renderOrdersTable();
    await renderDashboard();
    await switchView("orders");
  } catch (err) {
    console.error(err);
    showToast("Could not create order");
  }
}

/* ---------- Helpers ---------- */
function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
