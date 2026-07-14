/* Cawnpore Opticals — example config
 *
 * Copy this file to config.js for local use:
 *   cp js/config.example.js js/config.js
 *
 * Prefer env vars (Vercel / .env) so secrets stay out of git:
 *   SUPABASE_URL=...
 *   SUPABASE_ANON_KEY=...
 *   npm run build
 *
 * Supabase Dashboard → Project Settings → API
 *   - Project URL     → supabaseUrl
 *   - anon public key → supabaseAnonKey
 *
 * Leave placeholders to use local SQLite (python server.py).
 */
window.CAWNPORE_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT_REF.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",
};
