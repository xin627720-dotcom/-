insert into sources (id, name, base_url, entry_url, collection_method, collector_kind, enabled, notes)
values (
  'fk-gptkt-pro',
  'fk.gptkt.pro',
  'https://fk.gptkt.pro',
  'https://fk.gptkt.pro/',
  'http',
  'kami',
  true,
  'Kami 发卡接口自动采集；最初识别为 browser，已通过 /user/api/index/commodity 试采。'
)
on conflict (id) do update set
  name = excluded.name,
  base_url = excluded.base_url,
  entry_url = excluded.entry_url,
  collection_method = excluded.collection_method,
  collector_kind = excluded.collector_kind,
  enabled = excluded.enabled,
  notes = excluded.notes,
  updated_at = now();
