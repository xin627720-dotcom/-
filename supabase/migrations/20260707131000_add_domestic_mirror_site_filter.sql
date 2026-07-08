do $migration$
declare
  current_definition text;
  next_definition text;
  old_shared_block constant text := $old$  if text_value !~ '(非拼车|不是拼车|不拼车|无拼车|拒绝拼车|非团购|不是团购|不团购|非共享|不是共享|不共享|无共享|非合租|不是合租|不合租|非车位|不是车位)'
    and (
      text_value ~ '(拼车|团购|拼团|车位|多人共享|多人共用|(多人|二人|两人|双人|三人|四人|五人|六人|七人|八人|九人|十人|[2-9]人|[1-9][0-9]人)体验(号|账号|帐号)|(二|两|双|三|四|五|六|七|八|九|十|[2-9]|[1-9][0-9])人(车|共享|共用|位)|多人车|车友|车队|家庭车|团号|团购车|拼车位|共享车)'
      or (
        text_value !~ '(独享|独立|一人一号|一人一户|专享)'
        and text_value ~ '(共享|共用|合租|共享号)'
      )
    )
  then
    output := array_append(output, 'shared_access');
  end if;$old$;
  new_shared_block constant text := $new$  if text_value !~ '(非拼车|不是拼车|不拼车|无拼车|拒绝拼车|非团购|不是团购|不团购|非共享|不是共享|不共享|无共享|非合租|不是合租|不合租|非车位|不是车位)'
    and (
      text_value ~ '(拼车|团购|拼团|车位|多人共享|多人共用|(多人|二人|两人|双人|三人|四人|五人|六人|七人|八人|九人|十人|[2-9]人|[1-9][0-9]人)体验(号|账号|帐号)|(二|两|双|三|四|五|六|七|八|九|十|[2-9]|[1-9][0-9])人(车|共享|共用|位)|多人车|车友|车队|家庭车|团号|团购车|拼车位|共享车)'
      or (
        text_value !~ '(独享|独立|一人一号|一人一户|专享)'
        and text_value ~ '(共享|共用|合租|共享号)'
      )
    )
  then
    output := array_append(output, 'shared_access');
  end if;

  if text_value ~ '(国内镜像站|国内镜像|网页镜像|镜像站|镜像|mirror)' then
    output := array_append(output, 'domestic_mirror_site');
  end if;$new$;
begin
  select pg_get_functiondef('public.priceai_public_offer_filter_tags(text, text[])'::regprocedure)
  into current_definition;

  if position('domestic_mirror_site' in current_definition) > 0 then
    raise notice 'priceai_public_offer_filter_tags already recognizes domestic mirror sites';
  else
    if position(old_shared_block in current_definition) = 0 then
      raise exception 'Expected shared-access filter tag block was not found';
    end if;

    next_definition := replace(current_definition, old_shared_block, new_shared_block);
    execute next_definition;
  end if;
end;
$migration$;

update raw_offers
set updated_at = now()
where coalesce(public_filter_tags, '{}'::text[]) is distinct from priceai_public_offer_filter_tags(source_title, tags);

with domestic_mirror_offers as (
  select
    id,
    case
      when source_title ~* '(grok[[:space:]]*heavy|heavy[[:space:]]*grok|super[[:space:]]*grok[[:space:]]*heavy|supergrok[[:space:]]*heavy)' then 'super-grok-heavy'
      when source_title ~* '(super[[:space:]]*grok|supergrok|grok)' then 'super-grok'
      when source_title ~* '(gemini|google[[:space:]]*ai|pixel)' and source_title ~* '(ultra|250[[:space:]]*(刀|美元|美金|\\$)|flow)' then 'gemini-ultra'
      when source_title ~* '(gemini|google[[:space:]]*ai|pixel)' then 'gemini-pro-year'
      when source_title ~* '(claude|克劳德)' and source_title ~* '(max[[:space:]]*20|20x|x20|20[[:space:]]*倍|200[[:space:]]*(刀|美元|美金|\\$))' then 'claude-max-20x'
      when source_title ~* '(claude|克劳德)' and source_title ~* '(max[[:space:]]*5|5x|x5|5[[:space:]]*倍|100[[:space:]]*(刀|美元|美金|\\$))' then 'claude-max-5x'
      when source_title ~* '(claude|克劳德)' then 'claude-pro-month'
      when source_title ~* '(chatgpt|gpt|openai|plus)' and source_title ~* '(pro[[:space:]]*20|20x|x20|20[[:space:]]*倍|200[[:space:]]*(刀|美元|美金|\\$))' then 'chatgpt-pro-20x'
      when source_title ~* '(chatgpt|gpt|openai|plus)' and source_title ~* '(pro[[:space:]]*5|5x|x5|5[[:space:]]*倍|100[[:space:]]*(刀|美元|美金|\\$))' then 'chatgpt-pro-5x'
      when source_title ~* '(chatgpt|gpt|openai|plus)' and source_title ~* '(team|business|k12)' then 'chatgpt-team-business'
      when source_title ~* '(chatgpt|gpt|openai|plus)' then 'chatgpt-plus'
      else null
    end as target_product_id
  from raw_offers
  where hidden = false
    and source_title ~* '(国内镜像站|国内镜像|网页镜像|镜像站|镜像|mirror)'
),
target_products as (
  select
    domestic_mirror_offers.id,
    canonical_products.id as target_product_id,
    canonical_products.platform as target_platform
  from domestic_mirror_offers
  join canonical_products on canonical_products.id = domestic_mirror_offers.target_product_id
)
update raw_offers
set
  canonical_product_id = target_products.target_product_id,
  category_slug = target_products.target_platform,
  updated_at = now()
from target_products
where raw_offers.id = target_products.id
  and (
    raw_offers.canonical_product_id is distinct from target_products.target_product_id
    or raw_offers.category_slug is distinct from target_products.target_platform
  );

do $migration$
declare
  current_definition text;
  next_definition text;
begin
  select pg_get_functiondef('public.list_public_product_offers_page(text, integer, integer)'::regprocedure)
  into current_definition;

  next_definition := replace(
    current_definition,
    'coalesce(raw_offers.public_filter_tags, priceai_public_offer_filter_tags(raw_offers.source_title, raw_offers.tags)) @> array[''shared_access'']::text[]',
    'coalesce(raw_offers.public_filter_tags, priceai_public_offer_filter_tags(raw_offers.source_title, raw_offers.tags)) && array[''shared_access'', ''domestic_mirror_site'']::text[]'
  );
  next_definition := replace(next_definition, 'shared_access_rank', 'special_delivery_rank');

  if next_definition <> current_definition then
    execute next_definition;
  else
    raise notice 'list_public_product_offers_page already deprioritizes domestic mirror sites';
  end if;

  select pg_get_functiondef('public.list_public_product_offers_page_v2(text, text[], text, text, text, numeric, numeric, integer, integer)'::regprocedure)
  into current_definition;

  next_definition := replace(
    current_definition,
    'coalesce(filtered.public_filter_tags, priceai_public_offer_filter_tags(filtered.source_title, filtered.tags)) @> array[''shared_access'']::text[]',
    'coalesce(filtered.public_filter_tags, priceai_public_offer_filter_tags(filtered.source_title, filtered.tags)) && array[''shared_access'', ''domestic_mirror_site'']::text[]'
  );
  next_definition := replace(next_definition, 'shared_access_rank', 'special_delivery_rank');

  if next_definition <> current_definition then
    execute next_definition;
  else
    raise notice 'list_public_product_offers_page_v2 already deprioritizes domestic mirror sites';
  end if;
end;
$migration$;

do $migration$
declare
  current_definition text;
  next_definition text;
  lowest_target constant text := 'where offers.is_public_available = true
      and not (offers.public_offer_filter_tags @> array[''shared_access'']::text[])';
  lowest_replacement constant text := 'where offers.is_public_available = true
      and not (offers.public_offer_filter_tags @> array[''shared_access'']::text[])
      and not (offers.public_offer_filter_tags @> array[''domestic_mirror_site'']::text[])';
  warranty_target constant text := 'where offers.is_public_available = true
      and offers.public_offer_filter_tags @> array[''warranty_long'']::text[]
      and not (offers.public_offer_filter_tags @> array[''shared_access'']::text[])';
  warranty_replacement constant text := 'where offers.is_public_available = true
      and offers.public_offer_filter_tags @> array[''warranty_long'']::text[]
      and not (offers.public_offer_filter_tags @> array[''shared_access'']::text[])
      and not (offers.public_offer_filter_tags @> array[''domestic_mirror_site'']::text[])';
begin
  select pg_get_functiondef('public.list_public_product_summaries()'::regprocedure)
  into current_definition;

  next_definition := current_definition;

  if position('domestic_mirror_site' in next_definition) = 0 then
    if position(lowest_target in next_definition) = 0 then
      raise exception 'Expected product summary lowest clause was not found';
    end if;

    next_definition := replace(next_definition, lowest_target, lowest_replacement);

    if position(warranty_target in next_definition) = 0 then
      raise exception 'Expected product summary warranty lowest clause was not found';
    end if;

    next_definition := replace(next_definition, warranty_target, warranty_replacement);
    execute next_definition;
  else
    raise notice 'list_public_product_summaries already excludes domestic mirror sites from lowest prices';
  end if;
end;
$migration$;

do $migration$
declare
  current_definition text;
  next_definition text;
  lowest_target constant text := 'where deduped.is_public_available = true
      and not (deduped.public_offer_filter_tags @> array[''shared_access'']::text[])';
  lowest_replacement constant text := 'where deduped.is_public_available = true
      and not (deduped.public_offer_filter_tags @> array[''shared_access'']::text[])
      and not (deduped.public_offer_filter_tags @> array[''domestic_mirror_site'']::text[])';
  warranty_target constant text := 'where deduped.is_public_available = true
      and deduped.public_offer_filter_tags @> array[''warranty_long'']::text[]
      and not (deduped.public_offer_filter_tags @> array[''shared_access'']::text[])';
  warranty_replacement constant text := 'where deduped.is_public_available = true
      and deduped.public_offer_filter_tags @> array[''warranty_long'']::text[]
      and not (deduped.public_offer_filter_tags @> array[''shared_access'']::text[])
      and not (deduped.public_offer_filter_tags @> array[''domestic_mirror_site'']::text[])';
begin
  select pg_get_functiondef('public.list_public_merchant_summaries()'::regprocedure)
  into current_definition;

  next_definition := current_definition;

  if position('domestic_mirror_site' in next_definition) = 0 then
    if position(lowest_target in next_definition) = 0 then
      raise exception 'Expected merchant summary lowest clause was not found';
    end if;

    next_definition := replace(next_definition, lowest_target, lowest_replacement);

    if position(warranty_target in next_definition) = 0 then
      raise exception 'Expected merchant summary warranty lowest clause was not found';
    end if;

    next_definition := replace(next_definition, warranty_target, warranty_replacement);
    execute next_definition;
  else
    raise notice 'list_public_merchant_summaries already excludes domestic mirror sites from lowest prices';
  end if;
end;
$migration$;

delete from public_api_snapshots
where kind in ('explorer', 'offers', 'product_offers', 'merchants');

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
    'reason', 'migration add domestic mirror site filter and reclassify AI mirror offers',
    'refreshIntervalSeconds', 60,
    'globalDirty', true,
    'fullRefreshRequired', true,
    'affectedProductIds', jsonb_build_array('chatgpt-plus', 'chatgpt-pro-5x', 'chatgpt-pro-20x', 'chatgpt-team-business', 'claude-pro-month', 'claude-max-5x', 'claude-max-20x', 'gemini-pro-year', 'gemini-ultra', 'super-grok', 'super-grok-heavy', 'other-product'),
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

revoke execute on function priceai_public_offer_filter_tags(text, text[]) from anon, public;
revoke execute on function list_public_product_offers_page(text, integer, integer) from anon, public;
revoke execute on function list_public_product_offers_page_v2(text, text[], text, text, text, numeric, numeric, integer, integer) from anon, authenticated, public;
revoke execute on function list_public_product_summaries() from anon, public;
revoke execute on function list_public_merchant_summaries() from anon, authenticated, public;
grant execute on function priceai_public_offer_filter_tags(text, text[]) to service_role;
grant execute on function list_public_product_offers_page(text, integer, integer) to service_role;
grant execute on function list_public_product_offers_page_v2(text, text[], text, text, text, numeric, numeric, integer, integer) to service_role;
grant execute on function list_public_product_summaries() to service_role;
grant execute on function list_public_merchant_summaries() to service_role;
