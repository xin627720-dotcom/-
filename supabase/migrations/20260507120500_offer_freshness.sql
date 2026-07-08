alter table raw_offers add column if not exists source_status text not null default 'unknown';
alter table raw_offers add column if not exists effective_status text not null default 'low_confidence';
alter table raw_offers add column if not exists freshness_status text not null default 'fresh';
alter table raw_offers add column if not exists verified_at timestamptz;
alter table raw_offers add column if not exists expires_at timestamptz;
alter table raw_offers add column if not exists source_priority integer not null default 50;
alter table raw_offers add column if not exists confidence numeric not null default 0.5;
alter table raw_offers add column if not exists last_failed_at timestamptz;
alter table raw_offers add column if not exists failure_reason text;

update raw_offers
set
  source_status = status,
  verified_at = coalesce(verified_at, last_seen_at, captured_at, source_updated_at),
  source_priority = case
    when exists (
      select 1 from sources
      where sources.id = raw_offers.source_id
        and sources.collection_method = 'public_json'
    ) then 40
    else 90
  end,
  confidence = case
    when exists (
      select 1 from sources
      where sources.id = raw_offers.source_id
        and sources.collection_method = 'public_json'
    ) then 0.55
    else 0.90
  end,
  effective_status = case
    when status = 'out_of_stock' then 'unavailable'
    when coalesce(verified_at, last_seen_at, captured_at, source_updated_at) < now() - interval '30 minutes' then 'stale'
    when exists (
      select 1 from sources
      where sources.id = raw_offers.source_id
        and sources.collection_method = 'public_json'
    ) then 'low_confidence'
    when coalesce(verified_at, last_seen_at, captured_at, source_updated_at) < now() - interval '10 minutes' then 'low_confidence'
    else 'available'
  end,
  freshness_status = case
    when coalesce(verified_at, last_seen_at, captured_at, source_updated_at) < now() - interval '2 hours' then 'expired'
    when coalesce(verified_at, last_seen_at, captured_at, source_updated_at) < now() - interval '30 minutes' then 'stale'
    when coalesce(verified_at, last_seen_at, captured_at, source_updated_at) < now() - interval '10 minutes' then 'aging'
    else 'fresh'
  end,
  expires_at = coalesce(
    expires_at,
    coalesce(verified_at, last_seen_at, captured_at, source_updated_at) +
      case
        when exists (
          select 1 from sources
          where sources.id = raw_offers.source_id
            and sources.collection_method = 'public_json'
        ) then interval '30 minutes'
        else interval '2 hours'
      end
  )
where true;

create index if not exists raw_offers_effective_status_idx on raw_offers(effective_status);
create index if not exists raw_offers_verified_at_idx on raw_offers(verified_at desc);
create index if not exists raw_offers_expires_at_idx on raw_offers(expires_at);

select
  count(*) as raw_offer_count,
  count(*) filter (where effective_status = 'available') as trusted_offer_count,
  count(*) filter (where effective_status = 'low_confidence') as reference_offer_count,
  count(*) filter (where freshness_status in ('stale', 'expired')) as stale_offer_count
from raw_offers;
