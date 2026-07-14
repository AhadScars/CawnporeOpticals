# Cawnpore Opticals

Premium eyewear e-commerce for **Cawnpore Opticals** (Kanpur) — storefront, cart, checkout, and admin.

| Production | Local fallback |
|------------|----------------|
| **Vercel** (static) + **Supabase** (PostgreSQL) | Python `server.py` + SQLite |

**Full walkthrough:** see **[SETUP.md](SETUP.md)** (Supabase project → env vars → Vercel deploy).

## Quick deploy

1. **Supabase:** create a project → run [`supabase/schema.sql`](supabase/schema.sql) in the SQL Editor → copy **Project URL** + **anon** key.
2. **Vercel:** import the repo → set env vars → deploy.

| Env var | Value |
|---------|--------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | anon public key |

Build runs `npm run build`, which writes `js/config.js` from those env vars. That file is **gitignored** so keys never go into git.

```bash
# Local (optional)
cp .env.example .env   # fill in keys
npm run build
npm run dev:static     # http://localhost:5000 with Supabase
# or
npm run dev            # SQLite via server.py (placeholders in config)
```

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML, CSS, vanilla JS |
| Hosting | Vercel |
| Database | Supabase (PostgreSQL + REST) |
| Local API | `server.py` + SQLite (when config is placeholders) |
| Cart | `localStorage` |

## Features

- **Storefront:** Home, Shop, Product, Cart/checkout, About, Contact
- **Admin** (`/admin.html`): products CRUD, orders, stats — login `admin` / `admin123`
- Auto-detects backend: real Supabase keys → Supabase; placeholders → local `/api`

## Project structure

```
├── SETUP.md                 # Step-by-step Supabase + Vercel
├── supabase/schema.sql      # Tables, RLS, seed
├── js/
│   ├── config.example.js    # Template (committed)
│   ├── config.js            # Generated from env (gitignored)
│   ├── db.js                # Supabase / local adapter
│   ├── products.js, orders.js, cart.js, main.js, admin.js
├── scripts/build-config.js  # npm run build
├── package.json
├── vercel.json
├── server.py                # Local SQLite API
└── data/seed_products.json
```

## Security

- Use only the **anon** key in the browser / Vercel env
- Never commit `.env` or `js/config.js` with real keys
- Never ship the **service_role** key to the client
- Admin login is client-side demo only — tighten RLS + Auth for production

## License

© 2026 Cawnpore Opticals. All rights reserved.
