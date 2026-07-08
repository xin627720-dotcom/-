create extension if not exists pgcrypto;

create table if not exists official_subscription_apps (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  provider text not null,
  app_store_id text not null,
  app_store_slug text not null,
  logo_key text,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists official_subscription_regions (
  id uuid primary key default gen_random_uuid(),
  country_code text not null unique,
  storefront_code text not null,
  country_label text not null,
  currency_code text not null,
  enabled boolean not null default true,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists official_subscription_plans (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references official_subscription_apps(id) on delete cascade,
  slug text not null,
  label text not null,
  billing_period text not null check (billing_period in ('monthly', 'annual', 'one_time')),
  notes text,
  aliases text[] not null default '{}'::text[],
  match_rules jsonb not null default '{}'::jsonb,
  canonical_product_id text references canonical_products(id) on delete set null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (app_id, slug)
);

create table if not exists official_subscription_collect_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null default 'manual' check (mode in ('manual', 'cron', 'worker')),
  target_app_slug text,
  target_region_codes text[],
  status text not null check (status in ('success', 'partial_success', 'failed')),
  success_count integer not null default 0,
  failure_count integer not null default 0,
  unmatched_count integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz not null default now(),
  logs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists official_subscription_region_prices (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references official_subscription_apps(id) on delete cascade,
  plan_id uuid not null references official_subscription_plans(id) on delete cascade,
  region_id uuid not null references official_subscription_regions(id) on delete cascade,
  price_text text,
  price_value numeric,
  currency_code text,
  cny_price numeric,
  fx_rate_to_cny numeric,
  fx_date date,
  source_url text not null,
  evidence_source text not null default 'app_store_html' check (evidence_source in ('app_store_html', 'amp_catalog', 'manual_verified')),
  status text not null check (status in ('available', 'stale', 'missing', 'parse_failed', 'needs_review')),
  raw_title text,
  raw_snippet_hash text,
  last_success_at timestamptz,
  last_checked_at timestamptz not null default now(),
  failure_reason text,
  updated_at timestamptz not null default now(),
  unique (app_id, plan_id, region_id)
);

create table if not exists official_subscription_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references official_subscription_collect_runs(id) on delete set null,
  app_id uuid not null references official_subscription_apps(id) on delete cascade,
  plan_id uuid not null references official_subscription_plans(id) on delete cascade,
  region_id uuid not null references official_subscription_regions(id) on delete cascade,
  price_text text,
  price_value numeric,
  currency_code text,
  cny_price numeric,
  fx_rate_to_cny numeric,
  fx_date date,
  source_url text not null,
  evidence_source text not null default 'app_store_html' check (evidence_source in ('app_store_html', 'amp_catalog', 'manual_verified')),
  raw_title text,
  raw_snippet_hash text,
  fetched_at timestamptz not null,
  status text not null check (status in ('available', 'stale', 'missing', 'parse_failed', 'needs_review')),
  failure_reason text,
  created_at timestamptz not null default now()
);

create table if not exists fx_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null,
  target_currency text not null,
  rate numeric not null,
  date date not null,
  source text not null,
  fetched_at timestamptz not null default now(),
  unique (base_currency, target_currency, date, source)
);

create index if not exists official_subscription_apps_enabled_sort_idx
  on official_subscription_apps(enabled, sort_order);
create index if not exists official_subscription_plans_app_sort_idx
  on official_subscription_plans(app_id, enabled, sort_order);
create index if not exists official_subscription_regions_enabled_priority_idx
  on official_subscription_regions(enabled, priority);
create index if not exists official_subscription_region_prices_status_idx
  on official_subscription_region_prices(status, updated_at desc);
create index if not exists official_subscription_region_prices_plan_idx
  on official_subscription_region_prices(plan_id, status, cny_price);
create index if not exists official_subscription_price_snapshots_run_idx
  on official_subscription_price_snapshots(run_id, created_at desc);
create index if not exists official_subscription_collect_runs_finished_idx
  on official_subscription_collect_runs(finished_at desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists official_subscription_apps_set_updated_at on official_subscription_apps;
create trigger official_subscription_apps_set_updated_at
before update on official_subscription_apps
for each row execute function set_updated_at();

drop trigger if exists official_subscription_regions_set_updated_at on official_subscription_regions;
create trigger official_subscription_regions_set_updated_at
before update on official_subscription_regions
for each row execute function set_updated_at();

drop trigger if exists official_subscription_plans_set_updated_at on official_subscription_plans;
create trigger official_subscription_plans_set_updated_at
before update on official_subscription_plans
for each row execute function set_updated_at();

drop trigger if exists official_subscription_region_prices_set_updated_at on official_subscription_region_prices;
create trigger official_subscription_region_prices_set_updated_at
before update on official_subscription_region_prices
for each row execute function set_updated_at();

alter table official_subscription_apps enable row level security;
alter table official_subscription_regions enable row level security;
alter table official_subscription_plans enable row level security;
alter table official_subscription_collect_runs enable row level security;
alter table official_subscription_region_prices enable row level security;
alter table official_subscription_price_snapshots enable row level security;
alter table fx_rates enable row level security;
