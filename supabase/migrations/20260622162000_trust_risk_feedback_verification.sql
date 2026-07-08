alter table offer_feedback
  add column if not exists verification_status text not null default 'not_needed',
  add column if not exists verification_result text,
  add column if not exists verification_message text,
  add column if not exists verification_checked_at timestamptz,
  add column if not exists created_collection_job_id text references collection_jobs(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'offer_feedback_verification_status_check'
  ) then
    alter table offer_feedback
      add constraint offer_feedback_verification_status_check
      check (
        verification_status in (
          'not_needed',
          'pending',
          'running',
          'auto_fixed',
          'recollection_created',
          'manual_review',
          'failed'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'offer_feedback_verification_result_check'
  ) then
    alter table offer_feedback
      add constraint offer_feedback_verification_result_check
      check (
        verification_result is null
        or verification_result in (
          'offer_changed',
          'item_removed',
          'out_of_stock',
          'still_available',
          'recollection_created',
          'inconclusive',
          'blocked'
        )
      );
  end if;
end $$;

create index if not exists offer_feedback_verification_status_idx
  on offer_feedback(verification_status, created_at desc);

create index if not exists offer_feedback_created_collection_job_id_idx
  on offer_feedback(created_collection_job_id);
