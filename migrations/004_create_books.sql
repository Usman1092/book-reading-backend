-- 004_create_books.sql
-- pdf_path and cover_path store paths INSIDE the private storage root
-- (e.g. /var/wisdom-storage/books/<uuid>.pdf), never a web-accessible URL.
-- page_count is computed server-side at upload time (via pdf-lib) and is
-- the source of truth for preview/expiry page-boundary checks.

CREATE TABLE IF NOT EXISTS books (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    author          VARCHAR(255) NOT NULL,
    description     TEXT,
    category_id     INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    cover_path      VARCHAR(500),
    pdf_path        VARCHAR(500) NOT NULL,
    page_count      INTEGER NOT NULL CHECK (page_count > 0),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_books_category_id ON books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_is_active ON books(is_active);
CREATE INDEX IF NOT EXISTS idx_books_title ON books USING gin (to_tsvector('simple', title));
