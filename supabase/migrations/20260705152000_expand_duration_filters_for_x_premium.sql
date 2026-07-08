do $migration$
declare
  current_definition text;
  next_definition text;
  old_duration_block constant text := $old$if text_value ~ '(12个月|十二个月|一年|1年|365天|三百六十五天|年卡|年度|全年)' then
    output := array_append(output, 'duration_year');
  elsif text_value ~ '(6个月|六个月|180天|一百八十天|半年|半年卡)' then
    output := array_append(output, 'duration_half_year');
  elsif text_value ~ '(3个月|三个月|90天|九十天|季度|季卡)' then
    output := array_append(output, 'duration_quarter');
  elsif text_value ~ '(月卡|月会员|一个月|1个月|30天|三十天|一月|单月)' then
    output := array_append(output, 'duration_month');
  elsif text_value ~ '((^|[^0-9])([1-9]|10)天(号|会员|体验)?|(二|两|三|四|五|六|七|八|九|十)天(号|会员|体验)?|[1-9]-10天|2到10天|2至10天|3-7天|7-10天|周会员|一周会员|体验卡|短期体验)' then
    output := array_append(output, 'duration_trial');
  end if;$old$;
  new_duration_block constant text := $new$if text_value ~ '(12个月|十二个月|一年|1年|365天|三百六十五天|年卡|年度|全年)' then
    output := array_append(output, 'duration_year');
  end if;

  if text_value ~ '(6个月|六个月|180天|一百八十天|半年|半年卡)' then
    output := array_append(output, 'duration_half_year');
  end if;

  if text_value ~ '(3个月|三个月|90天|九十天|季度|季卡)' then
    output := array_append(output, 'duration_quarter');
  end if;

  if text_value ~ '(月卡|月会员|一个月|1个月|30天|三十天|一月|单月)' then
    output := array_append(output, 'duration_month');
  end if;

  if text_value ~ '((^|[^0-9])([1-9]|10)天(号|会员|体验)?|(二|两|三|四|五|六|七|八|九|十)天(号|会员|体验)?|[1-9]-10天|2到10天|2至10天|3-7天|7-10天|周会员|一周会员|体验卡|短期体验)' then
    output := array_append(output, 'duration_trial');
  end if;$new$;
begin
  select pg_get_functiondef('public.priceai_public_offer_filter_tags(text, text[])'::regprocedure)
  into current_definition;

  if position(new_duration_block in current_definition) > 0 then
    raise notice 'priceai_public_offer_filter_tags already emits multiple duration tags';
  else
    if position(old_duration_block in current_definition) = 0 then
      raise exception 'Expected duration filter tag block was not found';
    end if;

    next_definition := replace(current_definition, old_duration_block, new_duration_block);
    execute next_definition;
  end if;
end;
$migration$;

with duration_candidates as (
  select id
  from raw_offers
  where hidden = false
    and (
      canonical_product_id in ('x-twitter-premium', 'super-grok', 'grok-account')
      or source_title ~* '(x[[:space:]-]*twitter|x[[:space:]]*premium|twitter[[:space:]]*premium|premium\+|推特|蓝标|蓝[[:space:]]*v|super[[:space:]]*grok|supergrok|grok)'
    )
    and (
      source_title ~* '(12[[:space:]]*个月|十二[[:space:]]*个月|一年|1[[:space:]]*年|365[[:space:]]*天|年卡|年度|全年)'
      or source_title ~* '(6[[:space:]]*个月|六[[:space:]]*个月|180[[:space:]]*天|半年|半年卡)'
      or source_title ~* '(3[[:space:]]*个月|三[[:space:]]*个月|90[[:space:]]*天|季度|季卡)'
      or source_title ~* '(月卡|月会员|一个月|1[[:space:]]*个月|30[[:space:]]*天|三十[[:space:]]*天|一月|单月)'
      or source_title ~* '((^|[^0-9])([1-9]|10)[[:space:]]*天(号|会员|体验)?|(二|两|三|四|五|六|七|八|九|十)天(号|会员|体验)?|[1-9][[:space:]]*-[[:space:]]*10天|2到10天|2至10天|3[[:space:]]*-[[:space:]]*7天|7[[:space:]]*-[[:space:]]*10天|周会员|一周会员|体验卡|短期体验)'
    )
)
update raw_offers
set source_title = raw_offers.source_title
from duration_candidates
where raw_offers.id = duration_candidates.id
  and coalesce(raw_offers.public_filter_tags, '{}'::text[]) is distinct from priceai_public_offer_filter_tags(raw_offers.source_title, raw_offers.tags);

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
    'reason', 'migration expand duration filters for X Premium and multi-duration offers',
    'refreshIntervalSeconds', 60,
    'globalDirty', true,
    'fullRefreshRequired', true,
    'affectedProductIds', jsonb_build_array('x-twitter-premium', 'super-grok', 'grok-account'),
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
grant execute on function priceai_public_offer_filter_tags(text, text[]) to service_role;
