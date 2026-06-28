-- ═══════════════════════════════════════════════════════════
-- BB ENTERPRISE — MULTI-SIZE MIGRATION
-- ═══════════════════════════════════════════════════════════
-- Run this ONCE in Supabase SQL Editor after the original
-- database.sql, to add multi-size support to existing data.
--
-- Safe to re-run: every statement is idempotent.
-- ═══════════════════════════════════════════════════════════

-- 1. Add the new sizes array column (keeps `size` for backward compat)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sizes TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 2. Backfill: copy each existing scalar size into the new array
UPDATE products
SET sizes = ARRAY[size]
WHERE size IS NOT NULL
  AND (sizes IS NULL OR cardinality(sizes) = 0);

-- 3. Relax the legacy NOT NULL on `size` so future inserts can rely
--    only on `sizes`. The admin app still writes sizes[0] into `size`
--    so anything still reading p.size keeps working.
ALTER TABLE products
  ALTER COLUMN size DROP NOT NULL;
