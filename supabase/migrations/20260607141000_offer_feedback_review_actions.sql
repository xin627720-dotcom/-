alter table offer_feedback
  add column if not exists user_expected_action text not null default 'recheck',
  add column if not exists suggested_action text not null default 'recollect',
  add column if not exists evidence_text text,
  add column if not exists evidence_urls jsonb not null default '[]'::jsonb,
  add column if not exists ai_review_result jsonb;

create index if not exists offer_feedback_suggested_action_idx on offer_feedback(suggested_action);
