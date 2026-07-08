create table if not exists offer_feedback (
  id text primary key,
  product_id text,
  product_slug text,
  product_name text,
  offer_id text references raw_offers(id) on delete set null,
  source_id text references sources(id) on delete set null,
  source_name text,
  source_title text,
  offer_url text,
  reason text not null,
  notes text,
  contact text,
  status text not null default 'pending',
  reviewer_note text,
  submitter_ip text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists offer_feedback_status_idx on offer_feedback(status);
create index if not exists offer_feedback_created_at_idx on offer_feedback(created_at desc);
create index if not exists offer_feedback_offer_id_idx on offer_feedback(offer_id);
create index if not exists offer_feedback_source_id_idx on offer_feedback(source_id);

alter table offer_feedback enable row level security;
