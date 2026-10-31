# ONU Manager

Internal tool for managing GPON ONU stock, installations, staff, and complaints — built for field Staff and back-office Office/Admin roles.

## Stack

- Next.js 16 (App Router, TypeScript)
- Postgres + Prisma (works with Vercel Postgres, Neon, Supabase, etc.)
- NextAuth v5 (credentials + JWT sessions, role-based: `STAFF` / `OFFICE` / `ADMIN`)
- Vercel Blob (ONU label photo storage)
- Tesseract.js (client-side OCR — reads company name, MAC address, serial number off the ONU label)
- Tailwind CSS

## Local setup

1. `npm install`
2. Create a Postgres database (Vercel Postgres, Neon, or local) and set `DATABASE_URL` in `.env`.
3. Set `AUTH_SECRET` in `.env` (generate with `npx auth secret`).
4. Run migrations: `npx prisma migrate dev --name init`
5. Seed the first admin user:
   ```
   SEED_ADMIN_EMAIL=you@company.com SEED_ADMIN_PASSWORD=yourpassword npm run seed
   ```
6. `npm run dev` and log in at `/login`.

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add a Postgres database via the Vercel Storage tab (or connect Neon/Supabase) — this sets `DATABASE_URL` automatically.
3. Add a Blob store via Storage tab — this sets `BLOB_READ_WRITE_TOKEN` automatically.
4. Set `AUTH_SECRET` and `NEXTAUTH_URL` (your production URL) in Project Settings → Environment Variables.
5. Run `npx prisma migrate deploy` against the production database (via Vercel CLI or a one-off script), then run the seed script to create the first admin.
6. Deploy.

## Roles

- **Staff**: scans/photographs an ONU label, OCR extracts company + MAC + serial, matches it against available stock, cross-verifies, and records an installation (with customer details) or reports a fault.
- **Office**: adds new ONU stock (via OCR or manually), manages users, views all stock/installations/complaints, and sees the full activity log.
- **Admin**: everything Office can do, plus creating/editing user accounts, assigning roles, and setting assigned IPs.

## Notes

- OCR runs entirely in the browser (no external API calls, no per-scan cost) and is a best-effort guess — staff/office always confirm or correct the fields before submitting.
- `public/icons/icon-192.png` and `icon-512.png` are placeholder solid-color icons; swap them for real branding before shipping as an installable PWA.
