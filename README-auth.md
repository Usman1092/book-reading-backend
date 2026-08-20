# Wisdom — Authentication (Phase 4)

## Install & run
```bash
npm install
cp .env.example .env   # fill in DB + JWT secrets
npm run db:setup       # if not already done in Phase 3
npm run dev
```
API listens on `http://localhost:4000` by default.

> This sandbox has no network access, so these dependencies haven't been
> installed/executed here — run `npm install` and the smoke-test curls
> below in your own environment to verify end-to-end.

## How auth works

- **Access token** — short-lived (15 min) JWT, returned in the JSON body
  on login/refresh. Client stores it in memory (not localStorage, to
  reduce XSS exposure) and sends it as `Authorization: Bearer <token>`.
- **Refresh token** — 7-day JWT stored in an **httpOnly, `SameSite=Strict`,
  `secure` (in prod)** cookie, scoped to `/api/auth` only. Never readable
  by client-side JS. `POST /api/auth/refresh` reads it to mint a new
  access token when the old one expires.
- **Password reset tokens** — random 32-byte value, only the SHA-256 hash
  is stored server-side (mirrors password hashing), 30-minute expiry,
  single-use (`used_at`).
- **Role-based authorization** — `requireAuth` verifies the JWT and sets
  `req.user`; `requireRole('admin')` then checks `req.user.role`, which
  came from the verified token, never from anything the client sent
  directly in the request body/query.

## Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | none | rate-limited |
| POST | `/api/auth/login` | none | rate-limited, sets refresh cookie |
| POST | `/api/auth/refresh` | refresh cookie | issues a new access token |
| POST | `/api/auth/logout` | none | clears refresh cookie |
| POST | `/api/auth/forgot-password` | none | rate-limited, always returns the same message |
| POST | `/api/auth/reset-password` | none | rate-limited, consumes the reset token |
| GET | `/api/auth/me` | Bearer access token | returns the current user |

## Smoke test (curl)

```bash
# Register
curl -X POST localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Passw0rd!"}'

# Login (save the cookie jar to carry the refresh cookie forward)
curl -c cookies.txt -X POST localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Passw0rd!"}'
# → { "accessToken": "...", "user": {...} }

# Call a protected route
curl localhost:4000/api/auth/me -H "Authorization: Bearer <accessToken>"

# Refresh once the access token expires
curl -b cookies.txt -X POST localhost:4000/api/auth/refresh

# Forgot password (with SMTP_HOST unset, the reset link is printed to
# the server console instead of emailed)
curl -X POST localhost:4000/api/auth/forgot-password \
  -H "Content-Type: application/json" -d '{"email":"test@example.com"}'

# Reset password using the token printed to the console
curl -X POST localhost:4000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"<token-from-console>","password":"NewPassw0rd!"}'
```

## Using demo seed accounts
```bash
curl -c cookies.txt -X POST localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@wisdom.local","password":"AdminPass#123"}'
```

## Protecting future routes
```js
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.get('/admin/some-report', requireAuth, requireRole('admin'), handler);
```
