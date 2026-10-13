-- Recruiter activity notifications use the existing notification types so
-- existing notification constraints and job-match delivery remain compatible.

CREATE TABLE IF NOT EXISTS public.recruiter_candidate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('profile_viewed', 'resume_viewed', 'application_viewed')),
  recruiter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  application_id uuid REFERENCES public.job_applications(id) ON DELETE SET NULL,
  profile_view_id uuid REFERENCES public.profile_views(id) ON DELETE SET NULL,
  notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL,
  source text,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS recruiter_candidate_events_candidate_occurred_idx
  ON public.recruiter_candidate_events (candidate_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS recruiter_candidate_events_application_occurred_idx
  ON public.recruiter_candidate_events (application_id, occurred_at DESC)
  WHERE application_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS recruiter_candidate_events_dedupe_idx
  ON public.recruiter_candidate_events (
    recruiter_id, event_type, candidate_id, job_id, application_id, occurred_at DESC
  );
CREATE INDEX IF NOT EXISTS notifications_application_id_lookup_idx
  ON public.notifications (user_id, (data->>'applicationId'))
  WHERE type = 'application_status'
    AND data->>'applicationId' IS NOT NULL;

ALTER TABLE public.recruiter_candidate_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.recruiter_candidate_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.jobpoyt_is_notification_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.jobpoyt_is_notification_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.jobpoyt_is_notification_admin() TO authenticated;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'notifications'
    )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;

-- Restrictive policies ensure older permissive policies cannot expose or let
-- a recruiter alter another user's notifications. Admin access is retained.
DROP POLICY IF EXISTS notifications_owner_guard_select ON public.notifications;
CREATE POLICY notifications_owner_guard_select
  ON public.notifications AS RESTRICTIVE FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.jobpoyt_is_notification_admin());

DROP POLICY IF EXISTS notifications_owner_guard_update ON public.notifications;
CREATE POLICY notifications_owner_guard_update
  ON public.notifications AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.jobpoyt_is_notification_admin())
  WITH CHECK (user_id = auth.uid() OR public.jobpoyt_is_notification_admin());

DROP POLICY IF EXISTS notifications_owner_guard_insert ON public.notifications;
CREATE POLICY notifications_owner_guard_insert
  ON public.notifications AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.jobpoyt_is_notification_admin());

DROP POLICY IF EXISTS notifications_owner_guard_delete ON public.notifications;
CREATE POLICY notifications_owner_guard_delete
  ON public.notifications AS RESTRICTIVE FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.jobpoyt_is_notification_admin());

DROP POLICY IF EXISTS notifications_owner_select ON public.notifications;
CREATE POLICY notifications_owner_select
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.jobpoyt_is_notification_admin());

DROP POLICY IF EXISTS notifications_owner_update ON public.notifications;
CREATE POLICY notifications_owner_update
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.jobpoyt_is_notification_admin())
  WITH CHECK (user_id = auth.uid() OR public.jobpoyt_is_notification_admin());

DROP POLICY IF EXISTS notifications_owner_insert ON public.notifications;
CREATE POLICY notifications_owner_insert
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.jobpoyt_is_notification_admin());

DROP POLICY IF EXISTS notifications_owner_delete ON public.notifications;
CREATE POLICY notifications_owner_delete
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.jobpoyt_is_notification_admin());

CREATE OR REPLACE FUNCTION public.record_recruiter_candidate_event(
  p_event_type text,
  p_candidate_id uuid,
  p_job_id uuid DEFAULT NULL,
  p_application_id uuid DEFAULT NULL,
  p_source text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id uuid := auth.uid();
  v_recruiter_id uuid;
  v_candidate public.profiles%ROWTYPE;
  v_job_owner uuid;
  v_application_user uuid;
  v_application_job uuid;
  v_recipient_id uuid;
  v_event_id uuid;
  v_profile_view_id uuid;
  v_notification_id uuid;
  v_occurred_at timestamptz := clock_timestamp();
  v_title text;
  v_message text;
  v_category text;
  v_job_title text;
BEGIN
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT p.id INTO v_recruiter_id
  FROM public.profiles p
  WHERE p.role = 'recruiter'
    AND p.id = v_auth_user_id
  LIMIT 1;

  IF v_recruiter_id IS NULL THEN
    RAISE EXCEPTION 'A recruiter profile is required';
  END IF;

  IF p_event_type NOT IN ('profile_viewed', 'resume_viewed', 'application_viewed') THEN
    RAISE EXCEPTION 'Unsupported recruiter activity event';
  END IF;

  SELECT p.* INTO v_candidate
  FROM public.profiles p
  WHERE p.id = p_candidate_id
    AND p.role = 'job_seeker'
  LIMIT 1;

  IF NOT FOUND
    OR v_candidate.id = v_recruiter_id
    OR v_candidate.id = v_auth_user_id
  THEN
    RAISE EXCEPTION 'Candidate was not found or is not eligible';
  END IF;

  IF p_job_id IS NOT NULL THEN
    SELECT j.posted_by, j.title INTO v_job_owner, v_job_title
    FROM public.jobs j
    WHERE j.id = p_job_id;

    IF NOT FOUND
      OR (v_job_owner IS DISTINCT FROM v_recruiter_id AND v_job_owner IS DISTINCT FROM v_auth_user_id)
    THEN
      RAISE EXCEPTION 'Job is not owned by the authenticated recruiter';
    END IF;
  END IF;

  IF p_event_type IN ('resume_viewed', 'application_viewed') THEN
    IF p_event_type = 'application_viewed' AND p_application_id IS NULL THEN
      RAISE EXCEPTION 'Application is required for an application-view event';
    END IF;

    IF p_application_id IS NOT NULL THEN
      SELECT a.user_id, a.job_id, j.posted_by, j.title
      INTO v_application_user, v_application_job, v_job_owner, v_job_title
      FROM public.job_applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.id = p_application_id;

      IF NOT FOUND
        OR (v_job_owner IS DISTINCT FROM v_recruiter_id AND v_job_owner IS DISTINCT FROM v_auth_user_id)
        OR v_application_job IS DISTINCT FROM p_job_id AND p_job_id IS NOT NULL
        OR (
          v_application_user IS DISTINCT FROM v_candidate.id
        )
      THEN
        RAISE EXCEPTION 'Application does not belong to this candidate and recruiter';
      END IF;
    END IF;

    IF p_event_type = 'resume_viewed' AND p_application_id IS NULL AND NOT EXISTS (
      SELECT 1 FROM public.resume_unlocks ru
      WHERE ru.recruiter_id = v_recruiter_id
        AND ru.candidate_id = v_candidate.id
    ) THEN
      RAISE EXCEPTION 'Resume must be unlocked before it can be viewed';
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      concat_ws(
        ':',
        p_event_type,
        v_recruiter_id,
        v_candidate.id,
        COALESCE(p_application_id::text, ''),
        COALESCE(p_job_id::text, '')
      ),
      0
    )
  );

  SELECT e.id INTO v_event_id
  FROM public.recruiter_candidate_events e
  WHERE e.event_type = p_event_type
    AND e.recruiter_id = v_recruiter_id
    AND e.candidate_id = v_candidate.id
    AND e.job_id IS NOT DISTINCT FROM p_job_id
    AND e.application_id IS NOT DISTINCT FROM p_application_id
    AND e.occurred_at >= v_occurred_at - interval '1 minute'
  ORDER BY e.occurred_at DESC
  LIMIT 1;

  IF v_event_id IS NOT NULL THEN
    RETURN v_event_id;
  END IF;

  IF p_event_type = 'profile_viewed' THEN
    INSERT INTO public.profile_views (recruiter_id, candidate_id, job_id, source, viewed_at)
    VALUES (v_recruiter_id, v_candidate.id, p_job_id, p_source, v_occurred_at)
    RETURNING id INTO v_profile_view_id;
    v_title := 'A recruiter has recently shown interest in your profile';
    v_message := 'A recruiter recently viewed your candidate profile.';
    v_category := 'Profile Performance';
  ELSIF p_event_type = 'resume_viewed' THEN
    v_title := 'Your resume for job application was viewed';
    v_message := 'A recruiter opened your resume.';
    v_category := 'Application History';
  ELSE
    v_title := 'Your job application was viewed by recruiter';
    v_message := format('A recruiter viewed your application%s.',
      CASE WHEN v_job_title IS NOT NULL THEN format(' for %s', v_job_title) ELSE '' END);
    v_category := 'Application History';
  END IF;

  v_recipient_id := v_candidate.id;

  INSERT INTO public.recruiter_candidate_events (
    event_type, recruiter_id, candidate_id, job_id, application_id,
    profile_view_id, source, occurred_at
  )
  VALUES (
    p_event_type, v_recruiter_id, v_candidate.id, p_job_id, p_application_id,
    v_profile_view_id, p_source, v_occurred_at
  )
  RETURNING id INTO v_event_id;

  INSERT INTO public.notifications (user_id, type, title, message, data, read, created_at)
  VALUES (
    v_recipient_id,
    'application_status',
    v_title,
    v_message,
    jsonb_build_object(
      'eventType', p_event_type,
      'category', v_category,
      'recruiterId', v_recruiter_id,
      'candidateId', v_candidate.id,
      'jobId', p_job_id,
      'applicationId', p_application_id,
      'profileViewId', v_profile_view_id,
      'eventId', v_event_id,
      'occurredAt', v_occurred_at
    ),
    false,
    v_occurred_at
  )
  RETURNING id INTO v_notification_id;

  UPDATE public.recruiter_candidate_events
  SET notification_id = v_notification_id
  WHERE id = v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_recruiter_candidate_event(text, uuid, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_recruiter_candidate_event(text, uuid, uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_job_owner_of_application(p_application_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_application public.job_applications%ROWTYPE;
  v_job public.jobs%ROWTYPE;
  v_recruiter_user_id uuid;
  v_notification_id uuid;
BEGIN
  SELECT a.* INTO v_application
  FROM public.job_applications a
  WHERE a.id = p_application_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles candidate
      WHERE candidate.role = 'job_seeker'
        AND candidate.id = a.user_id
        AND candidate.id = v_user_id
    );

  IF NOT FOUND OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'Application is not owned by the authenticated candidate';
  END IF;

  SELECT * INTO v_job
  FROM public.jobs
  WHERE id = v_application.job_id;

  IF NOT FOUND OR v_job.posted_by IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT p.id
  INTO v_recruiter_user_id
  FROM public.profiles p
  WHERE p.id = v_job.posted_by
    AND p.role = 'recruiter'
  LIMIT 1;

  IF v_recruiter_user_id IS NULL THEN
    RAISE EXCEPTION 'The job owner recruiter profile could not be resolved';
  END IF;
  IF v_recruiter_user_id = v_user_id THEN
    RETURN NULL;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(concat('new-application:', p_application_id), 0));

  SELECT n.id INTO v_notification_id
  FROM public.notifications n
  WHERE n.user_id = v_recruiter_user_id
    AND n.type = 'application_status'
    AND n.data->>'applicationId' = p_application_id::text
  LIMIT 1;

  IF v_notification_id IS NOT NULL THEN
    RETURN v_notification_id;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, data, read)
  VALUES (
    v_recruiter_user_id,
    'application_status',
    'New Applicant',
    format('A candidate has applied for %s at %s.',
      COALESCE(v_job.title, 'your job posting'),
      COALESCE(v_job.company_name, 'your company')),
    jsonb_build_object('jobId', v_job.id, 'applicationId', p_application_id),
    false
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_job_owner_of_application(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_job_owner_of_application(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_candidate_of_job_invitation(
  p_candidate_id uuid,
  p_job_id uuid,
  p_match_score integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id uuid := auth.uid();
  v_recruiter_id uuid;
  v_candidate public.profiles%ROWTYPE;
  v_job public.jobs%ROWTYPE;
  v_notification_id uuid;
BEGIN
  SELECT p.id INTO v_recruiter_id
  FROM public.profiles p
  WHERE p.role = 'recruiter'
    AND p.id = v_auth_user_id
  LIMIT 1;

  IF v_recruiter_id IS NULL THEN
    RAISE EXCEPTION 'A recruiter profile is required';
  END IF;

  SELECT * INTO v_candidate
  FROM public.profiles
  WHERE id = p_candidate_id
    AND role = 'job_seeker'
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidate was not found';
  END IF;

  SELECT * INTO v_job
  FROM public.jobs
  WHERE id = p_job_id
    AND posted_by = v_recruiter_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job is not owned by the authenticated recruiter';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, data, read)
  VALUES (
    v_candidate.id,
    'job_match',
    format('You are a %s%% match', GREATEST(0, LEAST(100, p_match_score))),
    format('A recruiter invited you to apply for %s at %s.',
      COALESCE(v_job.title, 'this opportunity'),
      COALESCE(v_job.company_name, 'the company')),
    jsonb_build_object('jobId', v_job.id, 'recruiterId', v_recruiter_id, 'matchScore', p_match_score, 'source', 'ai_recommended_candidates'),
    false
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_candidate_of_job_invitation(uuid, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_candidate_of_job_invitation(uuid, uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.jobpoyt_notify_candidate_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id uuid := auth.uid();
  v_job public.jobs%ROWTYPE;
  v_recruiter_id uuid;
  v_candidate_id uuid;
  v_candidate_user_id uuid;
  v_title text;
  v_label text;
  v_occurred_at timestamptz := clock_timestamp();
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.id INTO v_recruiter_id
  FROM public.profiles p
  JOIN public.jobs j
    ON j.id = NEW.job_id
    AND j.posted_by = p.id
  WHERE p.role = 'recruiter'
    AND p.id = v_auth_user_id
  LIMIT 1;

  IF v_recruiter_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_job FROM public.jobs WHERE id = NEW.job_id;
  SELECT p.id, p.id
  INTO v_candidate_id, v_candidate_user_id
  FROM public.profiles p
  WHERE p.id = NEW.user_id
  LIMIT 1;

  v_label := replace(NEW.status, '_', ' ');
  v_title := CASE NEW.status
    WHEN 'shortlisted' THEN 'Application shortlisted'
    WHEN 'under_review' THEN 'Application moved to under review'
    WHEN 'accepted' THEN 'Application accepted'
    WHEN 'rejected' THEN 'Application rejected'
    ELSE 'Application status updated'
  END;

  INSERT INTO public.notifications (user_id, type, title, message, data, read, created_at)
  VALUES (
    COALESCE(v_candidate_user_id, NEW.user_id),
    'application_status',
    v_title,
    format('Your application%s was moved to %s.',
      CASE WHEN v_job.title IS NOT NULL THEN format(' for %s', v_job.title) ELSE '' END,
      v_label),
    jsonb_build_object(
      'eventType', 'application_status_changed',
      'category', 'Application History',
      'applicationId', NEW.id,
      'jobId', NEW.job_id,
      'recruiterId', v_recruiter_id,
      'candidateId', COALESCE(v_candidate_id, NEW.user_id),
      'previousStatus', OLD.status,
      'status', NEW.status,
      'occurredAt', v_occurred_at
    ),
    false,
    v_occurred_at
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobpoyt_notify_candidate_application_status_change ON public.job_applications;
CREATE TRIGGER jobpoyt_notify_candidate_application_status_change
  AFTER UPDATE OF status ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.jobpoyt_notify_candidate_application_status_change();

REVOKE ALL ON FUNCTION public.jobpoyt_notify_candidate_application_status_change() FROM PUBLIC, anon, authenticated;
