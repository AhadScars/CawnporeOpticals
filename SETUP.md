# Setup guide — Supabase + Vercel

Follow these steps once. Takes about 10–15 minutes.

---

## Part A — Create Supabase (database)

### A1. Sign up / log in

1. Open [https://supabase.com](https://supabase.com)
2. Sign in (GitHub is fine)

### A2. New project

1. Click **New project**
2. Choose your **Organization**
3. Fill in:
   - **Name:** `cawnporeopticals` (or any name)
   - **Database password:** generate a strong password and save it
   - **Region:** closest to your customers (e.g. Mumbai / Singapore)
4. Click **Create new project** and wait until it is ready (1–2 min)

### A3. Run the schema (tables + seed)

1. In the left sidebar: **SQL Editor**
2. Click **New query**
3. Open this file on your computer: `supabase/schema.sql`
4. Copy **all** of its contents into the SQL editor
5. Click **Run** (or Ctrl/Cmd + Enter)
6. You should see success (no red errors)

This creates:

- `products` table (catalog)
- `orders` table (checkouts)
- RLS policies (browser can read/write with the anon key)
- Default product seed data

### A4. Confirm data

1. Left sidebar: **Table Editor**
2. Open **products** — you should see 12 rows (Awadh Classic Aviator, etc.)

### A5. Copy API keys

1. Left sidebar: **Project Settings** (gear) → **API**
2. Copy these two values (you need them next):

| Field in Supabase | Env var name |
|-------------------|--------------|
| **Project URL** | `SUPABASE_URL` |
| **anon public** key | `SUPABASE_ANON_KEY` |

> Never use the **service_role** key in the frontend or Vercel public env. It bypasses RLS.

---

## Part B — Local config (optional test)

### B1. Create `.env` (not committed to git)

```bash
cp .env.example .env
```

Edit `.env`:

```env
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### B2. Generate `js/config.js`

```bash
npm run build
```

This writes `js/config.js` from your `.env`. That file is **gitignored** so keys stay private.

### B3. Preview locally

With Supabase configured (no Python API needed):

```bash
npm run dev:static
```

Open http://localhost:5000  

Or with local SQLite only (leave placeholders / no `.env`):

```bash
npm run dev
```

---

## Part C — Deploy to Vercel

### C1. Push code to GitHub

```bash
git add .
git commit -m "Add Supabase + Vercel deploy setup"
git push
```

Do **not** commit `.env` or `js/config.js` (they are gitignored).

### C2. Import on Vercel

1. Open [https://vercel.com/new](https://vercel.com/new)
2. **Import** your GitHub repository
3. Framework Preset: **Other**
4. Root directory: project root (default)
5. Build Command: `npm run build` (already in `vercel.json`)
6. Output: `.` (already in `vercel.json`)

### C3. Add environment variables (important)

Before deploying, expand **Environment Variables** and add:

| Name | Value | Environments |
|------|--------|--------------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Production, Preview, Development |
| `SUPABASE_ANON_KEY` | your anon key | Production, Preview, Development |

Then click **Deploy**.

### C4. CLI alternative

```bash
npx vercel login
npx vercel env add SUPABASE_URL
npx vercel env add SUPABASE_ANON_KEY
npx vercel --prod
```

### C5. Verify live site

| URL | What to check |
|-----|----------------|
| `https://your-app.vercel.app` | Home loads products |
| `https://your-app.vercel.app/shop.html` | Catalog from Supabase |
| `https://your-app.vercel.app/admin.html` | Login `admin` / `admin123` |

If the catalog is empty:

1. Re-run `supabase/schema.sql` in Supabase SQL Editor, or  
2. Admin → Reset products to defaults

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| “Could not load catalog. Check Supabase config / RLS.” | Env vars missing on Vercel, or schema/RLS not applied. Re-check Part A3 + C3. |
| Products empty | Run `schema.sql`; check Table Editor → products. |
| Orders fail on checkout | Confirm `orders` table exists and insert policy is on (schema.sql). |
| Works locally, fails on Vercel | Env vars not set for **Production**. Redeploy after adding them. |
| Accidentally committed keys | Rotate the anon key in Supabase (Settings → API), remove keys from git history, push again. |

---

## Security reminders

1. **anon key** is public by design — security comes from **RLS policies**.
2. Current policies are open for the demo admin. For a real store, add Supabase Auth and restrict writes to admins.
3. Never put `service_role` in `js/config.js` or Vercel public client env.
4. Change admin password in `js/admin.js` before sharing the admin URL.

---

## Quick checklist

- [ ] Supabase project created  
- [ ] `supabase/schema.sql` ran successfully  
- [ ] Products visible in Table Editor  
- [ ] `SUPABASE_URL` + `SUPABASE_ANON_KEY` copied  
- [ ] Vercel env vars set  
- [ ] Deploy succeeded  
- [ ] Live site shows products  
- [ ] Test checkout creates a row in `orders`  

Done. Your site is on Vercel; your data is on Supabase.
