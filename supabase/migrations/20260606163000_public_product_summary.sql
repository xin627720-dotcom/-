create index if not exists canonical_products_slug_idx on canonical_products(slug);

drop function if exists get_public_product_summary(text);

create or replace function get_public_product_summary(p_product_key text)
returns table (
  id text,
  slug text,
  display_name text,
  platform text,
  product_type text,
  spec text,
  summary text,
  aliases text[],
  updated_at timestamptz,
  offer_count bigint,
  in_stock_count bigint,
  out_of_stock_count bigint,
  lowest_price numeric,
  latest_seen_at timestamptz,
  lowest_offer jsonb,
  has_out_of_stock boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with product as (
    select *
    from canonical_products
    where is_active = true
      and (canonical_products.id = p_product_key or canonical_products.slug = p_product_key)
    limit 1
  ),
  offers as (
    select
      raw_offers.*,
      case
        when raw_offers.status <> 'out_of_stock'
          and raw_offers.price is not null
          and raw_offers.url <> ''
          and coalesce(raw_offers.effective_status, '') not in ('unavailable', 'stale', 'failed')
          and coalesce(raw_offers.freshness_status, '') not in ('expired', 'failed')
          and (raw_offers.expires_at is null or raw_offers.expires_at > now())
        then true
        else false
      end as is_public_available,
      coalesce(raw_offers.verified_at, raw_offers.last_seen_at, raw_offers.captured_at, raw_offers.source_updated_at) as public_updated_at,
      coalesce(raw_offers.source_store_name, raw_offers.source_name, '') as public_source_label
    from raw_offers
    join product on product.id = raw_offers.canonical_product_id
    where raw_offers.hidden = false
  ),
  lowest as (
    select offers.*
    from offers
    where offers.is_public_available = true
    order by
      offers.price asc nulls last,
      offers.public_updated_at desc nulls last,
      offers.public_source_label asc,
      offers.source_title asc,
      offers.url asc,
      offers.id asc
    limit 1
  ),
  stats as (
    select
      count(*) as offer_count,
      count(*) filter (where offers.is_public_available = true) as in_stock_count,
      count(*) filter (where offers.is_public_available = false) as out_of_stock_count,
      max(offers.public_updated_at) as latest_seen_at,
      bool_or(offers.is_public_available = false) as has_out_of_stock
    from offers
  )
  select
    product.id,
    product.slug,
    product.display_name,
    product.platform,
    product.product_type,
    product.spec,
    product.summary,
    product.aliases,
    product.updated_at,
    coalesce(stats.offer_count, 0) as offer_count,
    coalesce(stats.in_stock_count, 0) as in_stock_count,
    coalesce(stats.out_of_stock_count, 0) as out_of_stock_count,
    lowest.price as lowest_price,
    stats.latest_seen_at,
    case
      when lowest.id is null then null
      else jsonb_build_object(
        'id', lowest.id,
        'source_id', lowest.source_id,
        'source_name', lowest.source_name,
        'source_store_name', lowest.source_store_name,
        'source_title', lowest.source_title,
        'price', lowest.price,
        'currency', lowest.currency,
        'status', lowest.status,
        'url', lowest.url,
        'tags', lowest.tags,
        'stock_count', lowest.stock_count,
        'hidden', lowest.hidden,
        'canonical_product_id', lowest.canonical_product_id,
        'category_slug', lowest.category_slug,
        'captured_at', lowest.captured_at,
        'source_updated_at', lowest.source_updated_at,
        'last_seen_at', lowest.last_seen_at,
        'verified_at', lowest.verified_at,
        'expires_at', lowest.expires_at,
        'source_priority', lowest.source_priority,
        'confidence', lowest.confidence,
        'effective_status', lowest.effective_status,
        'freshness_status', lowest.freshness_status,
        'last_failed_at', lowest.last_failed_at,
        'failure_reason', lowest.failure_reason
      )
    end as lowest_offer,
    coalesce(stats.has_out_of_stock, false) as has_out_of_stock
  from product
  cross join stats
  left join lowest on true;
$$;
