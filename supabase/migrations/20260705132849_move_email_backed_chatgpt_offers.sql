with email_backed_chatgpt_team_offers as (
  select id
  from raw_offers
  where hidden = false
    and canonical_product_id in ('gmail-account', 'outlook-account', 'email-account')
    and (
      source_title ilike '%gmail%'
      or source_title ilike '%谷歌邮箱%'
      or source_title ilike '%google 邮箱%'
      or source_title ilike '%google邮箱%'
      or source_title ilike '%outlook%'
      or source_title ilike '%hotmail%'
      or source_title ilike '%微软邮箱%'
      or source_title ilike '%邮箱%'
    )
    and (
      lower(source_title) ~ '(gpt|chatgpt|openai).{0,24}(team|k12|business|busisness|团队)'
      or lower(source_title) ~ '(team|k12|business|busisness|团队).{0,24}(gpt|chatgpt|openai)'
      or lower(source_title) ~ 'gpt[[:space:]]*k12'
      or lower(source_title) ~ 'k12'
      or lower(source_title) ~ 'k12[[:space:]]*team'
      or lower(source_title) ~ 'team[[:space:]]*k12'
      or source_title ~* 'json[[:space:]]*反代'
      or source_title ~* 'cpa[[:space:]]*格式'
      or source_title ~* '发[[:space:]]*cpa'
    )
)
update raw_offers
set
  canonical_product_id = 'chatgpt-team-business',
  category_slug = 'ChatGPT',
  updated_at = now()
from email_backed_chatgpt_team_offers
where raw_offers.id = email_backed_chatgpt_team_offers.id
  and (
    raw_offers.canonical_product_id is distinct from 'chatgpt-team-business'
    or raw_offers.category_slug is distinct from 'ChatGPT'
  );

with email_backed_chatgpt_plus_offers as (
  select id
  from raw_offers
  where hidden = false
    and canonical_product_id in ('gmail-account', 'outlook-account', 'email-account')
    and (
      source_title ilike '%gmail%'
      or source_title ilike '%谷歌邮箱%'
      or source_title ilike '%google 邮箱%'
      or source_title ilike '%google邮箱%'
      or source_title ilike '%outlook%'
      or source_title ilike '%hotmail%'
      or source_title ilike '%微软邮箱%'
      or source_title ilike '%邮箱%'
    )
    and not (
      lower(source_title) ~ '(gpt|chatgpt|openai).{0,24}(team|k12|business|busisness|团队)'
      or lower(source_title) ~ '(team|k12|business|busisness|团队).{0,24}(gpt|chatgpt|openai)'
      or lower(source_title) ~ 'gpt[[:space:]]*k12'
      or lower(source_title) ~ 'k12'
      or lower(source_title) ~ 'k12[[:space:]]*team'
      or lower(source_title) ~ 'team[[:space:]]*k12'
      or source_title ~* 'json[[:space:]]*反代'
      or source_title ~* 'cpa[[:space:]]*格式'
      or source_title ~* '发[[:space:]]*cpa'
    )
    and (
      lower(source_title) ~ 'gptplus'
      or lower(source_title) ~ '(chatgpt|gpt|openai).{0,20}plus'
      or lower(source_title) ~ 'plus.{0,20}(成品|会员|账号|月卡|首登)'
      or source_title ~* '成品[[:space:]]*plus'
      or source_title ~* '谷歌邮箱.{0,20}plus'
    )
    and lower(source_title) !~ '(注册[[:space:]]*gpt[[:space:]]*专用|适用于[[:space:]]*gpt|接收邮件)'
)
update raw_offers
set
  canonical_product_id = 'chatgpt-plus',
  category_slug = 'ChatGPT',
  updated_at = now()
from email_backed_chatgpt_plus_offers
where raw_offers.id = email_backed_chatgpt_plus_offers.id
  and (
    raw_offers.canonical_product_id is distinct from 'chatgpt-plus'
    or raw_offers.category_slug is distinct from 'ChatGPT'
  );

with email_backed_chatgpt_free_offers as (
  select id
  from raw_offers
  where hidden = false
    and canonical_product_id in ('gmail-account', 'outlook-account', 'email-account')
    and (
      source_title ilike '%gmail%'
      or source_title ilike '%谷歌邮箱%'
      or source_title ilike '%google 邮箱%'
      or source_title ilike '%google邮箱%'
      or source_title ilike '%outlook%'
      or source_title ilike '%hotmail%'
      or source_title ilike '%微软邮箱%'
      or source_title ilike '%邮箱%'
    )
    and (
      lower(source_title) ~ '(chatgpt|gpt|openai|codex).{0,40}(free|普号|白号|普通号|rt|access[[:space:]_-]*token|token|已绑定手机|已绑手机|手机已验证)'
      or lower(source_title) ~ '(free|普号|白号|普通号|rt|access[[:space:]_-]*token|token|已绑定手机|已绑手机|手机已验证).{0,40}(chatgpt|gpt|openai|codex)'
    )
    and lower(source_title) !~ '(可开[[:space:]]*(gpt|chatgpt)|可注册[[:space:]]*gpt|注册[[:space:]]*gpt[[:space:]]*专用|适用于[[:space:]]*gpt|接收邮件)'
)
update raw_offers
set
  canonical_product_id = 'chatgpt-free-account',
  category_slug = 'ChatGPT',
  updated_at = now()
from email_backed_chatgpt_free_offers
where raw_offers.id = email_backed_chatgpt_free_offers.id
  and (
    raw_offers.canonical_product_id is distinct from 'chatgpt-free-account'
    or raw_offers.category_slug is distinct from 'ChatGPT'
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
    'reason', 'migration move email-backed ChatGPT offers out of email products',
    'refreshIntervalSeconds', 60,
    'globalDirty', true,
    'fullRefreshRequired', true,
    'affectedProductIds', jsonb_build_array('gmail-account', 'outlook-account', 'email-account', 'chatgpt-team-business', 'chatgpt-plus', 'chatgpt-free-account'),
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
