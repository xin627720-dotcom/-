update canonical_products
set
  summary = 'Kiro Pro、Pro+、Pro Max、Power、额度号或可超额相关权益。',
  aliases = array['kiro pro', 'kiro pro+', 'kiro promax', 'kiro power', 'kiro 积分', 'kiro 额度'],
  updated_at = now()
where id = 'kiro-pro-account';

with api_cdk_kiro_pool_offers as (
  select id
  from raw_offers
  where hidden = false
    and canonical_product_id in ('kiro-account', 'kiro-pro-account')
    and (
      source_title ilike '%kiro%'
      or source_title ilike '%ClaudeCode%'
      or source_title ilike '%Claude Code%'
      or source_title ilike '%号池%'
    )
    and lower(source_title) !~ '(注册机|生成器|源码)'
    and (
      source_title ~* '号池'
      or (
        regexp_replace(lower(source_title), 'claude[[:space:]]*code', 'claude code', 'g') ~ 'claude code'
        and source_title ~ '([0-9]+[[:space:]]*(刀|美元|美金)|[0-9]+[[:space:]]*\$)'
      )
      or source_title ~ '([0-9]+[[:space:]]*(刀|美元|美金)|[0-9]+[[:space:]]*\$)[[:space:]]*额度'
      or source_title ~ '(刀额度|美元额度|美金额度)'
    )
)
update raw_offers
set
  canonical_product_id = 'openai-api-cdk',
  category_slug = 'API/CDK',
  updated_at = now()
from api_cdk_kiro_pool_offers
where raw_offers.id = api_cdk_kiro_pool_offers.id
  and (
    raw_offers.canonical_product_id is distinct from 'openai-api-cdk'
    or raw_offers.category_slug is distinct from 'API/CDK'
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
    'reason', 'migration move Kiro pool credit offers to API/CDK',
    'refreshIntervalSeconds', 60,
    'globalDirty', true,
    'fullRefreshRequired', true,
    'affectedProductIds', jsonb_build_array('kiro-account', 'kiro-pro-account', 'openai-api-cdk'),
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
