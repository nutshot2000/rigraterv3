<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/16IHEpPmyURntNzPj0vs2lkE9IOoeWTk7

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` in the project root and set:
   - `GEMINI_API_KEY` (Gemini key)
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` (optional; enables cloud auth + DB)
3. Run the app:
   `npm run dev`

## Supabase Schema (optional)

If using Supabase, run this SQL:

```sql
create extension if not exists pgcrypto;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  category text not null,
  brand text,
  slug text,
  image_url text not null,
  price text not null,
  affiliate_link text not null,
  review text not null,
  specifications text not null
);

alter table products enable row level security;
create policy "allow read for all" on products for select using (true);
create policy "allow write for authenticated" on products for all using (auth.role() = 'authenticated');
```

Create an email/password user under Supabase Auth for admin access.

## Supabase Quick Checklist (when ready)
- Create project and copy `SUPABASE_URL`, `SUPABASE_ANON_KEY` to `.env.local`.
- Run the SQL above; confirm RLS policies exist.
- In Auth settings, disable public signups (or require invites).
- Create your admin user (email/password) in Auth Users.
- (Optional hardened RLS) Create `admins(user_id uuid primary key)` and policy to allow writes only for allowlisted `auth.uid()`.
- Redeploy with envs set. Log in via Admin panel using your email/password.

## Serverless AI (optional, recommended for prod)
- Create a tiny serverless function host (Cloudflare Workers, Netlify Functions, or Vercel Functions).
- Expose POST `/generateProductInfo` and `/suggestNewProducts` that call Gemini with your server key.
- Set `SERVERLESS_AI` in env to the base URL (e.g., `https://your-worker.example.com`).
- The app will use the serverless endpoint when set, otherwise it falls back to direct browser calls (dev only).

## Amazon Associates
- Set your tags in `.env.local`:
  - `AMAZON_TAG_US=yourtag-20`
  - `AMAZON_TAG_UK=yourtag-21`
- Product pages show US and UK buttons; links auto-append your tag.

## Admin Command Palette & Automation
- Open Command Palette with Ctrl/Cmd + K.
- Core commands: Add Product, AI Chat, New Blog, New Comparison, Bulk AI Products, Get Ideas.
- Key elements include stable `data-testid` attributes for automation tools.

## API (future serverless spec)
CRUD endpoints (JSON):
- `POST /api/admin/products` {product}
- `PUT /api/admin/products/:id` {product}
- `DELETE /api/admin/products/:id`
- `POST /api/admin/blogs` {post}
- `POST /api/admin/comparisons` {doc}
Responses: `{ id, status: 'ok' }` or `{ code, message, details }` with 4xx/5xx.
Idempotency-Key header recommended for POST.
