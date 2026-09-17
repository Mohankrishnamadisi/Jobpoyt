import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Container, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { Bookmark, BookmarkBorder, DownloadDone, DownloadForOffline, PlayCircleOutline, PlaylistAdd, Share } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@components/layout/Layout';
import { useAuthStore } from '@store/index';
import Swal from '@utils/sweetAlert';
import {
  learningVideosService,
  LearningVideosError,
  type LearningProfile,
  type LearningVideo,
} from '@services/learningVideos';
import { learningNotesService, type LearningNote } from '@services/learningNotes';
import {
  learningLibraryService,
  type DownloadEntry,
  type HistoryEntry,
  type LearningCourse,
  type LearningStreak,
} from '@services/learningLibrary';
import {
  LearningCommandCenter,
  type DifficultyFilter,
  type DurationFilter,
  type SortFilter,
} from '@components/dashboard/LearningCommandCenter';
import {
  LearningStudioSidebar,
  type LearningCategory,
  type LearningView,
} from '@components/dashboard/LearningStudioSidebar';
import { LearningLibraryPanel } from '@components/dashboard/LearningLibraryPanel';
import { VideoWorkspace } from '@components/dashboard/learning/VideoWorkspace';
import { EnhancedLearningNotesPanel } from '@components/dashboard/EnhancedLearningNotesPanel';
import { RelatedVideosList } from '@components/dashboard/RelatedVideosList';
import { ROUTES } from '@constants/index';

const unique = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const buildTopics = (profile: LearningProfile) => {
  const skills = unique([...profile.skills, ...profile.technologies]).slice(0, 6);
  const topics = skills.flatMap((skill) => [`${skill} tutorial`, `${skill} interview questions`]);
  if (profile.role) topics.push(`${profile.role} career skills`);
  if (profile.experience) topics.push(`${profile.experience} interview preparation`);
  return unique(topics).slice(0, 10);
};

const buildSearchKey = (profile: LearningProfile) => {
  const skills = unique([...profile.technologies, ...profile.skills]).slice(0, 6);
  const profileTerms = unique([...skills, profile.role, profile.experience]);
  return profileTerms.length ? `${profileTerms.join(' ')} tutorial` : '';
};

const formatDate = (date?: string | null) => {
  if (!date) return '';
  const parsed = new Date(date);
  return Number.isNaN(parsed.valueOf())
    ? ''
    : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const LearningPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const userId = user?.id || '';
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [videos, setVideos] = useState<LearningVideo[]>([]);
  const [activeTopic, setActiveTopic] = useState('');
  const [activeView, setActiveView] = useState<LearningView>('overview');
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<LearningVideo | null>(null);
  const [filters, setFilters] = useState<{
    difficulty: DifficultyFilter;
    duration: DurationFilter;
    sort: SortFilter;
  }>({ difficulty: 'all', duration: 'all', sort: 'relevance' });
  const [bookmarks, setBookmarks] = useState<LearningVideo[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [downloads, setDownloads] = useState<DownloadEntry[]>([]);
  const [courses, setCourses] = useState<LearningCourse[]>([]);
  const [streak, setStreak] = useState<LearningStreak>(() => learningLibraryService.getStreak(''));
  const [libraryReady, setLibraryReady] = useState(false);
  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteTitleError, setNoteTitleError] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeNoteVideoId, setActiveNoteVideoId] = useState<string | null>(null);
  const [isCreatingNewNote, setIsCreatingNewNote] = useState(false);
  const [noteHistory, setNoteHistory] = useState<LearningNote[]>([]);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [notesCreated, setNotesCreated] = useState(0);
  const [savedNotesPortalTarget, setSavedNotesPortalTarget] = useState<HTMLElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const topics = useMemo(() => (profile ? buildTopics(profile) : []), [profile]);

  const bookmarkIds = useMemo(() => new Set(bookmarks.map((item) => item.video_id)), [bookmarks]);
  const downloadIds = useMemo(() => new Set(downloads.map((entry) => entry.video.video_id)), [downloads]);

  /** Difficulty and duration refine the query sent to the videos function. */
  const effectiveQuery = useMemo(() => {
    if (!activeTopic.trim()) return '';
    const extras: string[] = [];
    if (filters.difficulty !== 'all') extras.push(filters.difficulty);
    if (filters.duration === 'short') extras.push('crash course');
    if (filters.duration === 'long') extras.push('full course');
    return [activeTopic.trim(), ...extras].join(' ');
  }, [activeTopic, filters.difficulty, filters.duration]);

  const displayVideos = useMemo(() => {
    if (filters.sort !== 'newest') return videos;
    return [...videos].sort(
      (a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
    );
  }, [videos, filters.sort]);

  // Hydrate the library from Supabase (local cache is used until it resolves)
  useEffect(() => {
    let active = true;
    setBookmarks(learningLibraryService.getBookmarks(userId));
    setHistory(learningLibraryService.getHistory(userId));
    setDownloads(learningLibraryService.getDownloads(userId));
    setCourses(learningLibraryService.getCourses(userId));
    setStreak(learningLibraryService.getStreak(userId));

    void learningLibraryService.hydrate(userId).then((snapshot) => {
      if (!active) return;
      setBookmarks(snapshot.bookmarks);
      setHistory(snapshot.history);
      setDownloads(snapshot.downloads);
      setCourses(snapshot.courses);
      setStreak(snapshot.streak);
      setLibraryReady(true);
    });

    return () => {
      active = false;
    };
  }, [userId]);

  const refreshNotesCount = useCallback(async () => {
    if (!user?.id) {
      setNotesCreated(0);
      return;
    }
    try {
      const count = await learningNotesService.getNotesCount(user.id);
      setNotesCreated(count);
    } catch (countError) {
      console.error('Failed to fetch learning notes count:', countError);
    }
  }, [user?.id]);

  const refreshNoteHistory = useCallback(async () => {
    if (!user?.id) {
      setNoteHistory([]);
      return;
    }
    try {
      const rows = await learningNotesService.listNotes(user.id);
      setNoteHistory(rows);
    } catch (historyError) {
      console.error('Failed to fetch learning notes history:', historyError);
    }
  }, [user?.id]);

  // Load profile
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    learningVideosService
      .getProfile(user.id)
      .then((nextProfile) => {
        if (!active) return;
        setProfile(nextProfile);
        setActiveTopic(buildSearchKey(nextProfile));
      })
      .catch(() => {
        if (active) setError('We could not read your profile yet. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  // Load videos when topic changes
  useEffect(() => {
    if (!effectiveQuery) return;
    let active = true;
    setVideos([]);
    setSelectedVideo(null);
    setNoteTitle('');
    setNoteContent('');
    setLoading(true);
    setError('');
    learningVideosService
      .getVideos(effectiveQuery)
      .then((nextVideos) => {
        if (!active) return;
        setVideos(nextVideos);
        if (nextVideos.length > 0) {
          setSelectedVideo(nextVideos[0]);
        }
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError instanceof LearningVideosError) {
          if (requestError.kind === 'auth' || requestError.kind === 'session') {
            setError('Your session has expired. Please sign in again.');
          } else if (requestError.kind === 'invalid-response') {
            setError('Learning videos returned an unexpected response. Please try again.');
          } else {
            setError(
              requestError.status
                ? `Learning videos request failed (${requestError.status}): ${requestError.message}`
                : requestError.message
            );
          }
        } else {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Learning videos are unavailable right now. Please try again.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [effectiveQuery]);

  // History and daily minutes are driven by real playback, not by selection
  const handlePlayStart = useCallback(
    (video: LearningVideo) => {
      if (!libraryReady) return;
      setHistory(learningLibraryService.recordWatch(userId, video));
      setStreak(learningLibraryService.touchStreak(userId, 0));
    },
    [userId, libraryReady]
  );

  const handleMinuteWatched = useCallback(
    (minutes: number) => {
      if (!libraryReady) return;
      setStreak(learningLibraryService.touchStreak(userId, minutes));
    },
    [userId, libraryReady]
  );

  // Load notes when selected video changes
  useEffect(() => {
    void refreshNotesCount();
    void refreshNoteHistory();
  }, [refreshNotesCount, refreshNoteHistory]);

  useEffect(() => {
    if (!user?.id || !selectedVideo?.video_id) {
      setNoteTitle('');
      setNoteTitleError(false);
      setNoteContent('');
      setLastSavedAt(null);
      setActiveNoteId(null);
      setActiveNoteVideoId(null);
      setIsCreatingNewNote(false);
      return;
    }
    setNoteTitle('');
    setNoteTitleError(false);
    setNoteContent('');
    setLastSavedAt(null);
    setActiveNoteId(null);
    setActiveNoteVideoId(selectedVideo.video_id);
    setIsCreatingNewNote(true);
  }, [selectedVideo?.video_id, user?.id]);

  const handleSaveNote = useCallback(async () => {
    if (!user?.id) return;

    if (!noteTitle.trim()) {
      setNoteTitleError(true);
      void Swal.fire({
        icon: 'warning',
        title: 'Note title required',
        text: 'Please add a note title before saving.',
        confirmButtonText: 'OK',
      });
      return;
    }
    setNoteTitleError(false);

    const noteVideoId = activeNoteVideoId || selectedVideo?.video_id;
    if (!noteVideoId) return;

    setIsSavingNote(true);
    try {
      const saved = await learningNotesService.saveNote({
        userId: user.id,
        videoId: noteVideoId,
        content: noteContent,
        noteTitle,
        noteId: activeNoteId,
        forceCreate: isCreatingNewNote,
      });
      setNoteTitle(saved.title || noteTitle);
      setNoteTitleError(false);
      setActiveNoteId(saved.id);
      setActiveNoteVideoId(saved.videoId || noteVideoId);
      setIsCreatingNewNote(false);
      setLastSavedAt(saved.updatedAt);
      await refreshNotesCount();
      await refreshNoteHistory();
    } catch (saveError) {
      console.error('Failed to save note:', saveError);
    } finally {
      setIsSavingNote(false);
    }
  }, [user?.id, activeNoteVideoId, selectedVideo?.video_id, activeNoteId, noteContent, noteTitle, isCreatingNewNote, refreshNotesCount, refreshNoteHistory]);

  const toggleBookmark = useCallback((video: LearningVideo) => {
    setBookmarks(learningLibraryService.toggleBookmark(userId, video));
  }, [userId]);

  const toggleDownload = useCallback((video: LearningVideo) => {
    setDownloads(learningLibraryService.toggleDownload(userId, video));
  }, [userId]);

  const handleSelectVideo = useCallback((video: LearningVideo) => {
    setSelectedVideo(video);
    setActiveView('overview');
  }, []);

  const handleShareVideo = useCallback(async (video: LearningVideo) => {
    const shareData = { title: video.title, text: video.title, url: video.video_url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(video.video_url);
      void Swal.fire({ icon: 'success', title: 'Link copied', timer: 1400, showConfirmButton: false });
    } catch {
      /* user dismissed the share sheet */
    }
  }, []);

  const handleSaveAsCourse = useCallback(() => {
    if (!activeTopic.trim() || videos.length === 0) return;
    setCourses(learningLibraryService.enrollCourse(userId, activeTopic.trim(), videos));
    void Swal.fire({
      icon: 'success',
      title: 'Added to My Courses',
      text: `${videos.length} lessons are now tracked under "${activeTopic.trim()}".`,
      timer: 1800,
      showConfirmButton: false,
    });
  }, [activeTopic, videos, userId]);

  const handleToggleLesson = useCallback((courseId: string, videoId: string) => {
    setCourses(learningLibraryService.toggleCourseLesson(userId, courseId, videoId));
  }, [userId]);

  const handleRemoveCourse = useCallback(async (courseId: string) => {
    const result = await Swal.fire({
      title: 'Remove this course?',
      text: 'Your progress for this learning path will be deleted.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1D4ED8',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Remove',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;
    setCourses(learningLibraryService.removeCourse(userId, courseId));
  }, [userId]);

  const handleClearHistory = useCallback(async () => {
    const result = await Swal.fire({
      title: 'Clear watch history?',
      text: 'This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1D4ED8',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Clear',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;
    setHistory(learningLibraryService.clearHistory(userId));
  }, [userId]);

  const handleCategorySelect = useCallback((category: LearningCategory) => {
    setActiveCategory(category.label);
    setActiveTopic(category.query);
    setActiveView('overview');
  }, []);

  const handleAddTimestamp = useCallback(() => {
    const timestamp = `[${new Date().toLocaleTimeString()}] `;
    setNoteContent((prev) => prev + timestamp);
  }, []);

  const handleClearNote = useCallback(() => {
    if (!user?.id) return;

    void (async () => {
      const result = await Swal.fire({
        title: 'Delete this note?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#1D4ED8',
        cancelButtonColor: '#64748B',
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
      });

      if (!result.isConfirmed) return;

      setNoteContent('');
      setNoteTitle('');
      try {
        if (activeNoteId) {
          await learningNotesService.deleteNoteById(user.id, activeNoteId);
        } else if (selectedVideo?.video_id) {
          await learningNotesService.deleteNote(user.id, selectedVideo.video_id);
        }
        setLastSavedAt(null);
        setActiveNoteId(null);
        setNoteTitle('');
        setIsCreatingNewNote(false);
        await refreshNotesCount();
        await refreshNoteHistory();
      } catch (deleteError) {
        console.error('Failed to delete learning note:', deleteError);
      }
    })();
  }, [user?.id, selectedVideo?.video_id, activeNoteId, refreshNotesCount, refreshNoteHistory]);

  const handleOpenHistoryNote = useCallback(async (noteId: string) => {
    if (!user?.id || !noteId) return;
    try {
      const note = await learningNotesService.getNoteById(user.id, noteId);
      if (!note) return;
      setActiveNoteId(note.id);
      setActiveNoteVideoId(note.videoId || null);
      setIsCreatingNewNote(false);
      setNoteTitle(note.title || '');
      setNoteTitleError(false);
      setNoteContent(note.content);
      setLastSavedAt(note.updatedAt);
    } catch (historyOpenError) {
      console.error('Failed to open learning note:', historyOpenError);
    }
  }, [user?.id]);

  const handleReorderHistory = useCallback((orderedNoteIds: string[]) => {
    const orderMap = new Map(orderedNoteIds.map((id, index) => [id, index]));
    setNoteHistory((prev) => {
      const withRank = [...prev];
      withRank.sort((a, b) => {
        const rankA = orderMap.has(a.id) ? (orderMap.get(a.id) as number) : Number.MAX_SAFE_INTEGER;
        const rankB = orderMap.has(b.id) ? (orderMap.get(b.id) as number) : Number.MAX_SAFE_INTEGER;
        if (rankA !== rankB) return rankA - rankB;
        return b.updatedAt - a.updatedAt;
      });
      return withRank;
    });
  }, []);

  const handleDeleteHistoryNote = useCallback(async (noteId: string) => {
    if (!user?.id || !noteId) return;

    const result = await Swal.fire({
      title: 'Delete this saved record?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1D4ED8',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;

    try {
      await learningNotesService.deleteNoteById(user.id, noteId);

      if (activeNoteId === noteId) {
        setNoteTitle('');
        setNoteContent('');
        setLastSavedAt(null);
        setActiveNoteId(null);
        setIsCreatingNewNote(false);
      }

      await refreshNotesCount();
      await refreshNoteHistory();
    } catch (deleteError) {
      console.error('Failed to delete history note:', deleteError);
    }
  }, [user?.id, activeNoteId, refreshNotesCount, refreshNoteHistory]);

  const handleCreateNewNote = useCallback(() => {
    if (!selectedVideo?.video_id) return;
    setActiveNoteId(null);
    setActiveNoteVideoId(selectedVideo.video_id);
    setNoteTitle('');
    setNoteTitleError(false);
    setNoteContent('');
    setLastSavedAt(null);
    setIsCreatingNewNote(true);
  }, [selectedVideo?.video_id]);

  const handleSearch = (query: string) => {
    setActiveCategory('');
    setActiveTopic(query);
    setActiveView('overview');
  };

  const handleFilterChange = (nextFilters: {
    difficulty: DifficultyFilter;
    duration: DurationFilter;
    sort: SortFilter;
  }) => {
    setFilters(nextFilters);
  };

  const handleOpenNoteFromLibrary = useCallback(
    (noteId: string) => {
      setActiveView('overview');
      void handleOpenHistoryNote(noteId);
    },
    [handleOpenHistoryNote]
  );

  const sidebarCounts = useMemo(
    () => ({
      courses: courses.length,
      bookmarks: bookmarks.length,
      notes: noteHistory.length,
      history: history.length,
      downloads: downloads.length,
    }),
    [courses.length, bookmarks.length, noteHistory.length, history.length, downloads.length]
  );

  const sidebar = (
    <LearningStudioSidebar
      activeView={activeView}
      onViewChange={setActiveView}
      counts={sidebarCounts}
      activeCategory={activeCategory}
      onCategorySelect={handleCategorySelect}
      onUpgrade={() => navigate(ROUTES.PRICING)}
      streak={streak.currentStreak}
      todayMinutes={streak.todayMinutes}
      dailyGoalMinutes={streak.dailyGoalMinutes}
    />
  );

  // Single notes instance: rendered in the side column, or inside the
  // fullscreen overlay - never both, so editor state stays consistent.
  const notesPanel = (
    <EnhancedLearningNotesPanel
      selectedVideo={selectedVideo}
      noteTitle={noteTitle}
      noteContent={noteContent}
      onNoteTitleChange={(title) => {
        setNoteTitle(title);
        if (title.trim()) setNoteTitleError(false);
      }}
      noteTitleError={noteTitleError}
      onNoteChange={setNoteContent}
      onAddTimestamp={handleAddTimestamp}
      onClearNote={handleClearNote}
      onSaveNote={handleSaveNote}
      isSavingNote={isSavingNote}
      lastSavedAt={lastSavedAt}
      notesHistory={noteHistory}
      activeNoteId={activeNoteId}
      onOpenHistoryNote={handleOpenHistoryNote}
      onReorderHistory={handleReorderHistory}
      userId={user?.id || ''}
      onCreateNewNote={handleCreateNewNote}
      onDeleteHistoryNote={handleDeleteHistoryNote}
      savedNotesPortalTarget={savedNotesPortalTarget}
    />
  );

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 2.5 }, px: { xs: 1, sm: 2, md: 3 } }}>
        {/* Learning Command Center */}
        {user && profile && (
          <LearningCommandCenter
            userName={profile.name}
            videosWatched={history.length}
            learningStreak={streak.currentStreak}
            notesCreated={notesCreated}
            topics={topics}
            activeTopic={activeTopic}
            onTopicChange={(topic) => {
              setActiveCategory('');
              setActiveTopic(topic);
              setActiveView('overview');
            }}
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
            isLoading={loading}
          />
        )}

        {!user && (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 3, md: 5 },
              textAlign: 'center',
              borderRadius: 3,
              maxWidth: 720,
              mx: 'auto',
            }}
          >
            <PlayCircleOutline color="primary" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="h6" fontWeight={700}>
              Sign in to personalize your learning feed
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75 }}>
              Your skills and designation will be used to find relevant learning videos.
            </Typography>
            <Button component="a" href={`#${ROUTES.LOGIN}`} variant="contained" sx={{ mt: 2 }}>
              Sign in
            </Button>
          </Paper>
        )}

        {/* Error Alert */}
        {user && error && (
          <Alert
            severity="error"
            sx={{ mb: 2.5 }}
            action={
              <Button color="inherit" size="small" onClick={() => setActiveTopic((topic) => `${topic} `)}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Studio Workspace */}
        {user && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr)',
              gap: { xs: 2.5, md: 3 },
              alignItems: 'start',
            }}
          >
            {sidebar}

            <Box sx={{ minWidth: 0 }}>
            {activeView !== 'overview' && (
              <LearningLibraryPanel
                view={activeView}
                bookmarks={bookmarks}
                history={history}
                downloads={downloads}
                courses={courses}
                notes={noteHistory}
                onPlayVideo={handleSelectVideo}
                onRemoveBookmark={(videoId) => setBookmarks(learningLibraryService.removeBookmark(userId, videoId))}
                onRemoveHistory={(videoId) => setHistory(learningLibraryService.removeHistory(userId, videoId))}
                onClearHistory={handleClearHistory}
                onRemoveDownload={(videoId) => setDownloads(learningLibraryService.removeDownload(userId, videoId))}
                onToggleLesson={handleToggleLesson}
                onRemoveCourse={handleRemoveCourse}
                onOpenNote={handleOpenNoteFromLibrary}
                onDeleteNote={(noteId) => void handleDeleteHistoryNote(noteId)}
                onBrowse={() => setActiveView('overview')}
              />
            )}

            {activeView === 'overview' && loading && (
              <Box sx={{ minHeight: 400, display: 'grid', placeItems: 'center' }}>
                <CircularProgress />
              </Box>
            )}

            {activeView === 'overview' && !loading && !error && videos.length > 0 && (
            <Box
              sx={{
                minWidth: 0,
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  lg: 'minmax(0, 1.8fr) minmax(360px, 1fr)',
                  xl: 'minmax(0, 1.9fr) minmax(400px, 1fr)',
                },
                gap: { xs: 2.5, md: 3 },
                alignItems: 'start',
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                {selectedVideo && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {/* Player */}
                    <VideoWorkspace
                      video={selectedVideo}
                      onPlayStart={handlePlayStart}
                      onMinuteWatched={handleMinuteWatched}
                      onFullscreenChange={setIsPlayerFullscreen}
                      hasNoteContent={Boolean(noteContent.replace(/<[^>]+>/g, '').trim())}
                      notes={isPlayerFullscreen ? notesPanel : null}
                    />

                    {/* Video Info */}
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                        <Box>
                          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.3, mb: 1 }}>
                            {selectedVideo.title}
                          </Typography>
                          <Stack direction="row" spacing={1.5}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                              {selectedVideo.channel_name || selectedVideo.source_platform}
                            </Typography>
                            {formatDate(selectedVideo.published_at) && (
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                                · {formatDate(selectedVideo.published_at)}
                              </Typography>
                            )}
                          </Stack>
                        </Box>
                        <Stack direction="row" spacing={0.3} sx={{ flexShrink: 0 }}>
                          <Tooltip title={bookmarkIds.has(selectedVideo.video_id) ? 'Remove bookmark' : 'Bookmark'}>
                            <IconButton
                              onClick={() => toggleBookmark(selectedVideo)}
                              color={bookmarkIds.has(selectedVideo.video_id) ? 'primary' : 'default'}
                            >
                              {bookmarkIds.has(selectedVideo.video_id) ? <Bookmark /> : <BookmarkBorder />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={downloadIds.has(selectedVideo.video_id) ? 'Remove from downloads' : 'Save offline'}>
                            <IconButton
                              onClick={() => toggleDownload(selectedVideo)}
                              color={downloadIds.has(selectedVideo.video_id) ? 'success' : 'default'}
                            >
                              {downloadIds.has(selectedVideo.video_id) ? <DownloadDone /> : <DownloadForOffline />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Save these results as a course">
                            <IconButton onClick={handleSaveAsCourse}>
                              <PlaylistAdd />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Share">
                            <IconButton onClick={() => void handleShareVideo(selectedVideo)}>
                              <Share />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </Box>

                    {displayVideos.length > 1 && (
                      <RelatedVideosList
                        videos={displayVideos}
                        selectedVideoId={selectedVideo.video_id}
                        onVideoSelect={handleSelectVideo}
                      />
                    )}
                  </Box>
                )}
              </Box>

              <Stack spacing={2.2} sx={{ minWidth: 0 }}>
                {/* Height is bounded so the panel lines up with the player and scrolls internally */}
                <Box
                  sx={{
                    display: isPlayerFullscreen ? 'none' : 'flex',
                    minWidth: 0,
                    height: 'auto',
                  }}
                >
                  {!isPlayerFullscreen && notesPanel}
                </Box>

                <Box ref={setSavedNotesPortalTarget} />

                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 3,
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Recently Watched</Typography>
                    <Button
                      size="small"
                      onClick={() => setActiveView('history')}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', minWidth: 0, p: 0.3 }}
                    >
                      View all
                    </Button>
                  </Stack>

                  <Stack spacing={1}>
                    {history.length === 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Videos you play will appear here.
                      </Typography>
                    )}
                    {history.slice(0, 4).map(({ video }) => (
                      <Box
                        key={`recent-${video.video_id}`}
                        onClick={() => handleSelectVideo(video)}
                        sx={{
                          display: 'flex',
                          gap: 1,
                          p: 0.7,
                          borderRadius: 1.5,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: (theme) => theme.palette.action.hover },
                        }}
                      >
                        <Box
                          component="img"
                          src={video.thumbnail_url || ''}
                          alt={video.title}
                          sx={{ width: 74, height: 44, borderRadius: 1, objectFit: 'cover', bgcolor: 'grey.200' }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              lineHeight: 1.25,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {video.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                            {video.channel_name || video.source_platform}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              </Stack>
            </Box>
            )}

            {activeView === 'overview' && !loading && !error && videos.length === 0 && (
              <Paper variant="outlined" sx={{ p: { xs: 3, md: 6 }, textAlign: 'center', borderRadius: 3 }}>
                <PlayCircleOutline color="primary" sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="h6" fontWeight={700}>
                  No videos found for this topic
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  Update your skills or choose another learning category to discover more.
                </Typography>
              </Paper>
            )}
            </Box>
          </Box>
        )}
      </Container>
    </Layout>
  );
};

export default LearningPage;
