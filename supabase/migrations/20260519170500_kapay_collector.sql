update sources
set
  collector_kind = 'dujiao',
  collection_method = case
    when collection_method = 'public_json' then collection_method
    else 'http'
  end,
  updated_at = now()
where id = 'auto-subscribe-1uh3sv'
  or lower(coalesce(base_url, entry_url, '')) like '%kapay.shop%';
