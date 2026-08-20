-- 005_create_subscription_plans.sql
-- Only one active plan for v1, but the table is fully relational so adding
-- a second plan later is just an INSERT — no schema change required.

CREATE TABLE IF NOT EXISTS subscription_plans (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    duration_days   INTEGER NOT NULL CHECK (duration_days > 0),
    benefits        TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
