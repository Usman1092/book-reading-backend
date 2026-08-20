# Wisdom — Reading & Access Control (Phase 7)

## The core rule
Every one of these endpoints calls `resolveAccess(userId, book)`
(`src/services/access.service.js`) — the **single** place access is
decided. Priority order:

1. An active, non-expired **admin-assigned `book_access` grant** → `full`
2. An active, non-expired **subscription** → `full`
3. Otherwise → `preview` (first 3 pages, or fewer if the book itself is shorter)

Anonymous visitors resolve to `preview` too — nothing here trusts a
frontend-supplied role, subscription flag, or page number.

## Endpoints (mounted under `/api/books/:id/...`)

| Method | Path | Auth | Behavior |
|---|---|---|---|
| GET | `/api/books/:id/access` | optional | Returns `{ accessLevel, allowedPages, expiresAt, message }` |
| GET | `/api/books/:id/pdf` | optional | Streams the PDF — **the actual bytes served differ by access level** |
| GET | `/api/books/:id/progress` | required | Last read page + percent for the current user |
| POST | `/api/books/:id/progress` | required | Body `{ page }` — updates progress, **rejected with 403 if `page` exceeds what this user is allowed** |

## How preview enforcement actually works (not just a frontend flag)

For `preview` access, the server never sends the original PDF. It builds
a **new, genuinely truncated PDF** containing only pages 1–3 (via
`pdf-lib`, in `pdfDelivery.service.js`), and that's the only file that
ever reaches the client. There is no page 4 in the bytes the browser
receives — a user inspecting network traffic or the PDF blob directly
still can't get past page 3. The truncated copy is cached on disk per
book (`storage/previews/<bookId>-3.pdf`) and regenerated automatically if
the book's PDF is replaced or the book is deleted.

For `full` access, the original stored PDF is streamed directly.

## 20-day expiry enforcement

There's no separate "is it expired" check to forget — `book_access.findActiveGrant()`
only returns a row where `end_date >= now()`. Once a grant's `end_date`
passes, the very next request simply falls through to the subscription
check and then to `preview` — expiry is enforced by the same query path
every time, not a background job that could fail to run.

## Reading progress

`percent` is always recomputed server-side from `last_page / page_count`
— never accepted as a client-sent value. A progress update is rejected
(`403`) if the requested page is beyond what `resolveAccess` currently
allows, using the exact UX messages from the spec:

- Preview limit hit: *"You've reached the free preview limit. Subscribe or get access to continue reading this book."*
- Expired access: *"Your access to this book has expired."*

## Smoke test
```bash
# Anonymous preview check
curl localhost:4000/api/books/1/access
# → { "accessLevel": "preview", "allowedPages": 3, ... }

# Anonymous preview PDF (genuinely only 3 pages)
curl localhost:4000/api/books/1/pdf -o preview.pdf

# As the demo user (has an active book_access grant on "The Art of War")
curl -c cookies.txt -X POST localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"reader@wisdom.local","password":"UserPass#123"}'
# copy the accessToken from the response, then:
curl localhost:4000/api/books/<art-of-war-id>/access -H "Authorization: Bearer <token>"
# → { "accessLevel": "full", ... }

# Try to record progress past what's allowed on a preview-only book
curl -X POST localhost:4000/api/books/2/progress \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"page": 50}'
# → 403 "You've reached the free preview limit..."
```

## Known limitation (documented per spec §10)
Browser-based PDF protection — disabling right-click/print/save in the
frontend reader — is a deterrent, not real DRM. A determined user can
always screenshot or use OS-level screen capture. What this backend
guarantees is that **unauthorized users never receive bytes beyond what
they're entitled to** in the first place; it does not and cannot prevent
someone from photographing their own screen.
