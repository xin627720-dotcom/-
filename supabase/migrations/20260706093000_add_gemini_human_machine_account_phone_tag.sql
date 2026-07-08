do $migration$
declare
  current_definition text;
  next_definition text;
  old_phone_pattern constant text := '(需要绑定手机|需绑定手机|需要绑手机|需绑手机|绑定手机号|绑定手机|手机号接码|手机接码|长效接码|接码)';
  new_phone_pattern constant text := '(需要绑定手机|需绑定手机|需要绑手机|需绑手机|绑定手机号|绑定手机|手机号接码|手机接码|长效接码|接码|人机号|人机账号|人机帐号)';
begin
  select pg_get_functiondef('public.priceai_public_offer_filter_tags(text, text[])'::regprocedure)
  into current_definition;

  if position('人机号' in current_definition) > 0 then
    raise notice 'priceai_public_offer_filter_tags already recognizes Gemini human-machine accounts as phone-required';
  else
    if position(old_phone_pattern in current_definition) = 0 then
      raise exception 'Expected Gemini phone-required filter tag pattern was not found';
    end if;

    next_definition := replace(current_definition, old_phone_pattern, new_phone_pattern);
    execute next_definition;
  end if;
end;
$migration$;

delete from public_api_snapshots
where kind = 'product_offers'
  and cache_key like '%gemini-pro-year%';

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
    'reason', 'migration add Gemini human-machine account phone-required tag',
    'refreshIntervalSeconds', 60,
    'globalDirty', false,
    'fullRefreshRequired', false,
    'affectedProductIds', jsonb_build_array('gemini-pro-year'),
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
