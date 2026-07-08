insert into canonical_products (
  id,
  slug,
  display_name,
  platform,
  product_type,
  spec,
  summary,
  aliases,
  is_active
)
values (
  'dreamina-account',
  'dreamina-account',
  'Dreamina / 即梦',
  '其他',
  '工具账号',
  'Basic / Seedance 2.0',
  'Dreamina 海外版即梦、Seedance 2.0 视频生成相关成品账号、积分或 Basic 权益。',
  array[
    'dreamina',
    'dreamina ai',
    '即梦',
    '即梦 ai',
    '吉梦',
    'jimeng',
    'jimeng ai',
    '海外即梦',
    '海外版即梦',
    'seedance',
    'seedance 2.0',
    'seedance2.0',
    'seedance2',
    'c档 2.0',
    'c档2.0',
    'c 档 2.0',
    'c 档2.0',
    'dreamina basic',
    '即梦 basic'
  ],
  true
)
on conflict (id) do update set
  slug = excluded.slug,
  display_name = excluded.display_name,
  platform = excluded.platform,
  product_type = excluded.product_type,
  spec = excluded.spec,
  summary = excluded.summary,
  aliases = excluded.aliases,
  is_active = excluded.is_active,
  updated_at = now();

update raw_offers
set
  canonical_product_id = 'dreamina-account',
  updated_at = now()
where hidden = false
  and (
    source_title ilike '%dreamina%'
    or source_title ilike '%jimeng%'
    or source_title ilike '%即梦%'
    or source_title ilike '%吉梦%'
    or source_title ilike '%seedance%'
    or source_title ilike '%c档2.0%'
    or source_title ilike '%c档 2.0%'
    or source_title ilike '%c 档2.0%'
    or source_title ilike '%c 档 2.0%'
  );

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
    'reason', 'migration add dreamina standard product',
    'refreshIntervalSeconds', 60,
    'globalDirty', true,
    'fullRefreshRequired', true,
    'affectedProductIds', jsonb_build_array('dreamina-account'),
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
