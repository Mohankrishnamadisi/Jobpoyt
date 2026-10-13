import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Avatar,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Lock as LockIcon,
  LocationOn as LocationIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { applicationService } from '@services/api';
import type { CandidateTag } from '@types';
import { CandidateTagAssigner } from './CandidateTagAssigner';
import { CandidateNotesPanel } from './CandidateNotesPanel';
import { ResumeUnlockContact } from './ResumeUnlockContact';
import { calculateMatchScore, getMatchScoreHex } from '@utils/matchScore';
import { getApplicantStage, getApplicantTags, getApplicantTalentPools } from './bulkActionsApi';
import { automationCenterService } from '@services/automationCenter';
import { trackCandidateResumeView } from '@utils/resumeUnlocks';

interface ApplicantDetailsModalProps {
  open: boolean;
  onClose: () => void;
  applicantId?: string;
  candidateId?: string;
  jobId?: string;
  recruiterId?: string;
  availableTags?: CandidateTag[];
  onStatusChange?: () => void;
  onTagsChange?: () => void;
  onUnlocked?: () => void;
}

const MotionCard = motion(Card);

export const ApplicantDetailsModal: React.FC<ApplicantDetailsModalProps> = ({
  open,
  onClose,
  applicantId,
  candidateId,
  jobId,
  recruiterId,
  availableTags = [],
  onStatusChange,
  onTagsChange,
  onUnlocked,
}) => {
  const [loading, setLoading] = useState(false);
  const [applicant, setApplicant] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState('applied');
  const [saving, setSaving] = useState(false);
  const [contactUnlocked, setContactUnlocked] = useState(false);
  const [automationTimeline, setAutomationTimeline] = useState<Array<{ id: string; title: string; note: string; at: string }>>([]);

  useEffect(() => {
    if (open && applicantId) {
      setContactUnlocked(false);
      fetchApplicantDetails();
    }
  }, [open, applicantId]);

  const fetchApplicantDetails = async () => {
    setLoading(true);
    try {
      const application = await applicationService.getApplicationDetails(applicantId!, jobId);
      setApplicant(application);
      setProfile(application.profiles || null);
      setStatus(application.status || 'applied');
      try {
        await applicationService.recordApplicationView(application.id, application.user_id, application.job_id);
      } catch (error) {
        console.error('Failed to record recruiter application view:', error);
        toast.error('Application loaded, but its view could not be recorded.');
      }
      if (recruiterId && candidateId) {
        const timeline = automationCenterService.getCandidateTimelineEvents(recruiterId, candidateId, applicantId);
        setAutomationTimeline(timeline);
      }
    } catch (err) {
      console.error('Error fetching applicant details:', err);
      toast.error('Failed to load applicant details');
    } finally {
      setLoading(false);
    }
  };

  const profileAvatarUrl =
    profile?.avatar_url || profile?.avatarUrl || profile?.image || profile?.photo || profile?.picture || '';

  const appliedDate = applicant?.applied_at
    ? new Date(applicant.applied_at)
    : applicant?.created_at
    ? new Date(applicant.created_at)
    : applicant?.updated_at
    ? new Date(applicant.updated_at)
    : null;

  const formatAppliedDate = appliedDate ? appliedDate.toLocaleString() : 'Unknown';

  const resumeUrl = profile?.resume_url || applicant?.resume_url || '';
  const resumeIsPdf = /\.pdf(?:$|[?#])/i.test(String(resumeUrl));
  const atsStage = applicant ? getApplicantStage(applicant) : 'Applied';
  const applicantTags = applicant ? getApplicantTags(applicant) : [];
  const applicantPools = applicant ? getApplicantTalentPools(applicant) : [];
  const matchScore = applicant
    ? calculateMatchScore(
        {
          ...(profile || {}),
          expected_ctc: applicant.expected_ctc || applicant.expectedCtc,
          current_ctc: applicant.current_ctc || applicant.currentCtc,
        },
        applicant.jobs
      )
    : null;

  const handleStatusChange = async () => {
    if (!applicant?.id) return;
    setSaving(true);
    try {
      const updatedApplication = await applicationService.updateApplicationStatus(applicant.id, status, jobId);
      setApplicant(updatedApplication);
      if (updatedApplication.profiles) {
        setProfile(updatedApplication.profiles);
      }

      if (recruiterId && candidateId) {
        const trigger = status === 'shortlisted'
          ? 'candidate_shortlisted'
          : status === 'rejected'
          ? 'candidate_rejected'
          : 'candidate_moved_stage';

        try {
          await automationCenterService.processEvent({
            recruiterId,
            trigger,
            candidateId,
            applicationId: applicant.id,
            jobId,
            candidateName: profile?.name || profile?.full_name || 'Candidate',
            matchScore: matchScore?.score,
            atsStage: status,
          });
          const timeline = automationCenterService.getCandidateTimelineEvents(recruiterId, candidateId, applicant.id);
          setAutomationTimeline(timeline);
        } catch (error) {
          console.warn('Automation processing skipped:', error);
        }
      }

      toast.success(`Status updated to ${status}`);
      onStatusChange?.();
      onClose();
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const downloadResume = async () => {
    if (!resumeUrl) {
      toast.error('Resume not available');
      return;
    }
    const resumeWindow = window.open('', '_blank');
    if (!resumeWindow) {
      toast.error('Please allow pop-ups to open the resume');
      return;
    }
    resumeWindow.opener = null;
    try {
      await trackCandidateResumeView({
        candidateId: applicant?.user_id || candidateId || '',
        jobId: applicant?.job_id || jobId || null,
        applicationId: applicant?.id || applicantId || null,
        source: 'application_details',
      });
      resumeWindow.location.href = resumeUrl;
    } catch (error) {
      resumeWindow.close();
      console.error('Resume opened but its activity could not be recorded:', error);
      toast.error('Could not record resume access. Please try again.');
    }
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 28px 70px rgba(9, 19, 36, 0.3)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 2,
          background: 'linear-gradient(115deg, #091324 0%, #16335F 58%, #28508A 100%)',
          color: '#FFFFFF',
          borderBottom: '1px solid rgba(125,211,252,0.28)',
        }}
      >
          <Typography component="div" variant="h6" sx={{ fontWeight: 800, color: '#FFFFFF' }}>
            Applicant Details
        </Typography>
        <CloseIcon sx={{ cursor: 'pointer' }} onClick={onClose} />
      </DialogTitle>

      <DialogContent dividers sx={{ py: { xs: 2, md: 2.5 }, px: { xs: 1.5, md: 2.5 }, bgcolor: '#F2F7FC' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : applicant ? (
          <Grid container spacing={3}>
            {/* Candidate Header */}
            <Grid item xs={12}>
              <MotionCard initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Avatar
                      src={profileAvatarUrl || undefined}
                      sx={{
                        width: 80,
                        height: 80,
                        background: profileAvatarUrl ? 'transparent' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        fontSize: 32,
                        fontWeight: 700,
                      }}
                    >
                      {!profileAvatarUrl && profile?.name?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                        {profile?.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                        {profile?.title && (
                          <Chip
                            label={profile.title}
                            size="small"
                            sx={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}
                          />
                        )}
                        <Chip
                          label={`Applied: ${formatAppliedDate}`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', color: 'text.secondary', fontSize: 14 }}>
                        {profile?.location && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationIcon sx={{ fontSize: 18 }} />
                            {profile.location}
                          </Box>
                        )}
                      </Box>
                      {recruiterId && candidateId && (
                        <Box sx={{ mt: 2, maxWidth: 520 }}>
                          <ResumeUnlockContact
                            recruiterId={recruiterId}
                            candidateId={candidateId}
                            jobId={jobId}
                            onUnlocked={(contact) =>
                              {
                                setContactUnlocked(true);
                                onUnlocked?.();
                                setProfile((current: any) => ({
                                  ...(current || {}),
                                  email: contact.email || current?.email,
                                  phone: contact.phone || current?.phone,
                                }));
                              }
                            }
                          />
                        </Box>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </MotionCard>
            </Grid>

            {/* AI Match Score */}
            {matchScore && (
              <Grid item xs={12}>
                <MotionCard initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          AI Match Score
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Rule-based match against {applicant.jobs?.title || 'this job'}
                        </Typography>
                      </Box>
                      <Chip
                        label={matchScore.label}
                        sx={{
                          height: 34,
                          px: 1,
                          fontWeight: 900,
                          bgcolor: `${getMatchScoreHex(matchScore.score)}14`,
                          color: getMatchScoreHex(matchScore.score),
                          border: `1px solid ${getMatchScoreHex(matchScore.score)}33`,
                        }}
                      />
                    </Box>

                    <Grid container spacing={2}>
                      {Object.values(matchScore.breakdown)
                        .filter((item) => item.weight > 0)
                        .map((item) => (
                          <Grid item xs={12} sm={6} md={4} key={item.label}>
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: 1,
                                border: '1px solid rgba(148, 163, 184, 0.24)',
                                bgcolor: 'rgba(248,250,252,0.7)',
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                  {item.label}
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800 }}>
                                  {item.points}/{item.weight}
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={item.percent}
                                sx={{
                                  height: 6,
                                  borderRadius: 3,
                                  bgcolor: 'rgba(148,163,184,0.18)',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: getMatchScoreHex(item.percent),
                                    borderRadius: 3,
                                  },
                                }}
                              />
                            </Box>
                          </Grid>
                        ))}
                    </Grid>

                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                      <Grid item xs={12} md={4}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                          Skills Matching Breakdown
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                          {matchScore.matchedSkills.length > 0 ? (
                            matchScore.matchedSkills.map((skill) => (
                              <Chip key={skill} label={skill} size="small" color="success" variant="outlined" />
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No required skills matched yet
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                          Missing Skills
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                          {matchScore.missingSkills.length > 0 ? (
                            matchScore.missingSkills.map((skill) => (
                              <Chip key={skill} label={skill} size="small" color="error" variant="outlined" />
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No missing required skills
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                          Strengths
                        </Typography>
                        <Box component="ul" sx={{ m: 0, pl: 2.2 }}>
                          {matchScore.strengths.length > 0 ? (
                            matchScore.strengths.map((strength) => (
                              <Typography component="li" variant="body2" key={strength} sx={{ mb: 0.5 }}>
                                {strength}
                              </Typography>
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Add more profile details for stronger insights
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </MotionCard>
              </Grid>
            )}

            {/* Professional Info */}
            <Grid item xs={12} sm={6}>
              <MotionCard initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Professional Info
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {(profile?.current_designation || profile?.current_company) && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: 'text.secondary' }}>Current Role</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{profile.current_designation}</Typography>
                        {profile.current_company && <Typography variant="body2" color="text.secondary">at {profile.current_company}</Typography>}
                      </Box>
                    )}
                    {profile?.experience && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: 'text.secondary' }}>Experience</Typography>
                        <Typography variant="body2">{profile.experience}</Typography>
                      </Box>
                    )}
                    {(profile?.current_ctc || profile?.expected_ctc) && (
                      <Box sx={{ display: 'flex', gap: 3 }}>
                        {profile.current_ctc && (
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>Current CTC</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>₹ {profile.current_ctc}</Typography>
                          </Box>
                        )}
                        {profile.expected_ctc && (
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>Expected CTC</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>₹ {profile.expected_ctc}</Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                    {profile?.notice_period && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: 'text.secondary' }}>Notice Period</Typography>
                        <Chip label={profile.notice_period} size="small" variant="outlined" />
                      </Box>
                    )}
                    {profile?.skills && profile.skills.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>Key Skills</Typography>
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                          {(Array.isArray(profile.skills) ? profile.skills : profile.skills.split(',')).map((s: string, i: number) => (
                            <Chip key={i} label={s.trim()} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </Box>
                    )}
                    {Array.isArray(profile?.it_skills) && profile.it_skills.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>IT Skills</Typography>
                        {profile.it_skills.map((s: any, i: number) => (
                          <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 120 }}>{s.skill}</Typography>
                            {s.version && <Chip label={s.version} size="small" sx={{ fontSize: '0.7rem' }} />}
                            {s.experience && <Typography variant="caption" color="text.secondary">{s.experience}</Typography>}
                          </Box>
                        ))}
                      </Box>
                    )}
                    {Array.isArray(profile?.preferred_job_titles) && profile.preferred_job_titles.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>Preferred Roles</Typography>
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                          {profile.preferred_job_titles.map((t: string) => (
                            <Chip key={t} label={t} size="small" color="primary" variant="outlined" />
                          ))}
                        </Box>
                      </Box>
                    )}
                    {profile?.bio && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: 'text.secondary' }}>Profile Summary</Typography>
                        <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary' }}>{profile.bio}</Typography>
                      </Box>
                    )}
                    {/* Social links */}
                    {(profile?.linkedin_url || profile?.github_url || profile?.portfolio_url) && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: 'text.secondary' }}>Online Profiles</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {profile.linkedin_url && <Typography component="a" href={profile.linkedin_url} target="_blank" variant="body2" sx={{ color: '#0077b5' }}>LinkedIn ↗</Typography>}
                          {profile.github_url && <Typography component="a" href={profile.github_url} target="_blank" variant="body2" sx={{ color: '#333' }}>GitHub ↗</Typography>}
                          {profile.portfolio_url && <Typography component="a" href={profile.portfolio_url} target="_blank" variant="body2" sx={{ color: '#6366f1' }}>Portfolio ↗</Typography>}
                        </Box>
                      </Box>
                    )}
                    {/* Education (text fallback) */}
                    {profile?.education && !Array.isArray(profile?.education_details?.length) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SchoolIcon sx={{ fontSize: 18 }} />
                        <Typography variant="body2">{profile.education}</Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </MotionCard>
            </Grid>

            {/* Application Info */}
            <Grid item xs={12} sm={6}>
              <MotionCard initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Application Info
                  </Typography>
                  <Box sx={{ space: 2 }}>
                    <Box sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                          Featured Application
                        </Typography>
                        <Chip label={applicant.priority_application || applicant.priorityApplication ? 'YES' : 'NO'} size="small" color={applicant.priority_application || applicant.priorityApplication ? 'warning' : 'default'} />
                    </Box>
                    {applicant?.cover_letter && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                          Cover Letter
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            p: 1.5,
                            background: 'rgba(99,102,241,0.05)',
                            borderRadius: 1,
                            borderLeft: '3px solid #6366f1',
                            lineHeight: 1.6,
                          }}
                        >
                          {applicant.cover_letter}
                        </Typography>
                      </Box>
                    )}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                        Applied On
                      </Typography>
                      <Typography variant="body2">
                        {formatAppliedDate}
                      </Typography>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                        ATS Stage
                      </Typography>
                      <Chip label={atsStage} size="small" color="info" variant="outlined" />
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                        Talent Pools
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {applicantPools.length > 0 ? (
                          applicantPools.map((pool) => (
                            <Chip key={pool} label={pool} size="small" color="primary" variant="outlined" />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">No pool assigned</Typography>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                        Candidate Tags
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {applicantTags.length > 0 ? (
                          applicantTags.map((tag) => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">No tags added</Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </MotionCard>
            </Grid>

            {/* Work Experience */}
            {Array.isArray(profile?.work_experience) && profile.work_experience.length > 0 && (
              <Grid item xs={12}>
                <MotionCard initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Employment</Typography>
                    {profile.work_experience.map((exp: any, i: number) => (
                      <Box key={i} sx={{ mb: i < profile.work_experience.length - 1 ? 2 : 0, pb: i < profile.work_experience.length - 1 ? 2 : 0, borderBottom: i < profile.work_experience.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <Typography sx={{ fontWeight: 700 }}>{exp.position || exp.title || exp.role}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{exp.company || exp.organization}</Typography>
                        {exp.duration && <Typography variant="caption" color="text.secondary">{exp.duration}</Typography>}
                        {exp.description && <Typography variant="body2" sx={{ mt: 0.5, color: '#475569', lineHeight: 1.65 }}>{exp.description}</Typography>}
                      </Box>
                    ))}
                  </CardContent>
                </MotionCard>
              </Grid>
            )}

            {/* Education */}
            {Array.isArray(profile?.education_details) && profile.education_details.length > 0 && (
              <Grid item xs={12} sm={6}>
                <MotionCard initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Education</Typography>
                    {profile.education_details.map((edu: any, i: number) => (
                      <Box key={i} sx={{ mb: 1.5 }}>
                        <Typography sx={{ fontWeight: 700 }}>{edu.degree}{edu.field ? ` – ${edu.field}` : ''}</Typography>
                        <Typography variant="body2" color="text.secondary">{edu.school}</Typography>
                        {edu.year && <Typography variant="caption" color="text.secondary">{edu.year}</Typography>}
                      </Box>
                    ))}
                  </CardContent>
                </MotionCard>
              </Grid>
            )}

            {/* Certifications & Projects */}
            {(Array.isArray(profile?.certifications) && profile.certifications.length > 0 ||
              Array.isArray(profile?.projects) && profile.projects.length > 0) && (
              <Grid item xs={12} sm={6}>
                <MotionCard initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <CardContent>
                    {Array.isArray(profile?.certifications) && profile.certifications.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Certifications</Typography>
                        {profile.certifications.map((cert: any, i: number) => (
                          <Box key={i} sx={{ mb: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{cert.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{cert.issuer}{cert.year ? ` · ${cert.year}` : ''}</Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                    {Array.isArray(profile?.projects) && profile.projects.length > 0 && (
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Projects</Typography>
                        {profile.projects.map((proj: any, i: number) => (
                          <Box key={i} sx={{ mb: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{proj.title}</Typography>
                            {proj.description && <Typography variant="caption" color="text.secondary">{proj.description}</Typography>}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </MotionCard>
              </Grid>
            )}

            {/* Resume */}
            {resumeUrl && (
              <Grid item xs={12}>
                <MotionCard initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                          Resume
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {contactUnlocked ? 'Candidate resume is available for this recruiter account.' : 'Resume Locked'}
                        </Typography>
                      </Box>
                      <Tooltip title={contactUnlocked ? 'View resume' : 'Unlock candidate to download resume.'}>
                        <span>
                          <Button
                            variant="contained"
                            endIcon={contactUnlocked ? <DownloadIcon /> : <LockIcon />}
                            onClick={downloadResume}
                            disabled={!contactUnlocked}
                            sx={{
                              background: contactUnlocked ? '#0A66C2' : undefined,
                              textTransform: 'none',
                              fontWeight: 700,
                            }}
                          >
                            {contactUnlocked ? 'View Resume' : 'Resume Locked'}
                          </Button>
                        </span>
                      </Tooltip>
                    </Box>
                    <Box sx={{ border: '1px solid #D7E3EF', borderRadius: 2, overflow: 'hidden', bgcolor: '#FFFFFF', minHeight: 180, display: 'grid', placeItems: 'center' }}>
                      {contactUnlocked && resumeIsPdf ? (
                        <Box
                          component="iframe"
                          src={String(resumeUrl)}
                          title="Candidate resume preview"
                          onLoad={() => {
                            void trackCandidateResumeView({
                              candidateId: applicant?.user_id || candidateId || '',
                              jobId: applicant?.job_id || jobId || null,
                              applicationId: applicant?.id || applicantId || null,
                              source: 'application_details_preview',
                            }).catch((error) => {
                              console.error('Failed to record application resume preview access:', error);
                              toast.error('Could not record resume preview activity.', {
                                id: `application-resume-preview-event-${applicant?.id || applicantId}`,
                              });
                            });
                          }}
                          sx={{ width: '100%', height: 420, border: 0, display: 'block' }}
                        />
                      ) : contactUnlocked ? (
                        <Box sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="body2" sx={{ color: '#49627F', mb: 0.5 }}>Preview is available for PDF resumes.</Typography>
                          <Typography variant="caption" sx={{ color: '#8090A5' }}>Use View Resume to open this file in a new tab.</Typography>
                        </Box>
                      ) : (
                        <Box sx={{ textAlign: 'center', p: 2 }}>
                          <LockIcon sx={{ color: '#28508A', fontSize: 30, mb: 0.5 }} />
                          <Typography variant="body2" sx={{ color: '#49627F' }}>Unlock the candidate to preview the resume.</Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </MotionCard>
              </Grid>
            )}

            <Divider sx={{ my: 1 }} />

            {/* Candidate Tags */}
            {recruiterId && candidateId && (
              <Grid item xs={12}>
                <MotionCard initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <CardContent>
                    <CandidateTagAssigner
                      candidateId={candidateId}
                      recruiterId={recruiterId}
                      availableTags={availableTags}
                      onTagsChange={onTagsChange}
                    />
                  </CardContent>
                </MotionCard>
              </Grid>
            )}

            {/* Recruiter Notes */}
            {recruiterId && candidateId && applicantId && (
              <Grid item xs={12}>
                <MotionCard initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <CardContent>
                    <CandidateNotesPanel
                      applicationId={applicantId}
                      candidateId={candidateId}
                      recruiterId={recruiterId}
                    />
                  </CardContent>
                </MotionCard>
              </Grid>
            )}

            {automationTimeline.length > 0 && (
              <Grid item xs={12}>
                <MotionCard initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Automation Timeline
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {automationTimeline.slice(0, 12).map((event) => (
                        <Box key={event.id} sx={{ p: 1.2, borderRadius: 1.5, border: '1px solid rgba(148,163,184,0.24)', bgcolor: 'rgba(248,250,252,0.7)' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{event.title}</Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{event.note || '-'}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{new Date(event.at).toLocaleString()}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </MotionCard>
              </Grid>
            )}

            {/* Status Update */}
            <Grid item xs={12}>
              <MotionCard initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Update Application Status
                  </Typography>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      label="Status"
                      disabled={saving}
                    >
                      <MenuItem value="applied">Applied</MenuItem>
                      <MenuItem value="under_review">Under Review</MenuItem>
                      <MenuItem value="shortlisted">Shortlisted</MenuItem>
                      <MenuItem value="rejected">Rejected</MenuItem>
                    </Select>
                  </FormControl>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Current status: <strong>{status}</strong>. Change and save to update the candidate&apos;s application status.
                  </Alert>
                </CardContent>
              </MotionCard>
            </Grid>
          </Grid>
        ) : (
          <Alert severity="error">Failed to load applicant details</Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1, background: 'rgba(0,0,0,0.02)' }}>
        <Button onClick={onClose} disabled={saving}>
          Close
        </Button>
        <Button
          variant="contained"
          onClick={handleStatusChange}
          disabled={saving || !applicant}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            textTransform: 'none',
            fontWeight: 600,
          }}
          endIcon={saving ? <CircularProgress size={20} /> : undefined}
        >
          {saving ? 'Saving...' : 'Save Status'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
