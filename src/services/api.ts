import { supabase } from './supabase';
import type { JobSeeker, Recruiter, Job } from '../types';
import { getFreshnessDate, diversifyJobsByCompany } from '@utils/index';
import { isCandidatePremium, isSubscriptionActive } from '@utils/candidateSubscriptionHelpers';
import { ensureRecruiterWelcomeBenefit, restoreRecruiterWelcomeJobPost, reserveRecruiterWelcomeJobPost } from '@utils/recruiterWelcomeBenefits';
import { buildKeywordSearchVariants, detectRoleFamily, matchesRoleSearchIntent, scoreRoleSearchMatch } from '@utils/roleSearch';

const normalizeJob = (job: Record<string, any>): Job => ({
  ...job,
  company_name: job.company_name || job.companyName || '',
  jobType: job.jobType || job.job_type || job.work_type || undefined,
  workMode: job.workMode || job.work_mode || undefined,
  salaryMin: job.salaryMin ?? job.salary_min,
  salaryMax: job.salaryMax ?? job.salary_max,
  positionsAvailable: job.positionsAvailable ?? job.positions_available ?? job.number_of_positions,
  positions_available: job.positions_available ?? job.positionsAvailable ?? job.number_of_positions,
  screeningQuestions: job.screeningQuestions || job.screening_questions || [],
  screening_questions: job.screening_questions || job.screeningQuestions || [],
  applicationLink: job.applicationLink || job.application_link || job.applicationUrl || job.application_url || undefined,
  application_link: job.application_link || job.applicationLink || job.applicationUrl || job.application_url || undefined,
  applicationUrl: job.applicationUrl || job.application_link || job.applicationLink || job.application_url || undefined,
  application_url: job.application_url || job.application_link || job.applicationLink || job.applicationUrl || undefined,
  createdAt: job.createdAt ?? job.created_at,
  updatedAt: job.updatedAt ?? job.updated_at,
} as Job);

const parseNumericExperienceYears = (value: unknown): number | null => {
  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text)) return null;
  const years = Number(text);
  return Number.isNaN(years) ? null : years;
};

const matchesExperienceYears = (jobExperience: unknown, years: number): boolean => {
  const experienceText = String(jobExperience ?? '').trim().toLowerCase();
  if (!experienceText) return false;

  if (experienceText.includes('fresher')) {
    return years === 0;
  }

  const rangeMatch = experienceText.match(/(\d+)\s*(?:-|to)\s*(\d+)/i);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);
    if (!Number.isNaN(min) && !Number.isNaN(max)) {
      return years >= min && years <= max;
    }
  }

  const plusMatch = experienceText.match(/(\d+)\s*\+/);
  if (plusMatch) {
    const min = Number(plusMatch[1]);
    if (!Number.isNaN(min)) {
      return years >= min;
    }
  }

  const singleMatch = experienceText.match(/(\d+)/);
  if (singleMatch) {
    const single = Number(singleMatch[1]);
    if (!Number.isNaN(single)) {
      return years === single;
    }
  }

  return false;
};

// User operations
export const userService = {
  async createProfile(userId: string, profileData: Partial<JobSeeker | Recruiter>) {
    const { data, error } = await supabase
      .from('profiles')
      .insert([{ id: userId, ...profileData }])
      .select();
    if (error) throw error;
    return data[0];
  },

  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async ensureRecruiterProfile(userId: string, profileData: Partial<Recruiter> & Record<string, unknown> = {}) {
    const { data: existing, error: existingError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') throw existingError;
    if (existing) {
      if (existing.role !== 'recruiter') {
        const { data, error } = await supabase
          .from('profiles')
          .update({ role: 'recruiter', updated_at: new Date().toISOString() })
          .eq('id', userId)
          .select()
          .single();
        if (error) throw error;
        await ensureRecruiterWelcomeBenefit(userId).catch(() => undefined);
        return data;
      }
      await ensureRecruiterWelcomeBenefit(userId).catch(() => undefined);
      return existing;
    }

    let authUser: any = null;
    if (!profileData.name || !profileData.email) {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userError && userData?.user?.id === userId) {
        authUser = userData.user;
      }
    }

    const payload: Record<string, unknown> = {
      id: userId,
      role: 'recruiter',
      name:
        profileData.hr_name ||
        profileData.name ||
        profileData.company_name ||
        authUser?.user_metadata?.name ||
        'Recruiter',
      email:
        profileData.company_email ||
        profileData.email ||
        authUser?.email ||
        null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('profiles').insert([payload]).select().single();
    if (error) throw error;
    await ensureRecruiterWelcomeBenefit(userId).catch(() => undefined);
    return data;
  },

  async updateProfile(userId: string, updates: Record<string, unknown>) {
    const payload: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() };

    // Keep avatar_url in sync with profile_image_url
    if (updates.profile_image_url && !updates.avatar_url) {
      payload.avatar_url = updates.profile_image_url;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select();
    if (error) throw error;
    return data[0];
  },

  async uploadResume(userId: string, file: File) {
    const fileName = `${userId}-${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('resumes')
      .upload(fileName, file);
    if (error) throw error;

    const { data: publicData } = supabase.storage.from('resumes').getPublicUrl(data.path);
    return publicData.publicUrl;
  },

  async uploadProfileImage(userId: string, file: File) {
    const fileName = `${userId}-avatar-${Date.now()}.${file.name.split('.').pop()}`;
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });
    if (error) throw error;

    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(data.path);
    return publicData.publicUrl;
  },

  async uploadCompanyLogo(userId: string, file: File) {
    const fileName = `${userId}-logo-${Date.now()}.${file.name.split('.').pop()}`;
    const { data, error } = await supabase.storage
      .from('company-logos')
      .upload(fileName, file);
    if (error) throw error;

    const { data: publicData } = supabase.storage.from('company-logos').getPublicUrl(data.path);
    return publicData.publicUrl;
  },
};

// Recruiter operations
export const recruiterService = {
  async createRecruiterProfile(userId: string, profileData: Partial<Recruiter> & Record<string, any>) {
    // Map incoming keys to recruiters table schema
    const payload: Record<string, unknown> = {
      id: userId,
      company_name: profileData.company_name || profileData.companyName || null,
      company_website: profileData.company_website || profileData.companyWebsite || null,
      company_logo_url: profileData.company_logo_url || profileData.company_logo || profileData.companyLogo || null,
      industry: profileData.industry || profileData.industryType || null,
      employee_count: profileData.employee_count || profileData.employeeCount || null,
      description: profileData.description || profileData.company_description || profileData.companyDescription || null,
      // keep legacy `location` if provided
      location: profileData.location || null,
      company_email: profileData.company_email || profileData.companyEmail || null,
      company_phone: profileData.company_phone || profileData.companyPhone || null,
      // company_address: prefer explicit company_address or companyAddress, fall back to location
      company_address:
        profileData.company_address || profileData.companyAddress || profileData.location || null,
      // GST/CIN and HR contact fields
      gst_number: profileData.gst_number || profileData.gstNumber || null,
      cin_number: profileData.cin_number || profileData.cinNumber || null,
      hr_name: profileData.hr_name || profileData.hrContactPerson || profileData.hrContact || null,
      hr_email: profileData.hr_email || profileData.hrEmail || null,
      hr_phone: profileData.hr_phone || profileData.hrPhone || null,
      company_name_original: profileData.company_name || profileData.companyName || null,
    };

    // Log payload for debugging to verify what is being sent to Supabase
    // eslint-disable-next-line no-console
    console.info('createRecruiterProfile payload:', JSON.parse(JSON.stringify(payload)));

    const { data, error } = await supabase
      .from('recruiters')
      .insert([{ ...payload }])
      .select();
    if (error) throw error;

    await userService.ensureRecruiterProfile(userId, {
      name: payload.hr_name as string,
      email: payload.company_email as string,
    } as Partial<Recruiter> & Record<string, unknown>);

    return data[0];
  },

  async getRecruiterProfile(userId: string) {
    const { data, error } = await supabase
      .from('recruiters')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },

  async updateRecruiterProfile(userId: string, updates: Record<string, unknown>) {
    const payload: Record<string, unknown> = {};
    const keyMap: Record<string, string> = {
      companyName: 'company_name',
      companyEmail: 'company_email',
      companyPhone: 'company_phone',
      companyWebsite: 'company_website',
      companyAddress: 'company_address',
      companyLogoUrl: 'company_logo_url',
      companyDescription: 'description',
      industryType: 'industry',
      employeeCount: 'employee_count',
      hrContactPerson: 'hr_name',
      hrEmail: 'hr_email',
      hrPhone: 'hr_phone',
      gstNumber: 'gst_number',
      cinNumber: 'cin_number',
      location: 'location',
    };

    Object.entries(updates).forEach(([key, value]) => {
      const dbKey = keyMap[key] || key;
      payload[dbKey] = value;
    });

    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('recruiters')
      .update(payload)
      .eq('id', userId)
      .select();
    if (error) throw error;
    return data[0];
  },

  async getRecruiterStats(recruiterId: string) {
    const { data: jobs, error: jobError } = await supabase
      .from('jobs')
      .select('id, status')
      .eq('posted_by', recruiterId);
    if (jobError) throw jobError;

    const { data: applications, error: appError } = await supabase
      .from('job_applications')
      .select('id, status, priority_application')
      .in(
        'job_id',
        jobs?.map((j) => j.id) || []
      );
    if (appError) throw appError;

    const stats = {
      active_jobs: jobs?.filter((j) => j.status === 'published').length || 0,
      total_jobs: jobs?.length || 0,
      total_applicants: applications?.length || 0,
      shortlisted: applications?.filter((a) => a.status === 'shortlisted').length || 0,
      rejected: applications?.filter((a) => a.status === 'rejected').length || 0,
      priority_applicants: applications?.filter((a) => a.priority_application).length || 0,
    };
    return stats;
  },
};

// Job operations
export const jobService = {
  async getJobs(filters?: Record<string, unknown>, page = 1, limit = 20) {
    let query = supabase.from('jobs').select('*', { count: 'exact' }).eq('status', 'published');

    const keywordInput = filters?.keyword ? String(filters.keyword).trim() : '';
    const keywordLower = keywordInput.toLowerCase();
    const keywordVariants = keywordInput ? buildKeywordSearchVariants(keywordInput) : [];
    const isFrontendUiSearch = Boolean(keywordInput) && detectRoleFamily(keywordInput) === 'frontend_ui';
    const experienceInput = filters?.experience ? String(filters.experience).trim() : '';
    const numericExperienceYears = parseNumericExperienceYears(experienceInput);

    const locationTerms = (Array.isArray(filters?.location) ? filters.location : [filters?.location])
      .map((value) => String(value || '').trim())
      .filter(Boolean);
    if (locationTerms.length > 0) {
      query = locationTerms.length === 1
        ? query.ilike('location', `%${locationTerms[0]}%`)
        : query.or(locationTerms.map((term) => `location.ilike.%${term.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`).join(','));
    }
    if (keywordInput && !isFrontendUiSearch) {
      const escapedKeyword = keywordInput.replace(/%/g, '\\%').replace(/_/g, '\\_');
      const variantClauses = keywordVariants.length > 0
        ? keywordVariants.map((term) => {
            const escapedTerm = term.replace(/%/g, '\\%').replace(/_/g, '\\_');
            return `title.ilike.%${escapedTerm}%,company_name.ilike.%${escapedTerm}%,description.ilike.%${escapedTerm}%,skills.cs.{${escapedTerm}}`;
          })
        : [`title.ilike.%${escapedKeyword}%,company_name.ilike.%${escapedKeyword}%,description.ilike.%${escapedKeyword}%,skills.cs.{${escapedKeyword}}`];

      query = query.or([
        `title.ilike.%${escapedKeyword}%,company_name.ilike.%${escapedKeyword}%,description.ilike.%${escapedKeyword}%,skills.cs.{${escapedKeyword}}`,
        ...variantClauses,
      ].join(','));
    }
    if (Array.isArray(filters?.jobType) && filters.jobType.length > 0) {
      query = query.in('job_type', filters.jobType as string[]);
    } else if (filters?.jobType) {
      query = query.eq('job_type', filters.jobType as string);
    }
    if (Array.isArray(filters?.workMode) && filters.workMode.length > 0) {
      query = query.in('work_mode', filters.workMode as string[]);
    } else if (filters?.workMode) {
      query = query.eq('work_mode', filters.workMode as string);
    }
    if (Array.isArray(filters?.category) && filters.category.length > 0) {
      const categoryTerms = (filters.category as string[])
        .map((value) => String(value).trim())
        .filter(Boolean);

      if (categoryTerms.length > 0) {
        const exactCategoryClauses = categoryTerms.map((term) => `category.eq.${JSON.stringify(term)}`);
        const titleClauses = categoryTerms.map((term) => `title.ilike.%${term.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`);
        const descriptionClauses = categoryTerms.map((term) => `description.ilike.%${term.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`);
        const companyClauses = categoryTerms.map((term) => `company_name.ilike.%${term.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`);
        const skillClauses = categoryTerms.map((term) => `skills.cs.{${term}}`);

        const allClauses = [
          ...exactCategoryClauses,
          ...titleClauses,
          ...descriptionClauses,
          ...companyClauses,
          ...skillClauses,
        ];

        query = query.or(allClauses.join(','));
      }
    } else if (filters?.category) {
      const term = String(filters.category).trim();
      const escaped = term.replace(/%/g, '\\%').replace(/_/g, '\\_');
      query = query.or(
        `category.eq.${JSON.stringify(term)},title.ilike.%${escaped}%,description.ilike.%${escaped}%,company_name.ilike.%${escaped}%,skills.cs.{${term}}`
      );
    }
    if (experienceInput && numericExperienceYears === null) {
      query = query.ilike('experience', `%${experienceInput}%`);
    }
    if (filters?.education) {
      query = query.ilike('education', `%${filters.education}%`);
    }
    if (filters?.freshness) {
      const fromDate = getFreshnessDate(filters.freshness as string);
      if (fromDate) {
        query = query.gte('created_at', fromDate);
      }
    }

    const needsInMemoryFiltering = numericExperienceYears !== null;

    if (!needsInMemoryFiltering) {
      let data: Record<string, any>[] = [];
      let count: number | null = null;

      if (isFrontendUiSearch) {
        const batchSize = 1000;
        let offset = 0;

        while (true) {
          const response = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + batchSize - 1);

          if (response.error) throw response.error;

          const batch = response.data || [];
          data = data.concat(batch);
          count = response.count;
          offset += batch.length;

          if (batch.length < batchSize || (count !== null && offset >= count)) {
            break;
          }
        }
      } else {
        const pageStart = (page - 1) * limit;
        const windowSize = Math.max(limit * 20, 500);
        const response = await query
          .order('created_at', { ascending: false })
          .range(pageStart, pageStart + windowSize - 1);

        if (response.error) throw response.error;

        data = response.data || [];
        count = response.count;
      }

      const normalizedJobs = data.map(normalizeJob);
      const baseMatches = keywordInput
        ? normalizedJobs.filter((job) => {
            const skills = Array.isArray(job.skills) ? job.skills : [];
            const directMatch = (
              String(job.title || '').toLowerCase().includes(keywordLower)
              || String(job.company_name || '').toLowerCase().includes(keywordLower)
              || String(job.description || '').toLowerCase().includes(keywordLower)
              || skills.some((skill) => String(skill || '').toLowerCase().includes(keywordLower))
            );

            return directMatch || matchesRoleSearchIntent(job as Record<string, unknown>, keywordInput);
          })
        : normalizedJobs;

      const diversified = diversifyJobsByCompany(baseMatches);
      const startIndex = (page - 1) * limit;
      const pageJobs = diversified.slice(startIndex, startIndex + limit);

      return {
        data: pageJobs,
        total: isFrontendUiSearch ? baseMatches.length : count || baseMatches.length || 0,
      };
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    let normalizedJobs = (data || []).map(normalizeJob);

    if (numericExperienceYears !== null) {
      normalizedJobs = normalizedJobs.filter((job) =>
        matchesExperienceYears((job as Record<string, unknown>).experience, numericExperienceYears)
      );
    }

    const matchesKeyword = (value: unknown) => String(value || '').toLowerCase().includes(keywordLower);

    const filteredJobs = keywordInput ? normalizedJobs.filter((job) => {
      const skills = Array.isArray(job.skills) ? job.skills : [];

      const literalMatch = (
        matchesKeyword(job.title)
        || matchesKeyword(job.company_name)
        || matchesKeyword(job.description)
        || skills.some((skill) => matchesKeyword(skill))
      );

      return literalMatch || matchesRoleSearchIntent(job as Record<string, unknown>, keywordInput);
    }) : normalizedJobs;

    const rankedJobs = keywordInput
      ? [...filteredJobs].sort((a, b) => scoreRoleSearchMatch(b as Record<string, unknown>, keywordInput) - scoreRoleSearchMatch(a as Record<string, unknown>, keywordInput))
      : filteredJobs;

    const diversified = diversifyJobsByCompany(rankedJobs);

    const startIndex = (page - 1) * limit;
    const paginatedJobs = diversified.slice(startIndex, startIndex + limit);

    return { data: paginatedJobs, total: diversified.length };
  },

  async getJobById(id: string) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return normalizeJob(data);
  },

  async getFeaturedJobs(limit = 6) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('featured', true)
      .eq('status', 'published')
      .limit(limit);
    if (error) throw error;
    return (data || []).map(normalizeJob);
  },

  async getLatestJobs(limit = 10) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(normalizeJob);
  },

  async createJob(userId: string, jobData: Partial<Job>) {
    if (!userId) throw new Error('Missing userId for createJob');

    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const hasUnlimitedRecruiterPlan = !subscriptionError && subscriptionData && ['premium', 'pro', 'enterprise'].includes(String(subscriptionData.plan || '').toLowerCase());

    if (!hasUnlimitedRecruiterPlan) {
      try {
        const welcomeCheck = await ensureRecruiterWelcomeBenefit(userId);
        if ((welcomeCheck.free_job_posts_total - welcomeCheck.free_job_posts_used) <= 0) {
          throw new Error('Your free job posting allowance has been used.');
        }
      } catch (welcomeError) {
        if (welcomeError instanceof Error && welcomeError.message.includes('free job posting allowance')) {
          throw welcomeError;
        }
      }

      try {
        const reservation = await reserveRecruiterWelcomeJobPost(userId);
        if (!reservation.allowed) {
          throw new Error('Your free job posting allowance has been used.');
        }

        try {
          // insert the job only after the free allowance is reserved
          const { data, error } = await supabase
            .from('jobs')
            .insert([{
              ...jobData,
              posted_by: userId,
              status: 'published',
            }])
            .select();
          if (error) {
            await restoreRecruiterWelcomeJobPost(userId, 1).catch(() => undefined);
            throw error;
          }
          return data?.[0] ? normalizeJob(data[0]) : null;
        } catch (jobError) {
          await restoreRecruiterWelcomeJobPost(userId, 1).catch(() => undefined);
          throw jobError;
        }
      } catch (reservationError) {
        if (reservationError instanceof Error && reservationError.message.includes('free job posting allowance')) {
          throw reservationError;
        }
        throw reservationError;
      }
    }

    // List of ALL camelCase properties to EXCLUDE from the payload
    // These should NEVER be sent to Supabase as they are not actual database columns
    const camelCasePropertiesToRemove = new Set([
      'salaryMax',
      'salaryMin',
      'positionsAvailable',
      'companyLogoUrl',
      'applicationDeadline',
      'applicationLink',
      'applicationUrl',
      'workMode',
      'screeningQuestions',
      'applicationsCount',
      'createdAt',
      'updatedAt',
      'jobType',
      'postedBy',
    ]);

    // Fields that should NEVER be sent to Supabase (read-only)
    const readOnlyFields = new Set(['created_at', 'applications_count']);

    // Build clean payload with ONLY valid snake_case database columns
    const createPayload: Record<string, unknown> = {
      posted_by: userId,
      status: 'published',
    };

    Object.entries(jobData).forEach(([key, value]) => {
      // Skip camelCase properties - they are not database columns
      if (camelCasePropertiesToRemove.has(key)) {
        console.log(`[createJob] Removing camelCase property: ${key}`);
        return;
      }

      // Skip read-only fields
      if (readOnlyFields.has(key)) {
        console.log(`[createJob] Skipping read-only field: ${key}`);
        return;
      }

      // Only add if value is defined
      if (value !== undefined && value !== null) {
        createPayload[key] = value;
      }
    });

    // Normalize arrays
    if (!Array.isArray(createPayload.skills)) {
      createPayload.skills = [];
    }
    if (!Array.isArray(createPayload.screening_questions)) {
      createPayload.screening_questions = [];
    }

    // Convert numeric string fields to numbers
    if (createPayload.positions_available && typeof createPayload.positions_available === 'string') {
      createPayload.positions_available = parseInt(createPayload.positions_available as string, 10) || 1;
    }
    if (createPayload.salary_min && typeof createPayload.salary_min === 'string') {
      createPayload.salary_min = parseInt(createPayload.salary_min as string, 10);
    }
    if (createPayload.salary_max && typeof createPayload.salary_max === 'string') {
      createPayload.salary_max = parseInt(createPayload.salary_max as string, 10);
    }

    console.log('CREATE PAYLOAD', JSON.stringify(createPayload, null, 2));
    console.log('[createJob] Payload keys:', Object.keys(createPayload));

    const { data, error } = await supabase
      .from('jobs')
      .insert([createPayload])
      .select();
    if (error) throw error;

    const createdJob = data?.[0] ? normalizeJob(data[0]) : null;

    try {
      if (createdJob?.id) {
        // Trigger priority job match notifications via Edge Function
        // The Edge Function will:
        // 1. Verify the caller is the job owner (authorization)
        // 2. Evaluate the new job against all candidate profiles
        // 3. Create job_match_notifications for matches
        // 4. Deliver premium notifications immediately
        // 5. Schedule normal notifications for 4-hour delay
        console.log(`[createJob] Triggering Edge Function for job match evaluation: ${createdJob.id}`);
        
        // Call the Edge Function asynchronously (non-blocking)
        // This ensures the recruiter's job creation completes immediately
        // Using supabase.functions.invoke() ensures proper routing and auth context
        supabase.functions
          .invoke('process-job-matches', {
            body: { jobId: createdJob.id },
          })
          .then((data) => {
            console.log(`[createJob] Job match processing complete:`, data);
          })
          .catch((error) => {
            console.error('Error triggering job match Edge Function:', error);
          });
      }
    } catch (notificationError) {
      console.error('Error in job creation notification handling:', notificationError);
    }

    return createdJob;
  },

  async updateJob(jobId: string, updates: Record<string, unknown>) {
    // List of ALL camelCase properties to EXCLUDE from the payload
    // These should NEVER be sent to Supabase as they are not actual database columns
    const camelCasePropertiesToRemove = new Set([
      'salaryMax',
      'salaryMin',
      'positionsAvailable',
      'companyLogoUrl',
      'applicationDeadline',
      'applicationLink',
      'applicationUrl',
      'workMode',
      'screeningQuestions',
      'applicationsCount',
      'createdAt',
      'updatedAt',
      'jobType',
      'postedBy',
    ]);

    // Fields that should NEVER be sent to Supabase (read-only)
    const readOnlyFields = new Set(['created_at', 'applications_count']);

    // Build clean payload with ONLY valid snake_case database columns
    const updatePayload: Record<string, unknown> = {};

    Object.entries(updates).forEach(([key, value]) => {
      // Skip camelCase properties - they are not database columns
      if (camelCasePropertiesToRemove.has(key)) {
        console.log(`[updateJob] Removing camelCase property: ${key}`);
        return;
      }

      // Skip read-only fields
      if (readOnlyFields.has(key)) {
        console.log(`[updateJob] Skipping read-only field: ${key}`);
        return;
      }

      // Only add if value is defined
      if (value !== undefined && value !== null) {
        updatePayload[key] = value;
      }
    });

    // Add current timestamp for updated_at
    updatePayload.updated_at = new Date().toISOString();

    console.log('UPDATE PAYLOAD', JSON.stringify(updatePayload, null, 2));
    console.log('[updateJob] Final payload keys:', Object.keys(updatePayload));

    const { data, error } = await supabase
      .from('jobs')
      .update(updatePayload)
      .eq('id', jobId)
      .select();
    if (error) throw error;
    return normalizeJob(data?.[0]);
  },

  async deleteJob(jobId: string) {
    const { error } = await supabase.from('jobs').delete().eq('id', jobId);
    if (error) throw error;
  },

  async getRecruiterJobs(recruiterId: string) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('posted_by', recruiterId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(normalizeJob);
  },

  async getJobsBySkills(skills: string[], page = 1, limit = 10) {
    const filteredSkills = skills.filter(Boolean).map((skill) => String(skill).trim());
    if (filteredSkills.length === 0) {
      return { data: [], total: 0 };
    }

    const skillQueries = filteredSkills
      .map((skill) => {
        const escaped = skill.replace(/%/g, '\\%').replace(/_/g, '\\_');
        return `skills.cs.{${escaped}}`;
      })
      .join(',');

    const pageStart = (page - 1) * limit;
    const windowSize = Math.max(limit * 20, 500);
    const { data, error, count } = await supabase
      .from('jobs')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .or(skillQueries)
      .order('created_at', { ascending: false })
      .range(pageStart, pageStart + windowSize - 1);

    if (error) throw error;

    const normalizedJobs = (data || []).map(normalizeJob);
    const diversified = diversifyJobsByCompany(normalizedJobs);
    const startIndex = (page - 1) * limit;
    const pageJobs = diversified.slice(startIndex, startIndex + limit);

    return { data: pageJobs, total: count || diversified.length || 0 };
  },

  async getCategories() {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('category')
        .eq('status', 'published')
        .not('category', 'is', null);

      if (error) throw error;

      // Extract unique categories and sort them
      const uniqueCategories = Array.from(
        new Set(
          (data || [])
            .map((job: Record<string, any>) => String(job.category || '').trim())
            .filter(Boolean)
        )
      ).sort();

      return uniqueCategories;
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      return [];
    }
  },
};

// Job Application operations
export const applicationService = {
  async applyForJob(
    jobId: string,
    userId: string,
    resumeUrl: string,
    coverLetter?: string,
    screeningAnswers?: Array<{ question: string; answer: string }>,
    currentCtc?: string,
    expectedCtc?: string,
    noticePeriod?: string
  ) {
    // Determine if this application should be marked as priority
    let isPriority = false;
    try {
      const sub = await subscriptionService.getUserSubscription(userId);
      const plan = String(sub?.plan || '').toLowerCase();
      const status = String(sub?.status || '').toLowerCase();
      // Check if candidate has active premium subscription (new or legacy plans)
      isPriority = status === 'active' && isCandidatePremium(plan) && isSubscriptionActive(sub?.end_date);
      console.log('Subscription for candidate', userId, { plan, status, sub });
      console.log('Priority Application flag for candidate', userId, isPriority);
    } catch (err) {
      // ignore subscription lookup errors and treat as non-priority
      console.error('Failed to lookup subscription for priority apply:', err);
    }

    const applicationPayload = {
      job_id: jobId,
      user_id: userId,
      resume_url: resumeUrl,
      cover_letter: coverLetter,
      screening_answers: screeningAnswers,
      current_ctc: currentCtc,
      expected_ctc: expectedCtc,
      notice_period: noticePeriod,
      status: 'applied',
      priority_application: isPriority,
    };
    console.log('Inserting job application payload', applicationPayload);

    const { data, error } = await supabase
      .from('job_applications')
      .insert([applicationPayload])
      .select();
    if (error) throw error;

    try {
      const application = data?.[0];
      if (application) {
        await notificationService.createNotification(
          userId,
          'application_status',
          'Application Submitted',
          `Your application for the selected role has been received. We'll let you know when HR updates the status.`,
          { jobId }
        );

        const { data: jobDetails, error: jobDetailsError } = await supabase
          .from('jobs')
          .select('posted_by, title, company_name')
          .eq('id', jobId)
          .maybeSingle();

        if (jobDetailsError) {
          console.error('Failed to load job details for recruiter notification', jobDetailsError);
        }

        if (jobDetails?.posted_by) {
          // Use 'application_status' — the closest valid type per DB check constraint
          // (valid types: 'job_match', 'application_status', 'new_job', 'subscription')
          await notificationService.createNotification(
            jobDetails.posted_by,
            'application_status',
            'New Applicant',
            `A candidate has applied for ${jobDetails.title || 'your job posting'} at ${jobDetails.company_name || 'your company'}.`,
            { jobId, applicationId: application.id }
          );
        }
      }
    } catch (notificationError) {
      console.error('Failed to send application notification:', notificationError);
    }

    return data[0];
  },

  async getUserApplications(userId: string) {
    const { data, error } = await supabase
      .from('job_applications')
      .select('*, jobs(*)')
      .eq('user_id', userId)
      .order('priority_application', { ascending: false })
      .order('applied_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getJobApplications(jobId: string) {
    const { data, error } = await supabase
      .from('job_applications')
      .select('*, profiles(*)')
      .eq('job_id', jobId)
      .order('priority_application', { ascending: false })
      .order('applied_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getApplicationDetails(applicationId: string, jobId?: string) {
    let query = supabase
      .from('job_applications')
      .select('*, profiles(*), jobs(*)')
      .eq('id', applicationId);

    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error('Failed to load application details', { applicationId, jobId }, error);
      throw error;
    }
    if (!data) {
      throw new Error('Application not found or access denied');
    }
    return data;
  },

  async hasUserApplied(jobId: string, userId: string) {
    if (!jobId || !userId) return false;
    const { data, error } = await supabase
      .from('job_applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  async updateApplicationStatus(applicationId: string, status: string, jobId?: string) {
    const updatePayload = {
      status,
      updated_at: new Date().toISOString(),
    };

    let query = supabase
      .from('job_applications')
      .update(updatePayload)
      .eq('id', applicationId);

    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const { data, error } = await query
      .select('id, status, user_id, job_id, profiles(*), jobs(*)')
      .maybeSingle();

    if (error) {
      console.error('Failed to update application status', { applicationId, status, jobId }, error);
      throw error;
    }

    if (!data) {
      console.error('Application status update returned no row', { applicationId, status, jobId });
      throw new Error('Application update failed or access denied');
    }

    const application = data;
    if (application) {
      try {
        const applicationJob = Array.isArray(application.jobs) ? application.jobs[0] : application.jobs as any;
        await notificationService.createNotification(
          application.user_id,
          'application_status',
          'Application Update',
          `HR has marked your application for ${applicationJob?.title || 'the role'} as ${status.replace('_', ' ')}. Check the dashboard for details.`,
          { applicationId, status }
        );
      } catch (notificationError) {
        console.error('Failed to send HR action notification:', notificationError);
      }
    }

    return application;
  },
};

// Subscription operations
export const subscriptionService = {
  async createSubscription(
    userId: string,
    plan: string,
    expiryDate: string | null,
    amount = 0,
    paymentId?: string
  ) {
    const startDate = new Date().toISOString();

    const { data: activeSubscriptions, error: activeSubscriptionsError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (activeSubscriptionsError) throw activeSubscriptionsError;
    if (activeSubscriptions && activeSubscriptions.length > 0) {
      const { error: expireError } = await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('user_id', userId)
        .eq('status', 'active');
      if (expireError) throw expireError;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert([
        {
          user_id: userId,
          plan,
          status: 'active',
          start_date: startDate,
          end_date: expiryDate,
          payment_id: paymentId,
          amount,
        },
      ])
      .select();
    if (error) throw error;

    // Only apply recruiter credits for legacy recruiter plans (premium, pro, enterprise)
    // NOT for new candidate plans (premium_monthly, premium_3_month)
    const lowerPlan = plan.toLowerCase();
    const isLegacyRecruiterPlan = ['premium', 'pro', 'enterprise'].includes(lowerPlan);
    
    if (isLegacyRecruiterPlan) {
      const { data: creditsData, error: creditsError } = await supabase
        .from('recruiter_credits')
        .select('*')
        .eq('recruiter_id', userId)
        .maybeSingle();
      if (creditsError) throw creditsError;

      if (creditsData) {
        const { error: updateError } = await supabase
          .from('recruiter_credits')
          .update({ available_credits: -1 })
          .eq('recruiter_id', userId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('recruiter_credits')
          .insert({ recruiter_id: userId, available_credits: -1, used_credits: 0 });
        if (insertError) throw insertError;
      }
    }

    return data[0];
  },

  async getUserSubscription(userId: string) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },

  async getActiveSubscriptionsForUserIds(userIds: string[]) {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) return {};

    const { data, error } = await supabase
      .from('subscriptions')
      .select('user_id, plan')
      .eq('status', 'active')
      .in('user_id', uniqueIds);
    if (error) throw error;

    return (data || []).reduce<Record<string, string>>((map, row) => {
      const id = String(row.user_id || '');
      if (id) {
        map[id] = String(row.plan || 'free').toLowerCase();
      }
      return map;
    }, {});
  },

  async updateSubscription(subscriptionId: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', subscriptionId)
      .select();
    if (error) throw error;
    return data[0];
  },
};

// Payment operations
export const paymentService = {
  async createPayment(userId: string, subscriptionId: string, amount: number, method: 'razorpay' | 'phonepe' | 'credit_card' | 'upi') {
    const { data, error } = await supabase
      .from('payments')
      .insert([
        {
          user_id: userId,
          subscription_id: subscriptionId,
          amount,
          currency: 'INR',
          status: 'completed',
          method,
        },
      ])
      .select();
    if (error) throw error;
    return data[0];
  },

  async updatePaymentStatus(paymentId: string, status: string, transactionId?: string) {
    const { data, error } = await supabase
      .from('payments')
      .update({ status, transaction_id: transactionId })
      .eq('id', paymentId)
      .select();
    if (error) throw error;
    return data[0];
  },

  async getUserPayments(userId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
};

// Notifications operations
export const notificationService = {
  async createNotification(userId: string, type: string, title: string, message: string, data?: Record<string, unknown>) {
    const { data: notif, error } = await supabase
      .from('notifications')
      .insert([{ user_id: userId, type, title, message, data, read: false }])
      .select();
    if (error) throw error;
    return notif[0];
  },

  async getUserNotifications(userId: string, limit = 20) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  async getUnreadNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async markAsRead(notificationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .select();
    if (error) throw error;
    return data[0];
  },

  async markAllAsRead(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) throw error;
  },
};

// Saved jobs/candidates operations
export const savedService = {
  async saveJob(userId: string, jobId: string) {
    const { data, error } = await supabase
      .from('saved_jobs')
      .insert([{ user_id: userId, job_id: jobId }])
      .select();
    if (error && error.code !== '23505') throw error; // 23505 is unique constraint
    return data ? data[0] : null;
  },

  async unsaveJob(userId: string, jobId: string) {
    const { error } = await supabase
      .from('saved_jobs')
      .delete()
      .eq('user_id', userId)
      .eq('job_id', jobId);
    if (error) throw error;
  },

  async getUserSavedJobs(userId: string) {
    const { data, error } = await supabase
      .from('saved_jobs')
      .select('*, jobs(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async isJobSaved(userId: string, jobId: string) {
    const { data, error } = await supabase
      .from('saved_jobs')
      .select('id')
      .eq('user_id', userId)
      .eq('job_id', jobId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },
};

// Job statistics operations
export const statsService = {
  async getJobStats(jobId: string) {
    const { data: applications, error: appError } = await supabase
      .from('job_applications')
      .select('id, status')
      .eq('job_id', jobId);
    if (appError) throw appError;

    const { data: saves, error: saveError } = await supabase
      .from('saved_jobs')
      .select('id')
      .eq('job_id', jobId);
    if (saveError) throw saveError;

    const stats = {
      total_applications: applications?.length || 0,
      applied: applications?.filter((a) => a.status === 'applied').length || 0,
      under_review: applications?.filter((a) => a.status === 'under_review').length || 0,
      shortlisted: applications?.filter((a) => a.status === 'shortlisted').length || 0,
      rejected: applications?.filter((a) => a.status === 'rejected').length || 0,
      accepted: applications?.filter((a) => a.status === 'accepted').length || 0,
      saved: saves?.length || 0,
    };
    return stats;
  },

  async getRecruiterStats(recruiterId: string) {
    const { data: jobs, error: jobError } = await supabase
      .from('jobs')
      .select('id, status')
      .eq('posted_by', recruiterId);
    if (jobError) throw jobError;

    const { data: applications, error: appError } = await supabase
      .from('job_applications')
      .select('id, status, priority_application')
      .in(
        'job_id',
        jobs?.map((j) => j.id) || []
      );
    if (appError) throw appError;

    const stats = {
      active_jobs: jobs?.filter((j) => j.status === 'published').length || 0,
      total_jobs: jobs?.length || 0,
      total_applicants: applications?.length || 0,
      shortlisted: applications?.filter((a) => a.status === 'shortlisted').length || 0,
      rejected: applications?.filter((a) => a.status === 'rejected').length || 0,
      priority_applicants: applications?.filter((a) => a.priority_application).length || 0,
    };
    return stats;
  },
};

const buildSubscriptionMap = async (userIds: string[]) => {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return {};

  const { data, error } = await supabase
    .from('subscriptions')
    .select('user_id, plan')
    .eq('status', 'active')
    .in('user_id', uniqueIds);
  if (error) throw error;

  return (data || []).reduce<Record<string, string>>((map, row) => {
    const id = String(row.user_id || '');
    if (id) {
      map[id] = String(row.plan || 'free').toLowerCase();
    }
    return map;
  }, {});
};

// Candidate subscription check - uses centralized helper
const isPremiumPlan = (plan?: string, endDate?: string | null): boolean => {
  const isPremium = isCandidatePremium(plan);
  if (endDate) {
    return isPremium && isSubscriptionActive(endDate);
  }
  return isPremium;
};

// Candidate search operations
export const candidateService = {
  async searchCandidates(filters: Record<string, unknown>, page = 1, limit = 20): Promise<{ data: Array<Record<string, any>>; total: number }> {
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'job_seeker');

    if (filters?.title) {
      query = query.ilike('bio', `%${filters.title}%`);
    }
    if (filters?.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }
    if (filters?.skills) {
      const skills = Array.isArray(filters.skills) ? filters.skills : [filters.skills];
      const cleanSkills = skills.map((skill) => String(skill).trim()).filter(Boolean);
      if (cleanSkills.length > 0) {
        query = query.contains('skills', cleanSkills);
      }
    }
    if (filters?.experience !== undefined && filters?.experience !== null) {
      const experienceMonths = Number(filters.experience) * 12;
      if (!Number.isNaN(experienceMonths)) {
        query = query.gte('total_experience_months', experienceMonths);
      }
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    const candidates = (data || []) as Array<Record<string, unknown>>;
    const userIds = candidates.map((candidate) => String(candidate.id)).filter(Boolean);
    const subscriptionMap = await buildSubscriptionMap(userIds);

    const getCreatedAt = (item: any) => new Date(String(item.created_at || item.createdAt || '')).getTime();

    const enrichedCandidates = candidates
      .map((candidate) => {
        const plan = subscriptionMap[String(candidate.id)] || 'free';
        const isPremiumCandidate = isPremiumPlan(plan);
        return {
          ...candidate,
          subscription_plan: plan,
          subscriptionPlan: plan,
          isPremiumCandidate,
        };
      })
      .sort((a, b) => {
        const aPremium = Boolean((a as any).isPremiumCandidate);
        const bPremium = Boolean((b as any).isPremiumCandidate);
        if (aPremium !== bPremium) return aPremium ? -1 : 1;
        return getCreatedAt(b) - getCreatedAt(a);
      });

    return { data: enrichedCandidates, total: count || 0 };
  },

  async getCandidateProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },
};

// Chat operations
export const chatService = {
  async sendMessage(
    senderId: string,
    receiverId: string,
    content: string,
    userRole: 'recruiter' | 'candidate' = 'candidate'
  ) {
    try {
      let conversation = await this.getConversation(senderId, receiverId);

      if (!conversation) {
        if (userRole !== 'recruiter') {
          throw new Error('Only recruiters can initiate conversations');
        }

        const recruiterId = senderId;
        const candidateId = receiverId;
        console.log('No conversation found. Creating new conversation', {
          recruiterId,
          candidateId,
        });

        const { data, error } = await supabase
          .from('conversations')
          .insert([
            {
              recruiter_id: recruiterId,
              candidate_id: candidateId,
              initiated_by_recruiter: true,
            },
          ])
          .select('id')
          .single();

        if (error) {
          const sqlError = error as any;
          if (sqlError?.code === '23505' || sqlError?.details?.includes('duplicate key value')) {
            console.warn('Conversation already exists after insert race, refetching existing conversation');
            conversation = await this.getConversation(senderId, receiverId);
          } else {
            throw error;
          }
        } else {
          if (!data?.id) throw new Error('Conversation creation did not return an id');
          conversation = { id: data.id, recruiter_id: recruiterId, candidate_id: candidateId };
          console.log('Conversation created', data.id);
        }
      } else {
        console.log('Conversation found', conversation.id);
      }

      if (!conversation?.id) {
        throw new Error('Unable to resolve conversation id');
      }

      console.log('Inserting message with conversation_id', conversation.id);
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversation.id,
            sender_id: senderId,
            receiver_id: receiverId,
            content,
            is_read: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Chat sendMessage error:', error);
      throw error;
    }
  },

  async getConversation(userId: string, otherUserId: string) {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, recruiter_id, candidate_id')
      .or(
        `and(recruiter_id.eq.${userId},candidate_id.eq.${otherUserId}),and(recruiter_id.eq.${otherUserId},candidate_id.eq.${userId})`
      )
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getUserConversations(userId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('sender_id, receiver_id, content, created_at')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Group by conversation
    const conversations: Record<string, unknown> = {};
    data?.forEach((msg) => {
      const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!conversations[otherId]) {
        conversations[otherId] = msg;
      }
    });
    return Object.values(conversations);
  },

  async markMessagesAsRead(userId: string, senderId: string) {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', userId)
      .eq('sender_id', senderId);
    if (error) throw error;
  },
};
