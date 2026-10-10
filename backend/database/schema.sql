-- Supabase Schema: Correction Memory Table
-- Stores human-verified manufacturer and brand overrides for high-precision learning

CREATE TABLE IF NOT EXISTS correction_memory (
    id BIGSERIAL PRIMARY KEY,
    raw_token TEXT NOT NULL UNIQUE,
    resolved_manufacturer TEXT NOT NULL,
    resolved_brand TEXT NOT NULL,
    verified_by TEXT DEFAULT 'admin',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_correction_memory_token ON correction_memory (raw_token);
