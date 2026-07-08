alter table api_transit_stations
  add column if not exists removed_at timestamptz,
  add column if not exists removed_reason text;

alter table api_transit_submissions
  add column if not exists normalized_url text,
  add column if not exists normalized_host text,
  add column if not exists duplicate_of text references api_transit_submissions(id) on delete set null,
  add column if not exists duplicate_count integer not null default 0;

create or replace function priceai_api_transit_normalized_host(p_url text)
returns text
language plpgsql
immutable
as $$
declare
  host text;
begin
  host := lower(substring(coalesce(p_url, '') from '^[a-zA-Z][a-zA-Z0-9+.-]*://([^/?#]+)'));
  if host is null or host = '' then
    return null;
  end if;
  host := regexp_replace(host, '^www\.', '');
  return nullif(host, '');
end;
$$;

create or replace function priceai_api_transit_normalized_url(p_url text)
returns text
language plpgsql
immutable
as $$
declare
  protocol text;
  host text;
  path text;
begin
  protocol := lower(coalesce(substring(coalesce(p_url, '') from '^([a-zA-Z][a-zA-Z0-9+.-]*)://'), ''));
  host := priceai_api_transit_normalized_host(p_url);
  if protocol not in ('http', 'https') or host is null then
    return null;
  end if;

  path := coalesce(substring(coalesce(p_url, '') from '^[a-zA-Z][a-zA-Z0-9+.-]*://[^/?#]+([^?#]*)'), '/');
  path := regexp_replace(path, '/+$', '');
  if path = '' then
    path := '/';
  end if;

  return protocol || '://' || host || path;
end;
$$;

update api_transit_submissions
set
  normalized_url = coalesce(normalized_url, priceai_api_transit_normalized_url(submitted_url)),
  normalized_host = coalesce(normalized_host, priceai_api_transit_normalized_host(submitted_url))
where normalized_url is null or normalized_host is null;

with ranked_submissions as (
  select
    id,
    first_value(id) over (
      partition by coalesce(normalized_host, normalized_url)
      order by created_at asc, id asc
    ) as root_id,
    row_number() over (
      partition by coalesce(normalized_host, normalized_url)
      order by created_at asc, id asc
    ) as row_number
  from api_transit_submissions
  where
    duplicate_of is null
    and review_status in ('pending', 'collector_todo', 'approved')
    and coalesce(normalized_host, normalized_url) is not null
),
duplicate_submissions as (
  select id, root_id
  from ranked_submissions
  where row_number > 1 and id <> root_id
)
update api_transit_submissions as submission
set duplicate_of = duplicate_submissions.root_id
from duplicate_submissions
where submission.id = duplicate_submissions.id;

with duplicate_counts as (
  select duplicate_of as root_id, count(*)::integer as duplicate_count
  from api_transit_submissions
  where duplicate_of is not null
  group by duplicate_of
)
update api_transit_submissions as submission
set duplicate_count = greatest(submission.duplicate_count, duplicate_counts.duplicate_count)
from duplicate_counts
where submission.id = duplicate_counts.root_id;

create index if not exists api_transit_stations_removed_at_idx
  on api_transit_stations(removed_at, published, updated_at desc);

create index if not exists api_transit_submissions_normalized_host_idx
  on api_transit_submissions(normalized_host, review_status, created_at desc);

create index if not exists api_transit_submissions_normalized_url_idx
  on api_transit_submissions(normalized_url, review_status, created_at desc);

create index if not exists api_transit_submissions_duplicate_of_idx
  on api_transit_submissions(duplicate_of);
