/* Cawnpore Opticals — data layer (Supabase REST or local /api) */

function getConfig() {
  return window.CAWNPORE_CONFIG || {};
}

function useSupabase() {
  const { supabaseUrl, supabaseAnonKey } = getConfig();
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (supabaseUrl.includes("YOUR_PROJECT_REF")) return false;
  if (supabaseAnonKey.includes("YOUR_SUPABASE_ANON_KEY")) return false;
  return true;
}

function supabaseHeaders(extra = {}) {
  const { supabaseAnonKey } = getConfig();
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function supabaseRestUrl(pathAndQuery) {
  const { supabaseUrl } = getConfig();
  return `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${pathAndQuery}`;
}

async function supabaseRequest(pathAndQuery, options = {}) {
  const prefer = options.prefer || "return=representation";
  const res = await fetch(supabaseRestUrl(pathAndQuery), {
    method: options.method || "GET",
    headers: supabaseHeaders({
      Prefer: prefer,
      ...(options.headers || {}),
    }),
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error_description || data.error)) ||
      res.statusText ||
      "Supabase request failed";
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

/* ---------- mappers ---------- */

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function mapProductFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    brand: row.brand,
    price: Number(row.price) || 0,
    originalPrice: Number(row.original_price) || 0,
    rating: Number(row.rating) || 0,
    reviews: Number(row.reviews) || 0,
    badge: row.badge || null,
    colors: asArray(row.colors),
    sizes: asArray(row.sizes),
    description: row.description || "",
    features: asArray(row.features),
    image: row.image || "aviator",
    gender: row.gender || "unisex",
    stock: row.stock != null ? Number(row.stock) : 50,
  };
}

function mapProductToDb(p) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    brand: p.brand,
    price: p.price,
    original_price: p.originalPrice ?? p.original_price ?? 0,
    rating: p.rating,
    reviews: p.reviews,
    badge: p.badge || null,
    colors: asArray(p.colors),
    sizes: asArray(p.sizes),
    description: p.description || "",
    features: asArray(p.features),
    image: p.image || "aviator",
    gender: p.gender || "unisex",
    stock: p.stock != null ? Number(p.stock) : 50,
  };
}

function mapOrderFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    customer: {
      name: row.customer_name || "",
      phone: row.customer_phone || "",
      email: row.customer_email || "",
      address: row.customer_address || "",
    },
    payment: row.payment || "cod",
    items: asArray(row.items),
    subtotal: Number(row.subtotal) || 0,
    shipping: Number(row.shipping) || 0,
    total: Number(row.total) || 0,
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ---------- local /api fallback ---------- */

async function localApiJson(url, options = {}) {
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

/* ---------- products ---------- */

async function dbListProducts() {
  if (useSupabase()) {
    const rows = await supabaseRequest("products?select=*&order=name.asc");
    return (rows || []).map(mapProductFromDb);
  }
  return localApiJson("/api/products");
}

async function dbGetProduct(id) {
  if (useSupabase()) {
    const rows = await supabaseRequest(
      `products?id=eq.${encodeURIComponent(id)}&select=*`
    );
    if (!rows || !rows.length) throw new Error("Product not found");
    return mapProductFromDb(rows[0]);
  }
  return localApiJson(`/api/products/${encodeURIComponent(id)}`);
}

async function dbCreateProduct(data) {
  if (useSupabase()) {
    const row = mapProductToDb(data);
    if (!row.id) row.id = `co-${Date.now()}`;
    const rows = await supabaseRequest("products", {
      method: "POST",
      body: row,
      prefer: "return=representation",
    });
    return mapProductFromDb(Array.isArray(rows) ? rows[0] : rows);
  }
  return localApiJson("/api/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function dbUpdateProduct(id, data) {
  if (useSupabase()) {
    const row = mapProductToDb({ ...data, id });
    delete row.id;
    const rows = await supabaseRequest(
      `products?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: row,
        prefer: "return=representation",
      }
    );
    if (!rows || !rows.length) throw new Error("Product not found");
    return mapProductFromDb(rows[0]);
  }
  return localApiJson(`/api/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

async function dbDeleteProduct(id) {
  if (useSupabase()) {
    await supabaseRequest(`products?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      prefer: "return=minimal",
    });
    return true;
  }
  await localApiJson(`/api/products/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return true;
}

async function dbResetProducts() {
  if (useSupabase()) {
    // PostgREST requires a filter for DELETE — remove every row with a non-null id
    await supabaseRequest("products?id=not.is.null", {
      method: "DELETE",
      prefer: "return=minimal",
    });

    const seedRes = await fetch("data/seed_products.json");
    if (!seedRes.ok) throw new Error("Could not load seed_products.json");
    const seed = await seedRes.json();
    const normalize =
      typeof normalizeProduct === "function"
        ? normalizeProduct
        : (p) => p;
    const rows = seed.map((p) => mapProductToDb(normalize(p)));
    if (rows.length) {
      await supabaseRequest("products", {
        method: "POST",
        body: rows,
        prefer: "return=representation",
      });
    }
    return dbListProducts();
  }
  const result = await localApiJson("/api/products/reset", {
    method: "POST",
    body: JSON.stringify({}),
  });
  return result.products || result;
}

/* ---------- orders ---------- */

async function dbListOrders() {
  if (useSupabase()) {
    const rows = await supabaseRequest(
      "orders?select=*&order=created_at.desc"
    );
    return (rows || []).map(mapOrderFromDb);
  }
  return localApiJson("/api/orders");
}

async function dbGetOrder(id) {
  if (useSupabase()) {
    const rows = await supabaseRequest(
      `orders?id=eq.${encodeURIComponent(id)}&select=*`
    );
    if (!rows || !rows.length) throw new Error("Order not found");
    return mapOrderFromDb(rows[0]);
  }
  return localApiJson(`/api/orders/${encodeURIComponent(id)}`);
}

async function dbCreateOrder(payload) {
  if (useSupabase()) {
    const customer = payload.customer || {};
    const orderId =
      payload.id || `CO${String(Date.now()).slice(-8)}`;
    const row = {
      id: orderId,
      status: payload.status || "pending",
      customer_name: customer.name || payload.customer_name || "",
      customer_phone: customer.phone || payload.customer_phone || "",
      customer_email: customer.email || payload.customer_email || "",
      customer_address: customer.address || payload.customer_address || "",
      payment: payload.payment || "cod",
      items: payload.items || [],
      subtotal: Number(payload.subtotal) || 0,
      shipping: Number(payload.shipping) || 0,
      total: Number(payload.total) || 0,
      notes: payload.notes || "",
    };
    const rows = await supabaseRequest("orders", {
      method: "POST",
      body: row,
      prefer: "return=representation",
    });
    return mapOrderFromDb(Array.isArray(rows) ? rows[0] : rows);
  }
  return localApiJson("/api/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function dbUpdateOrder(id, data) {
  if (useSupabase()) {
    const patch = {};
    if (data.status != null) patch.status = data.status;
    if (data.notes != null) patch.notes = data.notes;
    const rows = await supabaseRequest(
      `orders?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: patch,
        prefer: "return=representation",
      }
    );
    if (!rows || !rows.length) throw new Error("Order not found");
    return mapOrderFromDb(rows[0]);
  }
  return localApiJson(`/api/orders/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

async function dbDeleteOrder(id) {
  if (useSupabase()) {
    await supabaseRequest(`orders?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      prefer: "return=minimal",
    });
    return true;
  }
  await localApiJson(`/api/orders/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return true;
}

async function dbOrderStats() {
  if (useSupabase()) {
    const [products, orders] = await Promise.all([
      dbListProducts(),
      dbListOrders(),
    ]);
    const byStatus = {};
    let revenue = 0;
    for (const o of orders) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      if (o.status !== "cancelled") revenue += Number(o.total) || 0;
    }
    return {
      products: products.length,
      total: orders.length,
      revenue,
      pending: byStatus.pending || 0,
      processing: byStatus.processing || 0,
      shipped: byStatus.shipped || 0,
      delivered: byStatus.delivered || 0,
      cancelled: byStatus.cancelled || 0,
    };
  }
  return localApiJson("/api/stats");
}
