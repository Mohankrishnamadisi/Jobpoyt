import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Phone as PhoneIcon,
  Event as EventIcon,
  PushPin as PinIcon,
  Search as SearchIcon,
  StickyNote2 as StickyNoteIcon,
  Save as SaveIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { Layout } from '@components/layout/Layout';
import { DeleteActionButton } from '@components/common/DeleteActionButton';
import { useAuthStore } from '@store/index';
import { freeNotesService, type FreeNote, type FreeNotePriority, type FreeNoteStatus, type FreeNoteType } from '@services/freeNotes';
import { formatDate } from '@utils/index';

const typeOptions: Array<{ value: FreeNoteType; label: string }> = [
  { value: 'personal', label: 'Personal Note' },
  { value: 'recruiter_call', label: 'Recruiter Call' },
  { value: 'interview', label: 'Interview' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'offer', label: 'Offer/Negotiation' },
];

const priorityOptions: FreeNotePriority[] = ['low', 'medium', 'high', 'critical'];
const statusOptions: FreeNoteStatus[] = ['open', 'in_progress', 'done', 'archived'];

type NoteFormState = {
  title: string;
  content: string;
  type: FreeNoteType;
  priority: FreeNotePriority;
  status: FreeNoteStatus;
  tags: string;
  recruiter_name: string;
  company_name: string;
  call_date: string;
  interview_date: string;
  follow_up_at: string;
  pinned: boolean;
};

const defaultForm: NoteFormState = {
  title: '',
  content: '',
  type: 'personal',
  priority: 'medium',
  status: 'open',
  tags: '',
  recruiter_name: '',
  company_name: '',
  call_date: '',
  interview_date: '',
  follow_up_at: '',
  pinned: false,
};

const toPayload = (form: NoteFormState) => ({
  title: form.title.trim(),
  content: form.content.trim(),
  type: form.type,
  priority: form.priority,
  status: form.status,
  tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
  recruiter_name: form.recruiter_name.trim() || undefined,
  company_name: form.company_name.trim() || undefined,
  call_date: form.call_date || undefined,
  interview_date: form.interview_date || undefined,
  follow_up_at: form.follow_up_at || undefined,
  pinned: form.pinned,
});

const formFromNote = (note: FreeNote): NoteFormState => ({
  title: note.title,
  content: note.content,
  type: note.type,
  priority: note.priority,
  status: note.status,
  tags: note.tags.join(', '),
  recruiter_name: note.recruiter_name || '',
  company_name: note.company_name || '',
  call_date: note.call_date || '',
  interview_date: note.interview_date || '',
  follow_up_at: note.follow_up_at || '',
  pinned: note.pinned,
});

export const FreeNotesPage: React.FC<{ embedded?: boolean; onNewNoteReady?: (handler: () => void) => void }> = ({ embedded = false, onNewNoteReady }) => {
  const { user } = useAuthStore();
  const Shell = embedded ? React.Fragment : Layout;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<FreeNote[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | FreeNoteType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | FreeNoteStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | FreeNotePriority>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'follow_up' | 'priority'>('recent');
  const [openEditor, setOpenEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NoteFormState>(defaultForm);

  useEffect(() => {
    const loadNotes = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const data = await freeNotesService.getNotes(user.id);
        setNotes(data);
      } catch {
        toast.error('Failed to load notes');
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, [user?.id]);

  const stats = useMemo(() => {
    const recruiterCalls = notes.filter((note) => note.type === 'recruiter_call').length;
    const interviews = notes.filter((note) => note.type === 'interview').length;
    const followUps = notes.filter((note) => note.follow_up_at && note.status !== 'done' && note.status !== 'archived').length;
    return {
      total: notes.length,
      recruiterCalls,
      interviews,
      followUps,
    };
  }, [notes]);

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();

    const priorityRank: Record<FreeNotePriority, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    const result = notes.filter((note) => {
      if (typeFilter !== 'all' && note.type !== typeFilter) return false;
      if (statusFilter !== 'all' && note.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && note.priority !== priorityFilter) return false;
      if (!text) return true;

      const haystack = [
        note.title,
        note.content,
        note.recruiter_name || '',
        note.company_name || '',
        note.tags.join(' '),
      ].join(' ').toLowerCase();
      return haystack.includes(text);
    });

    return [...result].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

      if (sortBy === 'priority') {
        return priorityRank[b.priority] - priorityRank[a.priority];
      }

      if (sortBy === 'follow_up') {
        const aDate = a.follow_up_at ? new Date(a.follow_up_at).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.follow_up_at ? new Date(b.follow_up_at).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      }

      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [notes, priorityFilter, search, sortBy, statusFilter, typeFilter]);

  const applyTemplate = (template: 'call' | 'interview' | 'followup') => {
    if (template === 'call') {
      setForm((prev) => ({
        ...prev,
        type: 'recruiter_call',
        title: prev.title || 'Recruiter Call Summary',
        content: prev.content || 'Discussion points:\n1. Role details\n2. Compensation\n3. Next steps',
        status: 'in_progress',
        priority: 'high',
      }));
      return;
    }

    if (template === 'interview') {
      setForm((prev) => ({
        ...prev,
        type: 'interview',
        title: prev.title || 'Interview Debrief',
        content: prev.content || 'Interview round notes:\n- Questions asked\n- My responses\n- Improvements for next round',
        status: 'in_progress',
        priority: 'high',
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      type: 'follow_up',
      title: prev.title || 'Follow Up Plan',
      content: prev.content || 'Follow-up checklist:\n- Send thank-you message\n- Share requested documents\n- Confirm next interview schedule',
      status: 'open',
      priority: 'medium',
    }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setOpenEditor(true);
  };

  useEffect(() => {
    onNewNoteReady?.(openCreate);
    return () => onNewNoteReady?.(() => {});
  }, [onNewNoteReady]);

  const openEdit = (note: FreeNote) => {
    setEditingId(note.id);
    setForm(formFromNote(note));
    setOpenEditor(true);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and note content are required');
      return;
    }

    try {
      setSaving(true);
      const payload = toPayload(form);
      const next = editingId
        ? await freeNotesService.updateNote(user.id, editingId, payload)
        : await freeNotesService.createNote(user.id, payload);

      setNotes(next);
      setOpenEditor(false);
      toast.success(editingId ? 'Note updated' : 'Note saved');
    } catch {
      toast.error('Unable to save note');
    } finally {
      setSaving(false);
    }
  };

  const togglePinned = async (note: FreeNote) => {
    if (!user?.id) return;
    const next = await freeNotesService.updateNote(user.id, note.id, { pinned: !note.pinned });
    setNotes(next);
  };

  const toggleDone = async (note: FreeNote) => {
    if (!user?.id) return;
    const status: FreeNoteStatus = note.status === 'done' ? 'in_progress' : 'done';
    const next = await freeNotesService.updateNote(user.id, note.id, { status });
    setNotes(next);
  };

  const removeNote = async (noteId: string) => {
    if (!user?.id) return;
    const next = await freeNotesService.deleteNote(user.id, noteId);
    setNotes(next);
    toast.success('Note deleted');
  };

  const noteFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2,
      backgroundColor: '#FFFFFF',
      '&:hover fieldset': { borderColor: '#7EA4C5' },
      '&.Mui-focused fieldset': { borderColor: '#2563EB', borderWidth: 2 },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#2563EB' },
  };

  return (
    <Shell>
      <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 }, maxWidth: 1280, mx: 'auto' }}>
        {!embedded ? <Card sx={{ mb: 3, borderRadius: 4, background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #334155 100%)', color: '#E2E8F0' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.8 }}>
                  Free Notes (Premium)
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(226,232,240,0.88)', maxWidth: 720 }}>
                  Store personal plans, recruiter call summaries, interview debriefs, and follow-up actions in one advanced notebook.
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ fontWeight: 700 }}>
                New Note
              </Button>
            </Box>
          </CardContent>
        </Card> : null}

        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3 }}><CardContent><Typography variant="caption">Total Notes</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.total}</Typography></CardContent></Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3 }}><CardContent><Typography variant="caption">Recruiter Calls</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.recruiterCalls}</Typography></CardContent></Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3 }}><CardContent><Typography variant="caption">Interviews</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.interviews}</Typography></CardContent></Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3 }}><CardContent><Typography variant="caption">Pending Follow-ups</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.followUps}</Typography></CardContent></Card>
          </Grid>
        </Grid>

        <Card sx={{ mb: 2.5, borderRadius: 3 }}>
          <CardContent>
            <Grid container spacing={1.2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, company, recruiter, tags"
                  InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select value={typeFilter} label="Type" onChange={(e: SelectChangeEvent<any>) => setTypeFilter(e.target.value)}>
                    <MenuItem value="all">All</MenuItem>
                    {typeOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select value={statusFilter} label="Status" onChange={(e: SelectChangeEvent<any>) => setStatusFilter(e.target.value)}>
                    <MenuItem value="all">All</MenuItem>
                    {statusOptions.map((value) => <MenuItem key={value} value={value}>{value.replace('_', ' ')}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select value={priorityFilter} label="Priority" onChange={(e: SelectChangeEvent<any>) => setPriorityFilter(e.target.value)}>
                    <MenuItem value="all">All</MenuItem>
                    {priorityOptions.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sort</InputLabel>
                  <Select value={sortBy} label="Sort" onChange={(e: SelectChangeEvent<any>) => setSortBy(e.target.value)}>
                    <MenuItem value="recent">Recent</MenuItem>
                    <MenuItem value="follow_up">Follow-up Date</MenuItem>
                    <MenuItem value="priority">Priority</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            {loading ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>Loading notes...</Typography>
            ) : filtered.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>No notes found. Create your first premium note.</Typography>
            ) : (
              <List sx={{ p: 0, display: 'grid', gap: 1.2 }}>
                {filtered.map((note) => (
                  <ListItem key={note.id} sx={{ display: 'block', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start', mb: 0.8 }}>
                      <Box>
                        <Stack direction="row" spacing={0.8} sx={{ mb: 0.4, flexWrap: 'wrap' }}>
                          <Chip size="small" icon={<StickyNoteIcon />} label={note.type.replace('_', ' ')} />
                          <Chip size="small" color={note.priority === 'critical' ? 'error' : note.priority === 'high' ? 'warning' : 'default'} label={note.priority} />
                          <Chip size="small" variant="outlined" label={note.status.replace('_', ' ')} />
                          {note.pinned ? <Chip size="small" color="secondary" label="Pinned" /> : null}
                        </Stack>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{note.title}</Typography>
                      </Box>
                      <Stack direction="row" spacing={0.4}>
                        <IconButton size="small" onClick={() => togglePinned(note)}><PinIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => openEdit(note)}><EditIcon fontSize="small" /></IconButton>
                        <DeleteActionButton onClick={() => removeNote(note.id)} ariaLabel="Delete note" />
                      </Stack>
                    </Box>

                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary', mb: 1.2 }}>
                      {note.content}
                    </Typography>

                    <Stack direction="row" spacing={0.9} flexWrap="wrap" sx={{ mb: 0.8 }}>
                      {note.recruiter_name ? <Chip size="small" icon={<PhoneIcon />} label={`Recruiter: ${note.recruiter_name}`} /> : null}
                      {note.company_name ? <Chip size="small" label={`Company: ${note.company_name}`} /> : null}
                      {note.follow_up_at ? <Chip size="small" icon={<EventIcon />} color="info" label={`Follow-up: ${formatDate(note.follow_up_at)}`} /> : null}
                    </Stack>

                    <Stack direction="row" spacing={0.8} flexWrap="wrap" sx={{ mb: 0.8 }}>
                      {note.tags.map((tag) => <Chip key={`${note.id}_${tag}`} size="small" variant="outlined" label={`#${tag}`} />)}
                    </Stack>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Updated {formatDate(note.updated_at)}
                      </Typography>
                      <Button size="small" onClick={() => toggleDone(note)}>
                        {note.status === 'done' ? 'Reopen' : 'Mark Done'}
                      </Button>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={openEditor}
          onClose={() => setOpenEditor(false)}
          fullWidth
          maxWidth="md"
          PaperProps={{ sx: { borderRadius: 3.5, overflow: 'hidden', boxShadow: '0 24px 70px rgba(15,23,42,0.24)' } }}
        >
          <DialogTitle sx={{ px: { xs: 2.5, md: 3.5 }, py: 2.2, color: '#FFFFFF', background: 'linear-gradient(115deg, #071D35 0%, #0B3558 62%, #126B8F 100%)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.5, color: '#F7D774', textTransform: 'uppercase' }}>
                  Premium workspace
                </Typography>
                <Typography sx={{ fontSize: { xs: 21, md: 26 }, fontWeight: 900, lineHeight: 1.2, mt: 0.3 }}>
                  {editingId ? 'Edit Note' : 'Create New Note'}
                </Typography>
              </Box>
              <IconButton aria-label="Close note editor" onClick={() => setOpenEditor(false)} sx={{ color: '#FFFFFF', bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: '#DC2626' } }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers sx={{ px: { xs: 2, md: 3.5 }, py: 2.5, background: '#F8FAFC' }}>
            <Box sx={{ mb: 2.2, p: 1.5, borderRadius: 2.5, background: '#EEF4F8', border: '1px solid #D7E3EC' }}>
              <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#475569', fontWeight: 800 }}>
                Start quickly with a template
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button size="small" variant="outlined" startIcon={<PhoneIcon />} onClick={() => applyTemplate('call')} sx={{ borderRadius: 1.8, textTransform: 'none', fontWeight: 700 }}>Recruiter Call</Button>
                <Button size="small" variant="outlined" startIcon={<EventIcon />} onClick={() => applyTemplate('interview')} sx={{ borderRadius: 1.8, textTransform: 'none', fontWeight: 700 }}>Interview Debrief</Button>
                <Button size="small" variant="outlined" startIcon={<SaveIcon />} onClick={() => applyTemplate('followup')} sx={{ borderRadius: 1.8, textTransform: 'none', fontWeight: 700 }}>Follow-up Plan</Button>
              </Stack>
            </Box>

            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth sx={noteFieldSx} label="Note title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth sx={noteFieldSx}>
                  <InputLabel>Type</InputLabel>
                  <Select label="Type" value={form.type} onChange={(e: SelectChangeEvent<any>) => setForm((p) => ({ ...p, type: e.target.value }))}>
                    {typeOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={1.5}>
                <FormControl fullWidth sx={noteFieldSx}>
                  <InputLabel>Priority</InputLabel>
                  <Select label="Priority" value={form.priority} onChange={(e: SelectChangeEvent<any>) => setForm((p) => ({ ...p, priority: e.target.value }))}>
                    {priorityOptions.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={1.5}>
                <FormControl fullWidth sx={noteFieldSx}>
                  <InputLabel>Status</InputLabel>
                  <Select label="Status" value={form.status} onChange={(e: SelectChangeEvent<any>) => setForm((p) => ({ ...p, status: e.target.value }))}>
                    {statusOptions.map((value) => <MenuItem key={value} value={value}>{value.replace('_', ' ')}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  sx={noteFieldSx}
                  label="Note"
                  multiline
                  minRows={5}
                  value={form.content}
                  onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={4}><TextField fullWidth sx={noteFieldSx} label="Recruiter name" value={form.recruiter_name} onChange={(e) => setForm((p) => ({ ...p, recruiter_name: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth sx={noteFieldSx} label="Company name" value={form.company_name} onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth sx={noteFieldSx} label="Tags (comma separated)" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth sx={noteFieldSx} type="date" label="Call date" InputLabelProps={{ shrink: true }} value={form.call_date} onChange={(e) => setForm((p) => ({ ...p, call_date: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth sx={noteFieldSx} type="date" label="Interview date" InputLabelProps={{ shrink: true }} value={form.interview_date} onChange={(e) => setForm((p) => ({ ...p, interview_date: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth sx={noteFieldSx} type="datetime-local" label="Follow-up reminder" InputLabelProps={{ shrink: true }} value={form.follow_up_at} onChange={(e) => setForm((p) => ({ ...p, follow_up_at: e.target.value }))} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: { xs: 2, md: 3.5 }, py: 1.8, bgcolor: '#FFFFFF', borderTop: '1px solid #E2E8F0' }}>
            <Button onClick={() => setOpenEditor(false)} sx={{ borderRadius: 1.8, textTransform: 'none', fontWeight: 700, color: '#475569' }}>Cancel</Button>
            <Button onClick={handleSave} variant="contained" disabled={saving} startIcon={<SaveIcon />} sx={{ borderRadius: 1.8, px: 2.4, textTransform: 'none', fontWeight: 800, background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
              {saving ? 'Saving...' : 'Save Note'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Shell>
  );
};

export default FreeNotesPage;
