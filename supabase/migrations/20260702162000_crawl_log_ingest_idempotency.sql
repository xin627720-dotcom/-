create table if not exists crawl_log_ingest_runs (
  id text primary key,
  source_id text references sources(id) on delete set null,
  source_name text,
  started_at timestamptz not null,
  batch_index integer,
  batch_count integer,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  result jsonb,
  expires_at timestamptz not null default (now() + interval '2 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crawl_log_ingest_runs_status_expires_at_idx
  on crawl_log_ingest_runs(status, expires_at);

create index if not exists crawl_log_ingest_runs_source_started_at_idx
  on crawl_log_ingest_runs(source_id, started_at desc);

drop trigger if exists crawl_log_ingest_runs_set_updated_at on crawl_log_ingest_runs;
create trigger crawl_log_ingest_runs_set_updated_at
before update on crawl_log_ingest_runs
for each row execute function set_updated_at();

alter table crawl_log_ingest_runs enable row level security;

revoke all on table crawl_log_ingest_runs from anon, authenticated, public;
grant select, insert, update, delete on table crawl_log_ingest_runs to service_role;
