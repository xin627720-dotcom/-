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
  'super-grok-heavy',
  'super-grok-heavy',
  'SuperGrok Heavy / Grok Heavy',
  'Grok',
  '订阅/会员',
  'Heavy',
  'SuperGrok Heavy、Grok Heavy 高阶订阅、代充、成品号、月卡或年卡。',
  array['super grok heavy', 'supergrok heavy', 'grok heavy', 'heavy grok', 'grok super heavy', 'grok heavy 会员'],
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

with super_grok_heavy_offers as (
  select id
  from raw_offers
  where hidden = false
    and source_title ~* '(super[[:space:]]*grok[[:space:]]*heavy|supergrok[[:space:]]*heavy|grok[[:space:]]*super[[:space:]]*heavy|grok[[:space:]]*heavy|heavy[[:space:]]*grok)'
    and lower(source_title) !~ '(非[[:space:]]*heavy|不是[[:space:]]*heavy|not[[:space:]]*heavy)'
)
update raw_offers
set
  canonical_product_id = 'super-grok-heavy',
  category_slug = 'Grok',
  updated_at = now()
from super_grok_heavy_offers
where raw_offers.id = super_grok_heavy_offers.id
  and (
    raw_offers.canonical_product_id is distinct from 'super-grok-heavy'
    or raw_offers.category_slug is distinct from 'Grok'
  );

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
    'reason', 'migration add SuperGrok Heavy standard product',
    'refreshIntervalSeconds', 60,
    'globalDirty', true,
    'fullRefreshRequired', true,
    'affectedProductIds', jsonb_build_array('super-grok', 'super-grok-heavy', 'x-twitter-premium'),
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
