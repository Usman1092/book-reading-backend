# Wisdom — Database Setup (Phase 3)

## 1. Create the database
```bash
createdb wisdom
# or, inside psql:
# CREATE DATABASE wisdom;
```

## 2. Configure environment
```bash
cp .env.example .env
# edit .env: set DB_USER, DB_PASSWORD, DB_NAME to match your local Postgres
```

## 3. Install dependencies
```bash
npm install
```

## 4. Run migrations
```bash
npm run migrate
```
This applies every `.sql` file in `migrations/` in order (001 → 011) and
records each as applied in a `schema_migrations` table, so re-running
`npm run migrate` later is safe — already-applied files are skipped.

## 5. Seed demo data
```bash
npm run seed
```
Creates:
- **Admin:** `admin@wisdom.local` / `AdminPass#123`
- **Demo user:** `reader@wisdom.local` / `UserPass#123`
- 5 categories, 4 demo books (public-domain titles)
- 1 subscription plan ("Wisdom Monthly") + an approved payment + active subscription for the demo user
- 1 active 20-day `book_access` grant (*The Art of War*) and 1 expired grant (*Meditations*) — so both access-control paths are testable immediately
- Sample reading progress (page 37 of *The Art of War*)

Or run both at once: `npm run db:setup`

**Note:** the seed script only inserts database rows. The `pdf_path` /
`cover_path` values are placeholders — drop real, public-domain PDF/cover
files at those relative paths under your `PDF_STORAGE_ROOT` before testing
the reader (Phase 7).

## Schema overview

```
roles ──< users ──< subscriptions >── subscription_plans
                 │                          │
                 ├──< payments ─────────────┘
                 ├──< book_access >── books >── categories
                 ├──< reading_progress >── books
                 ├──< password_reset_tokens
                 └──< activity_logs
```

All access-control decisions read from `book_access` and `subscriptions`
server-side — see `resolveAccess()` in the architecture notes (Phase 4+).
