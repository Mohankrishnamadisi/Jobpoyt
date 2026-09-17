import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlock from '@tiptap/extension-code-block';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  Divider,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { KeyboardArrowDownRounded } from '@mui/icons-material';
import {
  Bold,
  Clock,
  Code2,
  Heading2,
  List,
  ListOrdered,
  PenLine,
  Redo as RedoIcon,
  Type,
  Trash2,
  Save,
  Undo as UndoIcon,
  Italic,
} from 'lucide-react';
import '@styles/tiptapEditor.css';

const LearningCodeBlock = CodeBlock.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      learningCode: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-learning-code'),
        renderHTML: (attributes) => attributes.learningCode
          ? { 'data-learning-code': attributes.learningCode }
          : {},
      },
      language: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-language'),
        renderHTML: (attributes) => attributes.language
          ? { 'data-language': attributes.language }
          : {},
      },
    };
  },
});

interface LearningEditorProps {
  content: string;
  onChange: (content: string) => void;
  onTimestamp: () => void;
  onClear: () => void;
  onSave: () => void;
  onNewChat: () => void;
  disabled?: boolean;
  isSaving?: boolean;
  lastSavedAt?: number | null;
  focusRequest?: number;
}

export const LearningEditor: React.FC<LearningEditorProps> = ({
  content,
  onChange,
  onTimestamp,
  onClear,
  onSave,
  disabled = false,
  isSaving = false,
  focusRequest = 0,
}) => {
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const lastSyncedHtml = useRef(content);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  onChangeRef.current = onChange;
  onSaveRef.current = onSave;

  /** Pushes editor HTML to the parent immediately. */
  const flush = useCallback((html: string) => {
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    lastSyncedHtml.current = html;
    onChangeRef.current(html);
  }, []);

  // Typing stays local and only reaches the page state after a pause, so the
  // heavy Learning page (player, lists) does not re-render on every keystroke.
  const scheduleFlush = useCallback((html: string) => {
    lastSyncedHtml.current = html;
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => {
      flushTimer.current = null;
      onChangeRef.current(html);
    }, 350);
  }, []);

  useEffect(
    () => () => {
      // Unmount can happen when the panel moves into the fullscreen overlay.
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
        flushTimer.current = null;
        onChangeRef.current(lastSyncedHtml.current);
      }
    },
    []
  );

  const editor = useEditor({
    extensions: [
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      StarterKit.configure({
        codeBlock: false,
        heading: {
          levels: [1, 2, 3],
        },
      }),
      LearningCodeBlock,
    ],
    content,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    onUpdate: ({ editor }) => {
      scheduleFlush(editor.getHTML());
    },
    onBlur: ({ editor }) => {
      flush(editor.getHTML());
    },
    editable: !disabled,
  });

  useEffect(() => {
    if (!editor) return;
    if (content === lastSyncedHtml.current) return;
    lastSyncedHtml.current = content;
    editor.commands.setContent(content || '', { emitUpdate: false });
  }, [content, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor || disabled || focusRequest === 0) return;
    requestAnimationFrame(() => editor.chain().focus('end').run());
  }, [disabled, editor, focusRequest]);

  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: instance }) => {
      if (!instance) return null;
      return {
        bold: instance.isActive('bold'),
        italic: instance.isActive('italic'),
        h1: instance.isActive('heading', { level: 1 }),
        h2: instance.isActive('heading', { level: 2 }),
        h3: instance.isActive('heading', { level: 3 }),
        bulletList: instance.isActive('bulletList'),
        orderedList: instance.isActive('orderedList'),
        codeBlock: instance.isActive('codeBlock'),
        color: String(instance.getAttributes('textStyle')?.color || ''),
        canUndo: instance.can().undo(),
        canRedo: instance.can().redo(),
        isEmpty: instance.isEmpty,
      };
    },
  });

  const handleSave = useCallback(() => {
    if (!editor) return;
    flush(editor.getHTML());
    // Let the flushed content land in page state before the save runs.
    setTimeout(() => onSaveRef.current(), 0);
  }, [editor, flush]);

  const applyHeading = (value: string) => {
    if (!editor) return;
    if (value === 'p') {
      editor.chain().focus().setParagraph().run();
      return;
    }
    const level = Number(value.replace('h', '')) as 1 | 2 | 3;
    editor.chain().focus().toggleHeading({ level }).run();
  };

  const isNoteEmpty = content.replace(/<[^>]+>/g, '').trim().length === 0;

  if (!editor || !toolbarState) {
    return null;
  }

  const isMarkActive = (mark: string): boolean => {
    if (mark === 'bold') return toolbarState.bold;
    if (mark === 'italic') return toolbarState.italic;
    return false;
  };

  const currentHeading = toolbarState.h1 ? 'h1' : toolbarState.h2 ? 'h2' : toolbarState.h3 ? 'h3' : 'p';

  const colorOptions = ['#0f172a', '#1d4ed8', '#065f46', '#b91c1c', '#7e22ce'];
  const currentColor = toolbarState.color;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 430,
        borderRadius: 2.5,
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
        bgcolor: '#fff',
        boxShadow: '0 6px 20px rgba(15, 35, 63, 0.05)',
      }}
    >
      {/* Toolbar */}
      <Paper
        elevation={0}
        sx={{
          order: 2,
          px: 1,
          py: 0.75,
          borderRadius: 0,
          borderTop: '1px solid #E2E8F0',
          bgcolor: '#F8FAFC',
          display: 'flex',
          gap: 0.25,
          rowGap: 0.5,
          overflowX: 'hidden',
          flexWrap: 'wrap',
          alignItems: 'center',
          '& .MuiIconButton-root': {
            width: 30,
            height: 30,
            flexShrink: 0,
            borderRadius: 1.25,
            color: '#475569',
            '&:hover': { bgcolor: '#EFF6FF', color: '#1D4ED8' },
          },
        }}
      >
        <Tooltip title="Undo">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={disabled || !toolbarState.canUndo}
          >
            <UndoIcon size={16} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Redo">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={disabled || !toolbarState.canRedo}
          >
            <RedoIcon size={16} />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" sx={{ height: 24, mx: 0.45, borderColor: '#CBD5E1' }} />

        <FormControl size="small" sx={{ minWidth: 108, flexShrink: 0 }}>
          <Select
            value={currentHeading}
            onChange={(e) => applyHeading(e.target.value)}
            disabled={disabled}
            IconComponent={KeyboardArrowDownRounded}
            sx={{
              height: 30,
              fontSize: '0.74rem',
              fontWeight: 650,
              color: '#334155',
              borderRadius: 1.25,
              bgcolor: '#fff',
              '& .MuiSelect-select': { py: 0.4, pl: 1.1, pr: '26px !important' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' },
              '& .MuiSelect-icon': { fontSize: 18, right: 5, top: '50%', transform: 'translateY(-50%)', color: '#64748B' },
              '& .MuiSelect-iconOpen': { transform: 'translateY(-50%) rotate(180deg)' },
            }}
          >
            <MenuItem value="p">Paragraph</MenuItem>
            <MenuItem value="h1">Header 1</MenuItem>
            <MenuItem value="h2">Header 2</MenuItem>
            <MenuItem value="h3">Header 3</MenuItem>
          </Select>
        </FormControl>

        <Divider orientation="vertical" sx={{ height: 24, mx: 0.45, borderColor: '#CBD5E1' }} />

        <Tooltip title="Bold">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={disabled}
            sx={{
              bgcolor: isMarkActive('bold') ? '#DBEAFE' : 'transparent',
              color: isMarkActive('bold') ? '#1D4ED8' : '#475569',
              '&:hover': {
                bgcolor: '#DBEAFE',
              },
            }}
          >
            <Bold size={16} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Italic">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={disabled}
            sx={{
              bgcolor: isMarkActive('italic') ? '#DBEAFE' : 'transparent',
              color: isMarkActive('italic') ? '#1D4ED8' : '#475569',
              '&:hover': {
                bgcolor: '#DBEAFE',
              },
            }}
          >
            <Italic size={16} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Header Quick">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            disabled={disabled}
            sx={{
              bgcolor: toolbarState.h2 ? '#DBEAFE' : 'transparent',
              color: toolbarState.h2 ? '#1D4ED8' : '#475569',
            }}
          >
            <Heading2 size={16} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Bullet List">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={disabled}
            sx={{
              bgcolor: toolbarState.bulletList ? '#DBEAFE' : 'transparent',
              color: toolbarState.bulletList ? '#1D4ED8' : '#475569',
              '&:hover': {
                bgcolor: '#DBEAFE',
              },
            }}
          >
            <List size={16} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Ordered List">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={disabled}
            sx={{
              bgcolor: toolbarState.orderedList ? '#DBEAFE' : 'transparent',
              color: toolbarState.orderedList ? '#1D4ED8' : '#475569',
              '&:hover': {
                bgcolor: '#DBEAFE',
              },
            }}
          >
            <ListOrdered size={16} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Code Block">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleCodeBlock({ learningCode: 'true', language: 'javascript' }).run()}
            disabled={disabled}
            sx={{
              bgcolor: toolbarState.codeBlock ? '#DBEAFE' : 'transparent',
              color: toolbarState.codeBlock ? '#1D4ED8' : '#475569',
            }}
          >
            <Code2 size={16} />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" sx={{ height: 24, mx: 0.45, borderColor: '#CBD5E1' }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <Type size={14} color="#64748b" />
          {colorOptions.map((color) => (
            <Tooltip title={`Text color ${color}`} key={color}>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().setColor(color).run()}
                disabled={disabled}
                sx={{
                  width: '22px !important',
                  height: '22px !important',
                  p: 0,
                  border: `2px solid ${currentColor === color ? '#1d4ed8' : 'transparent'}`,
                }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: color,
                    border: '1px solid rgba(148,163,184,0.4)',
                  }}
                />
              </IconButton>
            </Tooltip>
          ))}
          <Tooltip title="Reset color">
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().unsetColor().run()}
              disabled={disabled}
            >
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: 'text.secondary' }}>Aa</Typography>
            </IconButton>
          </Tooltip>
        </Box>

        <Divider orientation="vertical" sx={{ height: 24, mx: 0.45, borderColor: '#CBD5E1' }} />

        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.35 }}>
          <Tooltip title="Add Timestamp">
            <IconButton
              size="small"
              onClick={onTimestamp}
              disabled={disabled}
              sx={{ color: '#2563EB' }}
            >
              <Clock size={16} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Clear Note">
            <IconButton
              size="small"
              onClick={onClear}
              disabled={disabled || isSaving || isNoteEmpty}
              sx={{ color: 'error.main' }}
            >
              <Trash2 size={16} />
            </IconButton>
          </Tooltip>

          <Button
            size="small"
            variant="contained"
            startIcon={<Save size={13} />}
            onClick={handleSave}
            disabled={disabled || isSaving || isNoteEmpty}
            sx={{ minWidth: 0, height: 28, px: 1, color: '#071D35', bgcolor: '#D6A73A', fontSize: '0.66rem', fontWeight: 800, whiteSpace: 'nowrap', boxShadow: 'none', '& .MuiButton-startIcon': { mr: 0.45 }, '&:hover': { bgcolor: '#F4C95D', boxShadow: 'none' } }}
          >
            {isSaving ? 'Saving...' : 'Save Note'}
          </Button>
        </Box>
      </Paper>

      {/* Editor Content */}
      <Box
        sx={{
          order: 1,
          flex: 1,
          position: 'relative',
          minHeight: 300,
          overflow: 'auto',
          p: { xs: 2, sm: 2.5 },
          bgcolor: '#fff',
          '& .ProseMirror': {
            outline: 'none',
            minHeight: 270,
            color: '#10233F',
            fontSize: '0.94rem',
            '& h2': {
              fontSize: '1.25rem',
              fontWeight: 700,
              margin: '0.5rem 0',
              lineHeight: 1.4,
            },
            '& h1': {
              fontSize: '1.5rem',
              fontWeight: 800,
              margin: '0.6rem 0',
              lineHeight: 1.3,
            },
            '& h3': {
              fontSize: '1.1rem',
              fontWeight: 700,
              margin: '0.45rem 0',
              lineHeight: 1.35,
            },
            '& p': {
              margin: '0.5rem 0',
              lineHeight: 1.75,
            },
            '& ul, & ol': {
              paddingLeft: '1.5rem',
              margin: '0.5rem 0',
            },
            '& li': {
              margin: '0.25rem 0',
              lineHeight: 1.6,
            },
          },
        }}
      >
        <EditorContent editor={editor} />
        {toolbarState.isEmpty && (
          <Box
            sx={{
              position: 'absolute',
              inset: { xs: '62px 18px auto', sm: '72px 24px auto' },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              pointerEvents: 'none',
              color: '#64748B',
            }}
          >
            <Box sx={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 2, color: '#D6A73A', bgcolor: '#FFF8E7', border: '1px solid rgba(214,167,58,0.28)' }}>
              <PenLine size={21} />
            </Box>
            <Typography sx={{ mt: 1.2, color: '#10233F', fontWeight: 800, fontSize: '0.95rem' }}>
              Start writing your notes...
            </Typography>
            <Typography sx={{ mt: 0.45, maxWidth: 390, fontSize: '0.75rem', lineHeight: 1.5 }}>
              Take notes, highlight key points, add code snippets, and save your learning journey.
            </Typography>
            <Stack direction="row" useFlexGap flexWrap="wrap" justifyContent="center" gap={0.65} sx={{ mt: 1.2 }}>
              {['Capture key concepts', 'Add code snippets', 'Save important points'].map((suggestion) => (
                <Chip key={suggestion} size="small" label={suggestion} sx={{ height: 24, color: '#475569', fontSize: '0.65rem', bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }} />
              ))}
            </Stack>
          </Box>
        )}
      </Box>

    </Box>
  );
};
