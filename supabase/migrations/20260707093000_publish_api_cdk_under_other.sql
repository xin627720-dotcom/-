update canonical_products
set
  platform = '其他',
  product_type = 'API额度',
  spec = 'API 额度 / CDK',
  summary = '通用 API、中转、余额、额度、Codex API 或 OpenAI API 商品。',
  updated_at = now()
where id = 'openai-api-cdk'
  and (
    platform is distinct from '其他'
    or product_type is distinct from 'API额度'
    or spec is distinct from 'API 额度 / CDK'
    or summary is distinct from '通用 API、中转、余额、额度、Codex API 或 OpenAI API 商品。'
  );

update raw_offers
set
  category_slug = '其他',
  updated_at = now()
where canonical_product_id = 'openai-api-cdk'
  and category_slug is distinct from '其他';

with chatgpt_pro_20x_account_offers as (
  select id
  from raw_offers
  where canonical_product_id = 'openai-api-cdk'
    and source_title ~* '(chatgpt|gpt)[[:space:]]*pro'
    and source_title ~* '(20x|x20|20[[:space:]]*倍|200[[:space:]]*(刀|美元|美金|\\$))'
    and source_title ~* '(成品号|库存号|账号|账户|首登|直登|质保首登|自助开通|自动发货)'
    and lower(source_title) !~ '(api[[:space:]]*中转|中转[[:space:]]*api|api[[:space:]]*额度|api额度|余额充值|充值余额|兑换码|号池|倍率|刀卡)'
)
update raw_offers
set
  canonical_product_id = 'chatgpt-pro-20x',
  category_slug = 'ChatGPT',
  updated_at = now()
from chatgpt_pro_20x_account_offers
where raw_offers.id = chatgpt_pro_20x_account_offers.id
  and (
    raw_offers.canonical_product_id is distinct from 'chatgpt-pro-20x'
    or raw_offers.category_slug is distinct from 'ChatGPT'
  );

with openai_phone_verification_offers as (
  select id
  from raw_offers
  where canonical_product_id = 'openai-api-cdk'
    and source_title ~* '(codex[[:space:]]*(接🐎|接马)|codex[[:space:]]*接码)'
    and lower(source_title) !~ '(成品号|账号|账户|账密|月卡|会员|订阅)'
)
update raw_offers
set
  canonical_product_id = 'openai-phone-verification',
  category_slug = '接码',
  updated_at = now()
from openai_phone_verification_offers
where raw_offers.id = openai_phone_verification_offers.id
  and (
    raw_offers.canonical_product_id is distinct from 'openai-phone-verification'
    or raw_offers.category_slug is distinct from '接码'
  );

with gmail_api_email_offers as (
  select id
  from raw_offers
  where canonical_product_id = 'openai-api-cdk'
    and source_title ~* '(gmail|谷歌邮箱|google[[:space:]]*邮箱)'
    and source_title ~* '(api|chatgpt|gpt|可分裂)'
    and lower(source_title) !~ '(接码|验证码|中转|兑换码|apikey|api[[:space:]]*key)'
)
update raw_offers
set
  canonical_product_id = 'gmail-account',
  category_slug = '邮箱',
  updated_at = now()
from gmail_api_email_offers
where raw_offers.id = gmail_api_email_offers.id
  and (
    raw_offers.canonical_product_id is distinct from 'gmail-account'
    or raw_offers.category_slug is distinct from '邮箱'
  );

with other_email_offers as (
  select id
  from raw_offers
  where canonical_product_id = 'openai-api-cdk'
    and source_title ~* '(邮箱|rambler)'
    and source_title ~* '(包gcp|gcp|piexl|pixel|家庭组|挖矿|token|2fa|三绑)'
    and lower(source_title) !~ '(接码|验证码|中转站|api[[:space:]]*中转|中转[[:space:]]*api|兑换码|apikey|api[[:space:]]*key)'
)
update raw_offers
set
  canonical_product_id = 'email-account',
  category_slug = '邮箱',
  updated_at = now()
from other_email_offers
where raw_offers.id = other_email_offers.id
  and (
    raw_offers.canonical_product_id is distinct from 'email-account'
    or raw_offers.category_slug is distinct from '邮箱'
  );

with api_cdk_credit_offers as (
  select id
  from raw_offers
  where canonical_product_id is distinct from 'openai-api-cdk'
    and (
      source_title ~* 'ultra[[:space:]]*号池.*不限时间'
      or source_title ~* 'token[[:space:]]*额度.*(apikey|api[[:space:]]*key|1000[[:space:]]*(刀|美元|美金|\\$))'
    )
)
update raw_offers
set
  canonical_product_id = 'openai-api-cdk',
  category_slug = '其他',
  updated_at = now()
from api_cdk_credit_offers
where raw_offers.id = api_cdk_credit_offers.id
  and (
    raw_offers.canonical_product_id is distinct from 'openai-api-cdk'
    or raw_offers.category_slug is distinct from '其他'
  );

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
    'reason', 'migration publish API/CDK under Other and repair misplaced API/CDK offers',
    'refreshIntervalSeconds', 60,
    'globalDirty', true,
    'fullRefreshRequired', true,
    'affectedProductIds', jsonb_build_array('openai-api-cdk', 'chatgpt-pro-20x', 'openai-phone-verification', 'gmail-account', 'email-account', 'other-product', 'chatgpt-team-business'),
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
