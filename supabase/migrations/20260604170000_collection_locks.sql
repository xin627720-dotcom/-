alter table sources add column if not exists collector_lock_until timestamptz;
alter table sources add column if not exists collector_lock_owner text;
alter table sources add column if not exists collector_lock_started_at timestamptz;

create index if not exists sources_collector_lock_until_idx on sources(collector_lock_until);

create or replace function acquire_source_collection_lock(
  p_source_id text,
  p_owner text,
  p_lock_seconds integer default 600
)
returns table(acquired boolean, lock_owner text, lock_until timestamptz)
language plpgsql
security definer
as $$
declare
  v_now timestamptz := now();
  v_lock_until timestamptz := now() + make_interval(secs => greatest(60, least(coalesce(p_lock_seconds, 600), 3600)));
begin
  update sources
  set
    collector_lock_owner = p_owner,
    collector_lock_started_at = v_now,
    collector_lock_until = v_lock_until,
    updated_at = v_now
  where id = p_source_id
    and (
      collector_lock_until is null
      or collector_lock_until < v_now
      or collector_lock_owner = p_owner
    );

  if found then
    return query select true, p_owner, v_lock_until;
    return;
  end if;

  return query
  select
    false,
    sources.collector_lock_owner,
    sources.collector_lock_until
  from sources
  where sources.id = p_source_id;
end;
$$;

create or replace function release_source_collection_lock(
  p_source_id text,
  p_owner text
)
returns boolean
language plpgsql
security definer
as $$
begin
  update sources
  set
    collector_lock_owner = null,
    collector_lock_started_at = null,
    collector_lock_until = null,
    updated_at = now()
  where id = p_source_id
    and collector_lock_owner = p_owner;

  return found;
end;
$$;
