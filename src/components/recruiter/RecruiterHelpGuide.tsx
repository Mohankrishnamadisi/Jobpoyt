import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  AccountTree as AccountTreeIcon,
  Apps as MarketplaceIcon,
  Api as ApiIcon,
  Assessment as AssessmentsIcon,
  AutoAwesome as AiInsightsIcon,
  Business as OrganizationIcon,
  Close as CloseIcon,
  Code as DeveloperIcon,
  Dashboard as DashboardIcon,
  Event as EventIcon,
  ExpandMore as ExpandMoreIcon,
  Group as GroupIcon,
  Groups as CommunityIcon,
  Insights as InsightsIcon,
  IntegrationInstructions as IntegrationsIcon,
  Label as TagIcon,
  Mail as MailIcon,
  ManageAccounts as ManageAccountsIcon,
  MenuBook as GuideIcon,
  PhoneIphone as MobileIcon,
  People as PeopleIcon,
  QueryStats as QueryStatsIcon,
  Receipt as ReceiptIcon,
  Recommend as ReferralIcon,
  RocketLaunch as RocketIcon,
  Search as SearchIcon,
  Security as SecurityIcon,
  SettingsSuggest as AutomationIcon,
  SmartToy as SmartToyIcon,
  Storage as WarehouseIcon,
  Timeline as ForecastIcon,
  TrendingUp as MarketIcon,
  Webhook as WebhookIcon,
  Work as WorkIcon,
  Workspaces as PoolIcon,
} from '@mui/icons-material';
import { CANDIDATE_UNLOCK_CREDIT_COST, FREE_RECRUITER_CREDITS, JOB_POST_CREDIT_COST } from '@services/recruiterCredits';

type GuideModule = {
  id: string;
  title: string;
  icon: React.ElementType;
  summary: string;
  actions: string[];
};

type GuideGroup = { label: string; color: string; modules: GuideModule[] };

const GUIDE_GROUPS: GuideGroup[] = [
  {
    label: 'Workspace',
    color: '#2563EB',
    modules: [
      { id: 'overview', title: 'Overview', icon: DashboardIcon, summary: 'Your home screen: hiring stats, active jobs, credits/plan status and quick shortcuts.', actions: ['See total jobs, applicants and shortlisted counts at a glance.', `Check free credits left (Free plan) or "Unlimited" (Pro).`, 'Use quick buttons to post a job or review applicants.'] },
      { id: 'jobs', title: 'Jobs', icon: WorkIcon, summary: 'Create, publish and manage all your job postings.', actions: [`Click "Post Job", fill the form and publish. Free plan: ${JOB_POST_CREDIT_COST} credits per job. Pro: unlimited.`, 'Filter jobs by status (live, closed, draft) or work mode.', 'Open a job to see the applicants for that job.', 'Edit or close a job when the role is filled.'] },
      { id: 'applicants', title: 'Applicants', icon: PeopleIcon, summary: 'Every candidate who applied to your jobs, with status tabs and match scores.', actions: ['Switch tabs: All, Applied, Under Review, Shortlisted, Rejected.', 'Sort / filter by match score or show top (featured) applicants only.', `Unlock full contact, resume and profile: ${CANDIDATE_UNLOCK_CREDIT_COST} credit per candidate on Free (re-opening the same candidate is free).`, 'Tick candidates to use the Candidate Actions toolbar (see "Bulk candidate actions").'] },
      { id: 'ats-pipeline', title: 'ATS Pipeline', icon: AccountTreeIcon, summary: 'Kanban board showing candidates in each hiring stage (Applied → Hired).', actions: ['Drag a candidate card to another stage to move them.', 'Filter the board by job.', 'See how many candidates are in each stage.'] },
      { id: 'messages', title: 'Messages', icon: MailIcon, summary: 'Chat with candidates in one inbox.', actions: ['Open a conversation and send a message.', 'Unread count also shows on the chat icon in the top bar.'] },
      { id: 'interview-management', title: 'Interviews', icon: EventIcon, summary: 'Schedule and track candidate interviews.', actions: ['Create an interview invite with date, time and round.', 'Track whether the candidate accepted.', 'Update the interview outcome after it is done.'] },
    ],
  },
  {
    label: 'Candidates',
    color: '#0E9F8E',
    modules: [
      { id: 'find-candidates', title: 'Find Candidates', icon: SearchIcon, summary: 'Search the Jobpoyt talent database (not only people who applied).', actions: ['Search by skills, experience and location.', `Unlock a profile: ${CANDIDATE_UNLOCK_CREDIT_COST} credit on Free, unlimited on Pro.`, 'Add good profiles to a talent pool or message them.'] },
      { id: 'talent-pool', title: 'Talent Pool', icon: PoolIcon, summary: 'Saved groups of candidates for current and future roles.', actions: ['Create pools such as "Frontend Developers".', 'Add candidates from Applicants or Find Candidates.', 'Re-contact candidates from a pool when a new job opens.'] },
      { id: 'tags', title: 'Candidate Tags', icon: TagIcon, summary: 'Labels such as "React Expert" to organise candidates.', actions: ['Create, rename or delete tags.', 'Add / remove tags in bulk from the Applicants toolbar.', 'Filter candidates by tag.'] },
      { id: 'assessments', title: 'Assessments', icon: AssessmentsIcon, summary: 'Skill tests for candidates.', actions: ['Create or assign an assessment.', 'Track completion and review scores.'] },
      { id: 'employee-referrals', title: 'Referrals', icon: ReferralIcon, summary: 'Employee referral programme.', actions: ['Share referral links for open jobs.', 'Track referred candidates and their status.'] },
      { id: 'talent-community', title: 'Talent Community', icon: CommunityIcon, summary: 'Community of candidates interested in your company.', actions: ['Browse community members.', 'Add members to a talent pool or message them.'] },
    ],
  },
  {
    label: 'Intelligence',
    color: '#7C3AED',
    modules: [
      { id: 'analytics', title: 'Analytics', icon: QueryStatsIcon, summary: 'Hiring funnel, time-to-hire and conversion reports.', actions: ['Filter by job and date range.', 'Find the stage where candidates drop off.'] },
      { id: 'market-intelligence', title: 'Market Intelligence', icon: MarketIcon, summary: 'Salary benchmarks and skill demand trends.', actions: ['Compare salaries for a role and location.', 'See which skills are in demand.'] },
      { id: 'ai-hiring-assistant', title: 'AI Hiring Assistant', icon: SmartToyIcon, summary: 'AI ranks candidates for a job and explains the match.', actions: ['Pick a job to get AI-ranked candidates.', 'Read the match reasons, then shortlist or message.'] },
      { id: 'automation-center', title: 'Automation', icon: AutomationIcon, summary: 'Rules that run actions automatically.', actions: ['Create a rule, e.g. send a message when a candidate is shortlisted.', 'Turn rules on or off any time.'] },
      { id: 'executive-intelligence', title: 'Executive Intelligence', icon: InsightsIcon, summary: 'Leadership-level KPIs for hiring.', actions: ['View summary KPIs and trends.', 'Export reports for management.'] },
      { id: 'business-intelligence', title: 'Business Intelligence', icon: QueryStatsIcon, summary: 'Deeper hiring reports and dashboards.', actions: ['Explore reports across jobs and teams.'] },
      { id: 'data-warehouse', title: 'Data Warehouse', icon: WarehouseIcon, summary: 'Your hiring data in one place for reporting.', actions: ['Review and export hiring datasets.'] },
      { id: 'ai-insights', title: 'AI Insights', icon: AiInsightsIcon, summary: 'AI suggestions to improve hiring.', actions: ['Read recommendations and act on them.'] },
      { id: 'forecasting', title: 'Forecasting', icon: ForecastIcon, summary: 'Predicts hiring timelines and pipeline needs.', actions: ['See expected hires and time-to-fill.'] },
    ],
  },
  {
    label: 'Company',
    color: '#D97706',
    modules: [
      { id: 'team-management', title: 'Team Management', icon: GroupIcon, summary: 'Invite colleagues and control what they can do.', actions: ['Invite a team member by email.', 'Set their role / permissions.', 'Remove access when someone leaves.'] },
      { id: 'organization', title: 'Organization', icon: OrganizationIcon, summary: 'Departments and team structure.', actions: ['Create departments and assign leads.'] },
      { id: 'integrations', title: 'Integrations', icon: IntegrationsIcon, summary: 'Connect other tools (HRIS, calendars, job boards).', actions: ['Connect / disconnect an integration.', 'Check sync status.'] },
      { id: 'developer-portal', title: 'Developer Portal', icon: DeveloperIcon, summary: 'API docs for your tech team.', actions: ['Read API docs and code samples.'] },
      { id: 'api-management', title: 'API Management', icon: ApiIcon, summary: 'API keys and usage.', actions: ['Create or revoke API keys.', 'Monitor API usage.'] },
      { id: 'marketplace', title: 'Marketplace', icon: MarketplaceIcon, summary: 'Add-on apps for your hiring workflow.', actions: ['Browse and install apps.'] },
      { id: 'webhooks', title: 'Webhooks', icon: WebhookIcon, summary: 'Send hiring events to your own systems.', actions: ['Add an endpoint URL and choose events.', 'Test delivery and view logs.'] },
    ],
  },
  {
    label: 'Account',
    color: '#475569',
    modules: [
      { id: 'security-center', title: 'Security Center', icon: SecurityIcon, summary: 'Login security for your account.', actions: ['Review login activity and sessions.', 'Turn on extra security options.'] },
      { id: 'mobile-pwa', title: 'Mobile & PWA', icon: MobileIcon, summary: 'Use Jobpoyt like an app on phone or desktop.', actions: ['Click install to add Jobpoyt to your home screen.'] },
      { id: 'billing-subscription', title: 'Billing & Subscription', icon: ReceiptIcon, summary: 'Your plan, credits, payments and invoices. Also opens from the crown icon in the top bar.', actions: ['Overview: current plan, credits left, plan end date.', 'Choose a Recruiter Pro duration (1, 3, 6 or 12 months) and pay.', 'Download GST invoices from the Invoices tab.'] },
      { id: 'my-details', title: 'My Details', icon: ManageAccountsIcon, summary: 'Company profile shown to candidates.', actions: ['Upload logo, add company name, industry, location, address and description.', 'Company email must be an official company email (Gmail, Yahoo, Outlook, etc. are not allowed).', 'Click Save. Jobs need a completed profile.'] },
    ],
  },
];

const QUICK_START = [
  'Complete My Details (logo, company info, official company email) and click Save.',
  `Post your first job from Jobs (${JOB_POST_CREDIT_COST} credits on Free plan).`,
  'Review candidates in Applicants. Unlock the ones you like to see contact details and resume.',
  'Shortlist, move stages, message, and schedule interviews.',
  'Upgrade to Recruiter Pro for unlimited jobs and unlocks.',
];

const TOPBAR_ITEMS = [
  { name: 'Plan chip (Free / Pro)', text: 'Shows your current plan.' },
  { name: 'Home', text: 'Opens the Jobpoyt home page.' },
  { name: 'Crown', text: 'Opens Billing & Subscription.' },
  { name: 'Bell', text: 'Opens notifications. The red number is unread notifications.' },
  { name: 'Chat', text: 'Opens Messages. The red number is unread messages.' },
  { name: '? Help', text: 'Opens this guide.' },
  { name: 'Profile picture', text: 'Menu: My Details, Settings, Dashboard Guide, Customer Care (raise a support ticket) and Sign out.' },
];

const BULK_ACTIONS = [
  { name: 'Shortlist', text: 'Marks all selected candidates as shortlisted.' },
  { name: 'Reject', text: 'Marks all selected candidates as rejected.' },
  { name: 'ATS Stage + Move', text: 'Pick a stage in the dropdown, then click Move.' },
  { name: 'Tags + Add / Remove', text: 'Pick tags in the dropdown, then add or remove them.' },
  { name: 'Talent Pool + Add / Remove', text: 'Pick pools, then add or remove candidates.' },
  { name: 'Message', text: 'Send one message to all selected candidates.' },
  { name: 'CSV', text: 'Download the selected candidates as a CSV file.' },
  { name: 'Deselect all', text: 'Clears the selection.' },
];

const FAQ = [
  { q: 'What happens when my free credits run out?', a: 'You cannot post new jobs or unlock new candidates until you upgrade. Candidates you already unlocked stay unlocked.' },
  { q: 'Does opening the same candidate again cost a credit?', a: 'No. Each candidate is charged only once.' },
  { q: 'What happens when Recruiter Pro expires?', a: 'Paid actions are paused and a renew screen appears. Renew from Billing & Subscription to continue.' },
  { q: 'Why does it say "Please use your official company email"?', a: 'Personal email domains (Gmail, Yahoo, Outlook, etc.) are blocked. Use your company domain email in My Details.' },
  { q: 'Why do I see an upgrade popup?', a: 'On the Free plan a reminder appears every 3 minutes. Click "Maybe later" to close it.' },
  { q: 'How do I get help?', a: 'Profile picture → Customer Care to raise a ticket. Replies show as a red count in that menu.' },
];

interface RecruiterHelpGuideProps {
  open: boolean;
  onClose: () => void;
  onOpenTab?: (tabId: string) => void;
}

const matches = (query: string, ...values: string[]) => {
  const q = query.trim().toLowerCase();
  return !q || values.some((value) => value.toLowerCase().includes(q));
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748B', mb: 1 }}>
    {children}
  </Typography>
);

export const RecruiterHelpGuide: React.FC<RecruiterHelpGuideProps> = ({ open, onClose, onOpenTab }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [query, setQuery] = React.useState('');

  const groups = GUIDE_GROUPS
    .map((group) => ({ ...group, modules: group.modules.filter((m) => matches(query, m.title, m.summary, ...m.actions)) }))
    .filter((group) => group.modules.length > 0);
  const faq = FAQ.filter((item) => matches(query, item.q, item.a));
  const searching = query.trim().length > 0;

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 4, overflow: 'hidden' } }}>
      <Box sx={{ position: 'relative', px: { xs: 2.5, md: 3.5 }, pt: 3, pb: 2.5, color: '#fff', background: 'radial-gradient(circle at 90% 0%, rgba(56,189,248,0.35), transparent 45%), linear-gradient(135deg, #1D4ED8 0%, #4F46E5 55%, #7C3AED 100%)' }}>
        <IconButton onClick={onClose} aria-label="Close guide" sx={{ position: 'absolute', top: 10, right: 10, color: 'rgba(255,255,255,0.85)' }}>
          <CloseIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 46, height: 46, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.18)' }}>
            <GuideIcon />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>Recruiter Dashboard Guide</Typography>
            <Typography sx={{ fontSize: 13, opacity: 0.85 }}>Everything you can do on Jobpoyt, A to Z.</Typography>
          </Box>
        </Box>
        <TextField
          fullWidth
          size="small"
          placeholder="Search e.g. post job, unlock, tags, invoice"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          sx={{ mt: 2, '& .MuiInputBase-root': { bgcolor: '#fff', borderRadius: 2.5 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
      </Box>

      <DialogContent sx={{ px: { xs: 2, md: 3.5 }, py: 2.5, bgcolor: '#F8FAFC' }}>
        {!searching && (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.3fr 1fr' }, gap: 2, mb: 3 }}>
              <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#fff', border: '1px solid #E2E8F0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
                  <RocketIcon sx={{ color: '#2563EB', fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 800 }}>Quick start</Typography>
                </Box>
                <Stack spacing={1}>
                  {QUICK_START.map((step, index) => (
                    <Box key={step} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                      <Box sx={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>{index + 1}</Box>
                      <Typography sx={{ fontSize: 13.5, color: '#334155' }}>{step}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
              <Box sx={{ p: 2, borderRadius: 3, border: '1px solid #FDE68A', background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)' }}>
                <Typography sx={{ fontWeight: 800, color: '#92400E', mb: 1 }}>Credits & plans</Typography>
                <Stack spacing={0.75} sx={{ fontSize: 13.5, color: '#78350F' }}>
                  <Typography sx={{ fontSize: 'inherit' }}>• Free plan: <strong>{FREE_RECRUITER_CREDITS} one-time credits</strong></Typography>
                  <Typography sx={{ fontSize: 'inherit' }}>• Post a job: <strong>{JOB_POST_CREDIT_COST} credits</strong></Typography>
                  <Typography sx={{ fontSize: 'inherit' }}>• Unlock a candidate: <strong>{CANDIDATE_UNLOCK_CREDIT_COST} credit</strong> (once per candidate)</Typography>
                  <Typography sx={{ fontSize: 'inherit' }}>• Recruiter Pro: <strong>unlimited</strong> jobs & unlocks</Typography>
                  <Typography sx={{ fontSize: 'inherit' }}>• Pro expired: paid actions pause until renewal</Typography>
                </Stack>
                {onOpenTab && (
                  <Button size="small" variant="contained" onClick={() => onOpenTab('billing-subscription')} sx={{ mt: 1.5, textTransform: 'none', fontWeight: 700, borderRadius: 2, background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                    View plans
                  </Button>
                )}
              </Box>
            </Box>

            <SectionTitle>Top bar</SectionTitle>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, mb: 3 }}>
              {TOPBAR_ITEMS.map((item) => (
                <Box key={item.name} sx={{ p: 1.25, borderRadius: 2, bgcolor: '#fff', border: '1px solid #E2E8F0' }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{item.name}</Typography>
                  <Typography sx={{ fontSize: 12.5, color: '#64748B' }}>{item.text}</Typography>
                </Box>
              ))}
            </Box>
          </>
        )}

        {groups.map((group) => (
          <Box key={group.label} sx={{ mb: 2.5 }}>
            <SectionTitle>{group.label}</SectionTitle>
            {group.modules.map((module) => {
              const Icon = module.icon;
              return (
                <Accordion key={module.id} disableGutters defaultExpanded={searching} sx={{ mb: 0.75, borderRadius: '12px !important', border: '1px solid #E2E8F0', boxShadow: 'none', '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                      <Box sx={{ flexShrink: 0, width: 32, height: 32, borderRadius: 2, display: 'grid', placeItems: 'center', color: group.color, bgcolor: `${group.color}14` }}>
                        <Icon sx={{ fontSize: 18 }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{module.title}</Typography>
                        <Typography sx={{ fontSize: 12.5, color: '#64748B' }}>{module.summary}</Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Stack component="ul" spacing={0.6} sx={{ pl: 2.5, my: 0 }}>
                      {module.actions.map((action) => (
                        <Typography component="li" key={action} sx={{ fontSize: 13.5, color: '#334155' }}>{action}</Typography>
                      ))}
                    </Stack>
                    {onOpenTab && (
                      <Button size="small" variant="outlined" onClick={() => onOpenTab(module.id)} sx={{ mt: 1.5, textTransform: 'none', fontWeight: 700, borderRadius: 2, color: group.color, borderColor: `${group.color}66` }}>
                        Open {module.title}
                      </Button>
                    )}
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        ))}

        {(!searching || matches(query, 'bulk candidate actions shortlist reject move tags pool message csv deselect')) && (
          <Box sx={{ mb: 2.5 }}>
            <SectionTitle>Bulk candidate actions (Applicants)</SectionTitle>
            <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#fff', border: '1px solid #E2E8F0' }}>
              <Typography sx={{ fontSize: 13, color: '#64748B', mb: 1.25 }}>Tick one or more candidates, then use the icons in the Candidate Actions bar. Hover any icon to see its name.</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {BULK_ACTIONS.map((item) => (
                  <Chip key={item.name} label={<span><strong>{item.name}</strong> – {item.text}</span>} sx={{ height: 'auto', py: 0.6, bgcolor: '#F1F5F9', '& .MuiChip-label': { whiteSpace: 'normal', fontSize: 12.5 } }} />
                ))}
              </Box>
            </Box>
          </Box>
        )}

        {faq.length > 0 && (
          <Box>
            <SectionTitle>FAQ</SectionTitle>
            {faq.map((item) => (
              <Accordion key={item.q} disableGutters defaultExpanded={searching} sx={{ mb: 0.75, borderRadius: '12px !important', border: '1px solid #E2E8F0', boxShadow: 'none', '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>{item.q}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Typography sx={{ fontSize: 13.5, color: '#334155' }}>{item.a}</Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {searching && groups.length === 0 && faq.length === 0 && (
          <Typography sx={{ textAlign: 'center', color: '#64748B', py: 4 }}>No results for "{query}". Try another word or contact Customer Care.</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
};
