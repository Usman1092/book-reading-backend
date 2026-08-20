# Wisdom — Admin Panel Backend (Phase 5)

All `/api/admin/*` routes require `requireAuth` + `requireRole('admin')`,
enforced once at the router level (`admin.routes.js`) rather than
repeated per-route.

## Dashboard
`GET /api/admin/dashboard` →
```json
{
  "totalUsers": 3, "totalBooks": 4, "totalCategories": 5,
  "activeSubscriptions": 1, "pendingPayments": 1,
  "activeAssignments": 1, "expiredAssignments": 1
}
```
`expiredAssignments` deliberately counts rows still marked `status='active'`
whose `end_date` has passed — i.e. grants that *would* be rejected on the
next read but haven't been formally flipped to `'expired'` yet. This gives
an accurate "needs attention" count regardless of whether a cleanup job
has run.

## User management
| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/users?search=&page=&pageSize=` | paginated, searches name/email |
| GET | `/api/admin/users/:id` | includes assigned books, active subscription, reading progress |
| PUT | `/api/admin/users/:id/active` | body `{ isActive }` |

## Book assignment (20-day access grants)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/book-access?status=` | filter by `active`/`revoked`/`expired` |
| POST | `/api/admin/book-access` | body `{ userId, bookId, durationDays? }` — defaults to 20 days; `end_date` always computed server-side |
| PUT | `/api/admin/book-access/:id/revoke` | immediately blocks access regardless of remaining days |
| PUT | `/api/admin/book-access/:id/renew` | resets `start_date` to now, extends `end_date` |

## Subscription plans (`/api/subscription-plans`)
| Method | Path | Auth |
|---|---|---|
| GET | `/` | public — active plans only, for the Subscription Plans page |
| GET | `/admin` | admin — all plans including inactive |
| POST | `/` | admin — `{ name, price, durationDays, benefits }` |
| PUT | `/:id` | admin — partial update |

## Payments (`/api/payments`) — manual verification workflow
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/` | user | `multipart/form-data`: `planId`, `method` (`easypaisa`\|`bank_transfer`), `referenceNumber`, `amount`, optional file field `proof` |
| GET | `/mine` | user | the current user's own payment history |
| GET | `/` | admin | `?status=pending` etc. |
| GET | `/:id/proof` | admin | streams the uploaded proof file (never publicly accessible) |
| PUT | `/:id/approve` | admin | **transactional**: flips payment → `approved` AND creates the subscription in one DB transaction — never one without the other |
| PUT | `/:id/reject` | admin | body `{ reason }` |

Approving twice, or approving an already-rejected payment, is rejected
with 400 — the approve/reject handlers lock the row (`SELECT ... FOR
UPDATE`) and check `status = 'pending'` before acting.

## Seed data for testing this phase
```bash
npm run seed
```
adds a third demo account with a payment already sitting in `pending`:
- **`pending@wisdom.local`** / `UserPass#123` — has one `bank_transfer`
  payment awaiting review, so `GET /api/admin/payments?status=pending`
  has something to show immediately.

## Smoke test
```bash
# Login as admin (see README-auth.md), then:
curl localhost:4000/api/admin/dashboard -H "Authorization: Bearer <token>"

curl -X POST localhost:4000/api/admin/book-access \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"userId": 2, "bookId": 3, "durationDays": 20}'

curl localhost:4000/api/payments -H "Authorization: Bearer <token>"
curl -X PUT localhost:4000/api/payments/2/approve -H "Authorization: Bearer <token>"
```
