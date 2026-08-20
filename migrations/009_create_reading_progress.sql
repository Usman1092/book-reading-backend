-- 009_create_reading_progress.sql
-- One row per (user, book) — "continue reading from page N".
-- percent is a derived convenience value (last_page / books.page_count),
-- recomputed on every progress update rather than trusted from the client.

CREATE TABLE IF NOT EXISTS reading_progress (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    last_page   INTEGER NOT NULL DEFAULT 1 CHECK (last_page > 0),
    percent     NUMERIC(5,2) NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON reading_progress(user_id);
