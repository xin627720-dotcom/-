alter table sources add column if not exists health_status text not null default 'unknown';
alter table sources add column if not exists last_checked_at timestamptz;
alter table sources add column if not exists last_success_at timestamptz;
alter table sources add column if not exists consecutive_failures integer not null default 0;
alter table sources add column if not exists last_error text;

create index if not exists sources_health_status_idx on sources(health_status);
create index if not exists sources_last_checked_at_idx on sources(last_checked_at desc);

update raw_offers
set
  effective_status = case
    when status = 'out_of_stock' then 'unavailable'
    else 'available'
  end,
  freshness_status = case
    when status = 'out_of_stock' then 'fresh'
    when coalesce(expires_at, verified_at + interval '24 hours', last_seen_at + interval '24 hours', captured_at + interval '24 hours') < now() then 'expired'
    else 'fresh'
  end,
  expires_at = coalesce(expires_at, coalesce(verified_at, last_seen_at, captured_at, now()) + interval '24 hours')
where true;
