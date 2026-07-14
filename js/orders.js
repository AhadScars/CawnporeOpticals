/* Cawnpore Opticals — Orders API client (SQLite backend) */
const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

let ORDERS_CACHE = [];

async function getOrders() {
  ORDERS_CACHE = await apiJson(`${API}/orders`);
  return ORDERS_CACHE;
}

async function createOrder(payload) {
  const order = await apiJson(`${API}/orders`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  ORDERS_CACHE.unshift(order);
  window.dispatchEvent(new CustomEvent("orders-updated", { detail: ORDERS_CACHE }));
  return order;
}

async function updateOrderStatus(id, status) {
  const order = await apiJson(`${API}/orders/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
  const idx = ORDERS_CACHE.findIndex((o) => o.id === id);
  if (idx >= 0) ORDERS_CACHE[idx] = order;
  window.dispatchEvent(new CustomEvent("orders-updated", { detail: ORDERS_CACHE }));
  return order;
}

async function updateOrder(id, data) {
  const order = await apiJson(`${API}/orders/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  const idx = ORDERS_CACHE.findIndex((o) => o.id === id);
  if (idx >= 0) ORDERS_CACHE[idx] = order;
  return order;
}

async function deleteOrder(id) {
  await apiJson(`${API}/orders/${encodeURIComponent(id)}`, { method: "DELETE" });
  ORDERS_CACHE = ORDERS_CACHE.filter((o) => o.id !== id);
  window.dispatchEvent(new CustomEvent("orders-updated", { detail: ORDERS_CACHE }));
  return true;
}

function getOrderById(id) {
  return ORDERS_CACHE.find((o) => o.id === id) || null;
}

async function fetchOrderById(id) {
  const order = await apiJson(`${API}/orders/${encodeURIComponent(id)}`);
  const idx = ORDERS_CACHE.findIndex((o) => o.id === id);
  if (idx >= 0) ORDERS_CACHE[idx] = order;
  else ORDERS_CACHE.push(order);
  return order;
}

async function orderStats() {
  return apiJson(`${API}/stats`);
}
