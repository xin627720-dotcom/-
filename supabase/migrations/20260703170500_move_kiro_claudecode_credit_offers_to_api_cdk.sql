with kiro_claudecode_credit_offers as (
  select id
  from raw_offers
  where hidden = false
    and canonical_product_id in ('kiro-account', 'kiro-pro-account')
    and lower(source_title) !~ '(注册机|生成器|源码)'
    and (
      lower(source_title) like '%claudecode%'
      or lower(source_title) like '%claude code%'
    )
    and (
      lower(source_title) like '%kiro%'
      or lower(source_title) like '%claudecode%'
      or lower(source_title) like '%claude code%'
    )
    and (
      source_title like '%刀%'
      or lower(source_title) like '%美元%'
      or lower(source_title) like '%美金%'
      or source_title like '%$%'
    )
)
update raw_offers
set
  canonical_product_id = 'openai-api-cdk',
  category_slug = 'API/CDK',
  updated_at = now()
from kiro_claudecode_credit_offers
where raw_offers.id = kiro_claudecode_credit_offers.id
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
    'reason', 'migration move Kiro ClaudeCode credit offers to API/CDK',
    'refreshIntervalSeconds', 60,
    'globalDirty', true,
    'fullRefreshRequired', true,
    'affectedProductIds', jsonb_build_array('kiro-pro-account', 'openai-api-cdk'),
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
