alter table offer_feedback
  add column if not exists offer_price numeric,
  add column if not exists offer_currency text,
  add column if not exists offer_status text,
  add column if not exists offer_captured_at timestamptz,
  add column if not exists offer_source_updated_at timestamptz,
  add column if not exists offer_last_seen_at timestamptz;
