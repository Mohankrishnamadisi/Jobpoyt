export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  avatar_url?: string;
  phone?: string;
  subscriptionPlan?: string;
  role: 'job_seeker' | 'recruiter' | 'admin';
  emailVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Education {
  id: string;
  degree: string;
  school: string;
  year: string;
  field?: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  duration: string;
  description?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  year: string;
  url?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  url?: string;
  technologies?: string[];
}

export interface SocialLinks {
  linkedin?: string;
  portfolio?: string;
  github?: string;
  twitter?: string;
}

export interface JobSeekerProfile {
  fullName: string;
  email: string;
  phone: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  bio?: string;
  skills: string[];
  experience?: string;
  experienceYears?: number;
  experienceMonths?: number;
  totalExperienceMonths?: number;
  preferredJobTitles?: string[];
  currentDesignation?: string;
  current_designation?: string;
  isFresher?: boolean;
  is_fresher?: boolean;
  currentCompany?: string;
  currentCtc?: string;
  expectedCtc?: string;
  noticePeriod?: string;
  education: Education[];
  workExperience: WorkExperience[];
  certifications: Certification[];
  projects: Project[];
  resumeUrl?: string;
  profileImageUrl?: string;
  socialLinks: SocialLinks;
}

export interface JobSeeker extends User {
  phone?: string;
  bio?: string;
  location?: string;
  skills: string[];
  resumeUrl?: string;
  profileImageUrl?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  experience?: string;
  experienceYears?: number;
  experienceMonths?: number;
  totalExperienceMonths?: number;
  preferredJobTitles?: string[];
  currentDesignation?: string;
  current_designation?: string;
  isFresher?: boolean;
  is_fresher?: boolean;
  currentCompany?: string;
  currentCtc?: string;
  expectedCtc?: string;
  noticePeriod?: string;
  education?: Education[];
  workExperience?: WorkExperience[];
  certifications?: Certification[];
  projects?: Project[];
  socialLinks?: SocialLinks;
  // New plan IDs first, then legacy for backward compatibility
  subscriptionPlan?: 'premium_monthly' | 'premium_3_month' | 'free' | 'basic' | 'premium' | 'pro' | 'enterprise';
  subscriptionExpiry?: string;
}

export interface RecruiterProfile {
  companyName: string;
  gstNumber: string;
  cinNumber?: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string;
  companyAddress: string;
  companyDescription: string;
  industryType: string;
  companyLogoUrl?: string;
  hrContactPerson: string;
  hrEmail: string;
  hrPhone: string;
}

export interface Recruiter extends User {
  companyName: string;
  gstNumber?: string;
  cinNumber?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyWebsite?: string;
  companyAddress?: string;
  companyDescription?: string;
  industry?: string;
  companyLogo?: string;
  hrContactPerson?: string;
  hrEmail?: string;
  hrPhone?: string;
  employeeCount?: string;
  // Recruiter plans remain unchanged from business model
  subscriptionPlan?: 'basic' | 'premium' | 'pro';
  subscriptionExpiry?: string;
}

export interface Job {
  id: string;
  title: string;
  company_name: string;
  companyLogo?: string;
  location: string;
  job_type?: 'Full-Time' | 'Part-Time' | 'Contract' | 'Internship' | 'Freelance';
  work_type?: 'Full-Time' | 'Part-Time' | 'Contract' | 'Internship' | 'Freelance';
  jobType?: 'Full-Time' | 'Part-Time' | 'Contract' | 'Internship' | 'Freelance';
  work_mode?: 'Onsite' | 'Remote' | 'Hybrid';
  workMode?: 'Onsite' | 'Remote' | 'Hybrid';
  positions_available?: number;
  positionsAvailable?: number;
  salaryMin?: number;
  salary_min?: number;
  salaryMax?: number;
  salary_max?: number;
  experience: string;
  description: string;
  screening_questions?: string[];
  screeningQuestions?: string[];
  skills: string[];
  applicationLink?: string;
  application_link?: string;
  applicationUrl?: string;
  application_url?: string;
  posted_by?: string;
  postedBy?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  applicationsCount?: number;
  featured?: boolean;
  status?: 'published' | 'draft' | 'closed';
  category?: string;
  education?: string;
  currency?: string;
  application_deadline?: string;
  [key: string]: unknown;
}

export interface JobApplication {
  id: string;
  jobId?: string;
  job_id?: string;
  userId?: string;
  user_id?: string;
  resumeUrl?: string;
  resume_url?: string;
  coverLetter?: string;
  cover_letter?: string;
  screening_answers?: Array<{ question: string; answer: string }>;
  screeningAnswers?: Array<{ question: string; answer: string }>;
  currentCtc?: string;
  current_ctc?: string;
  expectedCtc?: string;
  expected_ctc?: string;
  noticePeriod?: string;
  notice_period?: string;
  status: 'applied' | 'under_review' | 'shortlisted' | 'rejected' | 'accepted';
  appliedAt?: string;
  applied_at?: string;
  updatedAt?: string;
  updated_at?: string;
  priorityApplication?: boolean;
  priority_application?: boolean;
  profiles?: any;
  [key: string]: unknown;
}

export interface Subscription {
  id: string;
  userId: string;
  user_id?: string;
  // New plan IDs first, then legacy for backward compatibility
  plan: 'premium_monthly' | 'premium_3_month' | 'free' | 'basic' | 'premium' | 'pro' | 'enterprise';
  status: 'active' | 'expired' | 'cancelled';
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  paymentId?: string;
  payment_id?: string;
  amount?: number;
  autoRenew?: boolean;
  auto_renew?: boolean;
  createdAt?: string;
  created_at?: string;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  method: 'razorpay' | 'phonepe' | 'credit_card' | 'upi';
  transactionId?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  user_id?: string;
  type: 'job_match' | 'application_status' | 'new_job' | 'subscription';
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
  created_at?: string;
  scheduled_for?: string | null; // ISO timestamp for delayed notifications
  notification_metadata?: Record<string, unknown>; // Match metadata for job_match type
}

export interface JobMatchNotification {
  id: string;
  job_id: string;
  candidate_id: string;
  match_type: 'skill' | 'designation' | 'both';
  matched_skills: string[];
  matched_titles: string[];
  match_score: number;
  notification_tier: 'premium' | 'normal';
  scheduled_for: string | null; // ISO timestamp, null = immediate
  is_delivered: boolean;
  notification_id?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  jobs?: Partial<Job>;
  profiles?: Partial<JobSeeker>;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  attachments?: string[];
  isRead: boolean;
  createdAt: string;
}

export interface SavedJob {
  id: string;
  userId: string;
  jobId: string;
  createdAt: string;
}

export interface JobStats {
  total_applications: number;
  applied: number;
  under_review: number;
  shortlisted: number;
  rejected: number;
  accepted: number;
  saved: number;
}

export interface RecruiterStats {
  active_jobs: number;
  total_jobs: number;
  total_applicants: number;
  shortlisted: number;
  rejected: number;
  total_credits_used?: number;
  total_unlocks?: number;
  most_viewed_candidates?: ResumeUnlockCandidateStat[];
}

export interface RecruiterCredits {
  id: string;
  recruiter_id: string;
  available_credits: number;
  used_credits: number;
  created_at: string;
  updated_at: string;
}

export interface ResumeUnlock {
  id: string;
  recruiter_id: string;
  candidate_id: string;
  job_id?: string | null;
  credits_used: number;
  unlocked_at: string;
}

export interface ResumeUnlockCandidateStat {
  candidate_id: string;
  candidate_name: string;
  candidate_email?: string | null;
  unlock_count: number;
  last_unlocked_at?: string | null;
}

export interface ResumeUnlockContext {
  credits: RecruiterCredits | null;
  unlock: ResumeUnlock | null;
  isUnlocked: boolean;
}

export interface ResumeUnlockResult {
  already_unlocked: boolean;
  unlock_id: string;
  candidate_id: string;
  candidate_email?: string | null;
  candidate_phone?: string | null;
  available_credits: number;
  used_credits: number;
  credits_used: number;
  unlocked_at: string;
}

export interface AuthResponse {
  user: User;
  session?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface CandidateTag {
  id: string;
  recruiter_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CandidateTagAssignment {
  id: string;
  tag_id: string;
  candidate_id: string;
  assigned_by?: string | null;
  assigned_at: string;
  candidate_tags?: CandidateTag;
}

export interface CandidateNote {
  id: string;
  application_id: string;
  candidate_id: string;
  recruiter_id: string;
  note: string;
  created_at: string;
  updated_at: string;
  recruiter?: {
    id: string;
    hr_name?: string | null;
    hr_email?: string | null;
    company_name?: string | null;
  };
}

export interface TalentPool {
  id: string;
  recruiter_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  candidate_count?: number;
}

export interface TalentPoolCandidateProfile {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  skills?: string[] | string | null;
  experience_years?: number | string | null;
  experience_months?: number | string | null;
  total_experience_months?: number | string | null;
  experience?: string | null;
  avatar_url?: string | null;
  role?: string | null;
}

export interface TalentPoolCandidate {
  id: string;
  pool_id: string;
  candidate_id: string;
  notes?: string | null;
  added_at: string;
  profiles?: TalentPoolCandidateProfile;
}

export interface TalentPoolFilters {
  search?: string;
  location?: string;
  minExperience?: number;
  skill?: string;
}

export interface RecommendedCandidateProfile {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  skills?: string[] | string | null;
  experience_years?: number | string | null;
  experience_months?: number | string | null;
  total_experience_months?: number | string | null;
  experience?: string | null;
  preferredJobTitles?: string[];
  education?: unknown;
  expected_ctc?: string | number | null;
  current_ctc?: string | number | null;
  avatar_url?: string | null;
  role?: string | null;
  [key: string]: unknown;
}

export interface RecommendedCandidate {
  candidate: RecommendedCandidateProfile;
  job: Job;
  matchScore: import('@utils/matchScore').MatchScoreResult;
}

export interface RecommendedCandidateFilters {
  minMatchScore?: number;
  skills?: string;
  location?: string;
  minExperience?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
