update raw_offer_confirmations
set
  source_status = raw_offers.source_status,
  effective_status = raw_offers.effective_status,
  freshness_status = raw_offers.freshness_status,
  expires_at = raw_offers.expires_at,
  source_priority = raw_offers.source_priority,
  confidence = raw_offers.confidence,
  updated_at = now()
from raw_offers
where raw_offer_confirmations.raw_offer_id = raw_offers.id
  and raw_offers.effective_status = 'unavailable'
  and raw_offers.status <> 'out_of_stock'
  and raw_offers.last_failed_at is null
  and coalesce(raw_offers.failure_reason, '') not like '连续采集失败%'
  and raw_offer_confirmations.effective_status <> raw_offers.effective_status;

update raw_offers
set
  failure_reason = '来源明确不可购买，等待后续采集确认恢复。',
  updated_at = now()
where effective_status = 'unavailable'
  and status <> 'out_of_stock'
  and last_failed_at is null
  and failure_reason is null;

create or replace view raw_offer_public_state as
with merged as (
  select
    raw_offers.*,
    raw_offer_confirmations.source_status as confirmation_source_status,
    raw_offer_confirmations.effective_status as confirmation_effective_status,
    raw_offer_confirmations.freshness_status as confirmation_freshness_status,
    raw_offer_confirmations.captured_at as confirmation_captured_at,
    raw_offer_confirmations.last_seen_at as confirmation_last_seen_at,
    raw_offer_confirmations.verified_at as confirmation_verified_at,
    raw_offer_confirmations.expires_at as confirmation_expires_at,
    raw_offer_confirmations.source_priority as confirmation_source_priority,
    raw_offer_confirmations.confidence as confirmation_confidence,
    (
      raw_offers.effective_status = 'unavailable'
      and raw_offers.status <> 'out_of_stock'
      and raw_offers.last_failed_at is null
      and coalesce(raw_offers.failure_reason, '') not like '连续采集失败%'
      and raw_offer_confirmations.effective_status is not null
      and raw_offer_confirmations.effective_status <> raw_offers.effective_status
    ) as prefer_base_unavailable
  from raw_offers
  left join raw_offer_confirmations
    on raw_offer_confirmations.raw_offer_id = raw_offers.id
)
select
  merged.id,
  merged.source_id,
  merged.source_name,
  merged.source_store_name,
  merged.source_title,
  merged.price,
  merged.listed_price,
  merged.fee_amount,
  merged.price_basis,
  merged.currency,
  merged.status,
  case
    when merged.prefer_base_unavailable then merged.source_status
    else coalesce(merged.confirmation_source_status, merged.source_status)
  end as source_status,
  case
    when merged.prefer_base_unavailable then merged.effective_status
    else coalesce(merged.confirmation_effective_status, merged.effective_status)
  end as effective_status,
  case
    when merged.prefer_base_unavailable then merged.freshness_status
    else coalesce(merged.confirmation_freshness_status, merged.freshness_status)
  end as freshness_status,
  merged.url,
  merged.tags,
  merged.public_filter_tags,
  merged.stock_count,
  merged.hidden,
  merged.canonical_product_id,
  merged.category_slug,
  coalesce(merged.confirmation_captured_at, merged.captured_at) as captured_at,
  merged.source_updated_at,
  coalesce(merged.confirmation_last_seen_at, merged.last_seen_at) as last_seen_at,
  coalesce(merged.confirmation_verified_at, merged.verified_at) as verified_at,
  case
    when merged.prefer_base_unavailable then merged.expires_at
    else coalesce(merged.confirmation_expires_at, merged.expires_at)
  end as expires_at,
  case
    when merged.prefer_base_unavailable then merged.source_priority
    else coalesce(merged.confirmation_source_priority, merged.source_priority)
  end as source_priority,
  case
    when merged.prefer_base_unavailable then merged.confidence
    else coalesce(merged.confirmation_confidence, merged.confidence)
  end as confidence,
  merged.last_failed_at,
  merged.failure_reason,
  merged.created_at,
  merged.updated_at
from merged;

revoke all on table raw_offer_public_state from anon, authenticated, public;
grant select on table raw_offer_public_state to service_role;
