import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  HeadsetMic as HeadsetMicIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  HelpOutline as HelpOutlineIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
} from '@mui/icons-material';
import { useAuthStore } from '@store/index';
import { supportService, SupportTicket, markTicketsSeen } from '@services/support';

type SupportAudience = 'candidate' | 'recruiter' | 'admin';

type SupportWidgetProps = {
  audience: SupportAudience;
  showFab?: boolean;
  open?: boolean;
  onClose?: () => void;
};

const CATEGORY_OPTIONS = [
  'Account issue',
  'Payment issue',
  'Application issue',
  'Recruiter/Candidate issue',
  'Bug report',
  'Feature request',
  'Other',
];

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

const SupportWidget: React.FC<SupportWidgetProps> = ({
  audience,
  showFab = true,
  open,
  onClose,
}) => {
  const { user } = useAuthStore();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [internalOpen, setInternalOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [form, setForm] = useState({
    category: 'Account issue',
    priority: 'medium',
    subject: '',
    message: '',
  });
  const [submitMessage, setSubmitMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [unseenCount, setUnseenCount] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketDetailOpen, setTicketDetailOpen] = useState(false);
  const [userComment, setUserComment] = useState('');
  const [ticketCommentError, setTicketCommentError] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const isControlled = typeof open === 'boolean';
  const dialogOpen = isControlled ? Boolean(open) : internalOpen;

  const contactLabel = useMemo(() => {
    if (audience === 'admin') return 'Admin Support Desk';
    if (audience === 'recruiter') return 'Recruiter Support Desk';
    return 'Candidate Support Desk';
  }, [audience]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await supportService.getTickets(user?.id, user?.role);
      setTickets(data || []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dialogOpen) {
      loadTickets();
    }
  }, [dialogOpen]);

  // Load unseen count whenever widget is mounted (for badge in parent)
  useEffect(() => {
    if (!user?.id) return;
    supportService.getUnseenAdminResponseCount(user.id).then(setUnseenCount).catch(() => {});
  }, [user?.id, dialogOpen]);

  const openDialog = () => {
    if (!isControlled) {
      setInternalOpen(true);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, value: number) => {
    setTab(value);
    if (value === 1 && tickets.length > 0) {
      const idsWithNote = tickets.filter((t) => t.admin_note && t.admin_note.trim()).map((t) => t.id);
      if (idsWithNote.length > 0) {
        markTicketsSeen(idsWithNote, user?.id)
          .then(() => setUnseenCount(0))
          .catch(() => {});
      }
    }
  };

  const closeDialog = () => {
    if (!isControlled) {
      setInternalOpen(false);
    }
    onClose?.();
  };

  const openTicketDetail = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setUserComment('');
    setTicketCommentError('');
    setTicketDetailOpen(true);
  };

  const closeTicketDetail = () => {
    setTicketDetailOpen(false);
    setSelectedTicket(null);
    setUserComment('');
    setTicketCommentError('');
  };

  const submitUserComment = async () => {
    if (!selectedTicket?.id) return;
    const comment = userComment.trim();
    if (!comment) {
      setTicketCommentError('Please enter your comment.');
      return;
    }

    setTicketCommentError('');
    setCommentSubmitting(true);

    try {
      const nowLabel = new Date().toLocaleString();
      const existingMessage = selectedTicket.message || '';
      const updatedMessage = `${existingMessage}\n\n[User Follow-up | ${nowLabel}]\n${comment}`;
      const updated = await supportService.updateTicket(selectedTicket.id, {
        message: updatedMessage,
        status: 'open',
      });

      if (updated) {
        setSelectedTicket(updated);
      } else {
        setSelectedTicket((prev) => (prev ? { ...prev, message: updatedMessage, status: 'open' } : prev));
      }

      setUserComment('');
      setSubmitMessage('Your follow-up comment was added to the ticket.');
      await loadTickets();
    } catch {
      setTicketCommentError('Unable to submit your comment. Please try again.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const submitTicket = async () => {
    setSubmitMessage('');
    setErrorMessage('');

    if (!form.subject.trim() || !form.message.trim()) {
      setErrorMessage('Please fill subject and message.');
      return;
    }

    setLoading(true);
    try {
      await supportService.createTicket({
        user_id: user?.id,
        role: (user?.role || 'guest') as string,
        name: user?.name || '',
        email: user?.email || '',
        category: form.category,
        priority: form.priority,
        subject: form.subject.trim(),
        message: form.message.trim(),
      });

      setForm((prev) => ({ ...prev, subject: '', message: '' }));
      setSubmitMessage('Ticket created successfully. Our support team will contact you soon.');
      await loadTickets();
      setTab(1);
    } catch {
      setErrorMessage('Unable to create ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showFab ? (
        <Fab
          color="primary"
          aria-label="customer-care-support"
          onClick={openDialog}
          sx={{
            position: 'fixed',
            right: { xs: 16, md: 24 },
            bottom: { xs: 16, md: 24 },
            zIndex: 1400,
            boxShadow: '0 10px 24px rgba(25,118,210,0.35)',
          }}
        >
          <HeadsetMicIcon />
        </Fab>
      ) : null}

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            bgcolor: isDarkMode ? '#0B0F17' : undefined,
            color: isDarkMode ? '#FFFFFF' : undefined,
            border: `1px solid ${isDarkMode ? '#334155' : 'rgba(37, 99, 235, 0.18)'}`,
            boxShadow: isDarkMode ? '0 24px 60px rgba(0, 0, 0, 0.58)' : '0 24px 60px rgba(15, 23, 42, 0.22)',
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 1.4,
            background: isDarkMode
              ? 'linear-gradient(135deg, #111827 0%, #0F172A 100%)'
              : 'linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(16,185,129,0.1) 100%)',
            borderBottom: `1px solid ${isDarkMode ? '#334155' : 'rgba(37, 99, 235, 0.15)'}`,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <HeadsetMicIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Customer Care Support
              </Typography>
            </Stack>
            <Chip
              label={contactLabel}
              color="info"
              size="small"
              sx={{ fontWeight: 700, bgcolor: isDarkMode ? 'rgba(56, 189, 248, 0.16)' : 'rgba(3, 105, 161, 0.14)', color: isDarkMode ? '#BAE6FD' : undefined }}
            />
          </Stack>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            px: { xs: 2, md: 3 },
            py: 2.5,
            bgcolor: isDarkMode ? '#050608' : 'rgba(248, 250, 252, 0.75)',
          }}
        >
          <Tabs
            value={tab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              mb: 2.5,
              bgcolor: isDarkMode ? '#111827' : '#FFFFFF',
              borderRadius: 2,
              p: 0.5,
              border: '1px solid rgba(148, 163, 184, 0.25)',
              '& .MuiTabs-indicator': { display: 'none' },
              '& .MuiTab-root': {
                borderRadius: 1.5,
                textTransform: 'none',
                minHeight: 40,
                fontWeight: 600,
              },
              '& .Mui-selected': {
                bgcolor: isDarkMode ? 'rgba(59, 130, 246, 0.22)' : 'rgba(37, 99, 235, 0.12)',
                color: 'primary.main',
              },
              '& .MuiTab-root': { color: isDarkMode ? '#CBD5E1' : undefined },
            }}
          >
            <Tab label="Raise Ticket" />
            <Tab label={
              unseenCount > 0
                ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
                    My Tickets
                    <Box component="span" sx={{ bgcolor: 'error.main', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{unseenCount}</Box>
                  </Box>
                : 'My Tickets'
            } />
            <Tab label="Quick Contact" />
          </Tabs>

          {submitMessage ? <Alert severity="success" sx={{ mb: 2 }}>{submitMessage}</Alert> : null}
          {errorMessage ? <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert> : null}

          {tab === 0 ? (
            <Stack spacing={2} sx={{ p: { xs: 0.5, md: 1 }, bgcolor: isDarkMode ? '#0B0F17' : '#FFFFFF', borderRadius: 2, border: `1px solid ${isDarkMode ? '#334155' : 'rgba(148, 163, 184, 0.2)'}` }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  fullWidth
                  label="Category"
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  fullWidth
                  label="Priority"
                  value={form.priority}
                  onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>{option.toUpperCase()}</MenuItem>
                  ))}
                </TextField>
              </Stack>

              <TextField
                label="Subject"
                fullWidth
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
              />

              <TextField
                label="Describe your issue"
                multiline
                minRows={4}
                fullWidth
                value={form.message}
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              />

              <Box>
                <Button
                  variant="contained"
                  onClick={submitTicket}
                  disabled={loading}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    px: 3,
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    boxShadow: '0 10px 24px rgba(37,99,235,0.28)',
                  }}
                >
                  Submit Ticket
                </Button>
              </Box>
            </Stack>
          ) : null}

          {tab === 1 ? (
            <Box>
              {loading ? (
                <Typography variant="body2" color="text.secondary">Loading tickets...</Typography>
              ) : tickets.length === 0 ? (
                <Alert severity="info">No tickets found. Raise a ticket to get help.</Alert>
              ) : (
                <List sx={{ p: 0 }}>
                  {tickets.map((ticket) => (
                    <React.Fragment key={ticket.id}>
                      <ListItem
                        alignItems="flex-start"
                        sx={{
                          px: 1.2,
                          py: 1.1,
                          mb: 1,
                          borderRadius: 2,
                          bgcolor: isDarkMode ? '#111827' : '#FFFFFF',
                          border: `1px solid ${isDarkMode ? '#334155' : 'rgba(148, 163, 184, 0.22)'}`,
                        }}
                      >
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                              <Typography sx={{ fontWeight: 700 }}>{ticket.subject}</Typography>
                              <Chip size="small" label={String(ticket.status || 'open').toUpperCase()} color={String(ticket.status || 'open').toLowerCase() === 'closed' ? 'success' : 'warning'} />
                              <Chip size="small" variant="outlined" label={String(ticket.priority || 'medium').toUpperCase()} />
                            </Stack>
                          }
                          secondary={
                            <Box sx={{ mt: 0.6 }}>
                              <Typography variant="body2" color="text.secondary">{ticket.message}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {ticket.category} • {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'Recent'}
                              </Typography>
                              {ticket.admin_note ? (
                                  <Box sx={{ mt: 1, p: 1.2, borderRadius: 1.5, bgcolor: isDarkMode ? 'rgba(37, 99, 235, 0.18)' : 'rgba(25,118,210,0.08)', border: '1px solid rgba(25,118,210,0.18)' }}>
                                  <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 0.4 }}>
                                    <AdminPanelSettingsIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>Admin Response</Typography>
                                  </Stack>
                                  <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-wrap' }}>{ticket.admin_note}</Typography>
                                </Box>
                              ) : null}
                            </Box>
                          }
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openTicketDetail(ticket)}
                          sx={{ ml: 1.2, mt: 0.5, textTransform: 'none', fontWeight: 600 }}
                        >
                          Open
                        </Button>
                      </ListItem>
                      <Divider sx={{ opacity: 0.6 }} />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>
          ) : null}

          {tab === 2 ? (
            <Stack spacing={2} sx={{ p: { xs: 0.5, md: 1 }, bgcolor: isDarkMode ? '#0B0F17' : '#FFFFFF', borderRadius: 2, border: `1px solid ${isDarkMode ? '#334155' : 'rgba(148, 163, 184, 0.2)'}` }}>
              <Alert severity="info">
                Support hours: Monday to Saturday, 9:00 AM - 7:00 PM.
              </Alert>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  startIcon={<EmailIcon />}
                  variant="outlined"
                  href="mailto:support@jobpoyt.com"
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  support@jobpoyt.com
                </Button>
                <Button
                  startIcon={<PhoneIcon />}
                  variant="outlined"
                  href="tel:+919876543210"
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  +91 98765 43210
                </Button>
              </Stack>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1.2, fontWeight: 700 }}>Quick FAQs</Typography>
                <Stack spacing={1}>
                  <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: isDarkMode ? 'rgba(37, 99, 235, 0.16)' : 'rgba(25,118,210,0.06)' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <HelpOutlineIcon fontSize="small" color="primary" />
                      <Typography variant="body2">How soon will I get a response?</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">Usually within 24 working hours.</Typography>
                  </Box>
                  <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: isDarkMode ? 'rgba(37, 99, 235, 0.16)' : 'rgba(25,118,210,0.06)' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <HelpOutlineIcon fontSize="small" color="primary" />
                      <Typography variant="body2">Can I track my issue status?</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">Yes, use the My Tickets tab to track open/closed tickets.</Typography>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ px: 2.5, py: 1.4, borderTop: `1px solid ${isDarkMode ? '#334155' : 'rgba(148, 163, 184, 0.2)'}`, bgcolor: isDarkMode ? '#0B0F17' : '#FFFFFF' }}>
          <Button onClick={closeDialog} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={ticketDetailOpen}
        onClose={closeTicketDetail}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { bgcolor: isDarkMode ? '#0B0F17' : undefined, color: isDarkMode ? '#FFFFFF' : undefined, border: isDarkMode ? '1px solid #334155' : undefined } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Ticket Details
            </Typography>
            <Chip
              size="small"
              label={String(selectedTicket?.status || 'open').toUpperCase()}
              color={String(selectedTicket?.status || 'open').toLowerCase() === 'closed' ? 'success' : 'warning'}
            />
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {selectedTicket ? (
            <Stack spacing={1.5}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {selectedTicket.subject}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedTicket.category} • {selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString() : 'Recent'}
              </Typography>
              <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: isDarkMode ? '#111827' : 'rgba(15,23,42,0.04)', border: `1px solid ${isDarkMode ? '#334155' : 'rgba(15,23,42,0.1)'}` }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selectedTicket.message || '-'}
                </Typography>
              </Box>

              {selectedTicket.admin_note ? (
                <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: isDarkMode ? 'rgba(37, 99, 235, 0.18)' : 'rgba(25,118,210,0.08)', border: '1px solid rgba(25,118,210,0.18)' }}>
                  <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 0.4 }}>
                    <AdminPanelSettingsIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      Admin Response
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedTicket.admin_note}
                  </Typography>
                </Box>
              ) : null}

              {audience !== 'admin' ? (
                <>
                  <TextField
                    label="Add your comment"
                    multiline
                    minRows={3}
                    fullWidth
                    value={userComment}
                    onChange={(e) => setUserComment(e.target.value)}
                  />
                  {ticketCommentError ? <Alert severity="error">{ticketCommentError}</Alert> : null}
                </>
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>

        <DialogActions>
          <Button onClick={closeTicketDetail}>Close</Button>
          {audience !== 'admin' ? (
            <Button variant="contained" onClick={submitUserComment} disabled={commentSubmitting}>
              {commentSubmitting ? 'Submitting...' : 'Submit Comment'}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SupportWidget;
