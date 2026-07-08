alter table app_runtime_settings
  add column if not exists settings jsonb not null default '{}'::jsonb;
