create table if not exists collector_heartbeats (
  node_id text primary key,
  node_name text not null,
  node_type text,
  runtime text,
  region text,
  scope text,
  status text not null default 'unknown' check (status in ('running', 'success', 'partial', 'failed', 'idle', 'unknown')),
  started_at timestamptz,
  finished_at timestamptz,
  last_seen_at timestamptz not null default now(),
  success_count integer not null default 0,
  failure_count integer not null default 0,
  skipped_count integer not null default 0,
  offer_count integer not null default 0,
  message text,
  details jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists collector_heartbeats_last_seen_at_idx
on collector_heartbeats(last_seen_at desc);

create index if not exists collector_heartbeats_status_last_seen_at_idx
on collector_heartbeats(status, last_seen_at desc);

drop trigger if exists collector_heartbeats_set_updated_at on collector_heartbeats;
create trigger collector_heartbeats_set_updated_at
before update on collector_heartbeats
for each row execute function set_updated_at();

alter table collector_heartbeats enable row level security;
