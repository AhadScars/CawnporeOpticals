#!/usr/bin/env python3
"""
Cawnpore Opticals — HTTP server with SQLite backend.
Serves static files + REST API for products & orders.
Usage: python3 server.py
"""

from __future__ import annotations

import json
import os
import re
import sqlite3
import time
import urllib.parse
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "cawnpore.db"
SEED_PATH = DATA_DIR / "seed_products.json"
HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", "5000"))

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = get_conn()
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'eyeglasses',
                brand TEXT DEFAULT 'Cawnpore',
                price REAL NOT NULL DEFAULT 0,
                original_price REAL DEFAULT 0,
                rating REAL DEFAULT 4.5,
                reviews INTEGER DEFAULT 0,
                badge TEXT,
                colors TEXT DEFAULT '[]',
                sizes TEXT DEFAULT '[]',
                description TEXT DEFAULT '',
                features TEXT DEFAULT '[]',
                image TEXT DEFAULT 'aviator',
                gender TEXT DEFAULT 'unisex',
                stock INTEGER DEFAULT 50,
                created_at TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL DEFAULT 'pending',
                customer_name TEXT NOT NULL DEFAULT '',
                customer_phone TEXT NOT NULL DEFAULT '',
                customer_email TEXT DEFAULT '',
                customer_address TEXT DEFAULT '',
                payment TEXT DEFAULT 'cod',
                items TEXT NOT NULL DEFAULT '[]',
                subtotal REAL DEFAULT 0,
                shipping REAL DEFAULT 0,
                total REAL DEFAULT 0,
                notes TEXT DEFAULT '',
                created_at TEXT,
                updated_at TEXT
            );
            """
        )
        count = conn.execute("SELECT COUNT(*) AS c FROM products").fetchone()["c"]
        if count == 0:
            seed_products(conn)
        conn.commit()
    finally:
        conn.close()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _dumps_list(value: Any) -> str:
    if isinstance(value, list):
        return json.dumps(value)
    if value is None or value == "":
        return "[]"
    if isinstance(value, str):
        parts = [p.strip() for p in value.split(",") if p.strip()]
        return json.dumps(parts if parts else [])
    return json.dumps([])


def _loads_list(raw: str | None) -> list:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


def row_to_product(row: sqlite3.Row) -> dict:
    d = dict(row)
    return {
        "id": d["id"],
        "name": d["name"],
        "category": d["category"],
        "brand": d["brand"],
        "price": d["price"],
        "originalPrice": d["original_price"],
        "rating": d["rating"],
        "reviews": d["reviews"],
        "badge": d["badge"],
        "colors": _loads_list(d["colors"]),
        "sizes": _loads_list(d["sizes"]),
        "description": d["description"] or "",
        "features": _loads_list(d["features"]),
        "image": d["image"] or "aviator",
        "gender": d["gender"] or "unisex",
        "stock": d["stock"] if d["stock"] is not None else 50,
    }


def row_to_order(row: sqlite3.Row) -> dict:
    d = dict(row)
    return {
        "id": d["id"],
        "status": d["status"],
        "customer": {
            "name": d["customer_name"] or "",
            "phone": d["customer_phone"] or "",
            "email": d["customer_email"] or "",
            "address": d["customer_address"] or "",
        },
        "payment": d["payment"] or "cod",
        "items": _loads_list(d["items"]),
        "subtotal": d["subtotal"] or 0,
        "shipping": d["shipping"] or 0,
        "total": d["total"] or 0,
        "notes": d["notes"] or "",
        "createdAt": d["created_at"],
        "updatedAt": d["updated_at"],
    }


def normalize_product_payload(data: dict, product_id: str | None = None) -> dict:
    colors = data.get("colors", ["Black"])
    sizes = data.get("sizes", ["Free Size"])
    features = data.get("features", ["Prescription Ready"])
    if isinstance(colors, str):
        colors = [c.strip() for c in colors.split(",") if c.strip()] or ["Black"]
    if isinstance(sizes, str):
        sizes = [s.strip() for s in sizes.split(",") if s.strip()] or ["Free Size"]
    if isinstance(features, str):
        features = [f.strip() for f in features.split(",") if f.strip()] or ["Prescription Ready"]

    price = float(data.get("price") or 0)
    original = data.get("originalPrice", data.get("original_price", price))
    try:
        original = float(original)
    except (TypeError, ValueError):
        original = price

    badge = data.get("badge")
    if badge == "":
        badge = None

    pid = product_id or data.get("id") or f"co-{int(time.time() * 1000)}"
    return {
        "id": str(pid),
        "name": str(data.get("name") or "Untitled").strip(),
        "category": data.get("category") or "eyeglasses",
        "brand": data.get("brand") or "Cawnpore",
        "price": price,
        "original_price": original,
        "rating": min(5.0, max(0.0, float(data.get("rating") or 4.5))),
        "reviews": int(data.get("reviews") or 0),
        "badge": badge,
        "colors": json.dumps(colors),
        "sizes": json.dumps(sizes),
        "description": str(data.get("description") or "").strip(),
        "features": json.dumps(features),
        "image": data.get("image") or "aviator",
        "gender": data.get("gender") or "unisex",
        "stock": int(data.get("stock") if data.get("stock") is not None else 50),
    }


def seed_products(conn: sqlite3.Connection) -> int:
    if not SEED_PATH.exists():
        return 0
    products = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    now = _now()
    for p in products:
        n = normalize_product_payload(p, p.get("id"))
        conn.execute(
            """
            INSERT OR REPLACE INTO products (
                id, name, category, brand, price, original_price, rating, reviews,
                badge, colors, sizes, description, features, image, gender, stock,
                created_at, updated_at
            ) VALUES (
                :id, :name, :category, :brand, :price, :original_price, :rating, :reviews,
                :badge, :colors, :sizes, :description, :features, :image, :gender, :stock,
                :created_at, :updated_at
            )
            """,
            {**n, "created_at": now, "updated_at": now},
        )
    return len(products)


def list_products() -> list[dict]:
    conn = get_conn()
    try:
        rows = conn.execute("SELECT * FROM products ORDER BY name COLLATE NOCASE").fetchall()
        return [row_to_product(r) for r in rows]
    finally:
        conn.close()


def get_product(product_id: str) -> dict | None:
    conn = get_conn()
    try:
        row = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
        return row_to_product(row) if row else None
    finally:
        conn.close()


def create_product(data: dict) -> dict:
    n = normalize_product_payload(data)
    now = _now()
    conn = get_conn()
    try:
        # ensure unique id
        while conn.execute("SELECT 1 FROM products WHERE id = ?", (n["id"],)).fetchone():
            n["id"] = f"co-{int(time.time() * 1000)}"
        conn.execute(
            """
            INSERT INTO products (
                id, name, category, brand, price, original_price, rating, reviews,
                badge, colors, sizes, description, features, image, gender, stock,
                created_at, updated_at
            ) VALUES (
                :id, :name, :category, :brand, :price, :original_price, :rating, :reviews,
                :badge, :colors, :sizes, :description, :features, :image, :gender, :stock,
                :created_at, :updated_at
            )
            """,
            {**n, "created_at": now, "updated_at": now},
        )
        conn.commit()
        return get_product(n["id"])  # type: ignore
    finally:
        conn.close()


def update_product(product_id: str, data: dict) -> dict | None:
    existing = get_product(product_id)
    if not existing:
        return None
    merged = {**existing, **data, "id": product_id}
    n = normalize_product_payload(merged, product_id)
    now = _now()
    conn = get_conn()
    try:
        conn.execute(
            """
            UPDATE products SET
                name=:name, category=:category, brand=:brand, price=:price,
                original_price=:original_price, rating=:rating, reviews=:reviews,
                badge=:badge, colors=:colors, sizes=:sizes, description=:description,
                features=:features, image=:image, gender=:gender, stock=:stock,
                updated_at=:updated_at
            WHERE id=:id
            """,
            {**n, "updated_at": now},
        )
        conn.commit()
        return get_product(product_id)
    finally:
        conn.close()


def delete_product(product_id: str) -> bool:
    conn = get_conn()
    try:
        cur = conn.execute("DELETE FROM products WHERE id = ?", (product_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def reset_products() -> list[dict]:
    conn = get_conn()
    try:
        conn.execute("DELETE FROM products")
        seed_products(conn)
        conn.commit()
    finally:
        conn.close()
    return list_products()


def list_orders() -> list[dict]:
    conn = get_conn()
    try:
        rows = conn.execute(
            "SELECT * FROM orders ORDER BY datetime(created_at) DESC"
        ).fetchall()
        return [row_to_order(r) for r in rows]
    finally:
        conn.close()


def get_order(order_id: str) -> dict | None:
    conn = get_conn()
    try:
        row = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        return row_to_order(row) if row else None
    finally:
        conn.close()


def create_order(data: dict) -> dict:
    order_id = data.get("id") or f"CO{str(int(time.time() * 1000))[-8:]}"
    customer = data.get("customer") or {}
    items = data.get("items") or []
    now = _now()
    payload = {
        "id": order_id,
        "status": data.get("status") or "pending",
        "customer_name": customer.get("name") or data.get("customer_name") or "",
        "customer_phone": customer.get("phone") or data.get("customer_phone") or "",
        "customer_email": customer.get("email") or data.get("customer_email") or "",
        "customer_address": customer.get("address") or data.get("customer_address") or "",
        "payment": data.get("payment") or "cod",
        "items": json.dumps(items),
        "subtotal": float(data.get("subtotal") or 0),
        "shipping": float(data.get("shipping") or 0),
        "total": float(data.get("total") or 0),
        "notes": data.get("notes") or "",
        "created_at": now,
        "updated_at": now,
    }
    conn = get_conn()
    try:
        conn.execute(
            """
            INSERT INTO orders (
                id, status, customer_name, customer_phone, customer_email, customer_address,
                payment, items, subtotal, shipping, total, notes, created_at, updated_at
            ) VALUES (
                :id, :status, :customer_name, :customer_phone, :customer_email, :customer_address,
                :payment, :items, :subtotal, :shipping, :total, :notes, :created_at, :updated_at
            )
            """,
            payload,
        )
        conn.commit()
        return get_order(order_id)  # type: ignore
    finally:
        conn.close()


def update_order(order_id: str, data: dict) -> dict | None:
    existing = get_order(order_id)
    if not existing:
        return None
    status = data.get("status", existing["status"])
    notes = data.get("notes", existing.get("notes") or "")
    now = _now()
    conn = get_conn()
    try:
        conn.execute(
            "UPDATE orders SET status = ?, notes = ?, updated_at = ? WHERE id = ?",
            (status, notes, now, order_id),
        )
        conn.commit()
        return get_order(order_id)
    finally:
        conn.close()


def delete_order(order_id: str) -> bool:
    conn = get_conn()
    try:
        cur = conn.execute("DELETE FROM orders WHERE id = ?", (order_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def order_stats() -> dict:
    orders = list_orders()
    revenue = sum(o["total"] for o in orders if o["status"] != "cancelled")
    by_status: dict[str, int] = {}
    for o in orders:
        by_status[o["status"]] = by_status.get(o["status"], 0) + 1
    products_count = len(list_products())
    return {
        "products": products_count,
        "total": len(orders),
        "revenue": revenue,
        "pending": by_status.get("pending", 0),
        "processing": by_status.get("processing", 0),
        "shipped": by_status.get("shipped", 0),
        "delivered": by_status.get("delivered", 0),
        "cancelled": by_status.get("cancelled", 0),
    }


# ---------------------------------------------------------------------------
# HTTP handler
# ---------------------------------------------------------------------------

class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        print(f"[{self.log_date_time_string()}] {args[0] if args else fmt}")

    def _send_json(self, data: Any, status: int = 200) -> None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8"))
            return data if isinstance(data, dict) else {}
        except json.JSONDecodeError:
            return {}

    def end_headers(self) -> None:
        # CORS for local tools
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.end_headers()

    def do_GET(self) -> None:
        path = urllib.parse.urlparse(self.path).path
        if path == "/api/health":
            return self._send_json({"ok": True, "db": str(DB_PATH)})
        if path == "/api/products":
            return self._send_json(list_products())
        if path == "/api/stats":
            return self._send_json(order_stats())
        if path == "/api/orders":
            return self._send_json(list_orders())
        m = re.fullmatch(r"/api/products/([^/]+)", path)
        if m:
            product = get_product(urllib.parse.unquote(m.group(1)))
            if not product:
                return self._send_json({"error": "Product not found"}, 404)
            return self._send_json(product)
        m = re.fullmatch(r"/api/orders/([^/]+)", path)
        if m:
            order = get_order(urllib.parse.unquote(m.group(1)))
            if not order:
                return self._send_json({"error": "Order not found"}, 404)
            return self._send_json(order)
        return super().do_GET()

    def do_POST(self) -> None:
        path = urllib.parse.urlparse(self.path).path
        data = self._read_json()
        if path == "/api/products":
            product = create_product(data)
            return self._send_json(product, 201)
        if path == "/api/products/reset":
            products = reset_products()
            return self._send_json({"ok": True, "products": products})
        if path == "/api/orders":
            order = create_order(data)
            return self._send_json(order, 201)
        return self._send_json({"error": "Not found"}, 404)

    def do_PUT(self) -> None:
        path = urllib.parse.urlparse(self.path).path
        data = self._read_json()
        m = re.fullmatch(r"/api/products/([^/]+)", path)
        if m:
            product = update_product(urllib.parse.unquote(m.group(1)), data)
            if not product:
                return self._send_json({"error": "Product not found"}, 404)
            return self._send_json(product)
        m = re.fullmatch(r"/api/orders/([^/]+)", path)
        if m:
            order = update_order(urllib.parse.unquote(m.group(1)), data)
            if not order:
                return self._send_json({"error": "Order not found"}, 404)
            return self._send_json(order)
        return self._send_json({"error": "Not found"}, 404)

    def do_PATCH(self) -> None:
        return self.do_PUT()

    def do_DELETE(self) -> None:
        path = urllib.parse.urlparse(self.path).path
        m = re.fullmatch(r"/api/products/([^/]+)", path)
        if m:
            ok = delete_product(urllib.parse.unquote(m.group(1)))
            if not ok:
                return self._send_json({"error": "Product not found"}, 404)
            return self._send_json({"ok": True})
        m = re.fullmatch(r"/api/orders/([^/]+)", path)
        if m:
            ok = delete_order(urllib.parse.unquote(m.group(1)))
            if not ok:
                return self._send_json({"error": "Order not found"}, 404)
            return self._send_json({"ok": True})
        return self._send_json({"error": "Not found"}, 404)


def main() -> None:
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)
    print(f"Cawnpore Opticals running at http://localhost:{PORT}")
    print(f"SQLite DB: {DB_PATH}")
    print(f"Admin: http://localhost:{PORT}/admin.html  (admin / admin123)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down…")
        server.shutdown()


if __name__ == "__main__":
    main()
