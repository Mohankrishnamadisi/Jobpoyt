type ProfileCompletionInput = Record<string, any>;

export const calculateProfileCompletion = (profile: ProfileCompletionInput = {}): number => {
  const sections = [
    Boolean(profile.profile_image_url || profile.profileImageUrl || profile.profileImage),
    Boolean(profile.resume_url || profile.resumeUrl || profile.resume),
    Boolean(profile.bio || profile.resumeHeadline),
    Array.isArray(profile.skills) && profile.skills.length > 0,
    Array.isArray(profile.work_experience || profile.workExperience)
      && (profile.work_experience || profile.workExperience).length > 0,
    Array.isArray(profile.education_details || profile.education)
      && (profile.education_details || profile.education).length > 0,
    Array.isArray(profile.it_skills || profile.itSkills) && (profile.it_skills || profile.itSkills).length > 0,
    Boolean(profile.bio || profile.profileSummary),
    Boolean(
      profile.current_industry || profile.currentIndustry
      || (profile.desired_job_types || profile.desiredJobTypes || []).length > 0
      || (profile.preferred_job_titles || profile.preferredJobTitles || []).length > 0
      || (profile.preferred_work_locations || profile.preferredWorkLocations || []).length > 0
    ),
    Boolean(
      profile.gender
      && (profile.date_of_birth || profile.dateOfBirth)
      && profile.phone
      && (profile.current_designation || profile.currentDesignation || profile.current_company || profile.currentCompany)
    ),
  ];

  return Math.round((sections.filter(Boolean).length / sections.length) * 100);
};