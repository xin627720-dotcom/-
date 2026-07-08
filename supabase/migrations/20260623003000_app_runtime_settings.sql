create table if not exists app_runtime_settings (
  id text primary key,
  provider text not null default 'opencode',
  base_url text not null,
  model text not null,
  timeout_ms integer not null default 12000 check (timeout_ms between 3000 and 60000),
  encrypted_api_key jsonb,
  api_key_hint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists app_runtime_settings_set_updated_at on app_runtime_settings;
create trigger app_runtime_settings_set_updated_at
before update on app_runtime_settings
for each row execute function set_updated_at();

alter table app_runtime_settings enable row level security;
