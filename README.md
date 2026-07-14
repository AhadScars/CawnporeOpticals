# Cawnpore Opticals

Premium eyewear e-commerce site for **Cawnpore Opticals** (Kanpur) — eyeglasses, sunglasses, kids frames, and accessories. Includes a responsive storefront, shopping cart, checkout, and an admin panel backed by **SQLite**.

No third-party Python packages required — only the standard library.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML, CSS, vanilla JavaScript |
| Backend | Python 3 (`server.py`) — `http.server` + REST API |
| Database | SQLite (`data/cawnpore.db`) |
| Cart | Browser `localStorage` |

## Features

### Storefront
- **Pages:** Home, Shop, Product detail, Cart & checkout, About, Contact
- Product filters (category, search), ratings, badges, and promo banners
- Cart stored in the browser; orders saved to SQLite on checkout
- Categories: eyeglasses, sunglasses, kids, accessories

### Admin (`/admin.html`)
- Login: `admin` / `admin123`
- **Products:** full CRUD (create, edit, delete, reseed catalog)
- **Orders:** list, update status, delete, manual create
- **Dashboard:** stats from the database

## Requirements

- **Python 3.8+** (uses only the standard library)
- No `pip install` needed

## Quick start

### Linux / macOS

```bash
python3 server.py
```

### Windows

Double-click `run.bat`, or:

```bat
python server.py
```

### Custom port

```bash
PORT=8080 python3 server.py
```

Then open:

| URL | Purpose |
|-----|---------|
| http://localhost:5000 | Storefront |
| http://localhost:5000/admin.html | Admin panel |

> Always use `server.py` (not `python -m http.server`) so the REST API and SQLite backend work.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/products` | List products |
| GET | `/api/products/:id` | Get one product |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |
| POST | `/api/products/reset` | Reseed catalog from seed file |
| GET | `/api/orders` | List orders |
| GET | `/api/orders/:id` | Get one order |
| POST | `/api/orders` | Create order |
| PUT | `/api/orders/:id` | Update order (e.g. status) |
| DELETE | `/api/orders/:id` | Delete order |
| GET | `/api/stats` | Dashboard stats |

## Project structure

```
cawnporeopticals/
├── server.py                 # HTTP server + SQLite REST API
├── run.bat                   # Windows launcher
├── index.html                # Home
├── shop.html                 # Catalog
├── product.html              # Product detail
├── cart.html                 # Cart & checkout
├── about.html
├── contact.html
├── admin.html                # Admin dashboard
├── css/
│   ├── style.css             # Storefront styles
│   └── admin.css             # Admin styles
├── js/
│   ├── main.js               # Shared UI (nav, search, etc.)
│   ├── products.js           # Products API + UI helpers
│   ├── orders.js             # Orders API client
│   ├── cart.js               # Cart (localStorage)
│   └── admin.js              # Admin panel logic
├── data/
│   ├── cawnpore.db           # SQLite DB (auto-created)
│   └── seed_products.json    # Default catalog seed
└── assets/                   # Static assets
```

## Database

On first run, `server.py`:

1. Creates `data/` if needed
2. Creates `products` and `orders` tables
3. Seeds products from `data/seed_products.json` when the catalog is empty

| Table | Purpose |
|-------|---------|
| `products` | Catalog (price, stock, colors, sizes, etc.) |
| `orders` | Customer orders (items JSON, totals, status) |

## Notes

- Cart stays in browser `localStorage` until checkout
- Products and orders persist in SQLite
- Change admin credentials in the frontend admin script for production use
- Bind address is `0.0.0.0` (reachable on your LAN); default port is `5000`

## License

© 2026 Cawnpore Opticals. All rights reserved.
