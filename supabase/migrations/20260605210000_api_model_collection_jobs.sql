alter table collection_jobs
drop constraint if exists collection_jobs_job_type_check;

alter table collection_jobs
add constraint collection_jobs_job_type_check
check (job_type in ('all', 'source', 'official_prices', 'api_models'));
