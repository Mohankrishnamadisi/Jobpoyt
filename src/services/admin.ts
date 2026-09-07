import { supabase } from './supabase';
import { supportService } from './support';

export const adminService = {
  async getDashboardStats() {
    const [{ count: usersCount }, { count: candidatesCount }, { count: recruitersCount }, { count: activeJobsCount }] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'job_seeker'),
      supabase.from('recruiters').select('id', { count: 'exact' }),
      supabase.from('jobs').select('id', { count: 'exact' }).eq('status', 'published'),
    ]).then((res) => res.map((r) => r));

    return {
      totalUsers: usersCount || 0,
      totalCandidates: candidatesCount || 0,
      totalRecruiters: recruitersCount || 0,
      activeJobs: activeJobsCount || 0,
    };
  },

  async getUsers(limit = 100) {
    const { data, error } = await supabase.from('profiles').select('*').limit(limit).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async updateUser(userId: string, updates: Record<string, any>) {
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select();
    if (error) throw error;
    return data?.[0];
  },

  async getJobs(limit = 200) {
    const { data, error } = await supabase.from('jobs').select('*').limit(limit).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async updateJob(jobId: string, updates: Record<string, any>) {
    const { data, error } = await supabase.from('jobs').update(updates).eq('id', jobId).select();
    if (error) throw error;
    return data?.[0];
  },

  async getRecruiters(limit = 100) {
    const { data, error } = await supabase.from('recruiters').select('*').limit(limit).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getCandidates(limit = 100) {
    const { data, error } = await supabase.from('profiles').select('*').eq('role', 'job_seeker').limit(limit).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getApplications(limit = 200) {
    const { data, error } = await supabase
      .from('job_applications')
      .select('*, jobs(*), profiles(*)')
      .limit(limit)
      .order('applied_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async updateApplication(applicationId: string, updates: Record<string, any>) {
    const { data, error } = await supabase
      .from('job_applications')
      .update(updates)
      .eq('id', applicationId)
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async bulkUpdateUsers(userIds: string[], updates: Record<string, any>) {
    if (!Array.isArray(userIds) || userIds.length === 0) return { updated: 0 };
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .in('id', userIds)
      .select('id');
    if (error) throw error;
    return { updated: data?.length || 0 };
  },

  async bulkUpdateJobs(jobIds: string[], updates: Record<string, any>) {
    if (!Array.isArray(jobIds) || jobIds.length === 0) return { updated: 0 };
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .in('id', jobIds)
      .select('id');
    if (error) throw error;
    return { updated: data?.length || 0 };
  },

  async bulkUpdateApplications(applicationIds: string[], updates: Record<string, any>) {
    if (!Array.isArray(applicationIds) || applicationIds.length === 0) return { updated: 0 };
    const { data, error } = await supabase
      .from('job_applications')
      .update(updates)
      .in('id', applicationIds)
      .select('id');
    if (error) throw error;
    return { updated: data?.length || 0 };
  },

  async getSubscribers(limit = 300) {
    const tryWithJoin = await supabase
      .from('payments')
      .select('id, user_id, amount, status, plan, created_at, profiles(name, email)')
      .limit(limit)
      .order('created_at', { ascending: false });

    if (!tryWithJoin.error && Array.isArray(tryWithJoin.data)) {
      return tryWithJoin.data;
    }

    const fallback = await supabase
      .from('payments')
      .select('*')
      .limit(limit)
      .order('created_at', { ascending: false });

    if (fallback.error) throw fallback.error;
    return fallback.data || [];
  },

  async getPayments(limit = 500) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .limit(limit)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getSupportTickets(limit = 200) {
    const tickets = await supportService.getTickets(undefined, 'admin');
    return (tickets || []).slice(0, limit);
  },

  async updateSupportTicket(ticketId: string, updates: Record<string, any>) {
    const updated = await supportService.updateTicket(ticketId, updates);
    if (!updated) {
      throw new Error('Ticket not found');
    }
    return updated;
  },

  async getAdminNotifications(adminUserId: string, limit = 12) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', adminUserId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async getUnreadNotificationsCount(adminUserId: string) {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', adminUserId)
      .eq('read', false);
    if (error) throw error;
    return count || 0;
  },

  async markNotificationRead(adminUserId: string, notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', adminUserId)
      .eq('id', notificationId);
    if (error) throw error;
  },

  async markAllNotificationsRead(adminUserId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', adminUserId)
      .eq('read', false);
    if (error) throw error;
  },

  async updateSubscriber(paymentId: string, updates: Record<string, any>) {
    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', paymentId)
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async bulkUpdateSubscribers(paymentIds: string[], updates: Record<string, any>) {
    if (!Array.isArray(paymentIds) || paymentIds.length === 0) return { updated: 0 };
    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .in('id', paymentIds)
      .select('id');
    if (error) throw error;
    return { updated: data?.length || 0 };
  },

  async getAnalytics() {
    const [{ count: usersCount }, { count: candidatesCount }, { count: recruitersCount }, { count: activeJobsCount }, { count: applicationsCount }] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'job_seeker'),
      supabase.from('recruiters').select('id', { count: 'exact' }),
      supabase.from('jobs').select('id', { count: 'exact' }).eq('status', 'published'),
      supabase.from('job_applications').select('id', { count: 'exact' }),
    ]).then((res) => res.map((r) => r));

    const payments = await supabase.from('payments').select('amount');
    const totalRevenue = (payments.data || []).reduce((total, item) => total + Number(item.amount || 0), 0);

    return {
      totalUsers: usersCount || 0,
      totalCandidates: candidatesCount || 0,
      totalRecruiters: recruitersCount || 0,
      activeJobs: activeJobsCount || 0,
      totalApplications: applicationsCount || 0,
      totalRevenue,
    };
  },

  async getDashboardChartData(days = 14) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days + 1);
    const fromIso = fromDate.toISOString();

    const [profilesRes, paymentsRes] = await Promise.all([
      supabase.from('profiles').select('created_at').gte('created_at', fromIso),
      supabase.from('payments').select('amount, created_at').gte('created_at', fromIso),
    ]);

    const profiles = profilesRes.data || [];
    const payments = paymentsRes.data || [];

    const labels = Array.from({ length: days }).map((_, idx) => {
      const date = new Date(fromDate);
      date.setDate(fromDate.getDate() + idx);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });

    return labels.map((label) => {
      const registrations = profiles.filter((item: any) => {
        const createdAt = item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;
        return createdAt === label;
      }).length;

      const revenue = payments.reduce((sum, item: any) => {
        const paymentDate = item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;
        return paymentDate === label ? sum + Number(item.amount || 0) : sum;
      }, 0);

      return { day: label, registrations, revenue };
    });
  },

  async getSystemHealth() {
    const [{ data: jobs }, { data: applications }, { data: users }] = await Promise.all([
      supabase.from('jobs').select('id, status'),
      supabase.from('job_applications').select('id, status'),
      supabase.from('profiles').select('id, role'),
    ]);

    const integrity = await this.runIntegrityChecks();

    return {
      jobCount: jobs?.length || 0,
      applicationCount: applications?.length || 0,
      userCount: users?.length || 0,
      integrity,
    };
  },

  async getAdminSettings() {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('adminSettings') : null;
    return stored ? JSON.parse(stored) : { siteTitle: 'Jobpoyt Admin', supportEmail: '', maintenanceMode: false };
  },

  async saveAdminSettings(settings: Record<string, any>) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('adminSettings', JSON.stringify(settings));
    }
    return settings;
  },

  async bulkImportJobs(rows: Record<string, any>[]) {
    if (!Array.isArray(rows) || rows.length === 0) return { imported: 0 };
    // naive mapping: try to insert rows directly into jobs table
    const payload = rows.map((r) => ({
      title: r.title || r.job_title || r.name,
      company_name: r.company_name || r.company || r.companyName,
      location: r.location || r.city || r.area,
      experience: r.experience || r.experience_level,
      salary_min: r.salary_min || r.salary || null,
      salary_max: r.salary_max || null,
      skills: r.skills ? String(r.skills).split(',').map((s) => s.trim()) : [],
      job_type: r.job_type || r.jobType || null,
      employment_type: r.employment_type || null,
      description: r.description || r.job_description || null,
      requirements: r.requirements || null,
      benefits: r.benefits || null,
      industry: r.industry || null,
      status: r.status || 'published',
      posted_by: r.posted_by || null,
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase.from('jobs').insert(payload).select('id');
    if (error) {
      // return error summary
      return { error: String(error) };
    }
    return { imported: data?.length || 0 };
  },

  async runIntegrityChecks() {
    const results: Record<string, any> = {};

    // Recruiters who posted jobs but don't have a recruiters record
    const { data: profiles } = await supabase.from('profiles').select('id');
    const profileIds = (profiles || []).map((p: any) => String(p.id));

    // jobs without matching recruiter profiles
    const { data: jobs } = await supabase.from('jobs').select('id, posted_by');
    const recruiterIds = (await supabase.from('recruiters').select('id')).data?.map((r: any) => String(r.id)) || [];
    const jobsWithoutRecruiters = (jobs || []).filter((j: any) => j.posted_by && !recruiterIds.includes(String(j.posted_by))).slice(0, 50);
    results.jobsWithoutRecruiters = jobsWithoutRecruiters;

    // applications referencing users not in profiles
    const { data: applications } = await supabase.from('job_applications').select('id, user_id');
    const invalidApplications = (applications || []).filter((a: any) => a.user_id && !profileIds.includes(String(a.user_id))).slice(0, 50);
    results.invalidApplications = invalidApplications;

    // profiles that are job_seekers but have no applications
    const profilesWithNoApps = profileIds.filter((id) => !(applications || []).some((a: any) => String(a.user_id) === id));
    results.jobSeekerProfilesWithNoApplications = profilesWithNoApps.length;

    return results;
  },
};

export default adminService;
