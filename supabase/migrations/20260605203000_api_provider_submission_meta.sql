alter table api_provider_submissions
  add column if not exists submitted_contact text,
  add column if not exists provider_id text references api_providers(id) on delete set null,
  add column if not exists parsed_meta jsonb not null default '{}'::jsonb;

create index if not exists api_provider_submissions_review_status_idx
  on api_provider_submissions(review_status);

create index if not exists api_provider_submissions_created_at_idx
  on api_provider_submissions(created_at desc);
