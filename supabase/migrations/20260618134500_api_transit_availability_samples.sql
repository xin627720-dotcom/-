create table if not exists api_transit_availability_samples (
  id text primary key,
  run_id text not null references api_transit_detection_runs(id) on delete cascade,
  station_id text not null references api_transit_stations(id) on delete cascade,
  scope text not null check (scope in ('station', 'offer')),
  standard_model text,
  group_name text,
  ok boolean not null,
  checked_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists api_transit_availability_samples_station_time_idx
  on api_transit_availability_samples(station_id, checked_at desc);

create index if not exists api_transit_availability_samples_offer_time_idx
  on api_transit_availability_samples(station_id, scope, standard_model, group_name, checked_at desc);

alter table api_transit_availability_samples enable row level security;

revoke all on table api_transit_availability_samples from anon, public;
