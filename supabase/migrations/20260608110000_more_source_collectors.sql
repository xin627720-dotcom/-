update sources
set collector_kind = 'kami',
    collection_method = 'http',
    updated_at = now()
where entry_url ilike any (array[
  '%acg.nbcode.xyz%',
  '%fk.gptcz.cc%'
])
and coalesce(collector_kind, 'auto') <> 'kami';

update sources
set collector_kind = 'dujiao',
    collection_method = 'http',
    updated_at = now()
where entry_url ilike any (array[
  '%ac-card.org%',
  '%shop.mfttai.com%'
])
and coalesce(collector_kind, 'auto') <> 'dujiao';

update sources
set collector_kind = 'publicProductsApi',
    collection_method = 'http',
    updated_at = now()
where entry_url ilike any (array[
  '%academicgate.org%',
  '%catcard.uk%'
])
and coalesce(collector_kind, 'auto') <> 'publicProductsApi';

update sources
set collector_kind = 'shopUserProductsApi',
    collection_method = 'http',
    updated_at = now()
where entry_url ilike '%sd.ncet.top%'
and coalesce(collector_kind, 'auto') <> 'shopUserProductsApi';

update sources
set collector_kind = 'unicornHtml',
    collection_method = 'http',
    updated_at = now()
where entry_url ilike any (array[
  '%meowka.vip%',
  '%ouvg.top%'
])
and coalesce(collector_kind, 'auto') <> 'unicornHtml';

update sources
set collector_kind = 'mooncakeCatalog',
    collection_method = 'http',
    updated_at = now()
where entry_url ilike '%fk1.ybkjs.top%'
and coalesce(collector_kind, 'auto') <> 'mooncakeCatalog';

update sources
set collector_kind = 'genericHtml',
    collection_method = 'http',
    updated_at = now()
where entry_url ilike '%of365.vip%'
and coalesce(collector_kind, 'auto') <> 'genericHtml';

with collector_rules(pattern, collector) as (
  values
    ('%acg.nbcode.xyz%', 'kami'),
    ('%fk.gptcz.cc%', 'kami'),
    ('%ac-card.org%', 'dujiao'),
    ('%shop.mfttai.com%', 'dujiao'),
    ('%academicgate.org%', 'publicProductsApi'),
    ('%catcard.uk%', 'publicProductsApi'),
    ('%sd.ncet.top%', 'shopUserProductsApi'),
    ('%meowka.vip%', 'unicornHtml'),
    ('%ouvg.top%', 'unicornHtml'),
    ('%fk1.ybkjs.top%', 'mooncakeCatalog'),
    ('%of365.vip%', 'genericHtml')
)
update channel_submissions
set parsed_meta = parsed_meta
  || jsonb_build_object(
    'suggested_collection_method', 'http',
    'suggested_collector_kind', collector_rules.collector,
    'support_status', 'supported',
    'support_reason', '已识别 ' || collector_rules.collector || ' 采集器，可通过自动采集拉取商品。'
  )
from collector_rules
where channel_submissions.url ilike collector_rules.pattern
  and channel_submissions.status in ('pending', 'collector_todo');
