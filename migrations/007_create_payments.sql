-- 007_create_payments.sql
-- Manual payment verification workflow: user submits proof, admin
-- approves/rejects. reviewed_by / rejection_reason / reviewed_at capture
-- the admin decision trail.

CREATE TABLE IF NOT EXISTS payments (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id             INTEGER NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    method              VARCHAR(20) NOT NULL CHECK (method IN ('easypaisa', 'bank_transfer')),
    reference_number    VARCHAR(150) NOT NULL,
    amount              NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    proof_path          VARCHAR(500),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason    TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
