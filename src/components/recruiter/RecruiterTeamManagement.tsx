import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { RecruiterPageHero } from './RecruiterPageHero';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FileDownload as FileDownloadIcon,
  Group as GroupIcon,
  LockReset as LockResetIcon,
  Notifications as NotificationsIcon,
  PersonAddAlt as PersonAddAltIcon,
  Refresh as RefreshIcon,
  RemoveRedEye as RemoveRedEyeIcon,
  Security as SecurityIcon,
  SyncAlt as SyncAltIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { Job } from '@types';
import { supabase } from '@services/supabase';
import {
  PermissionKey,
  TeamMember,
  TeamRoleKey,
  teamManagementService,
} from '@services/teamManagement';
import { themeColors } from '@styles/recruiterTheme';

interface RecruiterTeamManagementProps {
  ownerId: string;
  currentUserId: string;
  ownerName?: string;
  ownerEmail?: string;
  jobs: Job[];
}

type TeamTab =
  | 'overview'
  | 'members'
  | 'roles'
  | 'permissions'
  | 'assignments'
  | 'activity'
  | 'audit'
  | 'login-history'
  | 'notifications'
  | 'reports'
  | 'security';

interface CandidateOption {
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
}

const MotionBox = motion(Box);

const metricCard = (title: string, value: string | number, color: string) => (
  <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
    <CardContent>
      <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>{title}</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.6, color }}>{value}</Typography>
    </CardContent>
  </Card>
);

const parseDate = (value: string): string => {
  try {
    return format(new Date(value), 'dd MMM yyyy, hh:mm a');
  } catch {
    return '-';
  }
};

const downloadText = (fileName: string, content: string, type = 'text/plain;charset=utf-8'): void => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const emptyInvite = {
  fullName: '',
  email: '',
  role: 'recruiter' as TeamRoleKey,
  customRoleId: '',
  department: 'Engineering',
  phone: '',
};

const getRoleText = (role: TeamRoleKey): string => teamManagementService.getRoleLabels()[role];

export const RecruiterTeamManagement: React.FC<RecruiterTeamManagementProps> = ({
  ownerId,
  currentUserId,
  ownerName = 'Company Owner',
  ownerEmail = '',
  jobs,
}) => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const [tab, setTab] = useState<TeamTab>('overview');

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | TeamRoleKey>('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'invited'>('all');
  const [lastActiveFilter, setLastActiveFilter] = useState<'all' | '7d' | '30d' | '90d'>('all');

  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteState, setInviteState] = useState(emptyInvite);

  const [newRoleName, setNewRoleName] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([]);

  const [permissionMemberId, setPermissionMemberId] = useState('');

  const [assignJobMemberIds, setAssignJobMemberIds] = useState<string[]>([]);
  const [assignJobIds, setAssignJobIds] = useState<string[]>([]);
  const [assignCandidateMemberIds, setAssignCandidateMemberIds] = useState<string[]>([]);
  const [assignCandidateIds, setAssignCandidateIds] = useState<string[]>([]);

  const [auditSearch, setAuditSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [reportOutput, setReportOutput] = useState('');

  const [enableTwoFactorFuture, setEnableTwoFactorFuture] = useState(false);

  const roleLabels = teamManagementService.getRoleLabels();
  const allPermissions = teamManagementService.getAllPermissions();
  const permissionCategories = teamManagementService.getPermissionCategories();

  const access = useMemo(
    () => teamManagementService.getAccessContext(ownerId, currentUserId),
    [ownerId, currentUserId, members.length]
  );

  const can = (permission: PermissionKey): boolean => access.permissions.includes(permission);

  const refresh = async (): Promise<void> => {
    teamManagementService.initializeOwner(ownerId, ownerName, ownerEmail);

    const list = teamManagementService.listMembers(ownerId, {
      search,
      role: roleFilter,
      department: deptFilter,
      status: statusFilter,
      lastActive: lastActiveFilter,
    });
    setMembers(list);

    const jobIds = jobs.map((job) => String(job.id));
    if (jobIds.length > 0) {
      const { data } = await supabase
        .from('job_applications')
        .select('user_id, job_id, profiles(name), jobs(title)')
        .in('job_id', jobIds)
        .order('updated_at', { ascending: false });

      const rows = ((data || []) as any[]).map((row) => ({
        candidateId: String(row.user_id || ''),
        candidateName: String(row?.profiles?.name || 'Candidate'),
        jobId: String(row.job_id || ''),
        jobTitle: String(row?.jobs?.title || jobs.find((job) => String(job.id) === String(row.job_id))?.title || 'Untitled Job'),
      }));

      const uniqueMap = new Map<string, CandidateOption>();
      rows.forEach((row) => {
        const key = `${row.candidateId}-${row.jobId}`;
        if (!uniqueMap.has(key)) uniqueMap.set(key, row);
      });
      setCandidates(Array.from(uniqueMap.values()));
    } else {
      setCandidates([]);
    }
  };

  useEffect(() => {
    void refresh();
  }, [ownerId, currentUserId, search, roleFilter, deptFilter, statusFilter, lastActiveFilter, jobs.length]);

  const summary = useMemo(() => teamManagementService.summary(ownerId), [ownerId, members.length]);
  const departments = useMemo(() => teamManagementService.listDepartments(ownerId), [ownerId, members.length]);
  const customRoles = useMemo(() => teamManagementService.listCustomRoles(ownerId), [ownerId, members.length]);
  const invitations = useMemo(() => teamManagementService.getOrganization(ownerId).invitations, [ownerId, members.length]);
  const activityRows = useMemo(() => teamManagementService.listActivity(ownerId), [ownerId, members.length]);
  const auditLogs = useMemo(() => teamManagementService.listAuditLogs(ownerId, auditSearch), [ownerId, auditSearch, members.length]);
  const loginHistory = useMemo(
    () => teamManagementService
      .listLoginHistory(ownerId)
      .filter((item) => !historySearch.trim() || `${item.memberName} ${item.browser} ${item.device} ${item.location} ${item.ipAddress}`.toLowerCase().includes(historySearch.toLowerCase())),
    [ownerId, historySearch, members.length]
  );
  const notifications = useMemo(() => teamManagementService.listNotifications(ownerId), [ownerId, members.length]);

  const onOpenEditMember = (member: TeamMember): void => {
    setEditingMember(member);
    setSelectedPermissions(member.permissions);
    setMemberDialogOpen(true);
  };

  const onSaveMember = (): void => {
    if (!editingMember) return;
    try {
      teamManagementService.updateMember(ownerId, editingMember.id, currentUserId, {
        fullName: editingMember.fullName,
        email: editingMember.email,
        role: editingMember.role,
        customRoleId: editingMember.customRoleId,
        department: editingMember.department,
        phone: editingMember.phone,
        permissions: selectedPermissions,
        status: editingMember.status,
      });
      setMemberDialogOpen(false);
      setEditingMember(null);
      toast.success('Team member updated');
      void refresh();
    } catch (error: any) {
      toast.error(String(error?.message || 'Failed to update member'));
    }
  };

  const onInviteMember = (): void => {
    if (!inviteState.fullName.trim() || !inviteState.email.trim()) {
      toast.error('Full name and email are required');
      return;
    }

    const rolePermissions = inviteState.role === 'custom'
      ? selectedPermissions
      : teamManagementService.getDefaultRolePermissions()[inviteState.role as Exclude<TeamRoleKey, 'custom'>] || [];

    try {
      teamManagementService.inviteMember(ownerId, currentUserId, {
        fullName: inviteState.fullName,
        email: inviteState.email,
        role: inviteState.role,
        customRoleId: inviteState.customRoleId || undefined,
        department: inviteState.department,
        phone: inviteState.phone,
        defaultPermissions: rolePermissions,
      });

      setInviteDialogOpen(false);
      setInviteState(emptyInvite);
      setSelectedPermissions([]);
      toast.success('Invitation sent');
      void refresh();
    } catch (error: any) {
      toast.error(String(error?.message || 'Failed to send invitation'));
    }
  };

  const onResendInvite = (inviteId: string): void => {
    try {
      teamManagementService.resendInvitation(ownerId, inviteId, currentUserId);
      toast.success('Invitation resent');
      void refresh();
    } catch (error: any) {
      toast.error(String(error?.message || 'Failed to resend invitation'));
    }
  };

  const onBulkAction = (action: 'deactivate' | 'activate' | 'delete' | 'export'): void => {
    if (selectedMemberIds.length === 0) {
      toast.error('Select at least one team member');
      return;
    }

    try {
      if (action === 'deactivate') {
        selectedMemberIds.forEach((id) => teamManagementService.deactivateMember(ownerId, id, currentUserId));
        toast.success('Selected members deactivated');
      }

      if (action === 'activate') {
        selectedMemberIds.forEach((id) => teamManagementService.activateMember(ownerId, id, currentUserId));
        toast.success('Selected members activated');
      }

      if (action === 'delete') {
        selectedMemberIds.forEach((id) => teamManagementService.removeMember(ownerId, id, currentUserId));
        toast.success('Selected members removed');
      }

      if (action === 'export') {
        const csv = teamManagementService.exportMembersCsv(ownerId);
        downloadText('team_members.csv', csv, 'text/csv;charset=utf-8');
        toast.success('Team members exported');
      }

      setSelectedMemberIds([]);
      void refresh();
    } catch (error: any) {
      toast.error(String(error?.message || 'Bulk action failed'));
    }
  };

  const onCreateCustomRole = (): void => {
    if (!newRoleName.trim()) {
      toast.error('Custom role name is required');
      return;
    }

    if (selectedPermissions.length === 0) {
      toast.error('Pick at least one permission for custom role');
      return;
    }

    try {
      teamManagementService.createCustomRole(ownerId, currentUserId, {
        name: newRoleName,
        permissions: selectedPermissions,
      });
      setNewRoleName('');
      setSelectedPermissions([]);
      toast.success('Custom role created');
      void refresh();
    } catch (error: any) {
      toast.error(String(error?.message || 'Failed to create custom role'));
    }
  };

  const onUpdateMemberPermissions = (): void => {
    if (!permissionMemberId) {
      toast.error('Select member first');
      return;
    }

    try {
      teamManagementService.updateMember(ownerId, permissionMemberId, currentUserId, {
        permissions: selectedPermissions,
      });
      toast.success('Member permissions updated');
      void refresh();
    } catch (error: any) {
      toast.error(String(error?.message || 'Failed to update permissions'));
    }
  };

  const onAssignJobs = (): void => {
    if (assignJobMemberIds.length === 0) {
      toast.error('Select at least one member');
      return;
    }

    teamManagementService.assignJobs(ownerId, currentUserId, assignJobMemberIds, assignJobIds);
    toast.success('Job assignment updated');
    void refresh();
  };

  const onAssignCandidates = (): void => {
    if (assignCandidateMemberIds.length === 0) {
      toast.error('Select at least one member');
      return;
    }

    teamManagementService.assignCandidates(ownerId, currentUserId, assignCandidateMemberIds, assignCandidateIds);
    toast.success('Candidate assignment updated');
    void refresh();
  };

  const onGenerateReports = (): void => {
    const reports = teamManagementService.generateReports(ownerId);
    const merged = [
      reports.recruiterPerformance,
      '',
      reports.departmentPerformance,
      '',
      reports.hiringPerformance,
      '',
      reports.interviewPerformance,
      '',
      reports.monthlyProductivity,
    ].join('\n\n');

    setReportOutput(merged);
  };

  const onExportReportsPdf = (): void => {
    if (!reportOutput) {
      toast.error('Generate reports first');
      return;
    }

    const win = window.open('', '_blank', 'width=1200,height=900');
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>Team Reports</title><style>body{font-family:Arial,sans-serif;margin:24px;} pre{white-space:pre-wrap;}</style></head>
        <body><h1>Team Management Reports</h1><pre>${reportOutput.replace(/[<>&]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[char] || char))}</pre></body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const canManageTeam = can('settings.manage_team');
  const canManageRoles = can('settings.manage_roles');
  const canManageSecurity = can('settings.security');

  return (
    <MotionBox initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <RecruiterPageHero
        eyebrow="Company"
        title="Team Management & RBAC"
        description="Centralized team access control for jobs, applicants, ATS, messaging, interviews, analytics, AI, automation, billing, and settings."
        actions={(
          <Button startIcon={<RefreshIcon />} variant="contained" onClick={() => void refresh()}>
            Refresh
          </Button>
        )}
      />

      {!canManageTeam && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You are in restricted mode. Some actions are hidden based on role permissions.
        </Alert>
      )}

      <Paper sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}`, mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, value: TeamTab) => setTab(value)}
          variant={isTablet ? 'scrollable' : 'scrollable'} scrollButtons="auto" allowScrollButtonsMobile sx={{ minHeight: 54, px: 0.5, '& .MuiTabs-scroller': { overflowX: 'auto !important' }, '& .MuiTabs-scrollButtons': { width: 34, borderRadius: 1, mx: 0.5 }, '& .MuiTab-root': { textTransform: 'none', whiteSpace: 'nowrap', minHeight: 54, minWidth: 'max-content', px: 1.8, fontWeight: 700, fontSize: '0.82rem' } }}
        >
          <Tab value="overview" label="Overview" />
          <Tab value="members" label="Team Members" />
          <Tab value="roles" label="Roles" />
          <Tab value="permissions" label="Permissions" />
          <Tab value="assignments" label="Assignments" />
          <Tab value="activity" label="Activity" />
          <Tab value="audit" label="Audit Logs" />
          <Tab value="login-history" label="Login History" />
          <Tab value="notifications" label="Notifications" />
          <Tab value="reports" label="Reports" />
          <Tab value="security" label="Security" />
        </Tabs>
      </Paper>

      {tab === 'overview' && (
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={4}>{metricCard('Total Team Members', summary.totalTeamMembers, '#2563EB')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{metricCard('Active Recruiters', summary.activeRecruiters, '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{metricCard('Hiring Managers', summary.hiringManagers, '#9333EA')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{metricCard('Interviewers', summary.interviewers, '#B45309')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{metricCard('Pending Invitations', summary.pendingInvitations, '#BE123C')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{metricCard('Open Roles', summary.openRoles, '#0369A1')}</Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Hiring Manager View</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Review shortlisted candidates" /></ListItem>
                  <ListItem><ListItemText primary="Submit interview feedback" /></ListItem>
                  <ListItem><ListItemText primary="Approve offers" /></ListItem>
                  <ListItem><ListItemText primary="Reject candidates" /></ListItem>
                  <ListItem><ListItemText primary="No billing/company settings access" /></ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Interviewer View</Typography>
                <List dense>
                  <ListItem><ListItemText primary="View assigned interviews" /></ListItem>
                  <ListItem><ListItemText primary="View candidate profile" /></ListItem>
                  <ListItem><ListItemText primary="Submit interview scorecard" /></ListItem>
                  <ListItem><ListItemText primary="No salary and billing access" /></ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'members' && (
        <Box>
          <Grid container spacing={1} sx={{ mb: 1.2 }}>
            <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Search by name/email/role/department" value={search} onChange={(event) => setSearch(event.target.value)} /></Grid>
            <Grid item xs={12} md={2}><FormControl fullWidth size="small"><InputLabel>Role</InputLabel><Select value={roleFilter} label="Role" onChange={(event) => setRoleFilter(event.target.value as 'all' | TeamRoleKey)}><MenuItem value="all">All</MenuItem>{Object.keys(roleLabels).map((role) => <MenuItem key={role} value={role}>{roleLabels[role as TeamRoleKey]}</MenuItem>)}</Select></FormControl></Grid>
            <Grid item xs={12} md={2}><FormControl fullWidth size="small"><InputLabel>Department</InputLabel><Select value={deptFilter} label="Department" onChange={(event) => setDeptFilter(event.target.value)}><MenuItem value="all">All</MenuItem>{departments.map((department) => <MenuItem key={department.id} value={department.name}>{department.name}</MenuItem>)}</Select></FormControl></Grid>
            <Grid item xs={12} md={2}><FormControl fullWidth size="small"><InputLabel>Status</InputLabel><Select value={statusFilter} label="Status" onChange={(event) => setStatusFilter(event.target.value as any)}><MenuItem value="all">All</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem><MenuItem value="invited">Invited</MenuItem></Select></FormControl></Grid>
            <Grid item xs={12} md={2}><FormControl fullWidth size="small"><InputLabel>Last Active</InputLabel><Select value={lastActiveFilter} label="Last Active" onChange={(event) => setLastActiveFilter(event.target.value as any)}><MenuItem value="all">All</MenuItem><MenuItem value="7d">Last 7 days</MenuItem><MenuItem value="30d">Last 30 days</MenuItem><MenuItem value="90d">Last 90 days</MenuItem></Select></FormControl></Grid>
            <Grid item xs={12} md={1}><Button fullWidth variant="contained" size="small" startIcon={<PersonAddAltIcon />} disabled={!canManageTeam} onClick={() => { setInviteDialogOpen(true); setSelectedPermissions(teamManagementService.getDefaultRolePermissions().recruiter); }}>Invite</Button></Grid>
          </Grid>

          <Paper sx={{ p: 1, mb: 1.2, border: `1px solid ${themeColors.border}`, borderRadius: 2 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button size="small" variant="outlined" onClick={() => onBulkAction('activate')} disabled={!canManageTeam}>Activate</Button>
              <Button size="small" variant="outlined" onClick={() => onBulkAction('deactivate')} disabled={!canManageTeam}>Deactivate</Button>
              <Button size="small" variant="outlined" onClick={() => onBulkAction('export')}>Export</Button>
              <Button size="small" color="error" variant="outlined" onClick={() => onBulkAction('delete')} disabled={!canManageTeam}>Delete</Button>
              <Chip size="small" label={`${selectedMemberIds.length} selected`} />
            </Stack>
          </Paper>

          <TableContainer component={Paper} sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox"><Checkbox size="small" checked={selectedMemberIds.length > 0 && selectedMemberIds.length === members.length} onChange={(event) => setSelectedMemberIds(event.target.checked ? members.map((member) => member.id) : [])} /></TableCell>
                  <TableCell>Avatar</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Assigned Jobs</TableCell>
                  <TableCell>Candidates Managed</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Active</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id} hover>
                    <TableCell padding="checkbox"><Checkbox size="small" checked={selectedMemberIds.includes(member.id)} onChange={(event) => setSelectedMemberIds((current) => event.target.checked ? [...current, member.id] : current.filter((id) => id !== member.id))} /></TableCell>
                    <TableCell><Avatar src={member.avatar || undefined}>{member.fullName.charAt(0).toUpperCase()}</Avatar></TableCell>
                    <TableCell>{member.fullName}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{getRoleText(member.role)}</TableCell>
                    <TableCell>{member.department}</TableCell>
                    <TableCell>{member.assignedJobIds.length}</TableCell>
                    <TableCell>{member.assignedCandidateIds.length}</TableCell>
                    <TableCell><Chip size="small" color={member.status === 'active' ? 'success' : member.status === 'inactive' ? 'default' : 'warning'} label={member.status} /></TableCell>
                    <TableCell>{parseDate(member.lastActiveAt)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.4} justifyContent="flex-end">
                        <Tooltip title="View"><span><IconButton size="small" onClick={() => onOpenEditMember(member)}><RemoveRedEyeIcon fontSize="small" /></IconButton></span></Tooltip>
                        <Tooltip title="Edit"><span><IconButton size="small" disabled={!canManageTeam} onClick={() => onOpenEditMember(member)}><EditIcon fontSize="small" /></IconButton></span></Tooltip>
                        <Tooltip title="Deactivate"><span><IconButton size="small" disabled={!canManageTeam || member.status !== 'active' || member.role === 'owner'} onClick={() => { teamManagementService.deactivateMember(ownerId, member.id, currentUserId); void refresh(); }}><SyncAltIcon fontSize="small" /></IconButton></span></Tooltip>
                        <Tooltip title="Remove"><span><IconButton size="small" color="error" disabled={!canManageTeam || member.role === 'owner'} onClick={() => { teamManagementService.removeMember(ownerId, member.id, currentUserId); void refresh(); }}><DeleteIcon fontSize="small" /></IconButton></span></Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Card sx={{ mt: 1.2, borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Pending Invitations</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Sent At</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invitations.filter((invite) => invite.status === 'pending').map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.fullName}</TableCell>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell>{getRoleText(invite.role)}</TableCell>
                      <TableCell>{invite.department}</TableCell>
                      <TableCell><Chip size="small" label={invite.status} color="warning" /></TableCell>
                      <TableCell>{parseDate(invite.sentAt)}</TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="outlined" disabled={!canManageTeam} onClick={() => onResendInvite(invite.id)}>Resend Invitation</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Box>
      )}

      {tab === 'roles' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Built-in Roles</Typography>
                <List dense>
                  {Object.keys(roleLabels)
                    .filter((role) => role !== 'custom')
                    .map((role) => (
                      <ListItem key={role}>
                        <ListItemText
                          primary={roleLabels[role as TeamRoleKey]}
                          secondary={`${teamManagementService.getDefaultRolePermissions()[role as Exclude<TeamRoleKey, 'custom'>]?.length || 0} permissions`}
                        />
                      </ListItem>
                    ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Create Custom Role</Typography>
                <Stack spacing={1}>
                  <TextField label="Role Name" value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} />
                  <FormControl fullWidth>
                    <InputLabel>Permissions</InputLabel>
                    <Select multiple value={selectedPermissions} label="Permissions" onChange={(event) => setSelectedPermissions(event.target.value as PermissionKey[])}>
                      {allPermissions.map((permission) => (
                        <MenuItem key={permission} value={permission}>{permission}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button variant="contained" startIcon={<AddIcon />} disabled={!canManageRoles} onClick={onCreateCustomRole}>Create Custom Role</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Custom Roles</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Permissions Count</TableCell>
                      <TableCell>Updated</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>{role.name}</TableCell>
                        <TableCell>{role.permissions.length}</TableCell>
                        <TableCell>{parseDate(role.updatedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Departments</Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                  <TextField label="Add Department" value={newDepartment} onChange={(event) => setNewDepartment(event.target.value)} />
                  <Button variant="outlined" onClick={() => {
                    if (!newDepartment.trim()) return;
                    teamManagementService.addDepartment(ownerId, newDepartment);
                    setNewDepartment('');
                    void refresh();
                  }}>Add</Button>
                </Stack>
                <Stack direction="row" spacing={0.7} sx={{ mt: 1, flexWrap: 'wrap' }}>
                  {departments.map((department) => <Chip key={department.id} label={department.name} size="small" />)}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'permissions' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Team Member</InputLabel>
              <Select value={permissionMemberId} label="Team Member" onChange={(event) => {
                const id = event.target.value;
                setPermissionMemberId(id);
                const member = members.find((row) => row.id === id);
                setSelectedPermissions(member?.permissions || []);
              }}>
                {members.map((member) => (
                  <MenuItem key={member.id} value={member.id}>{member.fullName} ({getRoleText(member.role)})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={8}><Button variant="contained" onClick={onUpdateMemberPermissions} disabled={!canManageRoles}>Update Permissions</Button></Grid>

          {Object.entries(permissionCategories).map(([category, permissions]) => (
            <Grid item xs={12} md={6} key={category}>
              <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.8 }}>{category}</Typography>
                  <Stack spacing={0.4}>
                    {permissions.map((permission) => (
                      <Box key={permission} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2">{permission}</Typography>
                        <Switch
                          checked={selectedPermissions.includes(permission)}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setSelectedPermissions((current) => Array.from(new Set([...current, permission])));
                            } else {
                              setSelectedPermissions((current) => current.filter((item) => item !== permission));
                            }
                          }}
                        />
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 'assignments' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Job Assignment</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Assigned recruiters see only assigned jobs unless they have jobs.view_all permission.</Typography>
                <Stack spacing={1}>
                  <FormControl fullWidth>
                    <InputLabel>Team Members</InputLabel>
                    <Select multiple value={assignJobMemberIds} label="Team Members" onChange={(event) => setAssignJobMemberIds(event.target.value as string[])}>
                      {members.filter((member) => member.status === 'active').map((member) => (
                        <MenuItem key={member.id} value={member.id}>{member.fullName} ({getRoleText(member.role)})</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel>Jobs</InputLabel>
                    <Select multiple value={assignJobIds} label="Jobs" onChange={(event) => setAssignJobIds(event.target.value as string[])}>
                      {jobs.map((job) => (
                        <MenuItem key={String(job.id)} value={String(job.id)}>{job.title}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button variant="contained" onClick={onAssignJobs} disabled={!canManageTeam}>Assign Jobs</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Candidate Assignment</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Assign or transfer candidate ownership, including bulk assignment.</Typography>
                <Stack spacing={1}>
                  <FormControl fullWidth>
                    <InputLabel>Team Members</InputLabel>
                    <Select multiple value={assignCandidateMemberIds} label="Team Members" onChange={(event) => setAssignCandidateMemberIds(event.target.value as string[])}>
                      {members.filter((member) => member.status === 'active').map((member) => (
                        <MenuItem key={member.id} value={member.id}>{member.fullName}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel>Candidates</InputLabel>
                    <Select multiple value={assignCandidateIds} label="Candidates" onChange={(event) => setAssignCandidateIds(event.target.value as string[])}>
                      {candidates.map((candidate) => (
                        <MenuItem key={`${candidate.candidateId}-${candidate.jobId}`} value={candidate.candidateId}>{candidate.candidateName} â€¢ {candidate.jobTitle}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button variant="contained" onClick={onAssignCandidates} disabled={!canManageTeam}>Assign Candidates</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'activity' && (
        <TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Member</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Jobs Created</TableCell>
                <TableCell>Applicants Reviewed</TableCell>
                <TableCell>Messages Sent</TableCell>
                <TableCell>Interviews Scheduled</TableCell>
                <TableCell>Offers Sent</TableCell>
                <TableCell>Hires Completed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activityRows.map((row) => (
                <TableRow key={row.memberId}>
                  <TableCell>{row.memberName}</TableCell>
                  <TableCell>{getRoleText(row.role)}</TableCell>
                  <TableCell>{row.department}</TableCell>
                  <TableCell>{row.jobsCreated}</TableCell>
                  <TableCell>{row.applicantsReviewed}</TableCell>
                  <TableCell>{row.messagesSent}</TableCell>
                  <TableCell>{row.interviewsScheduled}</TableCell>
                  <TableCell>{row.offersSent}</TableCell>
                  <TableCell>{row.hiresCompleted}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 'audit' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            <TextField fullWidth size="small" label="Search audit logs" value={auditSearch} onChange={(event) => setAuditSearch(event.target.value)} sx={{ mb: 1.2 }} />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Actor</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Entity</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{parseDate(log.createdAt)}</TableCell>
                    <TableCell>{log.actorName}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.entityType}</TableCell>
                    <TableCell>{log.details}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 'login-history' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            <TextField fullWidth size="small" label="Search login history" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} sx={{ mb: 1.2 }} />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell>Device</TableCell>
                  <TableCell>Browser</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loginHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.memberName}</TableCell>
                    <TableCell>{item.device}</TableCell>
                    <TableCell>{item.browser}</TableCell>
                    <TableCell>{item.location}</TableCell>
                    <TableCell>{item.ipAddress}</TableCell>
                    <TableCell>{parseDate(item.time)}</TableCell>
                    <TableCell>
                      <Chip size="small" color={item.successful ? 'success' : 'error'} label={item.successful ? 'Successful Login' : 'Failed Login'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 'notifications' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            <Stack spacing={0.8}>
              {notifications.length === 0 ? (
                <Alert severity="info">No notifications yet.</Alert>
              ) : notifications.map((item) => (
                <Paper key={item.id} sx={{ p: 1, border: `1px solid ${themeColors.border}` }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.type}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.message}</Typography>
                      <Typography variant="caption" sx={{ display: 'block', color: themeColors.text.tertiary }}>{parseDate(item.createdAt)}</Typography>
                    </Box>
                    <Button size="small" onClick={() => {
                      teamManagementService.markNotificationRead(ownerId, item.id);
                      void refresh();
                    }} disabled={item.read}>{item.read ? 'Read' : 'Mark Read'}</Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {tab === 'reports' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button variant="contained" startIcon={<FileDownloadIcon />} onClick={onGenerateReports}>Generate Reports</Button>
              <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={onExportReportsPdf}>Download PDF</Button>
              <Button variant="outlined" onClick={() => downloadText('team_reports.md', reportOutput, 'text/markdown;charset=utf-8')} disabled={!reportOutput}>Export Markdown</Button>
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Generated Reports</Typography>
                <Paper sx={{ p: 1.2, backgroundColor: '#F8FAFC', border: `1px solid ${themeColors.border}` }}>
                  <Typography component="pre" sx={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.8rem' }}>
                    {reportOutput || 'Generate reports to view Recruiter Performance, Department Performance, Hiring Performance, Interview Performance, and Monthly Productivity.'}
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'security' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Two-Factor Authentication (Future Ready)</Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Switch checked={enableTwoFactorFuture} onChange={(event) => setEnableTwoFactorFuture(event.target.checked)} />
                  <Typography variant="body2">Enable 2FA policy mode (UI placeholder)</Typography>
                </Stack>
                <Alert severity="info" sx={{ mt: 1 }}>2FA backend enforcement can be wired later without UI changes.</Alert>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Session Management</Typography>
                <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                  <InputLabel>Members</InputLabel>
                  <Select multiple value={selectedMemberIds} label="Members" onChange={(event) => setSelectedMemberIds(event.target.value as string[])}>
                    {members.filter((member) => member.role !== 'owner').map((member) => <MenuItem key={member.id} value={member.id}>{member.fullName}</MenuItem>)}
                  </Select>
                </FormControl>
                <Stack direction="row" spacing={1}>
                  <Button startIcon={<SecurityIcon />} variant="contained" disabled={!canManageSecurity} onClick={() => {
                    teamManagementService.forceLogout(ownerId, currentUserId, selectedMemberIds);
                    toast.success('Force logout applied');
                    void refresh();
                  }}>Force Logout</Button>
                  <Button startIcon={<LockResetIcon />} variant="outlined" disabled={!canManageSecurity} onClick={() => {
                    selectedMemberIds.forEach((id) => {
                      teamManagementService.logAction(ownerId, currentUserId, {
                        action: 'security_action',
                        entityType: 'security',
                        entityId: id,
                        details: 'Password reset requested by admin',
                      });
                    });
                    toast.success('Password reset request logged');
                    void refresh();
                  }}>Password Reset</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Security Notes</Typography>
                <List dense>
                  <ListItem><ListItemText primary="All sensitive actions are audited in Audit Logs." /></ListItem>
                  <ListItem><ListItemText primary="Force logout list is tracked and can be consumed by auth/session middleware." /></ListItem>
                  <ListItem><ListItemText primary="Unauthorized users should not see restricted menu items or actions based on permissions engine." /></ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Team Member</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1} sx={{ mt: 0.2 }}>
            <Grid item xs={12} md={6}><TextField fullWidth label="Full Name" value={inviteState.fullName} onChange={(event) => setInviteState((current) => ({ ...current, fullName: event.target.value }))} /></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth label="Email" value={inviteState.email} onChange={(event) => setInviteState((current) => ({ ...current, email: event.target.value }))} /></Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select value={inviteState.role} label="Role" onChange={(event) => {
                  const role = event.target.value as TeamRoleKey;
                  setInviteState((current) => ({ ...current, role }));
                  if (role !== 'custom') {
                    setSelectedPermissions(teamManagementService.getDefaultRolePermissions()[role as Exclude<TeamRoleKey, 'custom'>] || []);
                  }
                }}>
                  {Object.keys(roleLabels).map((role) => <MenuItem key={role} value={role}>{roleLabels[role as TeamRoleKey]}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}><FormControl fullWidth><InputLabel>Department</InputLabel><Select value={inviteState.department} label="Department" onChange={(event) => setInviteState((current) => ({ ...current, department: event.target.value }))}>{departments.map((department) => <MenuItem key={department.id} value={department.name}>{department.name}</MenuItem>)}</Select></FormControl></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth label="Phone" value={inviteState.phone} onChange={(event) => setInviteState((current) => ({ ...current, phone: event.target.value }))} /></Grid>
            {inviteState.role === 'custom' && (
              <Grid item xs={12} md={6}><FormControl fullWidth><InputLabel>Custom Role</InputLabel><Select value={inviteState.customRoleId} label="Custom Role" onChange={(event) => {
                const roleId = event.target.value;
                setInviteState((current) => ({ ...current, customRoleId: roleId }));
                const role = customRoles.find((item) => item.id === roleId);
                setSelectedPermissions(role?.permissions || []);
              }}>{customRoles.map((role) => <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>)}</Select></FormControl></Grid>
            )}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Default Permissions</InputLabel>
                <Select multiple value={selectedPermissions} label="Default Permissions" onChange={(event) => setSelectedPermissions(event.target.value as PermissionKey[])}>
                  {allPermissions.map((permission) => <MenuItem key={permission} value={permission}>{permission}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={onInviteMember}>Send Invitation</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={memberDialogOpen} onClose={() => setMemberDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Team Member</DialogTitle>
        <DialogContent dividers>
          {editingMember && (
            <Grid container spacing={1} sx={{ mt: 0.2 }}>
              <Grid item xs={12} md={6}><TextField fullWidth label="Full Name" value={editingMember.fullName} onChange={(event) => setEditingMember((current) => current ? { ...current, fullName: event.target.value } : current)} /></Grid>
              <Grid item xs={12} md={6}><TextField fullWidth label="Email" value={editingMember.email} onChange={(event) => setEditingMember((current) => current ? { ...current, email: event.target.value } : current)} /></Grid>
              <Grid item xs={12} md={6}><FormControl fullWidth><InputLabel>Role</InputLabel><Select value={editingMember.role} label="Role" onChange={(event) => setEditingMember((current) => current ? { ...current, role: event.target.value as TeamRoleKey } : current)}>{Object.keys(roleLabels).map((role) => <MenuItem key={role} value={role}>{roleLabels[role as TeamRoleKey]}</MenuItem>)}</Select></FormControl></Grid>
              <Grid item xs={12} md={6}><FormControl fullWidth><InputLabel>Status</InputLabel><Select value={editingMember.status} label="Status" onChange={(event) => setEditingMember((current) => current ? { ...current, status: event.target.value as any } : current)}><MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem><MenuItem value="invited">Invited</MenuItem></Select></FormControl></Grid>
              <Grid item xs={12} md={6}><FormControl fullWidth><InputLabel>Department</InputLabel><Select value={editingMember.department} label="Department" onChange={(event) => setEditingMember((current) => current ? { ...current, department: event.target.value } : current)}>{departments.map((department) => <MenuItem key={department.id} value={department.name}>{department.name}</MenuItem>)}</Select></FormControl></Grid>
              <Grid item xs={12} md={6}><TextField fullWidth label="Phone" value={editingMember.phone} onChange={(event) => setEditingMember((current) => current ? { ...current, phone: event.target.value } : current)} /></Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberDialogOpen(false)}>Close</Button>
          <Button variant="contained" disabled={!canManageTeam} onClick={onSaveMember}>Save</Button>
        </DialogActions>
      </Dialog>
    </MotionBox>
  );
};
