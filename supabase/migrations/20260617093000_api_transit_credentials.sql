create table if not exists api_transit_credentials (
  id text primary key,
  submission_id text not null references api_transit_submissions(id) on delete cascade,
  station_id text references api_transit_stations(id) on delete set null,
  credential_type text not null check (credential_type in ('test_key', 'test_account')),
  status text not null default 'submitted' check (status in ('submitted', 'ready', 'failed', 'revoked', 'deleted')),
  encrypted_payload jsonb not null,
  credential_meta jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  last_used_at timestamptz,
  failure_message text,
  submitter_ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, credential_type)
);

create index if not exists api_transit_credentials_submission_id_idx on api_transit_credentials(submission_id);
create index if not exists api_transit_credentials_status_idx on api_transit_credentials(status, created_at desc);

drop trigger if exists api_transit_credentials_set_updated_at on api_transit_credentials;
create trigger api_transit_credentials_set_updated_at
before update on api_transit_credentials
for each row execute function set_updated_at();

alter table api_transit_credentials enable row level security;
