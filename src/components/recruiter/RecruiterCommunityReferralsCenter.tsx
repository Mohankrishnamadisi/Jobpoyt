import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { networkCommunityService } from '@services/networkCommunity';
import toast from 'react-hot-toast';

type RecruiterTab = 'employee-referrals' | 'talent-community' | 'moderation' | 'analytics';

interface RecruiterCommunityReferralsCenterProps {
  recruiterId: string;
  mode?: 'employee-referrals' | 'talent-community';
}

const statCard = (label: string, value: string | number) => (
  <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
    <CardContent>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>{value}</Typography>
    </CardContent>
  </Card>
);

export const RecruiterCommunityReferralsCenter: React.FC<RecruiterCommunityReferralsCenterProps> = ({ recruiterId, mode = 'employee-referrals' }) => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const [tab, setTab] = useState<RecruiterTab>(mode);

  useEffect(() => {
    setTab(mode);
  }, [mode]);
  const [opportunity, setOpportunity] = useState({
    company: 'Jobpoyt',
    role: 'Frontend Engineer',
    eligibility: 'React + TypeScript + 2 years experience',
    availablePositions: 3,
    deadlineAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16),
  });

  const dashboard = useMemo(() => networkCommunityService.getRecruiterReferralDashboard(recruiterId), [recruiterId, tab]);
  const referrals = useMemo(() => networkCommunityService.listReferralRequestsByEmployee(recruiterId), [recruiterId, tab]);
  const opportunities = useMemo(() => networkCommunityService.listReferralOpportunities(), [tab]);
  const communities = useMemo(() => networkCommunityService.listCommunities(), [tab]);
  const posts = useMemo(() => networkCommunityService.listPosts(), [tab]);
  const analytics = useMemo(() => networkCommunityService.getAnalytics(), [tab]);
  const moderation = useMemo(() => networkCommunityService.getModerationArchitecture(), []);

  return (
    <Box>
      <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', mb: 2, background: 'linear-gradient(115deg, #0f172a 0%, #155e75 55%, #1e3a8a 100%)', color: '#f8fafc' }}>
        <CardContent>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Recruiter Referrals & Talent Community</Typography>
          <Typography variant="body2" sx={{ opacity: 0.92 }}>Employee referrals, talent communities, moderation and engagement analytics in one place.</Typography>
        </CardContent>
      </Card>

      <Paper sx={{ border: '1px solid #e2e8f0', borderRadius: 2, mb: 2 }}>
        <Tabs value={tab} onChange={(_, v: RecruiterTab) => setTab(v)} variant={isTablet ? 'scrollable' : 'scrollable'} scrollButtons="auto" allowScrollButtonsMobile sx={{ minHeight: 54, px: 0.5, '& .MuiTabs-scroller': { overflowX: 'auto !important' }, '& .MuiTabs-scrollButtons': { width: 34, borderRadius: 1, mx: 0.5 }, '& .MuiTab-root': { textTransform: 'none', whiteSpace: 'nowrap', minHeight: 54, minWidth: 'max-content', px: 1.8, fontWeight: 700, fontSize: '0.82rem' } }}>
          <Tab value="employee-referrals" label="Employee Referrals" />
          <Tab value="talent-community" label="Talent Community" />
          <Tab value="moderation" label="Moderation" />
          <Tab value="analytics" label="Analytics" />
        </Tabs>
      </Paper>

      {tab === 'employee-referrals' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={3}>{statCard('Total Referrals', dashboard.totalReferrals)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Successful Referrals', dashboard.successfulReferrals)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Pending Referrals', dashboard.pendingReferrals)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Bonus Paid', `Rs ${dashboard.bonusPaid.toLocaleString()}`)}</Grid>
          <Grid item xs={12}>
            <Card sx={{ border: '1px solid #e2e8f0' }}><CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Publish Referral Opportunity</Typography>
              <Grid container spacing={1}>
                <Grid item xs={12} md={4}><TextField fullWidth label="Company" value={opportunity.company} onChange={(e) => setOpportunity((c) => ({ ...c, company: e.target.value }))} /></Grid>
                <Grid item xs={12} md={4}><TextField fullWidth label="Role" value={opportunity.role} onChange={(e) => setOpportunity((c) => ({ ...c, role: e.target.value }))} /></Grid>
                <Grid item xs={12} md={4}><TextField fullWidth label="Eligibility" value={opportunity.eligibility} onChange={(e) => setOpportunity((c) => ({ ...c, eligibility: e.target.value }))} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth type="number" label="Available Positions" value={opportunity.availablePositions} onChange={(e) => setOpportunity((c) => ({ ...c, availablePositions: Number(e.target.value) || 1 }))} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth type="datetime-local" label="Deadline" InputLabelProps={{ shrink: true }} value={opportunity.deadlineAt} onChange={(e) => setOpportunity((c) => ({ ...c, deadlineAt: e.target.value }))} /></Grid>
                <Grid item xs={12}><Button variant="contained" onClick={() => {
                  networkCommunityService.createReferralOpportunity({
                    creatorId: recruiterId,
                    company: opportunity.company,
                    role: opportunity.role,
                    eligibility: opportunity.eligibility,
                    availablePositions: opportunity.availablePositions,
                    deadlineAt: new Date(opportunity.deadlineAt).toISOString(),
                  });
                  toast.success('Referral opportunity published');
                }}>Publish</Button></Grid>
              </Grid>
            </CardContent></Card>
          </Grid>

          <Grid item xs={12}>
            <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0' }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Candidate</TableCell><TableCell>Status</TableCell><TableCell>Bonus</TableCell><TableCell>Actions</TableCell></TableRow></TableHead>
                <TableBody>
                  {referrals.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.candidateId}</TableCell>
                      <TableCell>{row.status}</TableCell>
                      <TableCell>Rs {row.bonusAmount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Button size="small" onClick={() => { networkCommunityService.updateReferralStatus(row.id, 'accepted'); toast.success('Referral accepted'); }}>Accept</Button>
                          <Button size="small" onClick={() => { networkCommunityService.updateReferralStatus(row.id, 'interview_scheduled'); toast.success('Interview scheduled'); }}>Interview</Button>
                          <Button size="small" color="success" onClick={() => { networkCommunityService.updateReferralStatus(row.id, 'hired', 25000); toast.success('Candidate hired and bonus tracked'); }}>Hired</Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          <Grid item xs={12}><Alert severity="info">Top Referrers: {dashboard.topReferrers.map((x) => `${x.name} (${x.count})`).join(', ')}</Alert></Grid>
          <Grid item xs={12}><Alert severity="success">Marketplace Opportunities: {opportunities.length}</Alert></Grid>
        </Grid>
      )}

      {tab === 'talent-community' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="info">Talent community supports posts, comments, likes, bookmarks, announcements, hashtags, mentions, search and moderation.</Alert></Grid>
          <Grid item xs={12} md={5}>
            <Card sx={{ border: '1px solid #e2e8f0' }}><CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Top Communities</Typography>
              {communities.map((c) => (
                <Paper key={c.id} sx={{ p: 1, border: '1px solid #e2e8f0', mb: 0.8 }}>
                  <Typography variant="subtitle2">{c.name}</Typography>
                  <Typography variant="caption">{c.category} | Members: {c.members}</Typography>
                </Paper>
              ))}
            </CardContent></Card>
          </Grid>
          <Grid item xs={12} md={7}>
            <Card sx={{ border: '1px solid #e2e8f0' }}><CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Community Feed Snapshot</Typography>
              {posts.map((p) => (
                <Paper key={p.id} sx={{ p: 1, border: '1px solid #e2e8f0', mb: 0.8 }}>
                  <Typography variant="body2">{p.content}</Typography>
                  <Typography variant="caption">Likes: {p.likes} | Bookmarks: {p.bookmarks} | Comments: {p.comments}</Typography>
                </Paper>
              ))}
            </CardContent></Card>
          </Grid>
        </Grid>
      )}

      {tab === 'moderation' && (
        <Grid container spacing={1.2}>
          {Object.entries(moderation).map(([key, value]) => (
            <Grid item xs={12} md={6} key={key}>
              <Card sx={{ border: '1px solid #e2e8f0' }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</Typography>
                  <Typography variant="body2" color="text.secondary">{value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 'analytics' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={3}>{statCard('Community Growth', analytics.communityGrowth)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Referral Success Rate', `${analytics.referralSuccessRate}%`)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Mentorship Sessions', analytics.mentorshipSessions)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('User Engagement', analytics.userEngagement)}</Grid>
          <Grid item xs={12}><Alert severity="info">Top Communities: {analytics.topCommunities.join(', ')} | Top Mentors: {analytics.topMentors.join(', ')}</Alert></Grid>
        </Grid>
      )}
    </Box>
  );
};

export default RecruiterCommunityReferralsCenter;
