create table if not exists api_transit_multiplier_history (
  id text primary key,
  station_id text not null references api_transit_stations(id) on delete cascade,
  offer_id text references api_transit_offers(id) on delete set null,
  family text not null check (family in ('claude', 'gpt')),
  standard_model text not null,
  group_name text not null,
  recharge_ratio text,
  recharge_coefficient numeric,
  model_multiplier numeric,
  combined_rate numeric,
  input_price numeric,
  output_price numeric,
  cache_read_price numeric,
  cache_write_price numeric,
  price_source text,
  source_url text,
  status text,
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists api_transit_multiplier_history_station_time_idx
  on api_transit_multiplier_history(station_id, observed_at desc);

create index if not exists api_transit_multiplier_history_group_time_idx
  on api_transit_multiplier_history(station_id, family, group_name, observed_at desc);

alter table api_transit_multiplier_history enable row level security;

revoke all on table api_transit_multiplier_history from anon, public;

create or replace function api_transit_recharge_coefficient(value text)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
declare
  parts text[];
  base numeric;
  quota numeric;
begin
  if value is null or btrim(value) = '' then
    return null;
  end if;

  parts := regexp_match(value, '([0-9]+(?:\.[0-9]+)?)\s*:\s*([0-9]+(?:\.[0-9]+)?)');
  if parts is null then
    return null;
  end if;

  base := parts[1]::numeric;
  quota := parts[2]::numeric;
  if base <= 0 or quota <= 0 then
    return null;
  end if;

  return base / quota;
end;
$$;

create or replace function api_transit_multiplier_history_id(
  p_offer_id text,
  p_station_id text,
  p_standard_model text,
  p_group_name text,
  p_observed_at timestamptz
)
returns text
language sql
immutable
set search_path = public
as $$
  select md5(
    coalesce(p_offer_id, '') || '|' ||
    coalesce(p_station_id, '') || '|' ||
    coalesce(p_standard_model, '') || '|' ||
    coalesce(p_group_name, '') || '|' ||
    coalesce(p_observed_at::text, '')
  )
$$;

create or replace function record_api_transit_multiplier_history()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  observed_at timestamptz := now();
  coefficient numeric := api_transit_recharge_coefficient(new.recharge_ratio);
  combined numeric;
begin
  if new.model_multiplier is null or new.status <> 'active' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status is not distinct from new.status
      and old.recharge_ratio is not distinct from new.recharge_ratio
      and old.model_multiplier is not distinct from new.model_multiplier
      and old.input_price is not distinct from new.input_price
      and old.output_price is not distinct from new.output_price
      and old.cache_read_price is not distinct from new.cache_read_price
      and old.cache_write_price is not distinct from new.cache_write_price
      and old.price_source is not distinct from new.price_source
      and old.source_url is not distinct from new.source_url
    then
      return new;
    end if;
  end if;

  if coefficient is not null then
    combined := coefficient * new.model_multiplier;
  else
    combined := new.model_multiplier;
  end if;

  insert into api_transit_multiplier_history (
    id,
    station_id,
    offer_id,
    family,
    standard_model,
    group_name,
    recharge_ratio,
    recharge_coefficient,
    model_multiplier,
    combined_rate,
    input_price,
    output_price,
    cache_read_price,
    cache_write_price,
    price_source,
    source_url,
    status,
    observed_at
  )
  values (
    api_transit_multiplier_history_id(new.id, new.station_id, new.standard_model, new.group_name, observed_at),
    new.station_id,
    new.id,
    new.family,
    new.standard_model,
    new.group_name,
    new.recharge_ratio,
    coefficient,
    new.model_multiplier,
    combined,
    new.input_price,
    new.output_price,
    new.cache_read_price,
    new.cache_write_price,
    new.price_source,
    new.source_url,
    new.status,
    observed_at
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

insert into api_transit_multiplier_history (
  id,
  station_id,
  offer_id,
  family,
  standard_model,
  group_name,
  recharge_ratio,
  recharge_coefficient,
  model_multiplier,
  combined_rate,
  input_price,
  output_price,
  cache_read_price,
  cache_write_price,
  price_source,
  source_url,
  status,
  observed_at,
  created_at
)
select
  api_transit_multiplier_history_id(
    id,
    station_id,
    standard_model,
    group_name,
    coalesce(last_verified_at, updated_at, created_at, now())
  ),
  station_id,
  id,
  family,
  standard_model,
  group_name,
  recharge_ratio,
  api_transit_recharge_coefficient(recharge_ratio),
  model_multiplier,
  coalesce(api_transit_recharge_coefficient(recharge_ratio), 1) * model_multiplier,
  input_price,
  output_price,
  cache_read_price,
  cache_write_price,
  price_source,
  source_url,
  status,
  coalesce(last_verified_at, updated_at, created_at, now()),
  now()
from api_transit_offers
where status = 'active'
  and model_multiplier is not null
on conflict (id) do nothing;

drop trigger if exists api_transit_offers_record_multiplier_history on api_transit_offers;
create trigger api_transit_offers_record_multiplier_history
after insert or update of
  recharge_ratio,
  model_multiplier,
  input_price,
  output_price,
  cache_read_price,
  cache_write_price,
  price_source,
  source_url,
  status
on api_transit_offers
for each row
execute function record_api_transit_multiplier_history();
