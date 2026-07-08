create table if not exists public_api_snapshots (
  kind text not null,
  cache_key text not null,
  schema_version integer not null default 1,
  payload jsonb not null,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (kind, cache_key)
);

create index if not exists public_api_snapshots_updated_at_idx
  on public_api_snapshots(updated_at desc);

alter table public_api_snapshots enable row level security;

revoke all on table public_api_snapshots from anon, public;
grant select, insert, update, delete on table public_api_snapshots to service_role;
