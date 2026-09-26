import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Fab,
  IconButton,
  Paper,
  Portal,
  TextField,
  Tooltip,
  Typography,
  Zoom,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  Close as CloseIcon,
  Send as SendIcon,
  WorkOutline as WorkOutlineIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { careerAssistantService, type CareerAssistantCategory, type CareerAssistantJob, type CareerAssistantMessage } from '@services/careerAssistant';
import { savedService } from '@services/api';
import { useAuthStore } from '@store/index';

type ChatMessage = CareerAssistantMessage & {
  jobs?: CareerAssistantJob[];
  category?: CareerAssistantCategory;
  actions?: Array<{ label: string; route: string }>;
};

const suggestions = [
  { label: '🔎 Find Jobs', prompt: 'Find jobs that match my profile.' },
  { label: '📄 Improve Resume', prompt: 'Review my resume and suggest improvements.' },
  { label: '🎤 Interview Prep', prompt: 'Help me prepare for an interview based on my profile.' },
  { label: '💻 Explain a Technology', prompt: 'What technology should I learn next based on my career?' },
];

const welcomeMessage = `Hi! I'm your JobPoyt AI Assistant 👋

I can help you with jobs, career planning, resumes, interviews, technology questions, and general questions.`;

const formatSalary = (job: CareerAssistantJob) => job.salary || 'Salary not listed';

export const JobPoytAICareerAssistant = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const sendingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const submitMessage = async (value = draft) => {
    const text = value.trim();
    if (!text || sendingRef.current || !user?.id) return;

    const history = messages
      .filter((message) => message.content !== welcomeMessage)
      .slice(-8)
      .map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, { role: 'user', content: text }]);
    setDraft('');
    sendingRef.current = true;
    setSending(true);

    try {
      const reply = await careerAssistantService.ask(text, history);
      setMessages((current) => [...current, {
        role: 'assistant',
        content: reply.answer,
        jobs: reply.jobs,
        category: reply.category,
        actions: reply.actions,
      }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sorry, I could not process that right now. Please try again.';
      setMessages((current) => [...current, { role: 'assistant', content: message }]);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  };

  const openChat = () => {
    if (!messages.length) setMessages([{ role: 'assistant', content: welcomeMessage }]);
    setOpen(true);
  };

  const saveJob = async (jobId: string) => {
    if (!user?.id) return;
    try {
      await savedService.saveJob(user.id, jobId);
      setMessages((current) => [...current, { role: 'assistant', content: 'Job saved to your Saved Jobs.' }]);
    } catch {
      setMessages((current) => [...current, { role: 'assistant', content: 'I could not save that job right now. Please try again from the job details page.' }]);
    }
  };

  const goToAction = (route: string) => {
    setOpen(false);
    navigate(route);
  };

  return (
    <Portal>
      <>
      <Tooltip title="JobPoyt AI Assistant" placement="left">
        <Fab
          aria-label={open ? 'Close JobPoyt AI Assistant' : 'Open JobPoyt AI Assistant'}
          onClick={() => (open ? setOpen(false) : openChat())}
          sx={{
            position: 'fixed',
            right: { xs: 16, sm: 24 },
            bottom: { xs: 16, sm: 24 },
            zIndex: (theme) => theme.zIndex.tooltip + 2,
            width: { xs: 52, sm: 56 },
            height: { xs: 52, sm: 56 },
            minHeight: 0,
            color: '#fff',
            background: 'linear-gradient(145deg, #172554 0%, #4c1d95 100%)',
            boxShadow: '0 8px 24px rgba(15,23,42,0.3)',
            transition: 'transform 160ms ease, box-shadow 160ms ease',
            '&:hover': { background: 'linear-gradient(145deg, #1e3a8a 0%, #6d28d9 100%)', transform: 'scale(1.06)', boxShadow: '0 12px 28px rgba(76,29,149,0.35)' },
            '&:focus-visible': { outline: '3px solid #c4b5fd', outlineOffset: 3 },
          }}
        >
          {open ? <CloseIcon /> : (
            <Box
              component="img"
              src="https://ydvnozzigjihcachxnah.supabase.co/storage/v1/object/sign/website%20public/chatbot.png?token=eyJraWQiOiJjNjk4MjVmYS1iN2I5LTQ5OWItODBjMi1hZjRkNTQ4ZWQ3YjIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ3ZWJzaXRlIHB1YmxpYy9jaGF0Ym90LnBuZyIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3OTA0MjA4NDAsImV4cCI6MjQyMTE0MDg0MH0.kfIUVyvZCp9Ex7dvVV659398WhfN488mJzFnRiFAZZw"
              alt=""
              aria-hidden="true"
              sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          )}
        </Fab>
      </Tooltip>

      <Zoom in={open} unmountOnExit>
        <Paper
          role="dialog"
          aria-label="JobPoyt AI Assistant"
          aria-modal="false"
          elevation={16}
          sx={{
            position: 'fixed',
            right: { xs: 10, sm: 24 },
            bottom: { xs: 78, sm: 92 },
            zIndex: (theme) => theme.zIndex.tooltip + 1,
            display: 'flex',
            flexDirection: 'column',
            width: { xs: 'calc(100vw - 20px)', sm: 380 },
            maxWidth: 'calc(100vw - 20px)',
            height: { xs: '70dvh', sm: 520 },
            maxHeight: { xs: 600, sm: 'calc(100dvh - 110px)' },
            minHeight: 300,
            overflow: 'hidden',
            borderRadius: 3,
            border: '1px solid rgba(124,58,237,0.2)',
            background: (theme) => theme.palette.mode === 'dark' ? 'rgba(15,23,42,0.98)' : 'rgba(255,255,255,0.98)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 24px 70px rgba(15,23,42,0.28)',
          }}
        >
          <Box sx={{ px: 1.75, py: 1.5, color: '#fff', background: 'linear-gradient(115deg, #0f172a 0%, #312e81 55%, #6d28d9 100%)', display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' }}>
              <AutoAwesomeIcon fontSize="small" />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>JobPoyt AI Assistant</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.78)' }}>Ask about jobs, careers, technology or anything else</Typography>
            </Box>
            <IconButton aria-label="Close AI Assistant" onClick={() => setOpen(false)} size="small" sx={{ color: '#fff' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.4 }}>
            {messages.map((message, index) => (
              <Box key={`${message.role}-${index}`} sx={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start', gap: 0.8, alignItems: 'flex-end' }}>
                {message.role === 'assistant' && (
                  <Avatar sx={{ width: 25, height: 25, mb: 0.25, bgcolor: '#ede9fe', color: '#5b21b6' }}>
                    <AutoAwesomeIcon sx={{ fontSize: 15 }} />
                  </Avatar>
                )}
                <Box sx={{ maxWidth: '88%', minWidth: 0 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      px: 1.25,
                      py: 0.9,
                      borderRadius: message.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      color: message.role === 'user' ? '#fff' : 'text.primary',
                      bgcolor: message.role === 'user' ? '#4f46e5' : 'action.hover',
                      overflowWrap: 'anywhere',
                      '& p': { my: 0, mb: 0.75, fontSize: 13.5, lineHeight: 1.55 },
                      '& p:last-child': { mb: 0 },
                      '& ul, & ol': { my: 0.5, pl: 2.2 },
                      '& li': { fontSize: 13.5, lineHeight: 1.5, mb: 0.25 },
                      '& pre': { overflowX: 'auto', p: 1, borderRadius: 1, bgcolor: 'rgba(15,23,42,0.08)', fontSize: 12 },
                      '& code': { fontFamily: 'monospace', fontSize: '0.92em' },
                      '& a': { color: message.role === 'user' ? '#fff' : 'primary.main' },
                    }}
                  >
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </Paper>

                  {message.jobs?.map((job) => (
                    <Paper key={job.id} variant="outlined" sx={{ mt: 0.8, p: 1.1, borderRadius: 1.5, borderColor: 'divider', bgcolor: 'background.paper' }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8 }}>
                        <WorkOutlineIcon fontSize="small" color="primary" sx={{ mt: 0.2 }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.3 }}>{job.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{job.companyName || 'Company not listed'}</Typography>
                        </Box>
                      </Box>
                      <Typography variant="caption" display="block" sx={{ mt: 0.65, color: 'text.secondary' }}>
                        {[job.location, job.workMode, job.experience, formatSalary(job), job.postedAt ? `Posted ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(job.postedAt))}` : ''].filter(Boolean).join(' · ')}
                      </Typography>
                      {!!job.matchedSkills.length && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.8 }}>
                          {job.matchedSkills.slice(0, 4).map((skill) => <Chip key={skill} size="small" label={skill} color="primary" variant="outlined" />)}
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', gap: 0.7, mt: 0.8 }}>
                        <Button size="small" variant="contained" onClick={() => goToAction(`/jobs/${job.id}`)} sx={{ minHeight: 32, textTransform: 'none', fontSize: 12 }}>View &amp; Apply</Button>
                        <Button size="small" onClick={() => void saveJob(job.id)} sx={{ minHeight: 32, textTransform: 'none', fontSize: 12 }}>Save</Button>
                      </Box>
                    </Paper>
                  ))}

                  {!!message.actions?.length && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mt: 0.7 }}>
                      {message.actions.map((action) => (
                        <Button key={action.route} size="small" variant="outlined" onClick={() => goToAction(action.route)} sx={{ borderRadius: 5, textTransform: 'none', fontSize: 11.5, px: 1 }}>
                          {action.label}
                        </Button>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            ))}

            {messages.length === 1 && messages[0]?.content === welcomeMessage && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7, pl: 3.7 }}>
                {suggestions.map((suggestion) => (
                  <Chip key={suggestion.label} clickable label={suggestion.label} onClick={() => void submitMessage(suggestion.prompt)} sx={{ maxWidth: '100%', fontSize: 11.5 }} />
                ))}
                <Chip clickable label="🌐 Ask Anything" onClick={() => inputRef.current?.focus()} sx={{ fontSize: 11.5 }} />
              </Box>
            )}

            {sending && (
              <Box role="status" aria-live="polite" sx={{ display: 'flex', alignItems: 'center', gap: 0.8, pl: 3.7, color: 'text.secondary' }}>
                <CircularProgress size={14} />
                <Typography variant="caption">AI is thinking...</Typography>
              </Box>
            )}
          </Box>

          <Box component="form" onSubmit={(event) => { event.preventDefault(); void submitMessage(); }} sx={{ p: 1.2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'flex-end', gap: 0.8 }}>
            <TextField
              inputRef={inputRef}
              fullWidth
              multiline
              maxRows={4}
              size="small"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask JobPoyt AI anything..."
              inputProps={{ 'aria-label': 'Message JobPoyt AI Assistant', maxLength: 1200 }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 13 } }}
            />
            <IconButton type="submit" aria-label="Send message" disabled={!draft.trim() || sending} color="primary" sx={{ width: 40, height: 40, flexShrink: 0 }}>
              {sending ? <CircularProgress size={18} /> : <SendIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Paper>
      </Zoom>
      </>
    </Portal>
  );
};

export default JobPoytAICareerAssistant;