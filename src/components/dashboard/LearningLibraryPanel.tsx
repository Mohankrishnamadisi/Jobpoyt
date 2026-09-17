import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  InputBase,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  BookMarked,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock3,
  Download,
  FileText,
  Play,
  Search,
  Trash2,
} from 'lucide-react';
import type { LearningVideo } from '@services/learningVideos';
import type { LearningNote } from '@services/learningNotes';
import type { DownloadEntry, HistoryEntry, LearningCourse } from '@services/learningLibrary';
import type { LearningView } from './LearningStudioSidebar';

const relativeTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, actionLabel, onAction }) => (
  <Paper
    variant="outlined"
    sx={{ p: { xs: 3, md: 5 }, textAlign: 'center', borderRadius: 3, borderStyle: 'dashed' }}
  >
    <Box sx={{ color: 'primary.main', display: 'flex', justifyContent: 'center', mb: 1 }}>{icon}</Box>
    <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>{title}</Typography>
    <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: '0.88rem' }}>
      {message}
    </Typography>
    {actionLabel && onAction && (
      <Button variant="contained" size="small" onClick={onAction} sx={{ mt: 2, textTransform: 'none', fontWeight: 700 }}>
        {actionLabel}
      </Button>
    )}
  </Paper>
);

interface VideoRowProps {
  video: LearningVideo;
  meta?: string;
  badge?: React.ReactNode;
  onPlay: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  extraActions?: React.ReactNode;
}

const VideoRow: React.FC<VideoRowProps> = ({ video, meta, badge, onPlay, onRemove, removeLabel, extraActions }) => (
  <Paper
    elevation={0}
    sx={{
      p: 1.2,
      borderRadius: 2,
      border: (theme) => `1px solid ${theme.palette.divider}`,
      display: 'flex',
      gap: 1.4,
      alignItems: 'flex-start',
      transition: 'border-color 0.18s ease, transform 0.18s ease',
      '&:hover': { borderColor: 'primary.main', transform: 'translateY(-1px)' },
    }}
  >
    <Box
      onClick={onPlay}
      sx={{ position: 'relative', flexShrink: 0, cursor: 'pointer', width: { xs: 108, sm: 132 } }}
    >
      <Box
        component="img"
        src={video.thumbnail_url || ''}
        alt={video.title}
        sx={{ width: '100%', aspectRatio: '16 / 9', borderRadius: 1.5, objectFit: 'cover', bgcolor: 'grey.300', display: 'block' }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          opacity: 0,
          borderRadius: 1.5,
          bgcolor: 'rgba(15, 23, 42, 0.45)',
          color: 'white',
          transition: 'opacity 0.18s ease',
          '&:hover': { opacity: 1 },
        }}
      >
        <Play size={22} fill="currentColor" />
      </Box>
    </Box>

    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Typography
        onClick={onPlay}
        sx={{
          fontSize: '0.86rem',
          fontWeight: 700,
          lineHeight: 1.3,
          cursor: 'pointer',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          '&:hover': { color: 'primary.main' },
        }}
      >
        {video.title}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.74rem' }}>
          {video.channel_name || video.source_platform}
        </Typography>
        {meta && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.74rem' }}>
            · {meta}
          </Typography>
        )}
        {badge}
      </Stack>
    </Box>

    <Stack direction="row" spacing={0.3} sx={{ flexShrink: 0 }}>
      {extraActions}
      <Tooltip title="Play">
        <IconButton size="small" onClick={onPlay} color="primary">
          <Play size={16} />
        </IconButton>
      </Tooltip>
      {onRemove && (
        <Tooltip title={removeLabel || 'Remove'}>
          <IconButton size="small" onClick={onRemove} color="error">
            <Trash2 size={16} />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  </Paper>
);

const SectionHeader: React.FC<{
  title: string;
  subtitle: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  action?: React.ReactNode;
}> = ({ title, subtitle, search, onSearchChange, searchPlaceholder, action }) => (
  <Stack
    direction={{ xs: 'column', sm: 'row' }}
    justifyContent="space-between"
    alignItems={{ xs: 'stretch', sm: 'center' }}
    gap={1.5}
    sx={{ mb: 2 }}
  >
    <Box>
      <Typography sx={{ fontWeight: 800, fontSize: '1.15rem' }}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
        {subtitle}
      </Typography>
    </Box>
    <Stack direction="row" spacing={1} alignItems="center">
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.8,
          px: 1.2,
          py: 0.5,
          borderRadius: 2,
          minWidth: { xs: '100%', sm: 220 },
          border: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Search size={15} />
        <InputBase
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          sx={{ fontSize: '0.85rem', flex: 1 }}
        />
      </Paper>
      {action}
    </Stack>
  </Stack>
);

export interface LearningLibraryPanelProps {
  view: LearningView;
  bookmarks: LearningVideo[];
  history: HistoryEntry[];
  downloads: DownloadEntry[];
  courses: LearningCourse[];
  notes: LearningNote[];
  onPlayVideo: (video: LearningVideo) => void;
  onRemoveBookmark: (videoId: string) => void;
  onRemoveHistory: (videoId: string) => void;
  onClearHistory: () => void;
  onRemoveDownload: (videoId: string) => void;
  onToggleLesson: (courseId: string, videoId: string) => void;
  onRemoveCourse: (courseId: string) => void;
  onOpenNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onBrowse: () => void;
}

export const LearningLibraryPanel: React.FC<LearningLibraryPanelProps> = ({
  view,
  bookmarks,
  history,
  downloads,
  courses,
  notes,
  onPlayVideo,
  onRemoveBookmark,
  onRemoveHistory,
  onClearHistory,
  onRemoveDownload,
  onToggleLesson,
  onRemoveCourse,
  onOpenNote,
  onDeleteNote,
  onBrowse,
}) => {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();

  const matches = (...values: Array<string | null | undefined>) =>
    !query || values.some((value) => String(value || '').toLowerCase().includes(query));

  const filteredBookmarks = useMemo(
    () => bookmarks.filter((video) => matches(video.title, video.channel_name, video.search_key)),
    [bookmarks, query]
  );
  const filteredHistory = useMemo(
    () => history.filter((entry) => matches(entry.video.title, entry.video.channel_name)),
    [history, query]
  );
  const filteredDownloads = useMemo(
    () => downloads.filter((entry) => matches(entry.video.title, entry.video.channel_name)),
    [downloads, query]
  );
  const filteredCourses = useMemo(
    () => courses.filter((course) => matches(course.title, course.topic)),
    [courses, query]
  );
  const filteredNotes = useMemo(
    () => notes.filter((note) => matches(note.title, note.content)),
    [notes, query]
  );

  if (view === 'bookmarks') {
    return (
      <Box>
        <SectionHeader
          title="Bookmarks"
          subtitle={`${bookmarks.length} saved video${bookmarks.length === 1 ? '' : 's'} ready to revisit`}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search bookmarks"
        />
        {filteredBookmarks.length === 0 ? (
          <EmptyState
            icon={<BookMarked size={40} />}
            title="No bookmarks yet"
            message="Tap the bookmark icon on any video to save it here for later."
            actionLabel="Browse videos"
            onAction={onBrowse}
          />
        ) : (
          <Stack spacing={1.2}>
            {filteredBookmarks.map((video) => (
              <VideoRow
                key={`bookmark-${video.video_id}`}
                video={video}
                meta={video.search_key}
                onPlay={() => onPlayVideo(video)}
                onRemove={() => onRemoveBookmark(video.video_id)}
                removeLabel="Remove bookmark"
              />
            ))}
          </Stack>
        )}
      </Box>
    );
  }

  if (view === 'history') {
    return (
      <Box>
        <SectionHeader
          title="Watch History"
          subtitle={`${history.length} video${history.length === 1 ? '' : 's'} watched recently`}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search history"
          action={
            history.length > 0 ? (
              <Button
                size="small"
                color="error"
                variant="outlined"
                onClick={onClearHistory}
                sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
              >
                Clear all
              </Button>
            ) : undefined
          }
        />
        {filteredHistory.length === 0 ? (
          <EmptyState
            icon={<Clock3 size={40} />}
            title="Nothing watched yet"
            message="Videos you play show up here so you can resume anytime."
            actionLabel="Start learning"
            onAction={onBrowse}
          />
        ) : (
          <Stack spacing={1.2}>
            {filteredHistory.map((entry) => (
              <VideoRow
                key={`history-${entry.video.video_id}`}
                video={entry.video}
                meta={relativeTime(entry.watchedAt)}
                badge={
                  entry.watchCount > 1 ? (
                    <Chip size="small" label={`${entry.watchCount}x`} sx={{ height: 18, fontSize: '0.65rem' }} />
                  ) : undefined
                }
                onPlay={() => onPlayVideo(entry.video)}
                onRemove={() => onRemoveHistory(entry.video.video_id)}
                removeLabel="Remove from history"
              />
            ))}
          </Stack>
        )}
      </Box>
    );
  }

  if (view === 'downloads') {
    return (
      <Box>
        <SectionHeader
          title="Downloads"
          subtitle={`${downloads.length} video${downloads.length === 1 ? '' : 's'} saved for offline access`}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search downloads"
        />
        {filteredDownloads.length === 0 ? (
          <EmptyState
            icon={<Download size={40} />}
            title="No offline saves yet"
            message="Save videos for offline so they stay one tap away even on a weak network."
            actionLabel="Browse videos"
            onAction={onBrowse}
          />
        ) : (
          <Stack spacing={1.2}>
            {filteredDownloads.map((entry) => (
              <VideoRow
                key={`download-${entry.video.video_id}`}
                video={entry.video}
                meta={`Saved ${relativeTime(entry.savedAt)} · ${entry.sizeLabel}`}
                onPlay={() => onPlayVideo(entry.video)}
                onRemove={() => onRemoveDownload(entry.video.video_id)}
                removeLabel="Remove download"
              />
            ))}
          </Stack>
        )}
      </Box>
    );
  }

  if (view === 'courses') {
    return (
      <Box>
        <SectionHeader
          title="My Courses"
          subtitle={`${courses.length} learning path${courses.length === 1 ? '' : 's'} in progress`}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search courses"
        />
        {filteredCourses.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={40} />}
            title="No courses yet"
            message="Search any topic and tap 'Save as course' to turn the results into a trackable learning path."
            actionLabel="Build a course"
            onAction={onBrowse}
          />
        ) : (
          <Stack spacing={2}>
            {filteredCourses.map((course) => {
              const total = course.videos.length;
              const done = course.completedVideoIds.length;
              const percent = total ? Math.round((done / total) * 100) : 0;
              return (
                <Paper
                  key={course.id}
                  elevation={0}
                  sx={{ p: 2, borderRadius: 3, border: (theme) => `1px solid ${theme.palette.divider}` }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1.5}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>{course.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {done}/{total} lessons completed · started {relativeTime(course.createdAt)}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Chip
                        size="small"
                        label={percent === 100 ? 'Completed' : `${percent}%`}
                        color={percent === 100 ? 'success' : 'primary'}
                        sx={{ fontWeight: 800, height: 22 }}
                      />
                      <Tooltip title="Remove course">
                        <IconButton size="small" color="error" onClick={() => onRemoveCourse(course.id)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={percent}
                    color={percent === 100 ? 'success' : 'primary'}
                    sx={{ height: 6, borderRadius: 3, my: 1.5 }}
                  />

                  <Divider sx={{ mb: 1.2 }} />

                  <Stack spacing={0.6}>
                    {course.videos.map((video, index) => {
                      const completed = course.completedVideoIds.includes(video.video_id);
                      return (
                        <Stack
                          key={`${course.id}-${video.video_id}`}
                          direction="row"
                          alignItems="center"
                          spacing={1}
                          sx={{
                            px: 1,
                            py: 0.6,
                            borderRadius: 1.5,
                            '&:hover': { bgcolor: (theme) => theme.palette.action.hover },
                          }}
                        >
                          <Tooltip title={completed ? 'Mark as not done' : 'Mark as done'}>
                            <IconButton
                              size="small"
                              onClick={() => onToggleLesson(course.id, video.video_id)}
                              color={completed ? 'success' : 'default'}
                            >
                              {completed ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                            </IconButton>
                          </Tooltip>
                          <Typography
                            onClick={() => onPlayVideo(video)}
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              fontSize: '0.83rem',
                              cursor: 'pointer',
                              fontWeight: completed ? 500 : 600,
                              color: completed ? 'text.secondary' : 'text.primary',
                              textDecoration: completed ? 'line-through' : 'none',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              '&:hover': { color: 'primary.main' },
                            }}
                          >
                            {index + 1}. {video.title}
                          </Typography>
                          <IconButton size="small" color="primary" onClick={() => onPlayVideo(video)}>
                            <Play size={15} />
                          </IconButton>
                        </Stack>
                      );
                    })}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3, bgcolor: '#F4F7FB', border: '1px solid #E2E8F0' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        gap={1.5}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.2}>
          <Box sx={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 2, color: '#D6A73A', bgcolor: '#071D35' }}>
            <FileText size={19} />
          </Box>
          <Box>
            <Typography sx={{ color: '#10233F', fontWeight: 800, fontSize: '1.05rem' }}>Saved Notes</Typography>
            <Typography sx={{ color: '#64748B', fontSize: '0.78rem' }}>Your recent notes and ideas</Typography>
          </Box>
          <Chip size="small" label={`${notes.length} saved`} sx={{ height: 22, ml: 0.5, color: '#123B5D', fontWeight: 800, fontSize: '0.67rem', bgcolor: '#E8F1FC' }} />
        </Stack>

        <Paper
          elevation={0}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 1.2, py: 0.5, minWidth: { sm: 230 }, borderRadius: 2, border: '1px solid #D9E2EF', bgcolor: '#fff', '&:focus-within': { borderColor: '#2563EB', boxShadow: '0 0 0 3px rgba(37,99,235,0.1)' } }}
        >
          <Search size={15} color="#64748B" />
          <InputBase
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notes..."
            sx={{ fontSize: '0.82rem', flex: 1, color: '#10233F' }}
          />
        </Paper>
      </Stack>
      {filteredNotes.length === 0 ? (
        <EmptyState
          icon={<FileText size={40} />}
          title="No notes yet"
          message="Take notes while watching a video and they will be collected here."
          actionLabel="Start a note"
          onAction={onBrowse}
        />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            gap: 1.2,
          }}
        >
          {filteredNotes.map((note) => (
            <Paper
              key={note.id}
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2.25,
                border: '1px solid #E2E8F0',
                borderLeft: '3px solid #D6A73A',
                bgcolor: '#fff',
                display: 'flex',
                flexDirection: 'column',
                transition: 'border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
                '&:hover': { borderColor: '#93C5FD', borderLeftColor: '#D6A73A', transform: 'translateY(-1px)', boxShadow: '0 7px 18px rgba(15,35,63,0.07)' },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                  <Box sx={{ width: 30, height: 30, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1.5, color: '#D6A73A', bgcolor: '#FFF8E7' }}>
                    <FileText size={15} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      onClick={() => onOpenNote(note.id)}
                      sx={{
                        color: '#10233F',
                        fontWeight: 800,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        '&:hover': { color: '#2563EB' },
                      }}
                    >
                      {note.title || 'Untitled Note'}
                    </Typography>
                    <Typography sx={{ color: '#94A3B8', fontSize: '0.66rem' }}>Updated {relativeTime(note.updatedAt)}</Typography>
                  </Box>
                </Stack>
                <Tooltip title="Delete note">
                  <IconButton size="small" onClick={() => onDeleteNote(note.id)} sx={{ color: '#64748B', '&:hover': { color: 'error.main', bgcolor: '#FEF2F2' } }}>
                    <Trash2 size={15} />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 1,
                  flex: 1,
                  color: '#64748B',
                  fontSize: '0.78rem',
                  lineHeight: 1.55,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {stripHtml(note.content) || 'Empty note'}
              </Typography>
              <Stack direction="row" justifyContent="flex-end" alignItems="center" sx={{ mt: 1 }}>
                <Button
                  size="small"
                  onClick={() => onOpenNote(note.id)}
                  sx={{ minWidth: 0, px: 1, color: '#123B5D', textTransform: 'none', fontWeight: 800, fontSize: '0.72rem' }}
                >
                  Open note
                </Button>
              </Stack>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};
