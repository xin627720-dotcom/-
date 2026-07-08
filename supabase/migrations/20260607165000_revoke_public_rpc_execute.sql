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
) from anon, public;

revoke execute on function list_public_product_offers_page(text, integer, integer) from anon, public;
revoke execute on function list_public_product_summaries() from anon, public;
revoke execute on function get_public_product_summary(text) from anon, public;

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

grant execute on function list_public_product_offers_page(text, integer, integer) to service_role;
grant execute on function list_public_product_summaries() to service_role;
grant execute on function get_public_product_summary(text) to service_role;
