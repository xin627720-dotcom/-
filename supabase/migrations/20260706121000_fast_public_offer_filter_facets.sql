create index if not exists raw_offers_visible_product_public_filter_tags_idx
  on raw_offers (canonical_product_id)
  where hidden = false
    and coalesce(array_length(public_filter_tags, 1), 0) > 0;

update raw_offers
set updated_at = now()
where coalesce(public_filter_tags, '{}'::text[]) is distinct from priceai_public_offer_filter_tags(source_title, tags);

create or replace function list_public_product_offer_filter_facets(
  p_product_id text
)
returns table (
  tag_id text,
  offer_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with product as (
    select id
    from canonical_products
    where is_active = true
      and (canonical_products.id = p_product_id or canonical_products.slug = p_product_id)
    limit 1
  ),
  tag_rows as (
    select distinct
      priceai_public_offer_dedupe_key(
        raw_offers.canonical_product_id,
        raw_offers.url,
        raw_offers.source_title,
        raw_offers.price
      ) as offer_key,
      unnest(raw_offers.public_filter_tags) as tag_id
    from raw_offers
    join product on product.id = raw_offers.canonical_product_id
    where raw_offers.hidden = false
      and coalesce(array_length(raw_offers.public_filter_tags, 1), 0) > 0
  )
  select
    tag_rows.tag_id,
    count(*) as offer_count
  from tag_rows
  where tag_rows.tag_id is not null
    and tag_rows.tag_id <> ''
  group by tag_rows.tag_id
  order by array_position(
    array[
      'shared_access',
      'duration_trial',
      'duration_month',
      'duration_quarter',
      'duration_half_year',
      'duration_year',
      'verification_single',
      'verification_short',
      'verification_long',
      'verification_monthly',
      'telegram_region_us',
      'telegram_region_india',
      'telegram_premium_quarter',
      'telegram_premium_half_year',
      'telegram_premium_year',
      'telegram_stars',
      'proxy_supported',
      'gemini_antigravity_gcp',
      'gemini_phone_required',
      'gemini_appeal_required',
      'warranty_long'
    ]::text[],
    tag_rows.tag_id
  ),
  tag_rows.tag_id;
$$;

do $migration$
declare
  current_definition text;
  next_definition text;
  live_filtered_expression constant text := 'filtered.live_filter_tags';
  stored_filtered_expression constant text := 'filtered.public_filter_tags';
  live_filtered_select constant text := '      priceai_public_offer_filter_tags(raw_offers.source_title, raw_offers.tags) as live_filter_tags,
      concat_ws(';
  stored_filtered_select constant text := '      concat_ws(';
  live_filter_return constant text := '    ranked.live_filter_tags as filter_tags,';
  stored_filter_return constant text := '    ranked.public_filter_tags as filter_tags,';
begin
  select pg_get_functiondef('public.list_public_product_offers_page_v2(text, text[], text, text, integer, integer)'::regprocedure)
  into current_definition;

  next_definition := replace(current_definition, live_filtered_select, stored_filtered_select);
  next_definition := replace(next_definition, live_filtered_expression, stored_filtered_expression);
  next_definition := replace(next_definition, live_filter_return, stored_filter_return);

  if position('priceai_public_offer_filter_tags(raw_offers.source_title, raw_offers.tags) as live_filter_tags' in next_definition) > 0
    or position(live_filtered_expression in next_definition) > 0
    or position(live_filter_return in next_definition) > 0
  then
    raise exception 'list_public_product_offers_page_v2 still derives public filter tags during public reads';
  end if;

  if next_definition <> current_definition then
    execute next_definition;
  else
    raise notice 'list_public_product_offers_page_v2 already uses stored public filter tags';
  end if;
end;
$migration$;

delete from public_api_snapshots
where kind in ('explorer', 'offers', 'product_offers');

insert into public_api_snapshots (
  kind,
  cache_key,
  schema_version,
  payload,
  generated_at,
  updated_at
)
values (
  'refresh_state',
  'public-prices',
  1,
  jsonb_build_object(
    'dirty', true,
    'dirtyAt', now(),
    'reason', 'migration use stored public offer filter tags for public reads',
    'refreshIntervalSeconds', 60,
    'globalDirty', true,
    'fullRefreshRequired', true,
    'affectedProductIds', jsonb_build_array(),
    'affectedOfferIds', jsonb_build_array(),
    'affectedSourceIds', jsonb_build_array()
  ),
  now(),
  now()
)
on conflict (kind, cache_key) do update set
  schema_version = excluded.schema_version,
  payload = public_api_snapshots.payload || excluded.payload,
  generated_at = excluded.generated_at,
  updated_at = excluded.updated_at;

revoke execute on function list_public_product_offer_filter_facets(text) from anon, authenticated, public;
revoke execute on function list_public_product_offers_page_v2(text, text[], text, text, integer, integer) from anon, authenticated, public;
grant execute on function list_public_product_offer_filter_facets(text) to service_role;
grant execute on function list_public_product_offers_page_v2(text, text[], text, text, integer, integer) to service_role;
