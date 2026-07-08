create table if not exists api_transit_stations (
  id text primary key,
  slug text not null unique,
  name text not null,
  website_url text not null,
  api_base_url text,
  pricing_url text,
  status text not null default 'unknown' check (status in ('active', 'limited', 'unavailable', 'unknown')),
  source_type text not null default 'manual_collected' check (source_type in ('manual_collected', 'user_submitted', 'merchant_submitted')),
  commercial_relation text not null default 'unknown' check (commercial_relation in ('none', 'listed', 'partner', 'affiliate', 'sponsored', 'unknown')),
  summary text not null default '',
  channel_types text[] not null default '{}'::text[],
  account_pools text[] not null default '{}'::text[],
  payment_methods text[] not null default '{}'::text[],
  minimum_top_up text,
  balance_expiry text,
  support_channels text[] not null default '{}'::text[],
  refund_policy text,
  risk_labels text[] not null default '{}'::text[],
  usage_advice text not null default 'pending' check (usage_advice in ('try_small', 'cautious', 'not_recommended', 'pending')),
  data_status text not null default 'pending_review' check (data_status in ('sample', 'pending_review', 'verified')),
  availability_seven_day_rate numeric,
  availability_seven_day_samples integer not null default 0,
  availability_last_checked_at timestamptz,
  availability_note text,
  feedback_pending_count integer not null default 0,
  feedback_verified_risk_count integer not null default 0,
  feedback_merchant_responded_count integer not null default 0,
  feedback_main_themes text[] not null default '{}'::text[],
  feedback_public_notes text,
  collector_kind text not null default 'manual_review',
  pricing_endpoint_url text,
  collection_status text not null default 'pending' check (collection_status in ('pending', 'success', 'partial', 'failed', 'manual_review')),
  collection_error text,
  last_collected_at timestamptz,
  last_updated_at timestamptz not null default now(),
  published boolean not null default false,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists api_transit_offers (
  id text primary key,
  station_id text not null references api_transit_stations(id) on delete cascade,
  family text not null check (family in ('claude', 'gpt')),
  standard_model text not null,
  raw_model_name text not null,
  group_name text not null,
  recharge_ratio text,
  model_multiplier numeric,
  input_price numeric,
  output_price numeric,
  cache_read_price numeric,
  cache_write_price numeric,
  currency text not null default 'CNY',
  account_pool text not null default 'undisclosed',
  channel_type text not null default 'undisclosed',
  price_source text not null default '公开价格页',
  source_url text,
  availability_seven_day_rate numeric,
  availability_seven_day_samples integer not null default 0,
  availability_last_checked_at timestamptz,
  availability_note text,
  last_verified_at timestamptz,
  status text not null default 'needs_review' check (status in ('active', 'needs_review', 'inactive')),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (station_id, standard_model, group_name)
);

create table if not exists api_transit_submissions (
  id text primary key,
  submission_type text not null default 'user' check (submission_type in ('user', 'merchant')),
  submitted_url text not null,
  submitted_name text,
  api_base_url text,
  pricing_url text,
  contact text,
  notes text,
  submitted_models text[] not null default '{}'::text[],
  submitted_meta jsonb not null default '{}'::jsonb,
  parse_status text not null default 'pending' check (parse_status in ('pending', 'parsed', 'failed')),
  probe_status text not null default 'pending' check (probe_status in ('pending', 'public_pricing_found', 'needs_login', 'failed')),
  review_status text not null default 'pending' check (review_status in ('pending', 'collector_todo', 'approved', 'rejected')),
  station_id text references api_transit_stations(id) on delete set null,
  admin_note text,
  submitter_ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists api_transit_detection_runs (
  id text primary key,
  station_id text references api_transit_stations(id) on delete cascade,
  run_type text not null default 'public_pricing' check (run_type in ('public_pricing', 'model_list', 'api_probe', 'manual_review')),
  status text not null check (status in ('success', 'partial', 'failed')),
  model_count integer not null default 0,
  offer_count integer not null default 0,
  error_message text,
  source_url text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  raw_snapshot jsonb not null default '{}'::jsonb,
  logs jsonb not null default '{}'::jsonb
);

create table if not exists api_transit_feedback (
  id text primary key,
  station_id text references api_transit_stations(id) on delete set null,
  station_name text,
  station_url text,
  feedback_type text not null default 'general' check (feedback_type in ('general', 'price_change', 'unavailable', 'risk', 'merchant_response')),
  message text not null,
  evidence_urls jsonb not null default '[]'::jsonb,
  contact text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'rejected')),
  reviewer_note text,
  submitter_ip text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists api_transit_stations_published_idx on api_transit_stations(published, updated_at desc);
create index if not exists api_transit_stations_status_idx on api_transit_stations(status);
create index if not exists api_transit_stations_collector_kind_idx on api_transit_stations(collector_kind);
create index if not exists api_transit_offers_station_id_idx on api_transit_offers(station_id);
create index if not exists api_transit_offers_family_idx on api_transit_offers(family);
create index if not exists api_transit_offers_status_idx on api_transit_offers(status);
create index if not exists api_transit_submissions_review_status_idx on api_transit_submissions(review_status, created_at desc);
create index if not exists api_transit_submissions_submitted_url_idx on api_transit_submissions(submitted_url);
create index if not exists api_transit_detection_runs_started_at_idx on api_transit_detection_runs(started_at desc);
create index if not exists api_transit_detection_runs_station_id_idx on api_transit_detection_runs(station_id);
create index if not exists api_transit_feedback_status_idx on api_transit_feedback(status, created_at desc);

drop trigger if exists api_transit_stations_set_updated_at on api_transit_stations;
create trigger api_transit_stations_set_updated_at
before update on api_transit_stations
for each row execute function set_updated_at();

drop trigger if exists api_transit_offers_set_updated_at on api_transit_offers;
create trigger api_transit_offers_set_updated_at
before update on api_transit_offers
for each row execute function set_updated_at();

drop trigger if exists api_transit_submissions_set_updated_at on api_transit_submissions;
create trigger api_transit_submissions_set_updated_at
before update on api_transit_submissions
for each row execute function set_updated_at();

alter table api_transit_stations enable row level security;
alter table api_transit_offers enable row level security;
alter table api_transit_submissions enable row level security;
alter table api_transit_detection_runs enable row level security;
alter table api_transit_feedback enable row level security;
