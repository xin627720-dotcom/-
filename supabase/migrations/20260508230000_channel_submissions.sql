create table if not exists channel_submissions (
  id text primary key,
  url text not null,
  name text,
  contact text,
  notes text,
  parsed_title text,
  parsed_meta jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  reviewer_note text,
  approved_source_id text references sources(id) on delete set null,
  submitter_ip text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists channel_submissions_status_idx on channel_submissions(status);
create index if not exists channel_submissions_created_at_idx on channel_submissions(created_at desc);
create index if not exists channel_submissions_url_idx on channel_submissions(url);

alter table channel_submissions enable row level security;
