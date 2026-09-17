import React, { useCallback, useEffect, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { Box, Button, Chip, MenuItem, Select, Stack, Typography } from '@mui/material';
import { Check, Clipboard, Code2, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  CODE_LANGUAGES,
  type LearningCodeLanguage,
  readLearningCodeSnippet,
  writeLearningCodeSnippet,
} from '@utils/learningCodeNote';

interface LearningCodeEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  disabled?: boolean;
  isSaving?: boolean;
}

const languageExtension = (language: LearningCodeLanguage) => {
  if (language === 'typescript') return javascript({ typescript: true });
  if (language === 'jsx' || language === 'react') return javascript({ jsx: true });
  if (language === 'tsx') return javascript({ jsx: true, typescript: true });
  if (language === 'html' || language === 'vue') return html();
  if (language === 'css' || language === 'scss') return css();
  if (language === 'json') return json();
  if (language === 'python') return python();
  if (language === 'java') return java();
  if (language === 'sql') return sql();
  return javascript();
};

export const LearningCodeEditor: React.FC<LearningCodeEditorProps> = ({
  content,
  onChange,
  onSave,
  disabled = false,
  isSaving = false,
}) => {
  const initialSnippet = readLearningCodeSnippet(content);
  const [code, setCode] = useState(initialSnippet.code);
  const [language, setLanguage] = useState<LearningCodeLanguage>(initialSnippet.language);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseContent = useRef(content);
  const latestCode = useRef(code);
  const latestLanguage = useRef(language);
  const latestContent = useRef(content);

  useEffect(() => {
    if (content === baseContent.current) return;
    baseContent.current = content;
    latestContent.current = content;
    const snippet = readLearningCodeSnippet(content);
    latestCode.current = snippet.code;
    latestLanguage.current = snippet.language;
    setCode(snippet.code);
    setLanguage(snippet.language);
  }, [content]);

  const flush = useCallback((nextCode = latestCode.current, nextLanguage = latestLanguage.current) => {
    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
      syncTimer.current = null;
    }
    const nextContent = writeLearningCodeSnippet(baseContent.current, {
      code: nextCode,
      language: nextLanguage,
    });
    baseContent.current = nextContent;
    latestContent.current = nextContent;
    onChange(nextContent);
  }, [onChange]);

  useEffect(() => () => {
    if (!syncTimer.current) return;
    clearTimeout(syncTimer.current);
    const nextContent = writeLearningCodeSnippet(baseContent.current, {
      code: latestCode.current,
      language: latestLanguage.current,
    });
    if (nextContent !== latestContent.current) onChange(nextContent);
  }, [onChange]);

  const scheduleSync = useCallback((nextCode: string, nextLanguage: LearningCodeLanguage) => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => flush(nextCode, nextLanguage), 350);
  }, [flush]);

  const handleCodeChange = (value: string) => {
    latestCode.current = value;
    setCode(value);
    scheduleSync(value, latestLanguage.current);
  };

  const handleLanguageChange = (nextLanguage: LearningCodeLanguage) => {
    latestLanguage.current = nextLanguage;
    setLanguage(nextLanguage);
    flush(latestCode.current, nextLanguage);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    toast.success('Code copied');
  };

  const handleClear = () => {
    latestCode.current = '';
    setCode('');
    flush('', latestLanguage.current);
  };

  const handleSave = () => {
    flush();
    setTimeout(onSave, 0);
  };

  return (
    <Box sx={{ overflow: 'hidden', borderRadius: 2.5, border: '1px solid #243244', bgcolor: '#0B1220' }}>
      <Stack direction="row" alignItems="center" gap={1} sx={{ px: 1.25, py: 0.9, bgcolor: '#111827', borderBottom: '1px solid #243244' }}>
        <Stack direction="row" alignItems="center" gap={0.65} sx={{ color: '#E5E7EB', minWidth: 0 }}>
          <Code2 size={15} color="#F4C95D" />
          <Typography sx={{ fontSize: '0.74rem', fontWeight: 800, whiteSpace: 'nowrap' }}>Code Snippet</Typography>
        </Stack>

        <Select
          size="small"
          value={language}
          onChange={(event) => handleLanguageChange(event.target.value as LearningCodeLanguage)}
          disabled={disabled}
          MenuProps={{
            slotProps: {
              paper: {
                sx: {
                  bgcolor: '#111827',
                  color: '#fff',
                  border: '1px solid #334155',
                  '& .MuiMenuItem-root': { color: '#fff' },
                  '& .MuiMenuItem-root.Mui-selected': { bgcolor: 'rgba(214,167,58,0.2)' },
                },
              },
            },
          }}
          sx={{ ml: 0.5, height: 30, minWidth: 112, color: '#fff', fontSize: '0.7rem', bgcolor: 'transparent !important', '& .MuiSelect-select': { color: '#fff', bgcolor: 'transparent !important' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#64748B' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#D6A73A' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#D6A73A' }, '& .MuiSvgIcon-root': { color: '#fff' } }}
        >
          {CODE_LANGUAGES.map((option) => (
            <MenuItem key={option.value} value={option.value} sx={{ fontSize: '0.78rem' }}>
              {option.label}
            </MenuItem>
          ))}
        </Select>

        <Button
          size="small"
          startIcon={<Clipboard size={13} />}
          onClick={() => void handleCopy()}
          disabled={!code}
          sx={{ ml: 'auto', minWidth: 0, color: '#CBD5E1', fontSize: '0.68rem' }}
        >
          Copy
        </Button>
      </Stack>

      {!code && (
        <Box sx={{ px: 1.5, py: 1.1, borderBottom: '1px solid #243244', bgcolor: '#0F172A' }}>
          <Typography sx={{ color: '#E5E7EB', fontSize: '0.76rem', fontWeight: 700 }}>Start coding your notes...</Typography>
          <Typography sx={{ mt: 0.2, color: '#94A3B8', fontSize: '0.68rem' }}>Practice concepts from the video and save your code here.</Typography>
          <Stack direction="row" gap={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.8 }}>
            {(['javascript', 'typescript', 'react', 'python', 'sql'] as LearningCodeLanguage[]).map((value) => (
              <Chip
                key={value}
                size="small"
                label={CODE_LANGUAGES.find((option) => option.value === value)?.label}
                onClick={() => handleLanguageChange(value)}
                sx={{ height: 22, color: value === language ? '#071D35' : '#CBD5E1', fontSize: '0.64rem', bgcolor: value === language ? '#F4C95D' : '#1E293B' }}
              />
            ))}
          </Stack>
        </Box>
      )}

      <CodeMirror
        value={code}
        height="360px"
        theme={oneDark}
        extensions={[languageExtension(language)]}
        onChange={handleCodeChange}
        editable={!disabled}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          indentOnInput: true,
        }}
        style={{ fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace", fontSize: '13px' }}
      />

      <Stack direction="row" justifyContent="flex-end" gap={0.7} sx={{ p: 0.8, borderTop: '1px solid #243244', bgcolor: '#111827' }}>
        <Button size="small" startIcon={<Trash2 size={13} />} onClick={handleClear} disabled={disabled || !code} sx={{ color: '#CBD5E1', fontSize: '0.66rem' }}>
          Clear Code
        </Button>
        <Button size="small" variant="contained" startIcon={isSaving ? <Check size={13} /> : <Save size={13} />} onClick={handleSave} disabled={disabled || isSaving} sx={{ color: '#071D35', bgcolor: '#D6A73A', fontSize: '0.66rem', fontWeight: 800, boxShadow: 'none', '&:hover': { bgcolor: '#F4C95D', boxShadow: 'none' } }}>
          {isSaving ? 'Saving...' : 'Save Note'}
        </Button>
      </Stack>
    </Box>
  );
};