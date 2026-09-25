import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Collapse, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, Grid, IconButton, InputLabel, LinearProgress, Menu, MenuItem,
  Paper, Select, Stack, Switch, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  Add as AddIcon, AutoAwesome as AiIcon, Close as CloseIcon, ContentCopy as CopyIcon,
  DeleteOutline as DeleteIcon, Download as DownloadIcon, FileUpload as UploadIcon,
  MoreVert as MoreIcon, PersonOutline as ProfileIcon, Print as PrintIcon, TrackChanges as TargetIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';
import { supabase } from '@services/supabase';
import { resumeBuilderService, type ResumeData, type ResumeRecord, type ResumeTemplate } from '@services/resumeBuilder';

type SectionKey = 'personal' | 'summary' | 'experience' | 'skills' | 'education' | 'projects' | 'certifications' | 'custom' | 'analysis';
const EMPTY_DATA: ResumeData = {
  personal: { fullName: '', title: '', email: '', phone: '', location: '', linkedin: '', github: '', portfolio: '' },
  summary: '', experience: [], skills: [], education: [], projects: [], certifications: [], customSections: [],
};
const templates: Array<{ value: ResumeTemplate; label: string }> = [
  { value: 'professional', label: 'Professional' }, { value: 'modern', label: 'Modern' },
  { value: 'executive', label: 'Executive' }, { value: 'minimal', label: 'Minimal' }, { value: 'technical', label: 'Technical' },
];
const sections: Array<{ id: SectionKey; label: string }> = [
  { id: 'personal', label: 'Personal' }, { id: 'summary', label: 'Summary' }, { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' }, { id: 'education', label: 'Education' }, { id: 'projects', label: 'Projects' },
  { id: 'certifications', label: 'Certifications' }, { id: 'custom', label: 'Other sections' }, { id: 'analysis', label: 'AI analysis' },
];
const cardSx = { border: '1px solid #E2E8F0', borderRadius: 2, boxShadow: '0 2px 8px rgba(15,23,42,0.035)' };
const safeFileName = (value: string) => (value || 'Resume').replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '');

const ResumePreview: React.FC<{ data: ResumeData; template: ResumeTemplate; atsFriendly: boolean }> = ({ data, template, atsFriendly }) => {
  const accent = template === 'executive' ? '#17365D' : template === 'technical' ? '#0F4C81' : template === 'modern' && !atsFriendly ? '#2563EB' : '#1E293B';
  const sectionSx = { mb: 1.5, '& h3': { m: 0, mb: 0.55, pb: 0.35, borderBottom: `1px solid ${template === 'minimal' ? '#E2E8F0' : accent}`, color: accent, fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase' as const }, '& p': { m: 0, fontSize: 9, lineHeight: 1.45, color: '#334155' } };
  const hasContact = Object.values(data.personal).some(Boolean);
  return (
    <Paper id="resume-preview" elevation={0} sx={{ width: '100%', maxWidth: 410, minHeight: 520, mx: 'auto', p: { xs: 2.5, sm: 3.5 }, aspectRatio: '210 / 297', bgcolor: '#FFFFFF', color: '#172033', borderRadius: 0.5, boxShadow: '0 12px 34px rgba(15,23,42,0.16)', overflow: 'hidden', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <Box sx={{ borderTop: template === 'minimal' ? 'none' : `4px solid ${accent}`, pt: template === 'minimal' ? 0 : 1.1, mb: 1.5, textAlign: template === 'modern' && !atsFriendly ? 'center' : 'left' }}>
        <Typography sx={{ color: accent, fontWeight: 800, fontSize: 21, lineHeight: 1.1 }}>{data.personal.fullName || 'Your Name'}</Typography>
        <Typography sx={{ mt: 0.35, fontSize: 10, fontWeight: 600, color: '#475569' }}>{data.personal.title || 'Professional Title'}</Typography>
        {hasContact ? <Typography sx={{ mt: 0.6, fontSize: 8, lineHeight: 1.5, color: '#64748B', overflowWrap: 'anywhere' }}>{[data.personal.email, data.personal.phone, data.personal.location, data.personal.linkedin, data.personal.github, data.personal.portfolio].filter(Boolean).join('  |  ')}</Typography> : null}
      </Box>
      {data.summary ? <Box sx={sectionSx}><Typography component="h3">Professional Summary</Typography><Typography component="p">{data.summary}</Typography></Box> : null}
      {data.experience.length ? <Box sx={sectionSx}><Typography component="h3">Experience</Typography>{data.experience.map((item, index) => <Box key={`${item.company}-${index}`} sx={{ mb: 0.8 }}><Typography sx={{ fontSize: 9, fontWeight: 700, color: '#172033' }}>{[item.title, item.company].filter(Boolean).join(' | ') || 'Position'}</Typography><Typography sx={{ fontSize: 8, color: '#64748B' }}>{[item.location, [item.startDate, item.current ? 'Present' : item.endDate].filter(Boolean).join(' - ')].filter(Boolean).join(' | ')}</Typography>{item.bullets.filter(Boolean).map((bullet, bulletIndex) => <Typography key={bulletIndex} component="p" sx={{ pl: 1, mt: 0.2 }}>• {bullet}</Typography>)}</Box>)}</Box> : null}
      {data.skills.length ? <Box sx={sectionSx}><Typography component="h3">Skills</Typography><Typography component="p">{data.skills.join('  •  ')}</Typography></Box> : null}
      {data.education.length ? <Box sx={sectionSx}><Typography component="h3">Education</Typography>{data.education.map((item, index) => <Box key={index} sx={{ mb: 0.5 }}><Typography sx={{ fontSize: 9, fontWeight: 700 }}>{[item.degree, item.institution].filter(Boolean).join(' | ')}</Typography><Typography sx={{ fontSize: 8, color: '#64748B' }}>{[item.location, item.startDate && item.endDate ? `${item.startDate} - ${item.endDate}` : item.endDate || item.startDate, item.grade].filter(Boolean).join(' | ')}</Typography></Box>)}</Box> : null}
      {data.projects.length ? <Box sx={sectionSx}><Typography component="h3">Projects</Typography>{data.projects.map((item, index) => <Box key={index} sx={{ mb: 0.7 }}><Typography sx={{ fontSize: 9, fontWeight: 700 }}>{[item.name, item.role].filter(Boolean).join(' | ')}</Typography>{item.description ? <Typography component="p">{item.description}</Typography> : null}{item.technologies.length ? <Typography sx={{ fontSize: 8, color: '#64748B' }}>{item.technologies.join(', ')}</Typography> : null}</Box>)}</Box> : null}
      {data.certifications.length ? <Box sx={sectionSx}><Typography component="h3">Certifications</Typography>{data.certifications.map((item, index) => <Typography key={index} component="p">{[item.name, item.issuer, item.issueDate].filter(Boolean).join(' | ')}</Typography>)}</Box> : null}
      {data.customSections.map((section, index) => section.items.length ? <Box key={index} sx={sectionSx}><Typography component="h3">{section.title || 'Additional Information'}</Typography>{section.items.map((item, itemIndex) => <Typography key={itemIndex} component="p">• {item}</Typography>)}</Box> : null)}
    </Paper>
  );
};

export const ResumeStudio: React.FC = () => {
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [resume, setResume] = useState<ResumeRecord | null>(null);
  const [resumeVariant, setResumeVariant] = useState<'master' | 'tailored'>('master');
  const [data, setData] = useState<ResumeData>(EMPTY_DATA);
  const [screen, setScreen] = useState<'home' | 'studio'>('home');
  const [section, setSection] = useState<SectionKey>('personal');
  const [studioTab, setStudioTab] = useState<'resume' | 'cover'>('resume');
  const [buildAvailable, setBuildAvailable] = useState(true);
  const [missingProfileInfo, setMissingProfileInfo] = useState<string[]>([]);
  const [template, setTemplate] = useState<ResumeTemplate>('professional');
  const [atsFriendly, setAtsFriendly] = useState(true);
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeName, setResumeName] = useState('');
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [dailyLimit, setDailyLimit] = useState(false);
  const [showTailorForm, setShowTailorForm] = useState(false);
  const [tailorJobsLoading, setTailorJobsLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [target, setTarget] = useState({ jobId: '', title: '', company: '', description: '' });
  const [targetResumeId, setTargetResumeId] = useState('');
  const [confirmTailoring, setConfirmTailoring] = useState(false);
  const [tailoringExisting, setTailoringExisting] = useState(false);
  const [jobs, setJobs] = useState<Array<{ id: string; title: string; company_name: string; description: string }>>([]);
  const [aiBusy, setAiBusy] = useState('');
  const [analysis, setAnalysis] = useState<ResumeRecord['ats_analysis']>(null);
  const [skillsInput, setSkillsInput] = useState('');
  const [skillsGroups, setSkillsGroups] = useState<Array<{ name: string; skills: string[] }>>([]);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [bulletTarget, setBulletTarget] = useState<{ experienceIndex: number; bulletIndex: number } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const dirtyRef = useRef(false);
  const saveSequence = useRef(0);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await resumeBuilderService.load();
      setResumes(result.resumes || []);
      setBuildAvailable(result.buildAvailable);
      setMissingProfileInfo(result.missingProfileInfo || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Resume Studio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    if (screen !== 'studio' || !resume || !dirtyRef.current) return undefined;
    const timer = window.setTimeout(async () => {
      const sequence = ++saveSequence.current;
      dirtyRef.current = false;
      setSaveState('saving');
      try {
        const result = await resumeBuilderService.save(resume.id, data, { name: resumeName, template, atsFriendly, coverLetter, target, atsAnalysis: analysis, variant: resumeVariant });
        setResume(result.resume);
        setResumes((current) => current.map((item) => item.id === resume.id ? result.resume : item));
        if (sequence === saveSequence.current) setSaveState('saved');
      } catch (saveError) {
        dirtyRef.current = true;
        if (sequence === saveSequence.current) setSaveState('error');
        console.error('Resume autosave failed', saveError instanceof Error ? saveError.message : 'unknown error');
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [screen, resume, resumeVariant, data, resumeName, template, atsFriendly, coverLetter, target, analysis]);

  const updateData = (update: (current: ResumeData) => ResumeData) => {
    dirtyRef.current = true;
    setData(update);
  };
  const openStudio = (item: ResumeRecord, variant: 'master' | 'tailored' = 'master') => {
    dirtyRef.current = false;
    setResume(item);
    setResumeVariant(variant);
    setData((variant === 'tailored' ? item.tailored_resume_data : item.resume_data) || EMPTY_DATA);
    setTemplate(item.template || 'professional');
    setAtsFriendly(item.ats_friendly !== false);
    setCoverLetter(item.cover_letter || '');
    setResumeName(variant === 'tailored' ? item.tailored_version_name || `${item.target_job_title || 'Tailored'} Resume` : item.version_name || item.name || 'Professional Resume');
    setAnalysis((variant === 'tailored' ? item.tailored_ats_analysis : item.ats_analysis) || null);
    setTarget(variant === 'tailored' ? { jobId: item.target_job_id || '', title: item.target_job_title || '', company: item.target_company || '', description: item.target_job_description || '' } : { jobId: '', title: '', company: '', description: '' });
    setScreen('studio');
    setSection('personal');
    setError('');
  };

  const createResume = async (source: 'profile' | 'upload' | 'tailor') => {
    if (source === 'upload' && !uploadFile) { setError('Choose a PDF or DOCX file first.'); return; }
    if (source === 'tailor' && !target.description.trim()) { setError('Select a JobPoyt job or paste its job description first.'); return; }
    setCreating(true);
    setError('');
    setDailyLimit(false);
    try {
      let resumeText = '';
      if (source === 'upload' && uploadFile) {
        const extension = uploadFile.name.split('.').pop()?.toLowerCase();
        if (uploadFile.size > 8 * 1024 * 1024) throw new Error('Resume files must be smaller than 8 MB.');
        if (extension === 'docx') {
          const { default: mammoth } = await import('mammoth/mammoth.browser');
          const extracted = await mammoth.extractRawText({ arrayBuffer: await uploadFile.arrayBuffer() });
          resumeText = extracted.value.trim();
        } else if (extension === 'pdf') {
          const pdfjs = await import('pdfjs-dist');
          const { default: pdfWorker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
          pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
          const pdf = await pdfjs.getDocument({ data: new Uint8Array(await uploadFile.arrayBuffer()) }).promise;
          const pages: string[] = [];
          for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 25); pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();
            pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
          }
          resumeText = pages.join('\n').trim();
        } else {
          throw new Error('Choose a PDF or DOCX file.');
        }
      }
      const result = await resumeBuilderService.create(source, template, {
        ...(source === 'upload' ? { resumeText } : {}),
        ...(source === 'tailor' ? { target: { jobId: target.jobId, title: target.title, company: target.company, description: target.description }, resumeId: targetResumeId } : {}),
      });
      setBuildAvailable(false);
      setResumes((current) => [result.resume, ...current]);
      setUploadFile(null);
      openStudio(result.resume);
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Unable to create your resume. Please try again.';
      if (message.includes('already been used') || message.includes('DAILY_BUILD_USED')) {
        setDailyLimit(true);
        setBuildAvailable(false);
        void refresh();
      } else setError(message);
    } finally {
      setCreating(false);
    }
  };

  const tailorExisting = async () => {
    if (!targetResumeId || !target.description.trim() || tailoringExisting) return;
    setTailoringExisting(true);
    setError('');
    try {
      const result = await resumeBuilderService.tailorExisting(targetResumeId, { jobId: target.jobId, title: target.title, company: target.company, description: target.description });
      setResumes((current) => current.map((item) => item.id === result.resume.id ? result.resume : item));
      setConfirmTailoring(false);
      openStudio(result.resume, 'tailored');
    } catch (tailorError) {
      setError(tailorError instanceof Error ? tailorError.message : 'Unable to tailor this resume. Please try again.');
    } finally {
      setTailoringExisting(false);
    }
  };

  const openTailor = async () => {
    setTarget({ jobId: '', title: '', company: '', description: '' });
    setTargetResumeId(resumes[0]?.id || '');
    setShowTailorForm(true);
    setScreen('home');
    window.setTimeout(() => document.getElementById('resume-tailor-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
    setTailorJobsLoading(true);
    try {
      const { data: rows, error: jobsError } = await supabase.from('jobs').select('id,title,company_name,description').eq('status', 'published').order('created_at', { ascending: false }).limit(100);
      if (!jobsError) setJobs((rows || []) as typeof jobs);
    } catch { /* Pasted job descriptions remain available when job browsing is unavailable. */ }
    finally { setTailorJobsLoading(false); }
  };

  const runAi = async (action: string, options: { value?: string; style?: string; jobDescription?: string } = {}) => {
    if (aiBusy) return null;
    setAiBusy(action);
    setError('');
    try {
      return await resumeBuilderService.ai(action, data, { ...options, target: { title: target.title, company: target.company, description: target.description }, jobDescription: options.jobDescription || target.description });
    } catch (aiError) {
      setError(aiError instanceof Error ? aiError.message : 'Unable to complete that AI action. Please try again.');
      return null;
    } finally {
      setAiBusy('');
    }
  };

  const improveBullet = async (style: string) => {
    if (!bulletTarget) return;
    const current = data.experience[bulletTarget.experienceIndex]?.bullets[bulletTarget.bulletIndex] || '';
    const result = await runAi('improve_bullet', { value: current, style });
    if (result?.value) updateData((previous) => ({ ...previous, experience: previous.experience.map((item, index) => index === bulletTarget.experienceIndex ? { ...item, bullets: item.bullets.map((bullet, bulletIndex) => bulletIndex === bulletTarget.bulletIndex ? String(result.value) : bullet) } : item) }));
    setMenuAnchor(null);
  };

  const generateBullet = async () => {
    if (!bulletTarget) return;
    const current = data.experience[bulletTarget.experienceIndex]?.bullets[bulletTarget.bulletIndex] || '';
    const result = await runAi('generate_bullet', { value: current });
    if (result?.value) updateData((previous) => ({ ...previous, experience: previous.experience.map((item, index) => index === bulletTarget.experienceIndex ? { ...item, bullets: item.bullets.map((bullet, bulletIndex) => bulletIndex === bulletTarget.bulletIndex ? String(result.value) : bullet) } : item) }));
    setMenuAnchor(null);
  };

  const runAnalysis = async () => {
    const result = await runAi('analyze_resume', { jobDescription: target.description });
    if (result?.analysis) {
      setAnalysis(result.analysis);
      setSection('analysis');
      dirtyRef.current = true;
      setResume((current) => current ? (resumeVariant === 'tailored' ? { ...current, tailored_ats_analysis: result.analysis } : { ...current, ats_analysis: result.analysis }) : current);
    }
  };

  const addSkill = () => {
    const skill = skillsInput.trim();
    if (!skill || data.skills.some((item) => item.toLowerCase() === skill.toLowerCase())) return;
    updateData((current) => ({ ...current, skills: [...current.skills, skill] }));
    setSkillsInput('');
  };

  const setTemplateValue = (value: ResumeTemplate) => {
    setTemplate(value);
    dirtyRef.current = true;
  };
  const setCoverValue = (value: string) => { dirtyRef.current = true; setCoverLetter(value); };
  const setNameValue = (value: string) => { dirtyRef.current = true; setResumeName(value); };

  const printResume = () => {
    const targetWindow = window.open('', '_blank');
    if (!targetWindow) { setError('Allow pop-ups to print or download your resume as PDF.'); return; }
    const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
    const list = (items: string[]) => items.filter(Boolean).map((item) => `<li>${escape(item)}</li>`).join('');
    const printAccent = template === 'executive' ? '#17365D' : template === 'technical' ? '#0F4C81' : template === 'modern' && !atsFriendly ? '#2563EB' : '#1E293B';
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escape(resumeName || 'Resume')}</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font:10pt Arial,Helvetica,sans-serif;color:#172033;line-height:1.45}h1{font-size:21pt;margin:0;color:#17365d}h2{font-size:10pt;color:#17365d;text-transform:uppercase;border-bottom:1px solid #64748b;padding-bottom:3px;margin:16px 0 6px}h3{font-size:10pt;margin:6px 0 1px}p{margin:2px 0}ul{padding-left:16px;margin:4px 0}small{color:#64748b}</style></head><body><h1>${escape(data.personal.fullName || 'Your Name')}</h1><p><b>${escape(data.personal.title)}</b></p><small>${escape([data.personal.email,data.personal.phone,data.personal.location,data.personal.linkedin,data.personal.github,data.personal.portfolio].filter(Boolean).join(' | '))}</small>${data.summary ? `<h2>Professional Summary</h2><p>${escape(data.summary)}</p>` : ''}${data.experience.length ? `<h2>Experience</h2>${data.experience.map((item) => `<h3>${escape([item.title,item.company].filter(Boolean).join(' | '))}</h3><small>${escape([item.location,[item.startDate,item.current?'Present':item.endDate].filter(Boolean).join(' - ')].filter(Boolean).join(' | '))}</small><ul>${list(item.bullets)}</ul>`).join('')}` : ''}${data.skills.length ? `<h2>Skills</h2><p>${escape(data.skills.join(' | '))}</p>` : ''}${data.education.length ? `<h2>Education</h2>${data.education.map((item) => `<p><b>${escape([item.degree,item.institution].filter(Boolean).join(' | '))}</b><br><small>${escape([item.location,item.startDate,item.endDate,item.grade].filter(Boolean).join(' | '))}</small></p>`).join('')}` : ''}${data.projects.length ? `<h2>Projects</h2>${data.projects.map((item) => `<p><b>${escape(item.name)}</b> ${escape(item.role)}<br>${escape(item.description)}<br><small>${escape(item.technologies.join(', '))}</small></p>`).join('')}` : ''}${data.certifications.length ? `<h2>Certifications</h2><ul>${list(data.certifications.map((item) => [item.name,item.issuer,item.issueDate].filter(Boolean).join(' | ')))}</ul>` : ''}${data.customSections.map((item) => `<h2>${escape(item.title)}</h2><ul>${list(item.items)}</ul>`).join('')}<script>window.onload=()=>window.print()</script></body></html>`;
    targetWindow.document.write(html.replace(/#17365d/g, printAccent));
    targetWindow.document.close();
  };

  const copyCoverLetter = async () => {
    await navigator.clipboard.writeText(coverLetter);
    setError('Cover letter copied to clipboard.');
  };

  const loadExisting = (id: string) => {
    const found = resumes.find((item) => item.id === id);
    if (found) openStudio(found);
  };

  const switchVariant = (variant: 'master' | 'tailored') => {
    if (!resume) return;
    dirtyRef.current = false;
    setResumeVariant(variant);
    setData((variant === 'tailored' ? resume.tailored_resume_data : resume.resume_data) || EMPTY_DATA);
    setResumeName(variant === 'tailored' ? resume.tailored_version_name || 'Tailored Resume' : resume.version_name || resume.name);
    setAnalysis((variant === 'tailored' ? resume.tailored_ats_analysis : resume.ats_analysis) || null);
    setTarget(variant === 'tailored' ? { jobId: resume.target_job_id || '', title: resume.target_job_title || '', company: resume.target_company || '', description: resume.target_job_description || '' } : { jobId: '', title: '', company: '', description: '' });
  };

  const renderEditor = () => {
    if (studioTab === 'cover') return (
      <Stack spacing={1.2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 750 }}>Cover Letter</Typography>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Target role" value={target.title} onChange={(event) => { dirtyRef.current = true; setTarget((current) => ({ ...current, title: event.target.value })); }} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Company" value={target.company} onChange={(event) => { dirtyRef.current = true; setTarget((current) => ({ ...current, company: event.target.value })); }} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={3} size="small" label="Job description" value={target.description} onChange={(event) => { dirtyRef.current = true; setTarget((current) => ({ ...current, description: event.target.value })); }} /></Grid>
        </Grid>
        <TextField fullWidth multiline minRows={10} label="Cover letter" value={coverLetter} onChange={(event) => setCoverValue(event.target.value)} />
        <Stack direction="row" gap={0.8} flexWrap="wrap">
          <Button size="small" variant="contained" startIcon={aiBusy === 'generate_cover_letter' ? <CircularProgress size={14} color="inherit" /> : <AiIcon />} disabled={Boolean(aiBusy)} onClick={async () => { const result = await runAi('generate_cover_letter'); if (result?.value) setCoverValue(String(result.value)); }}>Generate with AI</Button>
          <Button size="small" variant="outlined" startIcon={<AiIcon />} disabled={Boolean(aiBusy) || !coverLetter} onClick={async () => { const result = await runAi('improve_cover_letter', { value: coverLetter }); if (result?.value) setCoverValue(String(result.value)); }}>Improve</Button>
          <Button size="small" variant="outlined" startIcon={<CopyIcon />} disabled={!coverLetter} onClick={() => void copyCoverLetter()}>Copy</Button>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} disabled={!coverLetter} onClick={() => { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([coverLetter], { type: 'text/plain' })); link.download = `${safeFileName(resumeName)}_Cover_Letter.txt`; link.click(); URL.revokeObjectURL(link.href); }}>Download</Button>
        </Stack>
      </Stack>
    );

    switch (section) {
      case 'personal': return <Stack spacing={1.2}><Typography variant="subtitle1" sx={{ fontWeight: 750 }}>Personal Information</Typography><Grid container spacing={1}><Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Full Name" value={data.personal.fullName} onChange={(event) => updateData((current) => ({ ...current, personal: { ...current.personal, fullName: event.target.value } }))} /></Grid><Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Professional Title" value={data.personal.title} onChange={(event) => updateData((current) => ({ ...current, personal: { ...current.personal, title: event.target.value } }))} /></Grid><Grid item xs={12} sm={6}><TextField fullWidth size="small" type="email" label="Email" value={data.personal.email} onChange={(event) => updateData((current) => ({ ...current, personal: { ...current.personal, email: event.target.value } }))} /></Grid><Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Phone" value={data.personal.phone} onChange={(event) => updateData((current) => ({ ...current, personal: { ...current.personal, phone: event.target.value } }))} /></Grid><Grid item xs={12}><TextField fullWidth size="small" label="Location" value={data.personal.location} onChange={(event) => updateData((current) => ({ ...current, personal: { ...current.personal, location: event.target.value } }))} /></Grid><Grid item xs={12} sm={6}><TextField fullWidth size="small" label="LinkedIn" value={data.personal.linkedin} onChange={(event) => updateData((current) => ({ ...current, personal: { ...current.personal, linkedin: event.target.value } }))} /></Grid><Grid item xs={12} sm={6}><TextField fullWidth size="small" label="GitHub" value={data.personal.github} onChange={(event) => updateData((current) => ({ ...current, personal: { ...current.personal, github: event.target.value } }))} /></Grid><Grid item xs={12}><TextField fullWidth size="small" label="Portfolio / Website" value={data.personal.portfolio} onChange={(event) => updateData((current) => ({ ...current, personal: { ...current.personal, portfolio: event.target.value } }))} /></Grid></Grid></Stack>;
      case 'summary': return <Stack spacing={1}><Typography variant="subtitle1" sx={{ fontWeight: 750 }}>Professional Summary</Typography><TextField fullWidth multiline minRows={5} maxRows={9} label="Professional summary" value={data.summary} onChange={(event) => updateData((current) => ({ ...current, summary: event.target.value }))} /><Stack direction="row" gap={0.75} flexWrap="wrap"><Button size="small" variant="contained" startIcon={<AiIcon />} disabled={Boolean(aiBusy)} onClick={async () => { const result = await runAi(data.summary ? 'improve_summary' : 'generate_summary', { value: data.summary }); if (result?.value) updateData((current) => ({ ...current, summary: String(result.value) })); }}> {aiBusy ? 'Working...' : data.summary ? 'Improve with AI' : 'Generate with AI'}</Button><FormControl size="small" sx={{ minWidth: 135 }}><InputLabel>AI tone</InputLabel><Select label="AI tone" defaultValue="professional" onChange={(event) => { const tone = String(event.target.value); if (data.summary) void runAi('improve_summary', { value: data.summary, style: tone }).then((result) => result?.value && updateData((current) => ({ ...current, summary: String(result.value) }))); }}><MenuItem value="professional">Professional</MenuItem><MenuItem value="concise">Concise</MenuItem><MenuItem value="technical">Technical</MenuItem><MenuItem value="executive">Executive</MenuItem></Select></FormControl></Stack></Stack>;
      case 'experience': return <Stack spacing={1}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="subtitle1" sx={{ fontWeight: 750 }}>Experience</Typography><Button size="small" startIcon={<AddIcon />} onClick={() => updateData((current) => ({ ...current, experience: [...current.experience, { company: '', title: '', location: '', startDate: '', endDate: '', current: false, bullets: [''] }] }))}>Add Experience</Button></Stack>{data.experience.length ? data.experience.map((item, index) => <Card key={index} variant="outlined" sx={{ p: 1.2, borderRadius: 1.5 }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="body2" sx={{ fontWeight: 700 }}>Position {index + 1}</Typography><IconButton size="small" aria-label="Remove experience" onClick={() => updateData((current) => ({ ...current, experience: current.experience.filter((_, itemIndex) => itemIndex !== index) }))}><DeleteIcon fontSize="small" /></IconButton></Stack><Grid container spacing={0.8} sx={{ mt: 0.1 }}><Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Job Title" value={item.title} onChange={(event) => updateData((current) => ({ ...current, experience: current.experience.map((entry, i) => i === index ? { ...entry, title: event.target.value } : entry) }))} /></Grid><Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Company" value={item.company} onChange={(event) => updateData((current) => ({ ...current, experience: current.experience.map((entry, i) => i === index ? { ...entry, company: event.target.value } : entry) }))} /></Grid><Grid item xs={12}><TextField fullWidth size="small" label="Location" value={item.location} onChange={(event) => updateData((current) => ({ ...current, experience: current.experience.map((entry, i) => i === index ? { ...entry, location: event.target.value } : entry) }))} /></Grid><Grid item xs={6}><TextField fullWidth size="small" label="Start Date" value={item.startDate} onChange={(event) => updateData((current) => ({ ...current, experience: current.experience.map((entry, i) => i === index ? { ...entry, startDate: event.target.value } : entry) }))} /></Grid><Grid item xs={6}><TextField fullWidth size="small" label={item.current ? 'End Date (Present)' : 'End Date'} disabled={item.current} value={item.current ? '' : item.endDate} onChange={(event) => updateData((current) => ({ ...current, experience: current.experience.map((entry, i) => i === index ? { ...entry, endDate: event.target.value } : entry) }))} /></Grid><Grid item xs={12}><Stack direction="row" alignItems="center"><Switch size="small" checked={item.current} onChange={(event) => updateData((current) => ({ ...current, experience: current.experience.map((entry, i) => i === index ? { ...entry, current: event.target.checked } : entry) }))} /><Typography variant="caption">Currently working here</Typography></Stack></Grid><Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700 }}>Responsibilities and achievements</Typography>{item.bullets.map((bullet, bulletIndex) => <Stack key={bulletIndex} direction="row" alignItems="flex-start" gap={0.5} sx={{ mt: 0.6 }}><TextField fullWidth size="small" multiline minRows={1} label={`Bullet ${bulletIndex + 1}`} value={bullet} onChange={(event) => updateData((current) => ({ ...current, experience: current.experience.map((entry, i) => i === index ? { ...entry, bullets: entry.bullets.map((value, j) => j === bulletIndex ? event.target.value : value) } : entry) }))} /><IconButton size="small" aria-label="Bullet AI actions" onClick={(event) => { setBulletTarget({ experienceIndex: index, bulletIndex }); setMenuAnchor(event.currentTarget); }}><MoreIcon fontSize="small" /></IconButton></Stack>)}<Button size="small" onClick={() => updateData((current) => ({ ...current, experience: current.experience.map((entry, i) => i === index ? { ...entry, bullets: [...entry.bullets, ''] } : entry) }))}>Add Bullet</Button></Grid></Grid></Card>) : <Alert severity="info">No experience added yet. Add a role when you are ready.</Alert>}</Stack>;
      case 'skills': return <Stack spacing={1}><Typography variant="subtitle1" sx={{ fontWeight: 750 }}>Skills</Typography><Stack direction="row" gap={0.6}><TextField size="small" fullWidth label="Add a skill" value={skillsInput} onChange={(event) => setSkillsInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addSkill(); } }} /><Button size="small" variant="outlined" onClick={addSkill}>Add</Button></Stack><Stack direction="row" flexWrap="wrap" gap={0.6}>{data.skills.map((skill) => <Chip key={skill} size="small" label={skill} onDelete={() => updateData((current) => ({ ...current, skills: current.skills.filter((item) => item !== skill) }))} />)}</Stack>{!data.skills.length ? <Alert severity="info">No skills added yet.</Alert> : null}<Button size="small" startIcon={<AiIcon />} disabled={!data.skills.length || Boolean(aiBusy)} onClick={async () => { const result = await runAi('organize_skills'); if (Array.isArray(result?.categories)) setSkillsGroups(result.categories); }}>Organize Skills</Button>{skillsGroups.length ? <Stack spacing={0.5}>{skillsGroups.map((group) => <Box key={group.name}><Typography variant="caption" sx={{ fontWeight: 700 }}>{group.name}</Typography><Typography variant="body2">{group.skills.join(' · ')}</Typography></Box>)}</Stack> : null}</Stack>;
      case 'education': return <Stack spacing={1}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="subtitle1" sx={{ fontWeight: 750 }}>Education</Typography><Button size="small" startIcon={<AddIcon />} onClick={() => updateData((current) => ({ ...current, education: [...current.education, { degree: '', institution: '', location: '', startDate: '', endDate: '', grade: '' }] }))}>Add Education</Button></Stack>{data.education.length ? data.education.map((item, index) => <Card key={index} variant="outlined" sx={{ p: 1.2, borderRadius: 1.5 }}><Grid container spacing={0.8}>{([['degree','Degree'],['institution','Institution'],['location','Location'],['startDate','Start Date'],['endDate','End Date'],['grade','Grade / GPA']] as const).map(([key,label]) => <Grid item xs={12} sm={6} key={key}><TextField fullWidth size="small" label={label} value={item[key]} onChange={(event) => updateData((current) => ({ ...current, education: current.education.map((entry, i) => i === index ? { ...entry, [key]: event.target.value } : entry) }))} /></Grid>)}</Grid><Button size="small" color="error" onClick={() => updateData((current) => ({ ...current, education: current.education.filter((_, i) => i !== index) }))}>Remove</Button></Card>) : <Alert severity="info">No education added yet.</Alert>}</Stack>;
      case 'projects': return <Stack spacing={1}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="subtitle1" sx={{ fontWeight: 750 }}>Projects</Typography><Button size="small" startIcon={<AddIcon />} onClick={() => updateData((current) => ({ ...current, projects: [...current.projects, { name: '', role: '', description: '', technologies: [], url: '' }] }))}>Add Project</Button></Stack>{data.projects.length ? data.projects.map((item, index) => <Card key={index} variant="outlined" sx={{ p: 1.2, borderRadius: 1.5 }}><Grid container spacing={0.8}><Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Project Name" value={item.name} onChange={(event) => updateData((current) => ({ ...current, projects: current.projects.map((entry, i) => i === index ? { ...entry, name: event.target.value } : entry) }))} /></Grid><Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Role" value={item.role} onChange={(event) => updateData((current) => ({ ...current, projects: current.projects.map((entry, i) => i === index ? { ...entry, role: event.target.value } : entry) }))} /></Grid><Grid item xs={12}><TextField fullWidth size="small" multiline minRows={2} label="Description" value={item.description} onChange={(event) => updateData((current) => ({ ...current, projects: current.projects.map((entry, i) => i === index ? { ...entry, description: event.target.value } : entry) }))} /></Grid><Grid item xs={12}><TextField fullWidth size="small" label="Technologies (comma-separated)" value={item.technologies.join(', ')} onChange={(event) => updateData((current) => ({ ...current, projects: current.projects.map((entry, i) => i === index ? { ...entry, technologies: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) } : entry) }))} /></Grid><Grid item xs={12}><TextField fullWidth size="small" label="Project URL" value={item.url} onChange={(event) => updateData((current) => ({ ...current, projects: current.projects.map((entry, i) => i === index ? { ...entry, url: event.target.value } : entry) }))} /></Grid></Grid><Button size="small" startIcon={<AiIcon />} disabled={!item.description || Boolean(aiBusy)} onClick={async () => { const result = await runAi('improve_project', { value: item.description }); if (result?.value) updateData((current) => ({ ...current, projects: current.projects.map((entry, i) => i === index ? { ...entry, description: String(result.value) } : entry) })); }}>Improve Description</Button><Button size="small" color="error" onClick={() => updateData((current) => ({ ...current, projects: current.projects.filter((_, i) => i !== index) }))}>Remove</Button></Card>) : <Alert severity="info">No projects added yet.</Alert>}</Stack>;
      case 'certifications': return <Stack spacing={1}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="subtitle1" sx={{ fontWeight: 750 }}>Certifications</Typography><Button size="small" startIcon={<AddIcon />} onClick={() => updateData((current) => ({ ...current, certifications: [...current.certifications, { name: '', issuer: '', issueDate: '', credentialId: '', url: '' }] }))}>Add Certification</Button></Stack>{data.certifications.length ? data.certifications.map((item, index) => <Card key={index} variant="outlined" sx={{ p: 1.2, borderRadius: 1.5 }}><Grid container spacing={0.8}>{([['name','Certification Name'],['issuer','Issuing Organization'],['issueDate','Issue Date'],['credentialId','Credential ID'],['url','Credential URL']] as const).map(([key,label]) => <Grid item xs={12} sm={6} key={key}><TextField fullWidth size="small" label={label} value={item[key]} onChange={(event) => updateData((current) => ({ ...current, certifications: current.certifications.map((entry, i) => i === index ? { ...entry, [key]: event.target.value } : entry) }))} /></Grid>)}</Grid><Button size="small" color="error" onClick={() => updateData((current) => ({ ...current, certifications: current.certifications.filter((_, i) => i !== index) }))}>Remove</Button></Card>) : <Alert severity="info">No certifications added yet.</Alert>}</Stack>;
      case 'custom': return <Stack spacing={1}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="subtitle1" sx={{ fontWeight: 750 }}>Additional Sections</Typography><Button size="small" startIcon={<AddIcon />} onClick={() => updateData((current) => ({ ...current, customSections: [...current.customSections, { title: '', items: [''] }] }))}>Add Section</Button></Stack>{data.customSections.length ? data.customSections.map((item, index) => <Card key={index} variant="outlined" sx={{ p: 1.2, borderRadius: 1.5 }}><TextField fullWidth size="small" label="Section name" value={item.title} onChange={(event) => updateData((current) => ({ ...current, customSections: current.customSections.map((entry, i) => i === index ? { ...entry, title: event.target.value } : entry) }))} /><TextField fullWidth multiline minRows={2} size="small" label="Items (one per line)" value={item.items.join('\n')} onChange={(event) => updateData((current) => ({ ...current, customSections: current.customSections.map((entry, i) => i === index ? { ...entry, items: event.target.value.split('\n') } : entry) }))} sx={{ mt: 0.8 }} /><Button size="small" color="error" onClick={() => updateData((current) => ({ ...current, customSections: current.customSections.filter((_, i) => i !== index) }))}>Remove</Button></Card>) : <Alert severity="info">Add achievements, awards, languages, publications, or volunteer work when relevant.</Alert>}</Stack>;
      case 'analysis': return <Stack spacing={1.1}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="subtitle1" sx={{ fontWeight: 750 }}>AI Resume Analysis</Typography><Button size="small" variant="contained" startIcon={aiBusy ? <CircularProgress size={14} color="inherit" /> : <AiIcon />} disabled={Boolean(aiBusy)} onClick={() => void runAnalysis()}>{aiBusy === 'analyze_resume' ? 'Analyzing...' : 'Analyze Resume'}</Button></Stack><Typography variant="caption" color="text.secondary">AI indicators are guidance only and do not guarantee ATS results.</Typography>{analysis?.scores ? <Grid container spacing={0.8}>{Object.entries(analysis.scores).map(([label, score]) => <Grid key={label} item xs={6}><Paper variant="outlined" sx={{ p: 0.8 }}><Typography variant="caption" color="text.secondary">{label.replace(/([A-Z])/g, ' $1')}</Typography><Typography variant="subtitle1" fontWeight={750}>{score} / 100</Typography></Paper></Grid>)}</Grid> : <Alert severity="info">Analyze your current content for advisory feedback.</Alert>}{analysis?.strengths?.length ? <Box><Typography variant="body2" fontWeight={700}>Strengths</Typography>{analysis.strengths.slice(0, 5).map((item, index) => <Typography key={index} variant="body2">• {item}</Typography>)}</Box> : null}{analysis?.improvements?.length ? <Box><Typography variant="body2" fontWeight={700}>Improve</Typography>{analysis.improvements.slice(0, 5).map((item, index) => <Typography key={index} variant="body2">• {item}</Typography>)}</Box> : null}{analysis?.matchedSkills?.length || analysis?.notFoundInResume?.length ? <Box><Typography variant="body2" fontWeight={700}>Job alignment</Typography><Typography variant="caption">Matched: {analysis.matchedSkills?.join(', ') || 'None listed'}</Typography><Typography display="block" variant="caption">Not found in resume: {analysis.notFoundInResume?.join(', ') || 'None'}</Typography><Typography display="block" variant="caption" color="text.secondary">Only add a missing skill if you genuinely have this experience.</Typography></Box> : null}</Stack>;
    }
  };

  const renderHome = () => (
    <Stack spacing={1.2}>
      <Paper variant="outlined" sx={{ px: 1.4, py: 1.1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, borderColor: buildAvailable ? '#C9DDFB' : '#E2E8F0', bgcolor: buildAvailable ? '#F7FAFF' : '#F8FAFC', borderRadius: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={750}>Today's Resume Build</Typography>
          <Typography variant="caption" color="text.secondary">{buildAvailable ? 'Your resume build for today is available.' : 'Your resume build for today has been used.'}</Typography>
        </Box>
        <Chip size="small" color={buildAvailable ? 'success' : 'default'} variant="outlined" label={buildAvailable ? 'Available' : 'Build used'} sx={{ flexShrink: 0, fontWeight: 650 }} />
      </Paper>

      {!buildAvailable ? (
        <Paper variant="outlined" sx={{ px: 1.4, py: 1.1, display: 'flex', alignItems: { sm: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, borderRadius: 1.5, bgcolor: '#FBFCFE' }}>
          <Box><Typography variant="body2" fontWeight={700}>Your resume is ready to work with</Typography><Typography variant="caption" color="text.secondary">Keep editing, improving and downloading your existing version.</Typography></Box>
          <Stack direction="row" gap={0.7} flexWrap="wrap">
            {resumes[0] ? <Button size="small" variant="outlined" onClick={() => loadExisting(resumes[0].id)}>Open My Resume</Button> : null}
            {resumes.length ? <Button size="small" variant="contained" startIcon={<TargetIcon fontSize="small" />} onClick={() => void openTailor()}>Tailor Existing Resume</Button> : null}
          </Stack>
        </Paper>
      ) : null}

      {missingProfileInfo.length ? <Alert severity="info" sx={{ py: 0 }}>Some profile information is missing ({missingProfileInfo.join(', ')}). You can add it before generating your resume.</Alert> : null}
      {dailyLimit ? <Alert severity="info" sx={{ py: 0 }} action={resumes[0] ? <Button size="small" onClick={() => loadExisting(resumes[0].id)}>Open My Resume</Button> : undefined}>Today's build is already used. Your existing resume is still available to edit and download.</Alert> : null}
      {error ? <Alert severity="error" sx={{ py: 0 }}>{error}</Alert> : null}

      {buildAvailable ? <Grid container spacing={1}>
        <Grid item xs={12} md={4}>
          <Card sx={{ ...cardSx, height: '100%', borderTop: '2px solid #2563EB', transition: 'border-color 160ms ease, box-shadow 160ms ease', '&:hover': { borderColor: '#B8D1F5', boxShadow: '0 5px 16px rgba(37,99,235,0.08)' } }}>
            <CardContent sx={{ p: '13px !important' }}>
              <Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 32, height: 32, display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: 1, bgcolor: '#EFF6FF', color: '#1D4ED8' }}><ProfileIcon fontSize="small" /></Box><Typography variant="body2" fontWeight={750}>Build from My JobPoyt Profile</Typography></Stack>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.75, minHeight: 34, lineHeight: 1.45, color: '#64748B' }}>Use your profile, skills, experience and education to create a professional resume.</Typography>
              <Button size="small" variant="contained" fullWidth sx={{ mt: 1, minHeight: 34, textTransform: 'none', fontWeight: 700 }} disabled={creating} onClick={() => void createResume('profile')}>{creating ? 'Building...' : 'Build from Profile'}</Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ ...cardSx, height: '100%', borderTop: '2px solid #0F766E', transition: 'border-color 160ms ease, box-shadow 160ms ease', '&:hover': { borderColor: '#B7DDD7', boxShadow: '0 5px 16px rgba(15,118,110,0.07)' } }}>
            <CardContent sx={{ p: '13px !important' }}>
              <Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 32, height: 32, display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: 1, bgcolor: '#F0FDFA', color: '#0F766E' }}><UploadIcon fontSize="small" /></Box><Typography variant="body2" fontWeight={750}>Upload Existing Resume</Typography></Stack>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.75, minHeight: 34, lineHeight: 1.45, color: '#64748B' }}>Import a PDF or DOCX and let AI structure the details for your review.</Typography>
              <Stack direction="row" gap={0.7} sx={{ mt: 1 }}>
                <Button size="small" component="label" variant="outlined" fullWidth sx={{ minHeight: 34, textTransform: 'none' }}>Choose PDF / DOCX<input hidden type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} /></Button>
                <Button size="small" variant="contained" disabled={!uploadFile || creating} onClick={() => void createResume('upload')} sx={{ minWidth: 108, minHeight: 34, textTransform: 'none', fontWeight: 700 }}>{creating ? 'Importing...' : 'Upload Resume'}</Button>
              </Stack>
              {uploadFile ? <Typography variant="caption" noWrap title={uploadFile.name} display="block" sx={{ mt: 0.45, color: '#64748B' }}>{uploadFile.name}</Typography> : null}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ ...cardSx, height: '100%', borderTop: '2px solid #B45309', transition: 'border-color 160ms ease, box-shadow 160ms ease', '&:hover': { borderColor: '#E9D1A8', boxShadow: '0 5px 16px rgba(180,83,9,0.06)' } }}>
            <CardContent sx={{ p: '13px !important' }}>
              <Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 32, height: 32, display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: 1, bgcolor: '#FFFBEB', color: '#A16207' }}><TargetIcon fontSize="small" /></Box><Typography variant="body2" fontWeight={750}>Tailor Resume for a Job</Typography></Stack>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.75, minHeight: 34, lineHeight: 1.45, color: '#64748B' }}>Create a job-focused version or a separate tailored copy of an existing resume.</Typography>
              <Button size="small" variant="outlined" fullWidth sx={{ mt: 1, minHeight: 34, textTransform: 'none', fontWeight: 650 }} onClick={() => void openTailor()}>Set Job Target</Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid> : null}

      <Collapse in={showTailorForm} unmountOnExit>
        <Card id="resume-tailor-form" sx={{ ...cardSx, p: { xs: 1.2, md: 1.5 }, borderLeft: '3px solid #2563EB' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Box><Typography variant="body2" fontWeight={750}>Tailor Resume for a Job</Typography><Typography variant="caption" color="text.secondary">Choose a JobPoyt listing or paste its description.</Typography></Box>
            <Button size="small" aria-label="Close job target form" onClick={() => setShowTailorForm(false)} endIcon={<CloseIcon fontSize="small" />}>Close</Button>
          </Stack>
          <Grid container spacing={0.9} sx={{ mt: 0.25 }}>
            {resumes.length ? <Grid item xs={12} md={4}><FormControl fullWidth size="small"><InputLabel>Resume to tailor</InputLabel><Select label="Resume to tailor" value={targetResumeId} onChange={(event) => setTargetResumeId(String(event.target.value))}>{resumes.filter((item) => item.status === 'ready').map((item) => <MenuItem key={item.id} value={item.id}>{item.version_name || item.name}</MenuItem>)}</Select></FormControl></Grid> : null}
            <Grid item xs={12} md={resumes.length ? 4 : 6}><FormControl fullWidth size="small"><InputLabel>JobPoyt job (optional)</InputLabel><Select label="JobPoyt job (optional)" value={target.jobId} onChange={(event) => { const job = jobs.find((item) => item.id === event.target.value); setTarget((current) => ({ ...current, jobId: String(event.target.value), title: job?.title || current.title, company: job?.company_name || current.company, description: job?.description || current.description })); }}><MenuItem value="">Paste description instead</MenuItem>{jobs.map((job) => <MenuItem key={job.id} value={job.id}>{job.title} · {job.company_name}</MenuItem>)}</Select></FormControl></Grid>
            <Grid item xs={12} md={resumes.length ? 4 : 6}><TextField fullWidth size="small" label="Target Job Title" value={target.title} onChange={(event) => setTarget((current) => ({ ...current, title: event.target.value }))} /></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth size="small" label="Company" value={target.company} onChange={(event) => setTarget((current) => ({ ...current, company: event.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline minRows={2} size="small" label="Job Description" value={target.description} onChange={(event) => setTarget((current) => ({ ...current, description: event.target.value }))} /></Grid>
            <Grid item xs={12}><Typography variant="caption" color="text.secondary">Missing skills are not added to your resume. Only add a skill if you genuinely have that experience.</Typography><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" gap={0.7} sx={{ mt: 0.7 }}>
              {buildAvailable ? <Button size="small" variant="outlined" disabled={!target.description.trim() || creating} onClick={() => void createResume('tailor')}>{creating ? 'Building...' : 'Build New Tailored Version'}</Button> : null}
              {resumes.length ? <Button size="small" variant="contained" disabled={!target.description.trim() || !targetResumeId || tailoringExisting} onClick={() => setConfirmTailoring(true)}>{tailoringExisting ? 'Tailoring...' : 'Tailor Existing Resume'}</Button> : null}
            </Stack></Grid>
          </Grid>
          {tailorJobsLoading ? <LinearProgress sx={{ mt: 0.7 }} /> : null}
        </Card>
      </Collapse>

      <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="subtitle2" fontWeight={750}>My Resume Versions</Typography><Button size="small" onClick={() => void refresh()} disabled={loading}>Refresh</Button></Stack>
      {loading ? <LinearProgress /> : resumes.length ? <Stack spacing={0.7}>{resumes.map((item) => <Card key={item.id} variant="outlined" sx={{ p: 1, borderRadius: 1.5 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={0.7}><Box sx={{ minWidth: 0 }}><Typography variant="body2" fontWeight={700}>{item.version_name || item.name}</Typography><Typography variant="caption" color="text.secondary">{new Date(item.updated_at).toLocaleDateString()} · {item.status === 'ready' ? 'Ready to edit' : 'Building'}</Typography></Box><Stack direction="row" gap={0.6}><Button size="small" variant="outlined" disabled={item.status !== 'ready'} onClick={() => loadExisting(item.id)}>Open Master</Button>{item.tailored_resume_data ? <Button size="small" variant="outlined" onClick={() => openStudio(item, 'tailored')}>Open Tailored</Button> : null}</Stack></Stack></Card>)}</Stack> : <Typography variant="body2" color="text.secondary">No resume versions yet. Build from your profile or import an existing resume.</Typography>}
    </Stack>
  );

  if (screen === 'home') return <Box className="w-full max-w-none">{creating ? <Alert icon={<CircularProgress size={16} />} severity="info" sx={{ mb: 1 }}>AI is preparing your resume from verified information. This may take a moment.</Alert> : null}{renderHome()}<Dialog open={confirmTailoring} onClose={() => { if (!tailoringExisting) setConfirmTailoring(false); }} maxWidth="xs" fullWidth><DialogTitle sx={{ fontWeight: 750 }}>Create tailored copy?</DialogTitle><DialogContent><Typography variant="body2" color="text.secondary">A job-focused copy will be saved separately. Your master resume stays unchanged, and this action does not use today's new-resume build.</Typography></DialogContent><DialogActions><Button size="small" disabled={tailoringExisting} onClick={() => setConfirmTailoring(false)}>Cancel</Button><Button size="small" variant="contained" disabled={tailoringExisting} onClick={() => void tailorExisting()} startIcon={tailoringExisting ? <CircularProgress size={14} color="inherit" /> : <AiIcon />}>{tailoringExisting ? 'Tailoring...' : 'Create Tailored Copy'}</Button></DialogActions></Dialog></Box>;

  return (
    <Box className="w-full max-w-none" sx={{ minWidth: 0 }}>
      {error ? <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>{error}</Alert> : null}
      <Stack spacing={1.2}>
        <Paper variant="outlined" sx={{ p: 1.1, borderRadius: 1.5, bgcolor: '#FFFFFF' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={1}>
            <Box sx={{ minWidth: 0, flex: 1 }}><Typography variant="subtitle1" fontWeight={800}>AI Resume Studio</Typography><TextField variant="standard" value={resumeName} onChange={(event) => setNameValue(event.target.value)} aria-label="Resume name" sx={{ maxWidth: 360, '& input': { fontSize: 13, fontWeight: 650 } }} /><Typography variant="caption" color={saveState === 'error' ? 'error.main' : 'text.secondary'} sx={{ ml: 1 }}>{saveState === 'saving' ? 'Saving...' : saveState === 'error' ? 'Save failed' : '✓ Saved'}</Typography></Box>
            <Stack direction="row" gap={0.5} flexWrap="wrap">{resume?.tailored_resume_data ? <FormControl size="small" sx={{ minWidth: 140 }}><InputLabel>Resume version</InputLabel><Select label="Resume version" value={resumeVariant} onChange={(event) => switchVariant(event.target.value as 'master' | 'tailored')}><MenuItem value="master">Master Resume</MenuItem><MenuItem value="tailored">Tailored Copy</MenuItem></Select></FormControl> : null}<Button size="small" startIcon={<PreviewIcon />} onClick={() => setPreviewOpen(true)}>Preview</Button><Button size="small" variant="contained" startIcon={<DownloadIcon />} onClick={printResume}>Download PDF</Button><Tooltip title="Print resume"><IconButton size="small" aria-label="Print resume" onClick={printResume}><PrintIcon fontSize="small" /></IconButton></Tooltip><FormControl size="small" sx={{ minWidth: 138 }}><InputLabel>Template</InputLabel><Select label="Template" value={template} onChange={(event) => setTemplateValue(event.target.value as ResumeTemplate)}>{templates.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</Select></FormControl><Tooltip title="ATS-friendly formatting improves machine readability, but cannot guarantee ATS results."><Stack direction="row" alignItems="center" sx={{ pl: 0.5 }}><Typography variant="caption">ATS mode</Typography><Switch size="small" checked={atsFriendly} onChange={(event) => { dirtyRef.current = true; setAtsFriendly(event.target.checked); }} inputProps={{ 'aria-label': 'ATS-friendly mode' }} /></Stack></Tooltip><Button size="small" onClick={() => setScreen('home')}>Versions</Button></Stack>
          </Stack>
        </Paper>
        <Tabs value={studioTab} onChange={(_, value) => setStudioTab(value)} variant="scrollable" allowScrollButtonsMobile sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}><Tab value="resume" label="Resume" /><Tab value="cover" label="Cover Letter" /></Tabs>
        <Box className="grid grid-cols-1 lg:grid-cols-[155px_minmax(0,1fr)_minmax(300px,350px)]" sx={{ gap: 1.25, alignItems: 'start', minWidth: 0 }}>
          {studioTab === 'resume' ? <Paper variant="outlined" sx={{ p: 0.7, borderRadius: 1.5, position: { lg: 'sticky' }, top: 0 }}><Tabs orientation="vertical" value={section} onChange={(_, value) => setSection(value)} sx={{ display: { xs: 'none', lg: 'flex' }, '& .MuiTab-root': { alignItems: 'flex-start', minHeight: 37, px: 1, fontSize: 12 } }}>{sections.map((item) => <Tab key={item.id} value={item.id} label={item.label} />)}</Tabs><Tabs orientation="horizontal" variant="scrollable" allowScrollButtonsMobile value={section} onChange={(_, value) => setSection(value)} sx={{ display: { xs: 'flex', lg: 'none' }, minHeight: 36, '& .MuiTab-root': { minHeight: 36, px: 1.2, fontSize: 12 } }}>{sections.map((item) => <Tab key={item.id} value={item.id} label={item.label} />)}</Tabs></Paper> : null}
          <Paper variant="outlined" sx={{ p: { xs: 1.2, md: 1.5 }, borderRadius: 1.5, minWidth: 0, overflowWrap: 'anywhere' }}>{renderEditor()}</Paper>
          {studioTab === 'resume' ? <Box sx={{ minWidth: 0 }}><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}><Typography variant="body2" fontWeight={750}>Live Resume Preview</Typography><Chip size="small" variant="outlined" label="A4" /></Stack><ResumePreview data={data} template={template} atsFriendly={atsFriendly} /></Box> : null}
        </Box>
      </Stack>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}><MenuItem onClick={() => void improveBullet('professional')}>Improve wording</MenuItem><MenuItem onClick={() => void generateBullet()}>Generate Bullet from these notes</MenuItem><MenuItem onClick={() => void improveBullet('concise')}>Make Concise</MenuItem><MenuItem onClick={() => void improveBullet('technical')}>Make Technical</MenuItem><MenuItem onClick={() => void improveBullet('achievement-focused, without adding outcomes')}>Achievement-focused</MenuItem><MenuItem onClick={() => void improveBullet('fix grammar only')}>Fix Grammar</MenuItem></Menu>
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth><DialogTitle>Resume Preview</DialogTitle><DialogContent sx={{ bgcolor: '#F1F5F9', py: 2 }}><ResumePreview data={data} template={template} atsFriendly={atsFriendly} /></DialogContent><DialogActions><Button onClick={() => setPreviewOpen(false)}>Close</Button><Button variant="contained" startIcon={<DownloadIcon />} onClick={printResume}>Download PDF</Button></DialogActions></Dialog>
    </Box>
  );
};
