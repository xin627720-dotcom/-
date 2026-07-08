update raw_offers
set canonical_product_id = 'other-product', updated_at = now()
where hidden = false
  and canonical_product_id = 'telegram-account'
  and lower(source_title) ~ '(tg|telegram|电报|飞机)'
  and lower(source_title) ~ '(中文包|语言包|汉化包|官方中文包)';

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
    'reason', 'migration exclude telegram language packs from account product',
    'refreshIntervalSeconds', 60,
    'globalDirty', true,
    'fullRefreshRequired', false,
    'affectedProductIds', jsonb_build_array('telegram-account', 'other-product'),
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
