drop function if exists list_source_offer_stats();

create function list_source_offer_stats()
returns table (
  source_id text,
  visible_count bigint,
  hidden_count bigint,
  manually_hidden_count bigint,
  collector_failure_count bigint,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    raw_offers.source_id,
    count(*) filter (where raw_offers.hidden = false) as visible_count,
    count(*) filter (where raw_offers.hidden = true) as hidden_count,
    count(*) filter (
      where raw_offers.hidden = true
        and raw_offers.failure_reason like '管理员手动下架%'
    ) as manually_hidden_count,
    count(*) filter (
      where raw_offers.last_failed_at is not null
        and coalesce(raw_offers.failure_reason, '') not like '管理员手动下架%'
    ) as collector_failure_count,
    count(*) as total_count
  from raw_offers
  where raw_offers.source_id is not null
  group by raw_offers.source_id
  order by raw_offers.source_id;
$$;

revoke execute on function list_source_offer_stats() from anon, authenticated, public;
grant execute on function list_source_offer_stats() to service_role;
