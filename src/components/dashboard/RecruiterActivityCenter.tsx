import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  Bookmark as BookmarkIcon,
  Download as DownloadIcon,
  Forum as ForumIcon,
  Insights as InsightsIcon,
  Search as SearchIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  Visibility as VisibilityIcon,
  EventAvailable as EventAvailableIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { supabase } from '@services/supabase';
import { messagingService } from '@services/messaging';
import { candidateInterviewInvitesService } from '@services/candidateInterviewInvites';

import {
  recruiterActivityService,
  type RecruiterActivityContext,
  type RecruiterActivityEvent,
  type RecruiterActivityFilter,
  type TrendRange,
} from '@services/recruiterActivity';
import { formatDate } from '@utils/index';

interface RecruiterActivityCenterProps {
  context: RecruiterActivityContext;
}

const filters: Array<{ key: RecruiterActivityFilter; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: '90d', label: 'Last 90 Days' },
];

const trendRanges: Array<{ key: TrendRange; label: string }> = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
];

const overviewMeta: Array<{
  key: 'profileViews' | 'resumeDownloads' | 'recruiterMessages' | 'interviewInvitations' | 'searchAppearances' | 'shortlists' | 'bookmarks';
  label: string;
  icon: React.ElementType;
  premiumOnly?: boolean;
}> = [
  { key: 'profileViews', label: 'Profile Views', icon: VisibilityIcon },
  { key: 'resumeDownloads', label: 'Resume Downloads', icon: DownloadIcon },
  { key: 'recruiterMessages', label: 'Recruiter Messages', icon: ForumIcon },
  { key: 'interviewInvitations', label: 'Interview Invitations', icon: EventAvailableIcon },
  { key: 'searchAppearances', label: 'Search Appearances', icon: SearchIcon, premiumOnly: true },
  { key: 'shortlists', label: 'Shortlists', icon: CheckCircleIcon },
  { key: 'bookmarks', label: 'Recruiter Bookmarks', icon: BookmarkIcon },
];

const eventIcon = (type: RecruiterActivityEvent['type']) => {
  switch (type) {
    case 'profile_viewed':
      return <VisibilityIcon color="primary" fontSize="small" />;
    case 'resume_downloaded':
      return <DownloadIcon color="success" fontSize="small" />;
    case 'application_shortlisted':
      return <CheckCircleIcon color="success" fontSize="small" />;
    case 'recruiter_message':
      return <ForumIcon color="info" fontSize="small" />;
    case 'interview_invite':
      return <EventAvailableIcon color="warning" fontSize="small" />;
    case 'saved_by_recruiter':
      return <BookmarkIcon color="secondary" fontSize="small" />;
    case 'assessment_viewed':
      return <SchoolIcon color="primary" fontSize="small" />;
    default:
      return <TrendingUpIcon color="action" fontSize="small" />;
  }
};

const statusColor = (status: RecruiterActivityEvent['status']): 'success' | 'warning' | 'info' => {
  if (status === 'completed') return 'success';
  if (status === 'in_progress') return 'warning';
  return 'info';
};

const toTime = (iso: string): string => {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const RecruiterActivityCenter: React.FC<RecruiterActivityCenterProps> = ({ context, onQuickAction }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [filter, setFilter] = useState<RecruiterActivityFilter>('7d');
  const [trendRange, setTrendRange] = useState<TrendRange>('weekly');
  const [liveEvents, setLiveEvents] = useState<RecruiterActivityEvent[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    if (!context.userId) {
      setActivityLoading(false);
      return undefined;
    }
    let active = true;
    const loadActivityEvents = async () => {
      setActivityLoading(true);
      const since = new Date(Date.now() - 90 * 86400000).toISOString();
      const [viewsResult, downloadsResult, conversationsResult, invitationsResult] = await Promise.allSettled([
        supabase.from('profile_views').select('id, recruiter_id, viewed_at, created_at').eq('candidate_id', context.userId).gte('viewed_at', since).order('viewed_at', { ascending: false }).limit(500),
        supabase.from('resume_unlocks').select('id, recruiter_id, unlocked_at').eq('candidate_id', context.userId).gte('unlocked_at', since).order('unlocked_at', { ascending: false }).limit(500),
        messagingService.getConversations(context.userId),
        candidateInterviewInvitesService.list(),
      ]);
      if (!active) return;
      const events: RecruiterActivityEvent[] = [];
      if (viewsResult.status === 'fulfilled' && !viewsResult.value.error) {
        for (const row of viewsResult.value.data || []) {
          const occurredAt = row.viewed_at || row.created_at;
          if (!occurredAt) continue;
          events.push({ id: `profile-view-${row.id}`, type: 'profile_viewed', title: 'Recruiter viewed your profile', subtitle: 'Your profile was opened by a recruiter.', occurredAt, status: 'completed', actionLabel: 'Improve profile', actionKey: 'improve-profile' });
        }
      } else if (viewsResult.status === 'rejected' || viewsResult.value?.error) {
        console.warn('Recruiter Activity profile view events are unavailable.');
      }
      if (downloadsResult.status === 'fulfilled' && !downloadsResult.value.error) {
        for (const row of downloadsResult.value.data || []) {
          if (!row.unlocked_at) continue;
          events.push({ id: `resume-download-${row.id}`, type: 'resume_downloaded', title: 'Resume accessed by recruiter', subtitle: 'A recruiter unlocked your resume.', occurredAt: row.unlocked_at, status: 'completed', actionLabel: 'View resume', actionKey: 'update-resume' });
        }
      } else if (downloadsResult.status === 'rejected' || downloadsResult.value?.error) {
        console.warn('Recruiter Activity resume access events are unavailable.');
      }
      if (conversationsResult.status === 'fulfilled') {
        for (const conversation of conversationsResult.value || []) {
          for (const message of conversation.incomingMessages || []) {
            if (!message.occurredAt) continue;
            events.push({ id: `recruiter-message-${message.id}`, type: 'recruiter_message', title: 'Recruiter sent a message', subtitle: `Message from ${conversation.participantName || 'a recruiter'}.`, occurredAt: message.occurredAt, status: message.unread ? 'new' : 'completed', actionLabel: 'Open messages', actionKey: 'messages' });
          }
        }
      } else {
        console.warn('Recruiter Activity message events are unavailable.');
      }
      if (invitationsResult.status === 'fulfilled') {
        for (const invite of invitationsResult.value.interviews) {
          if (!invite.created_at) continue;
          events.push({ id: `interview-invite-${invite.id}`, type: 'interview_invite', title: 'Interview invitation received', subtitle: `${invite.round || 'Interview'} · ${invite.job_title}${invite.company_name ? ` at ${invite.company_name}` : ''}`, occurredAt: invite.created_at, status: invite.candidate_response === 'pending' ? 'new' : invite.candidate_response === 'reschedule_requested' ? 'in_progress' : 'completed', actionLabel: 'View invitations', actionKey: 'interview-invites' });
        }
      } else {
        console.warn('Recruiter Activity interview invite events are unavailable.');
      }
      setLiveEvents(events);
      setActivityLoading(false);
    };
    void loadActivityEvents();
    return () => { active = false; };
  }, [context.userId]);

  const activityContext = useMemo(() => ({ ...context, activityEvents: [...(context.activityEvents || []), ...liveEvents] }), [context, liveEvents]);

  const insights = useMemo(
    () => recruiterActivityService.getInsights(activityContext, filter),
    [activityContext, filter],
  );

  const trendPoints = insights.trend[trendRange];

  return (
    <Card
      sx={{
        mt: 3,
        mb: 3,
        borderRadius: 4,
        border: isDarkMode ? '1px solid rgba(148,163,184,0.24)' : `1px solid ${theme.palette.divider}`,
        background: isDarkMode
          ? 'linear-gradient(140deg, rgba(2,6,23,0.95), rgba(30,41,59,0.95))'
          : 'linear-gradient(140deg, #FFFFFF 0%, #F8FAFF 60%, #EFF6FF 100%)',
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 2.4 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5, flexWrap: 'wrap', mb: 2.1 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Recruiter Activity
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              See how recruiters interact with your profile.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              icon={<InsightsIcon />}
              label={`Profile Completeness ${insights.visibilityBreakdown.profileCompletion}%`}
              color={insights.visibilityBreakdown.profileCompletion >= 80 ? 'success' : insights.visibilityBreakdown.profileCompletion >= 55 ? 'warning' : 'default'}
              sx={{ fontWeight: 700 }}
            />
            {context.isPremium ? (
              <Chip
                icon={<AutoAwesomeIcon />}
                label={`${insights.engagementScore} tracked interactions`}
                color={insights.engagementScore > 0 ? 'success' : 'default'}
                sx={{ fontWeight: 700 }}
              />
            ) : null}
          </Stack>
        </Box>

        <Stack direction="row" spacing={1} sx={{ mb: 2.1, flexWrap: 'wrap', rowGap: 1 }}>
          {filters.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              onClick={() => setFilter(item.key)}
              color={filter === item.key ? 'primary' : 'default'}
              variant={filter === item.key ? 'filled' : 'outlined'}
              sx={{ fontWeight: 700 }}
            />
          ))}
        </Stack>

        <Grid container spacing={1.3} sx={{ mb: 2.2 }}>
          {overviewMeta.map((item) => {
            const value = insights.overview[item.key];
            const locked = item.premiumOnly && !context.isPremium;
            return (
              <Grid item xs={12} sm={6} md={3.4} lg={1.7} key={item.key}>
                <Card sx={{ borderRadius: 2.5, height: '100%', border: isDarkMode ? '1px solid rgba(148,163,184,0.22)' : '1px solid rgba(203,213,225,0.8)' }}>
                  <CardContent sx={{ p: 1.4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                      <item.icon sx={{ color: locked ? '#94A3B8' : theme.palette.primary.main }} fontSize="small" />
                      {locked ? <Chip size="small" label="Premium" sx={{ height: 20, fontSize: 11 }} /> : null}
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                      {item.label}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.35 }}>
                      {locked ? '--' : value === null ? 'Not tracked' : value}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Grid container spacing={2}>
          <Grid item xs={12} lg={7}>
            <Card sx={{ borderRadius: 3, border: isDarkMode ? '1px solid rgba(148,163,184,0.2)' : '1px solid rgba(203,213,225,0.8)' }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.1 }}>
                  Recent Activity Feed
                </Typography>
                {activityLoading ? (
                  <Box sx={{ py: 2 }}><LinearProgress /><Typography variant="caption" sx={{ mt: 0.8, display: 'block', color: 'text.secondary' }}>Loading recorded activity...</Typography></Box>
                ) : insights.timeline.length === 0 ? (
                  <Box
                    sx={{
                      p: 1.6,
                      borderRadius: 2,
                      border: isDarkMode ? '1px dashed rgba(148,163,184,0.36)' : '1px dashed rgba(148,163,184,0.5)',
                    }}
                  >
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      No recruiter activity was recorded in this date range.
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0, display: 'grid', gap: 1 }}>
                    {insights.timeline.slice(0, context.isPremium ? 10 : 6).map((event) => (
                      <ListItem
                        key={event.id}
                        sx={{
                          p: 1.2,
                          borderRadius: 2,
                          border: isDarkMode ? '1px solid rgba(148,163,184,0.2)' : '1px solid rgba(203,213,225,0.72)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Box sx={{ mt: 0.35 }}>{eventIcon(event.type)}</Box>
                        <Box sx={{ flex: 1, minWidth: 190 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {event.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.3 }}>
                            {event.subtitle}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {formatDate(event.occurredAt)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {toTime(event.occurredAt)}
                            </Typography>
                            <Chip size="small" color={statusColor(event.status)} label={event.status.replace('_', ' ')} sx={{ textTransform: 'capitalize' }} />
                          </Stack>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => onQuickAction?.(event.actionKey as RecruiterActivityQuickAction)}
                          sx={{ fontWeight: 700 }}
                        >
                          {event.actionLabel}
                        </Button>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Stack spacing={1.5}>
              <Card sx={{ borderRadius: 3, border: isDarkMode ? '1px solid rgba(148,163,184,0.2)' : '1px solid rgba(203,213,225,0.8)' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.1 }}>Profile details</Typography>
                  <Box className="grid grid-cols-2 gap-1.2">
                    {[
                      ['Profile Completion', `${insights.visibilityBreakdown.profileCompletion}%`],
                      ['Skills', `${insights.visibilityBreakdown.skillsCount} listed`],
                      ['Projects', `${insights.visibilityBreakdown.projectCount} listed`],
                      ['Assessments', `${insights.visibilityBreakdown.assessmentsCompleted} completed`],
                      ['Resume', insights.visibilityBreakdown.hasResume ? 'On file' : 'Not added'],
                      ['Experience', `${insights.visibilityBreakdown.experienceCount} entries`],
                      ['Portfolio', insights.visibilityBreakdown.hasPortfolio ? 'Added' : 'Not added'],
                    ].map(([label, value]) => <Box key={label} sx={{ minWidth: 0, p: 0.9, border: '1px solid', borderColor: isDarkMode ? 'rgba(148,163,184,0.2)' : 'rgba(203,213,225,0.7)', borderRadius: 1.5 }}><Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{label}</Typography><Typography variant="body2" sx={{ mt: 0.2, fontWeight: 750 }}>{value}</Typography>{label === 'Profile Completion' ? <LinearProgress variant="determinate" value={insights.visibilityBreakdown.profileCompletion} sx={{ mt: 0.65, height: 5, borderRadius: 5 }} /> : null}</Box>)}
                  </Box>
                </CardContent>
              </Card>

              <Card sx={{ borderRadius: 3, border: isDarkMode ? '1px solid rgba(148,163,184,0.2)' : '1px solid rgba(203,213,225,0.8)' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.1 }}>
                    Weekly Comparison
                  </Typography>

                  <Stack spacing={0.9}>
                    {insights.weeklyComparison.map((row) => (
                      <Box key={row.label} sx={{ p: 1, borderRadius: 1.5, border: isDarkMode ? '1px solid rgba(148,163,184,0.18)' : '1px solid rgba(203,213,225,0.65)' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{row.label}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.4 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>This Week: {row.thisWeek}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Last Week: {row.lastWeek}</Typography>
                          <Typography variant="caption" sx={{ color: row.growth === null ? 'text.disabled' : row.growth >= 0 ? 'success.main' : 'error.main', fontWeight: 700 }}>
                            {row.growth === null ? 'Not enough prior data' : `${row.growth >= 0 ? '+' : ''}${row.growth}%`}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>

        <Grid container spacing={2} sx={{ mt: 0.2 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, border: isDarkMode ? '1px solid rgba(148,163,184,0.2)' : '1px solid rgba(203,213,225,0.8)' }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                  Notifications
                </Typography>
                <List sx={{ p: 0 }}>
                  {insights.notifications.length > 0 ? insights.notifications.map((note) => (
                    <ListItem key={note.id} sx={{ px: 0, py: 0.6 }}>
                      <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                      <ListItemText
                        primary={note.text}
                        secondary={formatDate(note.occurredAt)}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                      />
                    </ListItem>
                  )) : (
                    <ListItem sx={{ px: 0, py: 0.6 }}>
                      <ListItemText
                        primary="No new recruiter activity"
                        secondary="Your visibility alerts will appear here."
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, border: isDarkMode ? '1px solid rgba(148,163,184,0.2)' : '1px solid rgba(203,213,225,0.8)' }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                  {context.isPremium ? 'AI Visibility Suggestions' : 'Basic Suggestions'}
                </Typography>
                <List sx={{ p: 0 }}>
                  {insights.suggestions.length ? insights.suggestions.map((item) => (
                    <ListItem key={item} sx={{ px: 0, py: 0.5 }}>
                      <ListItemText
                        primary={item}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                      />
                    </ListItem>
                  )) : <ListItem sx={{ px: 0, py: 0.5 }}><ListItemText primary="No profile improvements are suggested from the available profile data." primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }} /></ListItem>}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {context.isPremium ? (
          <Grid container spacing={2} sx={{ mt: 0.2 }}>
            <Grid item xs={12} lg={5}>
              <Card sx={{ borderRadius: 3, border: isDarkMode ? '1px solid rgba(148,163,184,0.2)' : '1px solid rgba(203,213,225,0.8)' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.1 }}>
                    Recruiter Activity Trend
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>Recorded events per period</Typography>

                  <Stack direction="row" spacing={1} sx={{ mb: 1.2, flexWrap: 'wrap', rowGap: 1 }}>
                    {trendRanges.map((item) => (
                      <Chip
                        key={item.key}
                        label={item.label}
                        color={trendRange === item.key ? 'primary' : 'default'}
                        variant={trendRange === item.key ? 'filled' : 'outlined'}
                        onClick={() => setTrendRange(item.key)}
                        sx={{ fontWeight: 700 }}
                      />
                    ))}
                  </Stack>

                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, minHeight: 120 }}>
                    {(() => {
                      const maxCount = Math.max(1, ...trendPoints.map((point) => point.score));
                      return trendPoints.map((point) => (
                        <Box key={point.label} sx={{ flex: 1, textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>{point.score}</Typography>
                          <Box sx={{ height: `${Math.max(8, (point.score / maxCount) * 76)}px`, borderRadius: 1, bgcolor: point.score ? '#174A7C' : '#E2E8F0', mt: 0.35, mb: 0.5 }} />
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{point.label}</Typography>
                        </Box>
                      ));
                    })()}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={3.5}>
              <Card sx={{ borderRadius: 3, border: isDarkMode ? '1px solid rgba(148,163,184,0.2)' : '1px solid rgba(203,213,225,0.8)' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Recruiter Ranking</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.8 }}>Not tracked</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.2 }}>JobPoyt does not currently store a candidate ranking percentile.</Typography>

                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.7 }}>
                    Recruiter Interest Categories
                  </Typography>
                  <Stack spacing={0.8}>
                    {insights.interestCategories.length ? insights.interestCategories.map((item) => (
                      <Box key={item.category} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{item.category}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{item.level}</Typography>
                      </Box>
                    )) : <Typography variant="caption" color="text.secondary">Recruiter interest categories are not tracked yet.</Typography>}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={3.5}>
              <Card sx={{ borderRadius: 3, border: isDarkMode ? '1px solid rgba(148,163,184,0.2)' : '1px solid rgba(203,213,225,0.8)' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                    Tracked Recruiter Interactions
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    {insights.engagementScore}
                  </Typography>

                  <Stack spacing={0.9} sx={{ mt: 1.2 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Counted from recorded profile views, resume accesses, unread recruiter messages, interview invitations, and shortlists.</Typography>
                    {[
                      ['Profile views', insights.overview.profileViews],
                      ['Resume downloads', insights.overview.resumeDownloads],
                      ['Unread recruiter messages', insights.overview.recruiterMessages],
                      ['Interview invitations', insights.overview.interviewInvitations],
                      ['Shortlists', insights.overview.shortlists],
                    ].map(([label, value]) => <Box key={String(label)} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}><Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography><Typography variant="caption" sx={{ fontWeight: 750 }}>{value}</Typography></Box>)}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : null}

      </CardContent>
    </Card>
  );
};

export default RecruiterActivityCenter;
