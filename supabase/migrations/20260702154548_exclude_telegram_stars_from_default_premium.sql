do $$
declare
  current_definition text;
  next_definition text;
  default_target constant text := 'where raw_offers.hidden = false';
  default_replacement constant text := 'where raw_offers.hidden = false
      and not (
        product.id = ''telegram-premium''
        and coalesce(raw_offers.public_filter_tags, priceai_public_offer_filter_tags(raw_offers.source_title, raw_offers.tags)) @> array[''telegram_stars'']::text[]
      )';
  filtered_target constant text := 'where (coalesce(array_length(p_filter_tags, 1), 0) = 0 or filtered.public_filter_tags @> p_filter_tags)
      and (p_query is null or trim(p_query) = '''' or filtered.public_haystack ilike (''%'' || trim(p_query) || ''%''))';
  filtered_replacement constant text := 'where (coalesce(array_length(p_filter_tags, 1), 0) = 0 or filtered.public_filter_tags @> p_filter_tags)
      and (
        filtered.canonical_product_id <> ''telegram-premium''
        or not (filtered.public_filter_tags @> array[''telegram_stars'']::text[])
        or coalesce(p_filter_tags, array[]::text[]) @> array[''telegram_stars'']::text[]
      )
      and (p_query is null or trim(p_query) = '''' or filtered.public_haystack ilike (''%'' || trim(p_query) || ''%''))';
  lowest_target constant text := 'where offers.is_public_available = true
      and not (offers.public_offer_filter_tags @> array[''shared_access'']::text[])';
  lowest_replacement constant text := 'where offers.is_public_available = true
      and not (offers.public_offer_filter_tags @> array[''shared_access'']::text[])
      and not (
        offers.canonical_product_id = ''telegram-premium''
        and offers.public_offer_filter_tags @> array[''telegram_stars'']::text[]
      )';
  warranty_target constant text := 'where offers.is_public_available = true
      and offers.public_offer_filter_tags @> array[''warranty_long'']::text[]
      and not (offers.public_offer_filter_tags @> array[''shared_access'']::text[])';
  warranty_replacement constant text := 'where offers.is_public_available = true
      and offers.public_offer_filter_tags @> array[''warranty_long'']::text[]
      and not (offers.public_offer_filter_tags @> array[''shared_access'']::text[])
      and not (
        offers.canonical_product_id = ''telegram-premium''
        and offers.public_offer_filter_tags @> array[''telegram_stars'']::text[]
      )';
begin
  select pg_get_functiondef('public.list_public_product_offers_page(text, integer, integer)'::regprocedure)
  into current_definition;

  if position(default_replacement in current_definition) > 0 then
    raise notice 'list_public_product_offers_page already excludes Telegram Stars from default Premium offers';
  else
    if position(default_target in current_definition) = 0 then
      raise exception 'Expected default product offers hidden clause was not found';
    end if;

    next_definition := replace(current_definition, default_target, default_replacement);
    execute next_definition;
  end if;

  select pg_get_functiondef('public.list_public_product_offers_page_v2(text, text[], text, text, integer, integer)'::regprocedure)
  into current_definition;

  if position(filtered_replacement in current_definition) > 0 then
    raise notice 'list_public_product_offers_page_v2 already gates Telegram Stars behind its filter';
  else
    if position(filtered_target in current_definition) = 0 then
      raise exception 'Expected filtered product offers clause was not found';
    end if;

    next_definition := replace(current_definition, filtered_target, filtered_replacement);
    execute next_definition;
  end if;

  select pg_get_functiondef('public.list_public_product_summaries()'::regprocedure)
  into current_definition;
  next_definition := current_definition;

  if position(lowest_replacement in next_definition) > 0 then
    raise notice 'list_public_product_summaries already excludes Telegram Stars from Premium lowest price';
  else
    if position(lowest_target in next_definition) = 0 then
      raise exception 'Expected product summary lowest clause was not found';
    end if;

    next_definition := replace(next_definition, lowest_target, lowest_replacement);
  end if;

  if position(warranty_replacement in next_definition) > 0 then
    raise notice 'list_public_product_summaries already excludes Telegram Stars from Premium warranty lowest price';
  else
    if position(warranty_target in next_definition) = 0 then
      raise exception 'Expected product summary warranty lowest clause was not found';
    end if;

    next_definition := replace(next_definition, warranty_target, warranty_replacement);
  end if;

  if next_definition <> current_definition then
    execute next_definition;
  end if;
end;
$$;

delete from public_api_snapshots
where (kind = 'product_offers' and cache_key like '%telegram-premium:limit:30')
  or (kind = 'explorer' and cache_key = 'default');

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
    'reason', 'migration exclude telegram stars from default premium pricing',
    'refreshIntervalSeconds', 60,
    'globalDirty', true,
    'fullRefreshRequired', false,
    'affectedProductIds', jsonb_build_array('telegram-premium'),
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
