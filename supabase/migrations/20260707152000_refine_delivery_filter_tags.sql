create or replace function priceai_public_offer_filter_tags(
  p_source_title text,
  p_tags text[] default '{}'
)
returns text[]
language plpgsql
immutable
set search_path = public
as $$
declare
  text_value text := regexp_replace(
    lower(
      regexp_replace(
        coalesce(p_source_title, '') || ' ' || array_to_string(coalesce(p_tags, array[]::text[]), ' '),
        '[[:space:]]+',
        '',
        'g'
      )
    ),
    '[【】\[\]（）()]',
    ' ',
    'g'
  );
  title_text text := regexp_replace(
    lower(
      regexp_replace(coalesce(p_source_title, ''), '[[:space:]]+', '', 'g')
    ),
    '[【】\[\]（）()]',
    ' ',
    'g'
  );
  tags_text text := regexp_replace(
    lower(
      regexp_replace(array_to_string(coalesce(p_tags, array[]::text[]), ' '), '[[:space:]]+', '', 'g')
    ),
    '[【】\[\]（）()]',
    ' ',
    'g'
  );
  global_warranty_text text;
  output text[] := array[]::text[];
begin
  global_warranty_text := regexp_replace(
    text_value,
    '(不质保(封号|封禁|被封|账号|账户)|封号(不质保|无质保|无售后|不保|不售后|不在售后范围)|封禁(不质保|无质保|无售后|不保|不售后|不在售后范围)|不保(封号|封禁|被封|账号|账户)|不管(封号|封禁|被封)|封号不管)',
    '',
    'g'
  );

  if text_value !~ '(非拼车|不是拼车|不拼车|无拼车|拒绝拼车|非团购|不是团购|不团购|非共享|不是共享|不共享|无共享|非合租|不是合租|不合租|非车位|不是车位)'
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
  end if;

  if title_text ~ '(自助充值|自助开通|自助卡密|卡密自助|自助激活|自动充值|自动开通|自动激活|全自动激活|全自动开通|直充|代充|卡充|充值|续费|代开|内购|激活码|兑换码|cdk|卡密|提链|提取链接|支付二维码|扫码对接|upi扫码|pix渠道|ideal渠道|i deal渠道)'
    or tags_text ~ '(自助充值|自助开通|自助卡密|卡密自助|自助激活|自动充值|自动开通|自动激活|全自动激活|全自动开通|直充|代充|卡充|充值|续费|代开|内购|激活码|兑换码|cdk|提链|提取链接|支付二维码|扫码对接|upi扫码|pix渠道|ideal渠道|i deal渠道)'
  then
    output := array_append(output, 'delivery_recharge');
  end if;

  if text_value !~ '(非成品|不是成品|非账号|不是账号|非账户|不是账户|不交付账号|不发账号|不提供账号|不含账号|无需账号|自备账号|自备号|自己账号|自己的账号|到自己账号|冲自己号|充值自己号|给自己号)'
    and title_text !~ '(自助充值|自助开通|自助领取|自助激活|自动充值|自动开通|自动激活|全自动激活|全自动开通|免费试用资格|试用资格|资格新号|仅支持新号|老号有试用|新号都可以|充值渠道非成品|非成品|自备账号|国内镜像站|国内镜像|网页镜像|镜像站|镜像|mirror|拼车|团购|拼团|车位|多人共享|多人共用|多人体验号)'
    and title_text ~ '(成品号|成品账号|成品帐号|成品会员账号|成品|账号购买|账号|帐号|账户|账密|独享号|独享账号|独享账户|库存号|会员号|普通号|普号|白号|网页号|半成品|首登|保首登|质保首登|直登|未接码|已接码|已接|未接|带2fa|带二验|可二验|已绑手机|未绑手机)'
  then
    output := array_append(output, 'delivery_account');
  end if;

  if text_value ~ '(12个月|十二个月|一年|1年|365天|三百六十五天|年卡|年度|全年)' then
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
  end if;

  if text_value ~ '(月租|包月接码|接码包月|包月号码|长期租号|月付接码|30天接码|一个月接码|1个月接码)' then
    output := array_append(output, 'verification_monthly');
  elsif text_value ~ '(长效接码|长期接码|长效手机号|长期手机号|原始接码链接|电话接码链接|带电话接码链接|接码链接|取码url|取码链接|可续接|续接)' then
    output := array_append(output, 'verification_long');
  elsif text_value ~ '(短效接码|短效手机号|短期接码|短时接码|临时号码|短效号码|实卡接码|实体卡接码)' then
    output := array_append(output, 'verification_short');
  elsif text_value ~ '(单次接码|一次性接码|一次性验证|1次接码|1次验证|一次码|单号接码|接一次|质保1次成功接码|质保一次成功接码)' then
    output := array_append(output, 'verification_single');
  end if;

  if text_value !~ '(仅支持?网页|只能网页|仅网页|网页号|不支持codex|无法使用codex|不能使用codex|不能直接登录codex|无法直接登录codex|无法codex|codex不售后|不可反代|无法反代|不能反代|不支持反代)'
    and text_value ~ '(可反代|支持反代|反代\+?codex|可用codex|支持codex|直接登录codex|sub2|cpa|api格式|json格式|json文件|sub格式|cpa格式)'
  then
    output := array_append(output, 'proxy_supported');
  end if;

  if (
      (
        text_value ~ '(包gcp|支持gcp|gcp可用|gcp已开|gcp正常|googlecloud|谷歌云)'
        and text_value !~ '(不包gcp|无gcp|gcp已禁用|gcp禁用|不支持gcp|gcp不可用|不带gcp|不含gcp|不送gcp)'
      )
      or (
        text_value ~ '(包反重力|支持反重力|反重力直接用|反重力可用|可用反重力|antigravity)'
        and text_value !~ '(不包反重力|不支持反重力|反重力不可用|无法反重力|不能反重力|不等于反重力)'
      )
      or (
        text_value ~ '((gemini|googleai|googleaipro|gcp|反重力|antigravity).{0,16}cli|cli.{0,16}(gemini|googleai|googleaipro|gcp|反重力|antigravity)|codeassist)'
        and text_value !~ '(不支持cli|cli不可用|无法cli|不能cli)'
      )
    )
  then
    output := array_append(output, 'gemini_antigravity_gcp');
  end if;

  if text_value !~ '(无需绑定手机|无需绑手机|无须绑定手机|无须绑手机|免绑手机|不用绑手机|不需要绑定手机|不需要绑手机)'
    and text_value ~ '(需要绑定手机|需绑定手机|需要绑手机|需绑手机|绑定手机号|绑定手机|手机号接码|手机接码|长效接码|接码|人机号|人机账号|人机帐号)'
  then
    output := array_append(output, 'gemini_phone_required');
  end if;

  if text_value !~ '(无需申诉|无须申诉|免申诉|不用申诉|不需要申诉|无需注册|无须注册|免注册|不用注册|不需要注册)'
    and text_value ~ '(首登需要申诉|需要申诉|需申诉|申诉|需注册|需要注册|没注册过谷歌|未注册过谷歌|没注册过google|未注册过google)'
  then
    output := array_append(output, 'gemini_appeal_required');
  end if;

  if global_warranty_text !~ '(无.{0,4}质保|没.{0,4}质保|不质保|不保|不售后|售后不管|一律不售后|无售后|不作售后条件|不做售后|不管售后)'
    and text_value !~ '(质保首登|保首登|包首登|首登质保|首次登录|首次登陆|质保首次|质保购买一小时内首登|质保[0-9]+h?内首登|质保(一|二|三|四|五|六|七|八|九|十)+小时内首登|质保上车|只质保上车|仅质保上车|包上车|保上车|上车质保|质保登上|质保登录|质保登陆|质保直登|质保首登成功)'
    and text_value !~ '(质保([1-9]|1[0-4]|一|二|三|四|五|六|七|八|九|十|十一|十二|十三|十四)天|(^|[^0-9])([1-9]|1[0-4])天质保|(一|二|三|四|五|六|七|八|九|十|十一|十二|十三|十四)天质保|质保(一周|1周|两周|2周|二周)|(一周|1周|两周|2周|二周)质保|7天售后|七天售后|质保[0-9]{1,2}h|质保(24|48|72)小时|质保[0-9]+小时|[0-9]+h质保|[0-9]+小时质保|质保(1|2|3|4|5|6|7|8|9|一|二|三|四|五|六|七|八|九)次成功接码|质保(1|2|3|4|5|6|7|8|9|一|二|三|四|五|六|七|八|九)次接码|质保(1|2|3|4|5|6|7|8|9|一|二|三|四|五|六|七|八|九)次|质保额度|质保不来码|质保开通|仅质保开通|只质保开通|质保充值成功|质保激活成功|质保到手|质保上车|只质保上车|仅质保上车|包上车|保上车|上车质保)'
    and text_value ~ '(质保(1[5-9]|[2-9][0-9]|[1-9][0-9]{2,})天|(1[5-9]|[2-9][0-9]|[1-9][0-9]{2,})天质保|质保((订阅|定阅|稳定|权益|会员|掉会员|掉订阅|封号|封订阅|封号和订阅|封号封订阅)|[/丨·、,，和+&-]){1,6}(1[5-9]|[2-9][0-9]|[1-9][0-9]{2,})天|质保(十五|二十|二十五|二十八|三十|一百八十)天|(十五|二十|二十五|二十八|三十|一百八十)天质保|质保((订阅|定阅|稳定|权益|会员|掉会员|掉订阅|封号|封订阅|封号和订阅|封号封订阅)|[/丨·、,，和+&-]){1,6}(十五|二十|二十五|二十八|三十|一百八十)天|质保(半个月|一个月|1个月|一月|整月|两个月|2个月|二个月|三个月|3个月|一年|1年|12个月|180天)|(半个月|一个月|1个月|一月|整月|两个月|2个月|二个月|三个月|3个月|一年|1年|12个月|180天)质保|质保((订阅|定阅|稳定|权益|会员|掉会员|掉订阅|封号|封订阅|封号和订阅|封号封订阅)|[/丨·、,，和+&-]){1,6}(半个月|一个月|1个月|一月|整月|两个月|2个月|二个月|三个月|3个月|一年|1年|12个月|180天)|全程质保|全程保|质保全程(订阅|定阅|权益|会员)?|质保((订阅|定阅|稳定|权益|会员|掉会员|掉订阅)|[/丨·、,，和+&-]){1,6}全程|全程((订阅|定阅|稳定|权益|会员|掉会员|掉订阅)|[/丨·、,，和+&-]){1,6}质保|包月售后|包月质保|质保包月)'
  then
    output := array_append(output, 'warranty_long');
  end if;

  return output;
end;
$$;

do $refresh_public_filter_tags$
declare
  refreshed_rows integer := 0;
begin
  loop
    with stale_offers as (
      select id
      from raw_offers
      where coalesce(public_filter_tags, '{}'::text[]) is distinct from priceai_public_offer_filter_tags(source_title, tags)
      order by id
      limit 500
      for update skip locked
    )
    update raw_offers
    set updated_at = now()
    from stale_offers
    where raw_offers.id = stale_offers.id;

    get diagnostics refreshed_rows = row_count;
    exit when refreshed_rows = 0;
  end loop;
end;
$refresh_public_filter_tags$;

drop function if exists list_public_product_offers_page_v2(text, text[], text, text, text, numeric, numeric, integer, integer);

create or replace function list_public_product_offers_page_v2(
  p_product_id text,
  p_filter_tags text[] default '{}',
  p_query text default null,
  p_exclude_query text default null,
  p_collector text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_limit integer default 80,
  p_offset integer default 0
)
returns table (
  id text,
  source_id text,
  source_name text,
  source_store_name text,
  source_title text,
  price numeric,
  currency text,
  status text,
  url text,
  tags text[],
  stock_count integer,
  hidden boolean,
  canonical_product_id text,
  category_slug text,
  captured_at timestamptz,
  source_updated_at timestamptz,
  last_seen_at timestamptz,
  verified_at timestamptz,
  expires_at timestamptz,
  source_priority integer,
  confidence numeric,
  effective_status text,
  freshness_status text,
  last_failed_at timestamptz,
  failure_reason text,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with product as (
    select id
    from canonical_products
    where is_active = true
      and (canonical_products.id = p_product_id or canonical_products.slug = p_product_id)
    limit 1
  ),
  filtered as (
    select
      raw_offers.*,
      sources.collector_kind,
      concat_ws(
        ' ',
        raw_offers.source_title,
        raw_offers.source_name,
        raw_offers.source_store_name,
        raw_offers.url,
        array_to_string(raw_offers.tags, ' ')
      ) as public_haystack,
      case
        when sources.collector_kind = 'shopApi' then 'shopApi'
        when sources.collector_kind = 'dujiao' then 'dujiao'
        when sources.collector_kind = 'kami' then 'kami'
        else 'other'
      end as collector_group
    from raw_offer_public_state raw_offers
    join product on product.id = raw_offers.canonical_product_id
    left join sources on sources.id = raw_offers.source_id
    where raw_offers.hidden = false
  ),
  ranked as (
    select
      filtered.*,
      count(*) over() as total_count,
      case
        when filtered.status <> 'out_of_stock'
          and filtered.price is not null
          and filtered.url <> ''
          and coalesce(filtered.effective_status, '') not in ('unavailable', 'stale', 'failed')
          and coalesce(filtered.freshness_status, '') not in ('expired', 'failed')
          and (filtered.expires_at is null or filtered.expires_at > now())
        then 0
        else 1
      end as availability_rank,
      case
        when filtered.public_filter_tags && array['shared_access', 'domestic_mirror_site']::text[]
        then 1
        else 0
      end as special_delivery_rank,
      coalesce(filtered.verified_at, filtered.last_seen_at, filtered.captured_at, filtered.source_updated_at) as public_updated_at,
      coalesce(filtered.source_store_name, filtered.source_name, '') as public_source_label
    from filtered
    where (coalesce(array_length(p_filter_tags, 1), 0) = 0 or filtered.public_filter_tags @> p_filter_tags)
      and (p_query is null or trim(p_query) = '' or filtered.public_haystack ilike ('%' || trim(p_query) || '%'))
      and (
        p_exclude_query is null
        or trim(p_exclude_query) = ''
        or not exists (
          select 1
          from regexp_split_to_table(trim(p_exclude_query), '[,，[:space:]]+') as excluded_term(term)
          where excluded_term.term <> ''
            and filtered.public_haystack ilike ('%' || excluded_term.term || '%')
        )
      )
      and (p_collector is null or trim(p_collector) = '' or p_collector = 'all' or filtered.collector_group = p_collector)
      and (p_min_price is null or filtered.price >= p_min_price)
      and (p_max_price is null or filtered.price <= p_max_price)
  )
  select
    ranked.id,
    ranked.source_id,
    ranked.source_name,
    ranked.source_store_name,
    ranked.source_title,
    ranked.price,
    ranked.currency,
    ranked.status,
    ranked.url,
    ranked.tags,
    ranked.stock_count,
    ranked.hidden,
    ranked.canonical_product_id,
    ranked.category_slug,
    ranked.captured_at,
    ranked.source_updated_at,
    ranked.last_seen_at,
    ranked.verified_at,
    ranked.expires_at,
    ranked.source_priority,
    ranked.confidence,
    ranked.effective_status,
    ranked.freshness_status,
    ranked.last_failed_at,
    ranked.failure_reason,
    ranked.total_count
  from ranked
  order by
    ranked.availability_rank asc,
    ranked.special_delivery_rank asc,
    ranked.price asc nulls last,
    ranked.public_updated_at desc nulls last,
    ranked.public_source_label asc,
    ranked.source_title asc,
    ranked.url asc,
    ranked.id asc
  limit greatest(least(coalesce(p_limit, 80), 1200), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function list_public_product_offer_filter_facets(
  p_product_id text
)
returns table (
  tag_id text,
  offer_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with product as (
    select id
    from canonical_products
    where is_active = true
      and (canonical_products.id = p_product_id or canonical_products.slug = p_product_id)
    limit 1
  ),
  tag_rows as (
    select distinct
      priceai_public_offer_dedupe_key(
        raw_offers.canonical_product_id,
        raw_offers.url,
        raw_offers.source_title,
        raw_offers.price
      ) as offer_key,
      unnest(raw_offers.public_filter_tags) as tag_id
    from raw_offers
    join product on product.id = raw_offers.canonical_product_id
    where raw_offers.hidden = false
      and coalesce(array_length(raw_offers.public_filter_tags, 1), 0) > 0
  )
  select
    tag_rows.tag_id,
    count(*) as offer_count
  from tag_rows
  where tag_rows.tag_id is not null
    and tag_rows.tag_id <> ''
  group by tag_rows.tag_id
  order by array_position(
    array[
      'shared_access',
      'domestic_mirror_site',
      'delivery_recharge',
      'delivery_account',
      'duration_trial',
      'duration_month',
      'duration_quarter',
      'duration_half_year',
      'duration_year',
      'verification_single',
      'verification_short',
      'verification_long',
      'verification_monthly',
      'telegram_region_us',
      'telegram_region_india',
      'telegram_premium_quarter',
      'telegram_premium_half_year',
      'telegram_premium_year',
      'telegram_stars',
      'proxy_supported',
      'gemini_antigravity_gcp',
      'gemini_phone_required',
      'gemini_appeal_required',
      'warranty_long'
    ]::text[],
    tag_rows.tag_id
  ),
  tag_rows.tag_id;
$$;

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
    'reason', 'migration refine delivery filter tags',
    'refreshIntervalSeconds', 60,
    'globalDirty', true,
    'fullRefreshRequired', true,
    'affectedProductIds', jsonb_build_array(
      'chatgpt-plus',
      'chatgpt-go',
      'chatgpt-pro-5x',
      'chatgpt-pro-20x',
      'chatgpt-team-business',
      'claude-pro-month',
      'claude-team-standard',
      'claude-team-premium',
      'claude-max-5x',
      'claude-max-20x',
      'super-grok',
      'super-grok-heavy',
      'gemini-pro-year'
    ),
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
revoke execute on function list_public_product_offers_page_v2(text, text[], text, text, text, numeric, numeric, integer, integer) from anon, authenticated, public;
revoke execute on function list_public_product_offer_filter_facets(text) from anon, authenticated, public;
grant execute on function priceai_public_offer_filter_tags(text, text[]) to service_role;
grant execute on function list_public_product_offers_page_v2(text, text[], text, text, text, numeric, numeric, integer, integer) to service_role;
grant execute on function list_public_product_offer_filter_facets(text) to service_role;
