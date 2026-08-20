# Wisdom — Book & Category Management (Phase 6)

## Install
```bash
npm install   # adds multer + pdf-lib on top of Phase 3/4 deps
```

## Storage layout
Set `PDF_STORAGE_ROOT` in `.env` to an absolute path **outside** any
directory your web server serves directly (e.g. `/var/wisdom-storage`).
On startup the app creates:
```
<PDF_STORAGE_ROOT>/books/    ← PDFs. Never served statically. Filenames are
                                server-generated UUIDs; the original
                                uploaded filename is discarded.
<PDF_STORAGE_ROOT>/covers/   ← Cover images. Served read-only at /covers/<file>
                                via express.static — not sensitive.
```

## Endpoints

### Categories (`/api/categories`)
| Method | Path | Auth |
|---|---|---|
| GET | `/` | public — list all, with active book counts |
| GET | `/:id` | public |
| POST | `/` | admin — `{ name }`, slug auto-generated |
| PUT | `/:id` | admin |
| DELETE | `/:id` | admin |

### Books (`/api/books`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | public | query: `search`, `categoryId`, `sort` (`newest`\|`oldest`\|`title_asc`\|`title_desc`), `page`, `pageSize` (max 50) — only `is_active = true` books, `pdf_path` never included |
| GET | `/:id` | public | 404 if inactive |
| POST | `/` | admin | `multipart/form-data`: `title`, `author`, `description`, `categoryId`, file fields `pdf` (required) + `cover` (optional) |
| PUT | `/:id` | admin | same fields, all optional; replacing `pdf` recomputes `page_count` and deletes the old file |
| DELETE | `/:id` | admin | also deletes the PDF and cover files from disk |

## Validation & security
- PDF uploads are rejected unless `mimetype === 'application/pdf'` (50MB limit); cover uploads must be JPEG/PNG/WebP (5MB limit).
- `page_count` is **always** computed server-side from the actual uploaded file via `pdf-lib` — a client can't submit a fake page count.
- Uploaded files are written directly under `PDF_STORAGE_ROOT` with a UUID filename; the client's original filename is never used for storage.
- All write endpoints require `requireAuth` + `requireRole('admin')`.

## Smoke test (curl)
```bash
# Login as admin first (see README-auth.md) to get an accessToken.

# Create a category
curl -X POST localhost:4000/api/categories \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"name":"Fiction"}'

# Upload a book
curl -X POST localhost:4000/api/books \
  -H "Authorization: Bearer <token>" \
  -F "title=Pride and Prejudice" \
  -F "author=Jane Austen" \
  -F "description=A classic." \
  -F "categoryId=1" \
  -F "pdf=@./pride-and-prejudice.pdf" \
  -F "cover=@./cover.jpg"

# Browse/search
curl "localhost:4000/api/books?search=pride&sort=title_asc"
```

Next phase (7) adds the authenticated PDF page-streaming endpoint that
actually enforces the 3-page free preview and 20-day access rules against
these uploaded files.
