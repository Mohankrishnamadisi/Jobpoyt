import React, { useState } from 'react';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Box,
  Typography,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Lock as LockIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Message as MessageIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Download as DownloadIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  Close as CloseIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { formatExperienceString } from '@utils/experience';
import { motion } from 'framer-motion';
import { candidateService, savedService } from '@services/api';
import { AddToPoolButton } from './talentPool/AddToPoolButton';
import { ResumeUnlockContact } from './ResumeUnlockContact';
import { getResumeUnlockMap, trackCandidateProfileView, trackCandidateResumeView } from '@utils/resumeUnlocks';
import { recruiterSettingsService } from '@services/recruiterSettings';
import toast from 'react-hot-toast';

interface CandidateSearchProps {
  recruiterId: string;
  onChatClick?: (candidateId: string, candidateName: string) => void;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  headline: string;
  location: string;
  skills: string[];
  experience_years?: number;
  experience_months?: number;
  total_experience_months?: number;
  current_designation?: string | null;
  currentDesignation?: string | null;
  avatar_url?: string | null;
  profile_image_url?: string | null;
  resume_url?: string | null;
  experience?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  current_company?: string | null;
  current_ctc?: string | null;
  expected_ctc?: string | null;
  date_of_birth?: string | null;
  education?: string | null;
  gender?: string | null;
  notice_period?: string | null;
  work_experience?: Array<Record<string, any>>;
  education_details?: Array<Record<string, any>>;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
  subscriptionPlan?: string;
  isPremiumCandidate?: boolean;
  [key: string]: any;
}

export const CandidateSearch: React.FC<CandidateSearchProps> = ({ recruiterId, onChatClick }) => {
  const [searchResults, setSearchResults] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [savedCandidates, setSavedCandidates] = useState<Set<string>>(new Set());
  const [unlockedCandidates, setUnlockedCandidates] = useState<Record<string, boolean>>({});
  const [blockedCandidateIds, setBlockedCandidateIds] = useState<Set<string>>(new Set());
  const [blockedCandidateEmails, setBlockedCandidateEmails] = useState<Set<string>>(new Set());
  const [resumePreviewFailed, setResumePreviewFailed] = useState(false);

  const [filters, setFilters] = useState({
    title: '',
    location: '',
    skills: '',
    experience: '',
  });

  React.useEffect(() => {
    setBlockedCandidateIds(recruiterSettingsService.getBlockedCandidateIds(recruiterId));
    setBlockedCandidateEmails(recruiterSettingsService.getBlockedCandidateEmails(recruiterId));
  }, [recruiterId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const searchFilters: Record<string, unknown> = {};
      if (filters.title.trim()) searchFilters.title = filters.title.trim();
      if (filters.location.trim()) searchFilters.location = filters.location.trim();

      const skillValues = filters.skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean);
      if (skillValues.length) searchFilters.skills = skillValues;

      const experienceValue = Number(filters.experience);
      if (!Number.isNaN(experienceValue) && filters.experience !== '') {
        searchFilters.experience = experienceValue;
      }

      const result = await candidateService.searchCandidates(searchFilters);
      const candidates = ((result.data || []) as any as Candidate[]).filter(
        (candidate) => {
          const email = String(candidate.email || '').trim().toLowerCase();
          return !blockedCandidateIds.has(candidate.id) && (!email || !blockedCandidateEmails.has(email));
        }
      );
      setSearchResults(candidates);
      const unlockMap = await getResumeUnlockMap(recruiterId, candidates.map((candidate) => candidate.id));
      setUnlockedCandidates(unlockMap);

      if (candidates.length === 0) {
        toast('No candidates found matching your criteria', {
          duration: 4000,
          position: 'top-center',
          icon: '🔍',
        });
      }
    } catch (err) {
      console.error('Error searching candidates:', err);
      toast.error('Failed to search candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCandidate = async (candidate: Candidate) => {
    try {
      const profile = await candidateService.getCandidateProfile(candidate.id);
      await trackCandidateProfileView({
        recruiterId,
        candidateId: candidate.id,
        source: 'candidate_search',
      });
      setSelectedCandidate(profile as Candidate);
      setResumePreviewFailed(false);
      setViewDialogOpen(true);
    } catch (err) {
      console.error('Error loading candidate profile:', err);
      toast.error('Failed to load candidate profile');
    }
  };

  const handleSaveCandidate = async (candidateId: string) => {
    try {
      if (savedCandidates.has(candidateId)) {
        await savedService.unsaveJob(recruiterId, candidateId);
        setSavedCandidates((prev) => new Set([...prev].filter((id) => id !== candidateId)));
        toast.success('Candidate removed from saved');
      } else {
        await savedService.saveJob(recruiterId, candidateId);
        setSavedCandidates((prev) => new Set([...prev, candidateId]));
        toast.success('Candidate saved successfully!');
      }
    } catch (err) {
      console.error('Error saving candidate:', err);
      toast.error('Failed to save candidate');
    }
  };

  const handleBlockCandidate = (candidate: Candidate) => {
    recruiterSettingsService.upsertBlockedCandidate(recruiterId, {
      candidateId: candidate.id,
      name: candidate.name || 'Candidate',
      email: candidate.email || null,
      headline: candidate.headline || null,
      reason: 'Blocked from candidate search',
    });

    setBlockedCandidateIds((current) => {
      const next = new Set(current);
      next.add(candidate.id);
      return next;
    });
    setBlockedCandidateEmails((current) => {
      const email = String(candidate.email || '').trim().toLowerCase();
      if (!email) return current;
      const next = new Set(current);
      next.add(email);
      return next;
    });
    setSearchResults((current) => current.filter((entry) => entry.id !== candidate.id));
    if (selectedCandidate?.id === candidate.id) {
      setViewDialogOpen(false);
      setSelectedCandidate(null);
    }
    toast.success('Candidate blocked');
  };

  const resumeUrl = selectedCandidate?.resume_url || '';
  const isProfileUnlocked = Boolean(selectedCandidate && unlockedCandidates[selectedCandidate.id]);

  const openResumeInNewTab = async () => {
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
        candidateId: selectedCandidate!.id,
        source: 'candidate_search',
      });
      resumeWindow.location.href = resumeUrl;
    } catch (error) {
      resumeWindow.close();
      console.error('Resume opened but its activity could not be recorded:', error);
      toast.error('Could not record resume access. Please try again.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Search & Browse Candidates
          </Typography>

          {/* Search Form */}
          <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f9f9f9' }}>
            <Box component="form" onSubmit={handleSearch}>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Job Title / Headline"
                    value={filters.title}
                    onChange={(e) => setFilters({ ...filters, title: e.target.value })}
                    size="small"
                    placeholder="e.g., React Developer"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Location"
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                    size="small"
                    placeholder="e.g., Bangalore"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Skills (comma separated)"
                    value={filters.skills}
                    onChange={(e) => setFilters({ ...filters, skills: e.target.value })}
                    size="small"
                    placeholder="e.g., React, JavaScript, TypeScript"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Minimum Experience (years)"
                    type="number"
                    value={filters.experience}
                    onChange={(e) => setFilters({ ...filters, experience: e.target.value })}
                    size="small"
                    inputProps={{ min: 0 }}
                  />
                </Grid>
              </Grid>

              <Button
                type="submit"
                variant="contained"
                startIcon={<SearchIcon />}
                disabled={loading}
                fullWidth
                sx={{
                  background: 'linear-gradient(135deg, #1D4ED8 0%, #4338CA 100%)',
                  boxShadow: '0 16px 32px rgba(59, 130, 246, 0.18)',
                  py: 1.25,
                }}
              >
                {loading ? 'Searching...' : 'Search Candidates'}
              </Button>
            </Box>
          </Paper>

          {/* Search Results */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : searchResults.length === 0 && Object.values(filters).some((f) => f) ? (
            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
              No candidates found. Try adjusting your search criteria.
            </Typography>
          ) : (
            <List sx={{ width: '100%' }}>
              {searchResults.map((candidate) => (
                <motion.div key={candidate.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <ListItem
                    sx={{
                      mb: 1,
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      '&:hover': { backgroundColor: '#f9f9f9' },
                    }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <AddToPoolButton recruiterId={recruiterId} candidateId={candidate.id} />
                        <IconButton
                          edge="end"
                          onClick={() => handleSaveCandidate(candidate.id)}
                          title={savedCandidates.has(candidate.id) ? 'Unsave' : 'Save'}
                        >
                          {savedCandidates.has(candidate.id) ? (
                            <BookmarkIcon sx={{ color: '#1976d2' }} />
                          ) : (
                            <BookmarkBorderIcon />
                          )}
                        </IconButton>
                        <IconButton
                          edge="end"
                          onClick={() => handleViewCandidate(candidate)}
                          title="View profile"
                        >
                          <ViewIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          onClick={() => onChatClick?.(candidate.id, candidate.name)}
                          title="Send message"
                        >
                          <MessageIcon />
                        </IconButton>
                        <Tooltip title="Block candidate">
                          <IconButton edge="end" onClick={() => handleBlockCandidate(candidate)}>
                            <BlockIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar src={candidate.avatar_url || candidate.profile_image_url || undefined} alt={candidate.name} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography sx={{ fontWeight: 600 }}>{candidate.name}</Typography>
                          {candidate.isPremiumCandidate && (
                            <Chip
                              label={candidate.subscriptionPlan?.toUpperCase() || 'PREMIUM'}
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ fontWeight: 800 }}
                            />
                          )}
                          <Chip
                            icon={unlockedCandidates[candidate.id] ? <CheckCircleIcon /> : <LockIcon />}
                            label={unlockedCandidates[candidate.id] ? 'Unlocked' : 'Locked'}
                            size="small"
                            color={unlockedCandidates[candidate.id] ? 'success' : 'default'}
                            variant={unlockedCandidates[candidate.id] ? 'outlined' : 'filled'}
                            sx={{ fontWeight: 800 }}
                          />
                          {((candidate.experience_years != null && candidate.experience_years >= 0) || candidate.experience) && (
                            <Chip
                              label={
                                formatExperienceString(candidate.experience_years, candidate.experience_months) ||
                                String(candidate.experience || 'Experience').trim()
                              }
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                            {candidate.headline}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                            {candidate.current_designation ? `Current Designation: ${candidate.current_designation}` : `📍 ${candidate.location || 'Location not specified'}`}
                          </Typography>
                          {candidate.skills && candidate.skills.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                              {candidate.skills.slice(0, 3).map((skill) => (
                                <Chip
                                  key={skill}
                                  label={skill}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 24 }}
                                />
                              ))}
                              {candidate.skills.length > 3 && (
                                <Chip
                                  label={`+${candidate.skills.length - 3}`}
                                  size="small"
                                  variant="filled"
                                  sx={{ height: 24 }}
                                />
                              )}
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                </motion.div>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Candidate Profile Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 28px 70px rgba(9,19,36,0.3)',
            border: '1px solid rgba(125,211,252,0.22)',
          }
        }}
      >
        <DialogTitle sx={{ p: 0 }}>
          {selectedCandidate && (
            <Box
              sx={{
                background: 'linear-gradient(115deg, #091324 0%, #16335F 58%, #28508A 100%)',
                color: 'white',
                p: { xs: 2, md: 2.5 },
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: '12px 12px 0 0',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={selectedCandidate.avatar_url || selectedCandidate.profile_image_url || undefined}
                  sx={{
                    width: 54,
                    height: 54,
                    border: '3px solid rgba(186,230,253,0.85)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}
                />
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: { xs: 17, md: 19 } }}>
                    {selectedCandidate.name}
                  </Typography>
                  <Typography sx={{ opacity: 0.9, fontSize: 14 }}>
                    {selectedCandidate.headline}
                  </Typography>
                </Box>
              </Box>
              <IconButton
                onClick={() => setViewDialogOpen(false)}
                sx={{ color: 'white' }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          )}
        </DialogTitle>

        <DialogContent sx={{ p: 3, bgcolor: '#fafafa' }}>
          {selectedCandidate && (
            <Grid container spacing={2.5}>
              <Grid item xs={12} lg={6}>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Box sx={{ p: 2.5, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                    <Box sx={{ mb: 1.5 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 800 }}>{selectedCandidate.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{selectedCandidate.headline || 'Profile headline not provided'}</Typography>
                      </Box>
                    </Box>

                    {((selectedCandidate.experience_years != null && selectedCandidate.experience_years >= 0) || selectedCandidate.experience) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <WorkIcon sx={{ fontSize: 18, color: '#667eea' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatExperienceString(selectedCandidate.experience_years, selectedCandidate.experience_months) || selectedCandidate.experience || 'Not specified'}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 1 }}>
                      {selectedCandidate.current_designation && <Chip label={`Role: ${selectedCandidate.current_designation}`} size="small" variant="outlined" />}
                      {selectedCandidate.current_company && <Chip label={`Company: ${selectedCandidate.current_company}`} size="small" variant="outlined" />}
                      {selectedCandidate.notice_period && <Chip label={`Notice: ${selectedCandidate.notice_period}`} size="small" variant="outlined" />}
                      {selectedCandidate.location && <Chip label={selectedCandidate.location} size="small" variant="outlined" />}
                    </Box>
                  </Box>

                  <Box sx={{ p: 2.5, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LockIcon sx={{ fontSize: 20, color: '#667eea' }} />
                      Contact Information
                    </Typography>
                    {isProfileUnlocked ? (
                      <Box sx={{ display: 'grid', gap: 1 }}>
                        {selectedCandidate.email && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <EmailIcon sx={{ color: '#667eea', fontSize: 20 }} />
                            <Typography sx={{ wordBreak: 'break-all' }}>{selectedCandidate.email}</Typography>
                          </Box>
                        )}
                        {selectedCandidate.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <PhoneIcon sx={{ color: '#667eea', fontSize: 20 }} />
                            <Typography>{selectedCandidate.phone}</Typography>
                          </Box>
                        )}
                      </Box>
                    ) : (
                      <ResumeUnlockContact
                        recruiterId={recruiterId}
                        candidateId={selectedCandidate.id}
                        onUnlocked={(contact) => {
                          setUnlockedCandidates((current) => ({ ...current, [selectedCandidate.id]: true }));
                          setSelectedCandidate((current) =>
                            current
                              ? {
                                  ...current,
                                  email: contact.email || current.email,
                                  phone: contact.phone || current.phone,
                                }
                              : current
                          );
                        }}
                      />
                    )}
                  </Box>

                  <Box sx={{ p: 2.5, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Profile Details</Typography>
                    <Grid container spacing={1.2}>
                      {selectedCandidate.current_ctc && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">CURRENT CTC</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedCandidate.current_ctc}</Typography>
                        </Grid>
                      )}
                      {selectedCandidate.expected_ctc && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">EXPECTED CTC</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedCandidate.expected_ctc}</Typography>
                        </Grid>
                      )}
                      {selectedCandidate.gender && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">GENDER</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedCandidate.gender}</Typography>
                        </Grid>
                      )}
                      {selectedCandidate.date_of_birth && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">DATE OF BIRTH</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{new Date(selectedCandidate.date_of_birth).toLocaleDateString()}</Typography>
                        </Grid>
                      )}
                      {(selectedCandidate.address || selectedCandidate.city || selectedCandidate.state || selectedCandidate.country) && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">ADDRESS</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {[selectedCandidate.address, selectedCandidate.city, selectedCandidate.state, selectedCandidate.country]
                              .filter(Boolean)
                              .join(', ')}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Box>

                  {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                    <Box sx={{ p: 2.5, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Skills</Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {selectedCandidate.skills.map((skill) => (
                          <Chip key={skill} label={skill} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {selectedCandidate.bio && (
                    <Box sx={{ p: 2.5, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>About</Typography>
                      <Typography sx={{ color: 'text.secondary', lineHeight: 1.65 }}>{selectedCandidate.bio}</Typography>
                    </Box>
                  )}
                </Box>
              </Grid>

              <Grid item xs={12} lg={6}>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Box sx={{ p: { xs: 1.5, md: 2 }, bgcolor: 'white', borderRadius: 2, border: '1px solid #D7E3EF', boxShadow: '0 8px 20px rgba(15,39,75,0.04)' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                      Resume Preview
                    </Typography>
                    {resumeUrl ? (
                      isProfileUnlocked ? (
                        <>
                          <Box
                            sx={{
                              width: '100%',
                              height: { xs: 320, md: 520 },
                              borderRadius: 1.5,
                              border: '1px solid #e2e8f0',
                              overflow: 'hidden',
                              bgcolor: '#fff',
                            }}
                          >
                              {resumePreviewFailed ? (
                                <Box sx={{ height: '100%', display: 'grid', placeItems: 'center', textAlign: 'center', p: 2 }}>
                                  <Box>
                                    <Typography variant="body2" sx={{ color: '#49627F', mb: 1 }}>Preview is unavailable for this file format.</Typography>
                                    <Button size="small" variant="outlined" onClick={openResumeInNewTab} startIcon={<OpenInNewIcon />}>Open Resume</Button>
                                  </Box>
                                </Box>
                              ) : <iframe
                              title="Candidate Resume"
                              src={resumeUrl}
                              onLoad={() => {
                                void trackCandidateResumeView({
                                  candidateId: selectedCandidate.id,
                                  source: 'candidate_search_preview',
                                }).catch((error) => {
                                  console.error('Failed to record candidate resume preview access:', error);
                                  toast.error('Could not record resume preview activity.', {
                                    id: `resume-preview-event-${selectedCandidate.id}`,
                                  });
                                });
                              }}
                              onError={() => setResumePreviewFailed(true)}
                              style={{ width: '100%', height: '100%', border: 'none' }}
                            />}
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                            <Button onClick={openResumeInNewTab} startIcon={<OpenInNewIcon />}>
                              Open Full Resume
                            </Button>
                            <Button onClick={openResumeInNewTab} startIcon={<DownloadIcon />}>
                              Download
                            </Button>
                          </Box>
                        </>
                      ) : (
                        <Box
                          sx={{
                            height: { xs: 260, md: 360 },
                            borderRadius: 1.5,
                            border: '1px dashed #cbd5e1',
                            display: 'grid',
                            placeItems: 'center',
                            textAlign: 'center',
                            px: 2,
                            bgcolor: 'rgba(148, 163, 184, 0.08)',
                          }}
                        >
                          <Box>
                            <LockIcon sx={{ fontSize: 32, color: '#64748b', mb: 1 }} />
                            <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Resume Locked</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Unlock contact details to view and download this resume.
                            </Typography>
                          </Box>
                        </Box>
                      )
                    ) : (
                      <Typography variant="body2" color="text.secondary">Resume not uploaded by candidate.</Typography>
                    )}
                  </Box>

                  {Array.isArray(selectedCandidate.work_experience) && selectedCandidate.work_experience.length > 0 && (
                    <Box sx={{ p: 2.5, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Work Experience</Typography>
                      <Box sx={{ display: 'grid', gap: 1.5 }}>
                        {selectedCandidate.work_experience.map((item: any, index: number) => (
                          <Box key={index} sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, borderLeft: '3px solid #6366f1' }}>
                            <Typography sx={{ fontWeight: 700 }}>{item.position || item.title || item.role || 'Role'}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{item.company || item.organization || ''}</Typography>
                            {item.duration && <Typography variant="caption" color="text.secondary">{item.duration}</Typography>}
                            {item.description && <Typography variant="body2" sx={{ mt: 0.5, color: '#64748b', lineHeight: 1.6 }}>{item.description}</Typography>}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {Array.isArray(selectedCandidate.education_details) && selectedCandidate.education_details.length > 0 && (
                    <Box sx={{ p: 2.5, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Education</Typography>
                      <Box sx={{ display: 'grid', gap: 1.25 }}>
                        {selectedCandidate.education_details.map((item: any, index: number) => (
                          <Box key={index} sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5 }}>
                            <Typography sx={{ fontWeight: 700 }}>{item.degree || item.qualification || 'Degree'}{item.field ? ` – ${item.field}` : ''}</Typography>
                            <Typography variant="body2" color="text.secondary">{item.school || item.institution || item.college || ''}</Typography>
                            {item.year && <Typography variant="caption" color="text.secondary">{item.year}</Typography>}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {Array.isArray((selectedCandidate as any).it_skills) && (selectedCandidate as any).it_skills.length > 0 && (
                    <Box sx={{ p: 2.5, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>IT Skills</Typography>
                      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                        <Box component="thead">
                          <Box component="tr">
                            {['Skill', 'Version', 'Last Used', 'Experience'].map((h) => (
                              <Box component="th" key={h} sx={{ textAlign: 'left', pb: 0.75, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{h}</Box>
                            ))}
                          </Box>
                        </Box>
                        <Box component="tbody">
                          {(selectedCandidate as any).it_skills.map((s: any, i: number) => (
                            <Box component="tr" key={i}>
                              <Box component="td" sx={{ py: 0.75, fontWeight: 600, fontSize: '0.875rem' }}>{s.skill}</Box>
                              <Box component="td" sx={{ py: 0.75, fontSize: '0.875rem', color: '#64748b' }}>{s.version || '–'}</Box>
                              <Box component="td" sx={{ py: 0.75, fontSize: '0.875rem', color: '#64748b' }}>{s.lastUsed || '–'}</Box>
                              <Box component="td" sx={{ py: 0.75, fontSize: '0.875rem', color: '#64748b' }}>{s.experience || '–'}</Box>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  )}

                  {Array.isArray(selectedCandidate.certifications) && selectedCandidate.certifications.length > 0 && (
                    <Box sx={{ p: 2.5, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Certifications</Typography>
                      {(selectedCandidate.certifications as any[]).map((cert, i) => (
                        <Box key={i} sx={{ mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{cert.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{cert.issuer}{cert.year ? ` · ${cert.year}` : ''}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {Array.isArray(selectedCandidate.projects) && selectedCandidate.projects.length > 0 && (
                    <Box sx={{ p: 2.5, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Projects</Typography>
                      {(selectedCandidate.projects as any[]).map((proj, i) => (
                        <Box key={i} sx={{ mb: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{proj.title}</Typography>
                          {proj.description && <Typography variant="caption" color="text.secondary">{proj.description}</Typography>}
                          {proj.url && <Box><Typography component="a" href={proj.url} target="_blank" variant="caption" sx={{ color: '#6366f1' }}>{proj.url} ↗</Typography></Box>}
                        </Box>
                      ))}
                    </Box>
                  )}

                  {(selectedCandidate as any).linkedin_url || (selectedCandidate as any).github_url || (selectedCandidate as any).portfolio_url ? (
                    <Box sx={{ p: 2.5, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Online Profiles</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {(selectedCandidate as any).linkedin_url && <Typography component="a" href={(selectedCandidate as any).linkedin_url} target="_blank" variant="body2" sx={{ color: '#0077b5' }}>LinkedIn ↗</Typography>}
                        {(selectedCandidate as any).github_url && <Typography component="a" href={(selectedCandidate as any).github_url} target="_blank" variant="body2" sx={{ color: '#333' }}>GitHub ↗</Typography>}
                        {(selectedCandidate as any).portfolio_url && <Typography component="a" href={(selectedCandidate as any).portfolio_url} target="_blank" variant="body2" sx={{ color: '#6366f1' }}>Portfolio ↗</Typography>}
                      </Box>
                    </Box>
                  ) : null}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, bgcolor: '#f9fafb', gap: 1, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setViewDialogOpen(false)}>
            Close
          </Button>
          {selectedCandidate && (
            <>
              <Tooltip title="Save this candidate">
                <IconButton
                  onClick={() => handleSaveCandidate(selectedCandidate.id)}
                  color={savedCandidates.has(selectedCandidate.id) ? 'primary' : 'default'}
                >
                  {savedCandidates.has(selectedCandidate.id) ? (
                    <BookmarkIcon />
                  ) : (
                    <BookmarkBorderIcon />
                  )}
                </IconButton>
              </Tooltip>
              {unlockedCandidates[selectedCandidate.id] && (
                <AddToPoolButton
                  candidateId={selectedCandidate.id}
                  recruiterId={recruiterId}
                />
              )}
              <Button
                variant="contained"
                onClick={() => {
                  onChatClick?.(selectedCandidate.id, selectedCandidate.name);
                  setViewDialogOpen(false);
                }}
                startIcon={<MessageIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #091324 0%, #28508A 100%)',
                  color: '#FFFFFF',
                  textTransform: 'none',
                  fontWeight: 600,
                  '& .MuiButton-startIcon': { color: '#FFFFFF' },
                  '&:hover': { background: 'linear-gradient(135deg, #16335F 0%, #3567A2 100%)' },
                }}
              >
                Send Message
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};
