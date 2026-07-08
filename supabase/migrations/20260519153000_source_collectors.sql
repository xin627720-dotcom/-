alter table sources add column if not exists collector_kind text;

create index if not exists sources_collector_kind_idx on sources(collector_kind);

update sources
set collector_kind = case
  when collection_method = 'public_json' then 'unsupported'
  when lower(coalesce(base_url, entry_url, '')) like '%ai666.dnxb.cc%' then 'kami'
  when lower(coalesce(base_url, entry_url, '')) like '%aisou.pro%' then 'kami'
  when lower(coalesce(base_url, entry_url, '')) like '%caowo.store%' then 'kami'
  when lower(coalesce(base_url, entry_url, '')) like '%faka.redeemgpt.com%' then 'kami'
  when lower(coalesce(base_url, entry_url, '')) like '%feifei.shop%' then 'kami'
  when lower(coalesce(base_url, entry_url, '')) like '%talkai.cyou%' then 'kami'
  when lower(coalesce(base_url, entry_url, '')) like '%yh-mo.xyz%' then 'kami'
  when lower(coalesce(base_url, entry_url, '')) like '%zzshu.com%' then 'kami'
  when lower(coalesce(base_url, entry_url, '')) like '%shop.auto-subscribe.com%' then 'dujiao'
  when lower(coalesce(base_url, entry_url, '')) like '%burstpro-ai.online%' then 'dujiao'
  when lower(coalesce(base_url, entry_url, '')) like '%card.kxandyou.com%' then 'dujiao'
  when lower(coalesce(base_url, entry_url, '')) like '%shop.aitonse.com%' then 'dujiao'
  when lower(coalesce(base_url, entry_url, '')) like '%ultra.makelove.cloud%' then 'dujiao'
  when lower(coalesce(base_url, entry_url, '')) like '%pay.ldxp.cn%' then 'shopApi'
  when lower(coalesce(base_url, entry_url, '')) like '%pay.qxvx.cn%' then 'shopApi'
  when lower(coalesce(base_url, entry_url, '')) like '%upgrade.xiaoheiwan.com%' then 'xiaoheiwan'
  when lower(coalesce(base_url, entry_url, '')) like '%aifk.opensora.de%' then 'opensoraHtml'
  when lower(coalesce(base_url, entry_url, '')) like '%makerich.club%' then 'makerichHtml'
  when lower(coalesce(base_url, entry_url, '')) like '%bei-bei.shop%' then 'beibeiHtml'
  else collector_kind
end
where collector_kind is null;
