alter function acquire_source_collection_lock(text, text, integer) set search_path = public;
alter function claim_collection_job(text, integer) set search_path = public;
alter function release_source_collection_lock(text, text) set search_path = public;
alter function set_updated_at() set search_path = public;

revoke execute on function acquire_source_collection_lock(text, text, integer) from anon, authenticated, public;
revoke execute on function claim_collection_job(text, integer) from anon, authenticated, public;
revoke execute on function release_source_collection_lock(text, text) from anon, authenticated, public;
revoke execute on function set_updated_at() from anon, authenticated, public;

grant execute on function acquire_source_collection_lock(text, text, integer) to service_role;
grant execute on function claim_collection_job(text, integer) to service_role;
grant execute on function release_source_collection_lock(text, text) to service_role;
grant execute on function set_updated_at() to service_role;

revoke execute on function get_public_product_summary(text) from anon, authenticated, public;
revoke execute on function list_public_merchant_summaries() from anon, authenticated, public;
revoke execute on function list_public_offers_page(
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  integer,
  integer
) from anon, authenticated, public;
revoke execute on function list_public_product_offer_filter_facets(text) from anon, authenticated, public;
revoke execute on function list_public_product_offers_page(text, integer, integer) from anon, authenticated, public;
revoke execute on function list_public_product_offers_page_v2(text, text[], text, text, integer, integer)
  from anon, authenticated, public;
revoke execute on function list_public_product_summaries() from anon, authenticated, public;
revoke execute on function list_source_offer_stats() from anon, authenticated, public;
revoke execute on function priceai_hide_duplicate_public_offers_for_key(text, text) from anon, authenticated, public;
revoke execute on function priceai_raw_offers_hide_public_duplicates() from anon, authenticated, public;

grant execute on function get_public_product_summary(text) to service_role;
grant execute on function list_public_merchant_summaries() to service_role;
grant execute on function list_public_offers_page(
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  integer,
  integer
) to service_role;
grant execute on function list_public_product_offer_filter_facets(text) to service_role;
grant execute on function list_public_product_offers_page(text, integer, integer) to service_role;
grant execute on function list_public_product_offers_page_v2(text, text[], text, text, integer, integer)
  to service_role;
grant execute on function list_public_product_summaries() to service_role;
grant execute on function list_source_offer_stats() to service_role;
grant execute on function priceai_hide_duplicate_public_offers_for_key(text, text) to service_role;
grant execute on function priceai_raw_offers_hide_public_duplicates() to service_role;
