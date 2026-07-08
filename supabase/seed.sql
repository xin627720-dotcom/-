insert into sources (id, name, base_url, entry_url, collection_method, collector_kind, enabled, notes)
values
  ('aisou-pro', 'Aisou智充', 'https://aisou.pro', 'https://aisou.pro/', 'http', 'kami', true, '公开接口自动采集。'),
  ('auto-subscribe', 'Auto Subscribe', 'https://shop.auto-subscribe.com', 'https://shop.auto-subscribe.com/', 'http', 'dujiao', true, '公开接口自动采集。'),
  ('qxvx-pay', 'QXVX Pay', 'https://pay.qxvx.cn', 'https://pay.qxvx.cn/', 'http', 'shopApi', true, 'ShopApi 自动采集。'),
  ('ldxp-jinyao', 'LDXP 金钥', 'https://pay.ldxp.cn', 'https://pay.ldxp.cn/shop/jinyao', 'http', 'shopApi', true, 'ShopApi 自动采集；如遇风控由本地脚本继续尝试。'),
  ('opensora-aifk', 'AUTO FK', 'https://aifk.opensora.de', 'https://aifk.opensora.de/', 'http', 'opensoraHtml', true, '公开页面能读到部分商品、价格和库存。'),
  ('caowo-store', 'GPT专卖-cw', 'https://caowo.store', 'https://caowo.store/', 'http', 'kami', true, '公开接口自动采集。'),
  ('makerich-club', 'AI创富俱乐部', 'https://makerich.club', 'https://makerich.club/', 'http', 'makerichHtml', true, '公开页面可读到推荐商品。'),
  ('ldxp-pixelshop', 'LDXP Pixelshop', 'https://pay.ldxp.cn', 'https://pay.ldxp.cn/shop/pixelshop', 'http', 'shopApi', true, 'ShopApi 自动采集；如遇风控由本地脚本继续尝试。')
on conflict (id) do update set
  name = excluded.name,
  base_url = excluded.base_url,
  entry_url = excluded.entry_url,
  collection_method = excluded.collection_method,
  collector_kind = excluded.collector_kind,
  enabled = excluded.enabled,
  notes = excluded.notes;
