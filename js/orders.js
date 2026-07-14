/* Cawnpore Opticals — Orders API client (Supabase or local /api) */
const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

let ORDERS_CACHE = [];

async function getOrders() {
  ORDERS_CACHE = await dbListOrders();
  return ORDERS_CACHE;
}

async function createOrder(payload) {
  const order = await dbCreateOrder(payload);
  ORDERS_CACHE.unshift(order);
  window.dispatchEvent(new CustomEvent("orders-updated", { detail: ORDERS_CACHE }));
  return order;
}

async function updateOrderStatus(id, status) {
  const order = await dbUpdateOrder(id, { status });
  const idx = ORDERS_CACHE.findIndex((o) => o.id === id);
  if (idx >= 0) ORDERS_CACHE[idx] = order;
  window.dispatchEvent(new CustomEvent("orders-updated", { detail: ORDERS_CACHE }));
  return order;
}

async function updateOrder(id, data) {
  const order = await dbUpdateOrder(id, data);
  const idx = ORDERS_CACHE.findIndex((o) => o.id === id);
  if (idx >= 0) ORDERS_CACHE[idx] = order;
  return order;
}

async function deleteOrder(id) {
  await dbDeleteOrder(id);
  ORDERS_CACHE = ORDERS_CACHE.filter((o) => o.id !== id);
  window.dispatchEvent(new CustomEvent("orders-updated", { detail: ORDERS_CACHE }));
  return true;
}

function getOrderById(id) {
  return ORDERS_CACHE.find((o) => o.id === id) || null;
}

async function fetchOrderById(id) {
  const order = await dbGetOrder(id);
  const idx = ORDERS_CACHE.findIndex((o) => o.id === id);
  if (idx >= 0) ORDERS_CACHE[idx] = order;
  else ORDERS_CACHE.push(order);
  return order;
}

async function orderStats() {
  return dbOrderStats();
}
