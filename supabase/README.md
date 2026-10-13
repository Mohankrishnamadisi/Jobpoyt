# Supabase database changes

The repository does not contain the original schema migrations. The new
`20261013090000_recruiter_activity_notifications.sql` migration therefore
extends the existing Supabase schema used by the application; it is not a
replacement for that schema.

Before applying it, verify that the target project has these existing columns
and relationships, which are already used by the frontend:

- `profiles`: `id`, `role`
- `jobs`: `id`, `posted_by`, `title`, `company_name`
- `job_applications`: `id`, `user_id`, `job_id`, `status`
- `profile_views`: `id`, `recruiter_id`, `candidate_id`, `job_id`, `source`, `viewed_at`
- `resume_unlocks`: `recruiter_id`, `candidate_id`
- `notifications`: `id`, `user_id`, `type`, `title`, `message`, `data`, `read`, `created_at`

The target schema identifies a profile by `profiles.id`, which matches the
Supabase Auth user ID used by this application. Activity records reference
profile IDs, and notification recipients use that same ID. Application and job
ownership checks compare `job_applications.user_id` and `jobs.posted_by` to
`profiles.id`; this migration does not require a `profiles.user_id` column.

Apply the migration once to the target project. If the project's CLI migration
history is already managed, use the normal Supabase migration deploy flow. If
the existing schema was created outside this repository, inspect the columns
above first and run the migration in the Supabase SQL Editor instead of
blindly pushing a partial migration history.

The migration keeps existing notification type values, installs secure
activity RPCs and status-change notification handling, and adds restrictive
notification RLS guards. It adds `notifications` to `supabase_realtime` when
that publication exists and the table is not already present. The dashboard
also polls every 30 seconds if Realtime is unavailable.

After applying it, sign in as a candidate and recruiter to verify profile and
resume actions, application views, status transitions, read/unread behavior,
and that each account cannot read another account's notifications.

## Two-account verification

1. Create a candidate account with a profile and resume, and a recruiter
   account that owns a published job. Apply to that job as the candidate.
2. As the recruiter, open the candidate from candidate search and from the
   job's applicant list. The candidate should receive the profile-interest and
   application-view notifications with the requested categories. Reopening or
   refreshing within the one-minute deduplication window must not add a second
   event.
3. Unlock the candidate's resume but do not open it. No resume-view
   notification should arrive. Open the resume preview or use an explicit
   resume action; the candidate should then receive one resume-view
   notification with the application and job references when available.
4. Change the application from Applied to Under Review and then Shortlisted.
   Verify one notification per changed status. Saving the same status again
   must not create another notification. Test Rejected or Accepted only if
   those transitions are enabled for the test job.
5. Mark one notification read, then use Mark all read. The read state and
   unread count should update without a page reload. Verify older/newer
   notifications appear under Earlier/Today respectively.
6. As the candidate, try selecting or updating a notification belonging to the
   recruiter or a different candidate. RLS must return no row/deny the update.
   As the recruiter, try inserting a notification with another user's
   `user_id`; RLS must reject it.
7. Confirm one Premium job match is delivered immediately and one Free job
   match only after its existing scheduled delivery time. Their type, metadata,
   and read behavior must remain unchanged.

The repository currently has no checked-in original schema migrations or live
database test configuration, so database trigger/RLS integration tests must be
run against the target Supabase project after applying the migration.
