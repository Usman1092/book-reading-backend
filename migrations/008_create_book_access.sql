-- 008_create_book_access.sql
-- Admin-assigned, book-specific, time-limited access. end_date is always
-- computed server-side (start_date + duration_days) — never trust a
-- client-supplied expiry. A row is the single source of truth checked by
-- resolveAccess() on every protected-page request.

CREATE TABLE IF NOT EXISTS book_access (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    granted_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    start_date  TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date    TIMESTAMPTZ NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'revoked', 'expired')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_access_user_book ON book_access(user_id, book_id, status);
CREATE INDEX IF NOT EXISTS idx_book_access_end_date ON book_access(end_date);
