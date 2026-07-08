alter table api_transit_offers
  add column if not exists cache_hit_rate numeric,
  add column if not exists cache_hit_sample_tokens bigint not null default 0;

update api_transit_offers
set
  cache_hit_rate = case
    when nullif(raw_payload #>> '{group,cache_usage,total,cache_hit_rate}', '') is null
      then cache_hit_rate
    when (raw_payload #>> '{group,cache_usage,total,cache_hit_rate}') !~ '^-?[0-9]+(\.[0-9]+)?$'
      then cache_hit_rate
    when ((raw_payload #>> '{group,cache_usage,total,cache_hit_rate}')::numeric) > 1
      then least((raw_payload #>> '{group,cache_usage,total,cache_hit_rate}')::numeric / 100, 1)
    when ((raw_payload #>> '{group,cache_usage,total,cache_hit_rate}')::numeric) >= 0
      then (raw_payload #>> '{group,cache_usage,total,cache_hit_rate}')::numeric
    else cache_hit_rate
  end,
  cache_hit_sample_tokens = greatest(
    coalesce(case
      when (raw_payload #>> '{group,cache_usage,total,input_tokens}') ~ '^[0-9]+$'
        then (raw_payload #>> '{group,cache_usage,total,input_tokens}')::bigint
      else 0
    end, 0) +
    coalesce(case
      when (raw_payload #>> '{group,cache_usage,total,cache_creation_tokens}') ~ '^[0-9]+$'
        then (raw_payload #>> '{group,cache_usage,total,cache_creation_tokens}')::bigint
      else 0
    end, 0) +
    coalesce(case
      when (raw_payload #>> '{group,cache_usage,total,cache_read_tokens}') ~ '^[0-9]+$'
        then (raw_payload #>> '{group,cache_usage,total,cache_read_tokens}')::bigint
      else 0
    end, 0),
    0
  )
where raw_payload #> '{group,cache_usage,total}' is not null;
