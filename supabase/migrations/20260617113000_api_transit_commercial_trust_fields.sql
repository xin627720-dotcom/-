alter table api_transit_stations
  add column if not exists monitor_url text,
  add column if not exists strengths text[] not null default '{}'::text[],
  add column if not exists cautions text[] not null default '{}'::text[],
  add column if not exists commercial_offers jsonb not null default '[]'::jsonb,
  add column if not exists verification_events jsonb not null default '[]'::jsonb;

create index if not exists api_transit_stations_commercial_offers_idx
  on api_transit_stations using gin (commercial_offers);

create index if not exists api_transit_stations_verification_events_idx
  on api_transit_stations using gin (verification_events);
