import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  InputBase,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { BookOpenText, CheckCircle2, Code2, FileText, GripVertical, MessageSquarePlus, PenLine, Search, Trash2 } from 'lucide-react';
import { LearningEditor } from './LearningEditor';
import { LearningCodeEditor } from './LearningCodeEditor';
import { LearningVideo } from '@services/learningVideos';
import { type LearningNote } from '@services/learningNotes';
import { CODE_LANGUAGES, hasLearningCodeSnippet, readLearningCodeSnippet } from '@utils/learningCodeNote';

interface EnhancedLearningNotesPanelProps {
  selectedVideo?: LearningVideo | null;
  noteTitle: string;
  noteTitleError?: boolean;
  noteContent: string;
  onNoteTitleChange: (title: string) => void;
  onNoteChange: (content: string) => void;
  onAddTimestamp: () => void;
  onClearNote: () => void;
  isSavingNote?: boolean;
  lastSavedAt?: number | null;
  notesHistory: LearningNote[];
  activeNoteId: string | null;
  onOpenHistoryNote: (noteId: string) => void;
  onReorderHistory: (orderedNoteIds: string[]) => void;
  userId: string;
  onCreateNewNote: () => void;
  onSaveNote: () => void;
  onDeleteHistoryNote: (noteId: string) => void;
  savedNotesPortalTarget?: HTMLElement | null;
}

const toPlainText = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const formatSavedAt = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const EnhancedLearningNotesPanel: React.FC<EnhancedLearningNotesPanelProps> = ({
  selectedVideo,
  noteTitle,
  noteTitleError = false,
  noteContent,
  onNoteTitleChange,
  onNoteChange,
  onAddTimestamp,
  onClearNote,
  isSavingNote = false,
  lastSavedAt,
  notesHistory,
  activeNoteId,
  onOpenHistoryNote,
  onReorderHistory,
  userId,
  onCreateNewNote,
  onSaveNote,
  onDeleteHistoryNote,
  savedNotesPortalTarget,
}) => {
  const orderStorageKey = `actro_learning_notes_order:${userId}`;
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [notesSearch, setNotesSearch] = useState('');
  const [editorFocusRequest, setEditorFocusRequest] = useState(0);
  const [editorMode, setEditorMode] = useState<'write' | 'code'>('write');
  const editorSectionRef = useRef<HTMLDivElement | null>(null);
  const notesSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!userId) {
      setOrderedIds([]);
      return;
    }
    try {
      const raw = localStorage.getItem(orderStorageKey);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      setOrderedIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setOrderedIds([]);
    }
  }, [orderStorageKey, userId]);

  useEffect(() => {
    setEditorMode(hasLearningCodeSnippet(noteContent) ? 'code' : 'write');
  }, [activeNoteId]);

  const orderedHistory = useMemo(() => {
    if (!notesHistory.length) return [];
    const rank = new Map(orderedIds.map((id, index) => [id, index]));
    const rows = [...notesHistory];
    rows.sort((a, b) => {
      const aRank = rank.has(a.id) ? (rank.get(a.id) as number) : Number.MAX_SAFE_INTEGER;
      const bRank = rank.has(b.id) ? (rank.get(b.id) as number) : Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) return aRank - bRank;
      return b.updatedAt - a.updatedAt;
    });
    return rows;
  }, [notesHistory, orderedIds]);

  const filteredHistory = useMemo(() => {
    const query = notesSearch.trim().toLowerCase();
    if (!query) return orderedHistory;
    return orderedHistory.filter((note) =>
      [note.title, toPlainText(note.content || '')].some((value) => String(value || '').toLowerCase().includes(query))
    );
  }, [notesSearch, orderedHistory]);

  const persistOrder = (ids: string[]) => {
    setOrderedIds(ids);
    try {
      localStorage.setItem(orderStorageKey, JSON.stringify(ids));
    } catch {
      // Ignore storage failure and continue with in-memory order.
    }
  };

  const handleDragStart = (noteId: string) => {
    setDraggedId(noteId);
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const currentIds = orderedHistory.map((item) => item.id);
    const fromIndex = currentIds.indexOf(draggedId);
    const toIndex = currentIds.indexOf(targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...currentIds];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    persistOrder(next);
    onReorderHistory(next);
    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const focusEditor = () => {
    setEditorMode('write');
    editorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setEditorFocusRequest((request) => request + 1);
  };

  const handleNewChat = () => {
    onCreateNewNote();
    editorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (editorMode === 'write') setEditorFocusRequest((request) => request + 1);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: 'auto',
        width: '100%',
        minHeight: 0,
        p: { xs: 0.75, sm: 1 },
        borderRadius: 3,
        border: '1px solid #E2E8F0',
        overflowY: 'visible',
        overflowX: 'hidden',
        bgcolor: '#F4F7FB',
        boxShadow: '0 8px 28px rgba(15, 35, 63, 0.08)',
      }}
    >
      {/* Notes hero */}
      <Box
        sx={{
          position: 'relative',
          p: { xs: 1.1, sm: 1.25 },
          borderRadius: 2.5,
          overflow: 'hidden',
          color: '#fff',
          backgroundColor: '#071D35',
          backgroundImage:
            "linear-gradient(90deg, rgba(5, 20, 40, 0.97) 0%, rgba(7, 29, 53, 0.9) 46%, rgba(7, 29, 53, 0.48) 76%, rgba(7, 29, 53, 0.2) 100%), url('/images/notes.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
          backgroundRepeat: 'no-repeat',
          boxShadow: '0 12px 28px rgba(7, 29, 53, 0.2)',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Stack direction="row" spacing={0.9} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: { xs: 32, sm: 34 },
                height: { xs: 32, sm: 34 },
                flexShrink: 0,
                borderRadius: 1.6,
                display: 'grid',
                placeItems: 'center',
                color: '#F4C95D',
                bgcolor: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <BookOpenText size={17} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                component="h2"
                sx={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: { xs: '1rem', sm: '1.08rem' }, lineHeight: 1.1 }}
              >
                Learning Notes
              </Typography>
              <Typography sx={{ mt: 0.55, maxWidth: 280, color: 'rgba(255,255,255,0.8)', fontSize: { xs: '0.62rem', sm: '0.67rem' }, lineHeight: 1.35 }}>
                Capture ideas. Build your knowledge. Grow your career.
              </Typography>
            </Box>
          </Stack>

          <Stack spacing={0.4} alignItems="flex-end" sx={{ flexShrink: 0 }}>
            <Chip
              size="small"
              icon={<CheckCircle2 size={13} />}
              label={isSavingNote ? 'Saving...' : lastSavedAt ? 'Saved' : 'Ready'}
              sx={{
                height: 22,
                fontSize: '0.68rem',
                color: '#fff',
                fontWeight: 800,
                bgcolor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.18)',
                backdropFilter: 'blur(10px)',
                '& .MuiChip-icon': { color: isSavingNote ? '#F4C95D' : '#4ADE80' },
              }}
            />
            <Chip
              size="small"
              label={`${orderedHistory.length} ${orderedHistory.length === 1 ? 'Note' : 'Notes'}`}
              sx={{ height: 22, fontSize: '0.68rem', color: '#fff', fontWeight: 800, bgcolor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' }}
            />
          </Stack>
        </Stack>

      {/* Workspace navigation */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        gap={0.7}
        sx={{ mt: 0.8, mb: 0.7 }}
      >
        <Stack direction="row" spacing={0.5} sx={{ overflowX: 'auto', flex: 1, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          <Button
            size="small"
            startIcon={<PenLine size={13} />}
            onClick={focusEditor}
            sx={{ minHeight: 28, height: 28, px: 1, py: 0.25, flexShrink: 0, color: editorMode === 'write' ? '#071D35' : '#fff', fontSize: '0.7rem', fontWeight: 800, bgcolor: editorMode === 'write' ? '#D6A73A' : 'rgba(7,29,53,0.4)', border: `1px solid ${editorMode === 'write' ? '#D6A73A' : 'rgba(255,255,255,0.18)'}`, '& .MuiButton-startIcon': { mr: 0.6 }, '&:hover': { bgcolor: editorMode === 'write' ? '#D6A73A' : 'rgba(255,255,255,0.14)' } }}
          >
            Write
          </Button>
          <Button
            size="small"
            startIcon={<Code2 size={13} />}
            onClick={() => setEditorMode('code')}
            disabled={!selectedVideo}
            sx={{ minHeight: 28, height: 28, px: 1, py: 0.25, flexShrink: 0, color: editorMode === 'code' ? '#071D35' : '#fff', fontSize: '0.7rem', fontWeight: 800, bgcolor: editorMode === 'code' ? '#D6A73A' : 'rgba(7,29,53,0.4)', border: `1px solid ${editorMode === 'code' ? '#D6A73A' : 'rgba(255,255,255,0.18)'}`, backdropFilter: 'blur(8px)', '& .MuiButton-startIcon': { mr: 0.6 }, '&:hover': { bgcolor: editorMode === 'code' ? '#D6A73A' : '#071D35' } }}
          >
            Code
          </Button>
          <Button
            size="small"
            startIcon={<MessageSquarePlus size={13} />}
            onClick={handleNewChat}
            disabled={!selectedVideo}
            sx={{ minHeight: 28, height: 28, px: 1, py: 0.25, flexShrink: 0, color: '#fff', fontSize: '0.7rem', fontWeight: 700, bgcolor: 'rgba(37,99,235,0.45)', border: '1px solid rgba(147,197,253,0.32)', backdropFilter: 'blur(8px)', '& .MuiButton-startIcon': { mr: 0.6 }, '&:hover': { bgcolor: 'rgba(37,99,235,0.65)' }, '&.Mui-disabled': { color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.12)' } }}
          >
            New Chat
          </Button>
        </Stack>

        <Paper
          elevation={0}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.7, px: 1, height: 32, minWidth: { sm: 175 }, borderRadius: 1.7, border: '1px solid rgba(255,255,255,0.28)', bgcolor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)' }}
        >
          <Search size={14} color="#64748B" />
          <InputBase
            value={notesSearch}
            onChange={(event) => setNotesSearch(event.target.value)}
            placeholder="Search notes..."
            inputProps={{ 'aria-label': 'Search saved notes' }}
            sx={{ flex: 1, minWidth: 0, fontSize: '0.72rem', color: '#10233F' }}
          />
        </Paper>
      </Stack>

      <Box ref={editorSectionRef}>
        <TextField
          fullWidth
          error={noteTitleError}
          value={noteTitle}
          onChange={(event) => onNoteTitleChange(event.target.value)}
          placeholder="Note title — e.g. React hooks class 2"
          disabled={!selectedVideo}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FileText size={18} color={noteTitleError ? '#DC2626' : '#D6A73A'} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiInputBase-root': {
              height: 40,
              bgcolor: noteTitleError ? 'rgba(254,226,226,0.96)' : 'rgba(255,255,255,0.94)',
              borderRadius: 2,
              fontSize: '0.78rem',
              fontWeight: 650,
              color: '#10233F',
            },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: noteTitleError ? '#DC2626' : 'rgba(255,255,255,0.45)', borderWidth: noteTitleError ? 2 : 1 },
            '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: noteTitleError ? '#DC2626' : '#2563EB', borderWidth: noteTitleError ? 2 : 1 },
            '& .Mui-focused': { boxShadow: noteTitleError ? '0 0 0 3px rgba(220,38,38,0.16)' : '0 0 0 3px rgba(37,99,235,0.1)' },
          }}
        />
      </Box>
      </Box>

      {/* Editor */}
      <Box sx={{ minHeight: 430, mt: 1.25 }}>
        {editorMode === 'write' ? (
          <LearningEditor
            content={noteContent}
            onChange={onNoteChange}
            onTimestamp={onAddTimestamp}
            onClear={onClearNote}
            onSave={onSaveNote}
            onNewChat={onCreateNewNote}
            disabled={!selectedVideo}
            isSaving={isSavingNote}
            lastSavedAt={lastSavedAt}
            focusRequest={editorFocusRequest}
          />
        ) : (
          <LearningCodeEditor
            content={noteContent}
            onChange={onNoteChange}
            onSave={onSaveNote}
            disabled={!selectedVideo}
            isSaving={isSavingNote}
          />
        )}
      </Box>

      {savedNotesPortalTarget && createPortal(
        <Box
          ref={notesSectionRef}
          sx={{
            p: { xs: 1.25, sm: 1.5 },
            borderRadius: 2.5,
            border: '1px solid #E2E8F0',
            bgcolor: '#fff',
            boxShadow: '0 6px 20px rgba(15, 35, 63, 0.05)',
          }}
        >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.1 }}>
          <Box>
            <Typography sx={{ color: '#10233F', fontWeight: 800, fontSize: '0.9rem' }}>Saved Notes</Typography>
            <Typography sx={{ color: '#64748B', fontSize: '0.7rem' }}>Your recent notes and ideas</Typography>
          </Box>
          <Chip size="small" label={`${orderedHistory.length} saved`} sx={{ height: 23, fontWeight: 800, fontSize: '0.68rem', color: '#123B5D', bgcolor: '#EFF6FF' }} />
        </Stack>

        <Box>
          {filteredHistory.length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', py: 0.5 }}>
              {notesSearch ? 'No notes match your search.' : 'No saved notes yet.'}
            </Typography>
          )}

          <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
            {filteredHistory.map((note) => {
              const isActive = activeNoteId === note.id;
              const preview = toPlainText(note.content || '');
              const codeSnippet = readLearningCodeSnippet(note.content || '');
              const isCodeNote = hasLearningCodeSnippet(note.content || '');
              const languageLabel = CODE_LANGUAGES.find((language) => language.value === codeSnippet.language)?.label;
              return (
                <ListItemButton
                  key={note.id}
                  draggable
                  disableRipple
                  selected={isActive}
                  onDragStart={() => handleDragStart(note.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop(note.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onOpenHistoryNote(note.id)}
                  sx={{
                    py: 1,
                    pl: 0.8,
                    pr: 0.7,
                    gap: 0.8,
                    borderRadius: 2,
                    alignItems: 'flex-start',
                    border: `1px solid ${isActive ? 'rgba(214,167,58,0.55)' : '#E2E8F0'}`,
                    borderLeft: `3px solid ${isActive ? '#D6A73A' : '#E2E8F0'}`,
                    bgcolor: isActive ? '#FFFCF3' : '#fff',
                    opacity: draggedId === note.id ? 0.5 : 1,
                    transition: 'border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
                    '&.Mui-selected': { bgcolor: '#FFFCF3' },
                    '&:hover': { borderColor: '#93C5FD', transform: 'translateY(-1px)', boxShadow: '0 5px 14px rgba(15,35,63,0.06)' },
                    '&:hover .note-drag, &:hover .note-delete': { opacity: 1 },
                  }}
                >
                  {isCodeNote ? (
                    <Code2 size={16} color="#2563EB" style={{ marginTop: 2, flexShrink: 0 }} />
                  ) : (
                    <GripVertical
                      className="note-drag"
                      size={16}
                      color="#94A3B8"
                      style={{ cursor: 'grab', marginTop: 2, flexShrink: 0 }}
                    />
                  )}

                  <ListItemText
                    sx={{ my: 0, minWidth: 0 }}
                    primary={
                      <Stack direction="row" alignItems="center" spacing={0.7} sx={{ minWidth: 0 }}>
                        <Typography
                          noWrap
                          sx={{
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            lineHeight: 1.35,
                            color: isActive ? '#8A681D' : '#10233F',
                          }}
                        >
                          {note.title || 'Learning Note'}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ fontSize: '0.66rem', color: 'text.secondary', flexShrink: 0, whiteSpace: 'nowrap' }}
                        >
                          {formatSavedAt(note.updatedAt)}
                        </Typography>
                        {isCodeNote && (
                          <Chip size="small" label={languageLabel} sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, color: '#1D4ED8', bgcolor: '#EFF6FF' }} />
                        )}
                      </Stack>
                    }
                    secondary={
                      <Typography
                        noWrap
                        variant="caption"
                        sx={{ display: 'block', fontSize: '0.7rem', color: 'text.secondary', lineHeight: 1.35 }}
                      >
                        {preview || 'No note content'}
                      </Typography>
                    }
                  />

                  <Tooltip title="Delete note">
                    <IconButton
                      className="note-delete"
                      size="small"
                      aria-label="Delete note"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteHistoryNote(note.id);
                      }}
                      sx={{
                        flexShrink: 0,
                        width: 28,
                        height: 28,
                        color: '#64748B',
                        opacity: { xs: 1, md: 0.35 },
                        transition: 'opacity 0.18s ease, color 0.18s ease',
                        '&:hover': { color: 'error.main', bgcolor: 'error.light' },
                      }}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </Tooltip>
                </ListItemButton>
              );
            })}
          </List>
        </Box>
        </Box>,
        savedNotesPortalTarget
      )}
    </Paper>
  );
};
