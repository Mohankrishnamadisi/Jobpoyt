import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, Divider,
  DialogTitle, FormControl, Grid, InputLabel, LinearProgress, MenuItem, Paper, Select, Stack, Typography,
} from '@mui/material';
import {
  ArticleOutlined as ScorecardIcon, CheckCircleOutline as VerifiedIcon, Download as DownloadIcon,
  EmojiEventsOutlined as AwardIcon, Print as PrintIcon,
  VisibilityOutlined as ViewIcon,
} from '@mui/icons-material';
import { candidateAssessmentService, type AssessmentCertificate, type CandidateAssessmentDifficulty } from '@services/candidateAssessments';

const verificationUrl = (verificationId: string) => `${window.location.origin}/#/verify-certificate/${encodeURIComponent(verificationId)}`;
const safeName = (value: string) => value.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Candidate';
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date unavailable';
const getDetails = (certificate: AssessmentCertificate) => certificate.scorecard?.scoreDetails || certificate.scoreDetails || {};
const getCompetencies = (certificate: AssessmentCertificate) => certificate.scorecard?.competencyScores || certificate.competencyScores || [];
const getInsights = (certificate: AssessmentCertificate) => certificate.scorecard?.insights || certificate.insights || { strengths: [], improvements: [], nextStep: '' };

const drawCertificate = async (certificate: AssessmentCertificate, candidateName: string) => {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const qr = await QRCode.toDataURL(verificationUrl(certificate.verificationId), { errorCorrectionLevel: 'M', margin: 1, width: 180, color: { dark: '#17365D', light: '#FFFFFF' } });
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  const navy = '#17365D';
  const blue = '#2563EB';
  const muted = '#64748B';

  pdf.setFillColor('#FCFCFA');
  pdf.rect(0, 0, width, height, 'F');
  pdf.setDrawColor(navy);
  pdf.setLineWidth(0.8);
  pdf.roundedRect(9, 9, width - 18, height - 18, 1.5, 1.5, 'S');
  pdf.setDrawColor('#A9C2E4');
  pdf.setLineWidth(0.25);
  pdf.roundedRect(12, 12, width - 24, height - 24, 1, 1, 'S');
  pdf.setFillColor(navy);
  pdf.rect(14, 14, width - 28, 1.8, 'F');

  pdf.setTextColor(navy);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('JOBPOYT', width / 2, 29, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(muted);
  pdf.text('FIND. APPLY. GROW.', width / 2, 34, { align: 'center' });

  pdf.setDrawColor('#B9CCE4');
  pdf.setLineWidth(0.25);
  pdf.line(54, 39, width - 54, 39);
  pdf.setTextColor(navy);
  pdf.setFont('times', 'bold');
  pdf.setFontSize(25);
  pdf.text('CERTIFICATE OF ACHIEVEMENT', width / 2, 52, { align: 'center' });
  pdf.setTextColor(muted);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('This certificate is proudly presented to', width / 2, 64, { align: 'center' });

  pdf.setTextColor(navy);
  pdf.setFont('times', 'bold');
  pdf.setFontSize(candidateName.length > 34 ? 23 : 29);
  pdf.text(candidateName.toUpperCase(), width / 2, 79, { align: 'center', maxWidth: width - 100 });
  pdf.setDrawColor(blue);
  pdf.setLineWidth(0.55);
  pdf.line(width / 2 - 30, 84, width / 2 + 30, 84);
  pdf.setTextColor(muted);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('for successfully completing', width / 2, 94, { align: 'center' });

  pdf.setTextColor(navy);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(certificate.assessmentTitle.length > 45 ? 15 : 18);
  pdf.text(certificate.assessmentTitle.toUpperCase(), width / 2, 105, { align: 'center', maxWidth: width - 65 });
  pdf.setTextColor(muted);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`${certificate.assessmentCategory}  ·  ${certificate.difficulty} Difficulty`, width / 2, 112, { align: 'center' });

  pdf.setFillColor('#F0F5FB');
  pdf.roundedRect(width / 2 - 34, 119, 68, 28, 2, 2, 'F');
  pdf.setTextColor(muted);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('FINAL ASSESSMENT SCORE', width / 2, 126, { align: 'center' });
  pdf.setTextColor(blue);
  pdf.setFontSize(22);
  pdf.text(`${certificate.score} / ${certificate.maxScore}`, width / 2, 140, { align: 'center' });

  pdf.setDrawColor('#D8E1EC');
  pdf.line(40, 156, width - 40, 156);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(muted);
  pdf.setFontSize(8);
  pdf.text(`Completed: ${formatDate(certificate.completionDate)}`, width / 2 - 63, 165, { align: 'center' });
  pdf.text(`Issued: ${formatDate(certificate.issueDate)}`, width / 2 + 63, 165, { align: 'center' });

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(navy);
  pdf.setFontSize(9);
  pdf.text('Issued by JobPoyt', 28, 184);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(muted);
  pdf.setFontSize(7.5);
  pdf.text('Assessment & Career Platform', 28, 189);
  pdf.setFontSize(7);
  pdf.text(`Certificate ID: ${certificate.certificateId}`, 28, 196);
  pdf.addImage(qr, 'PNG', width - 39, 174, 18, 18);
  pdf.setTextColor(muted);
  pdf.setFontSize(6.5);
  pdf.text('Verify at JobPoyt', width - 30, 195, { align: 'center' });

  return pdf;
};

export const AssessmentCertifications: React.FC = () => {
  const [certificates, setCertificates] = useState<AssessmentCertificate[]>([]);
  const [stats, setStats] = useState({ earned: 0, assessmentsCompleted: 0, averageScore: 0, latestIssueDate: null as string | null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'highest'>('newest');
  const [viewer, setViewer] = useState<AssessmentCertificate | null>(null);
  const [previewQr, setPreviewQr] = useState('');
  const [scorecard, setScorecard] = useState<AssessmentCertificate | null>(null);
  const [downloadingId, setDownloadingId] = useState('');
  const [verifyingId, setVerifyingId] = useState('');
  const [verification, setVerification] = useState<{ verified: boolean; certificateId?: string } | null>(null);
  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await candidateAssessmentService.certificates();
      setCertificates(response.certificates);
      setStats(response.stats);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load certifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    let current = true;
    if (viewer) QRCode.toDataURL(verificationUrl(viewer.verificationId), { errorCorrectionLevel: 'M', margin: 1, width: 160, color: { dark: '#17365D', light: '#FFFFFF' } }).then((url) => { if (current) setPreviewQr(url); }).catch(() => { if (current) setPreviewQr(''); });
    else setPreviewQr('');
    return () => { current = false; };
  }, [viewer]);

  const visibleCertificates = useMemo(() => {
    const rows = certificates.filter((item) => filter === 'all' || item.assessmentCategory === filter);
    return rows.sort((left, right) => sort === 'highest' ? right.score - left.score : sort === 'newest' ? new Date(right.issueDate).getTime() - new Date(left.issueDate).getTime() : new Date(left.issueDate).getTime() - new Date(right.issueDate).getTime());
  }, [certificates, filter, sort]);

  const downloadPdf = async (certificate: AssessmentCertificate) => {
    if (downloadingId) return;
    setDownloadingId(certificate.id);
    setError('');
    try {
      const pdf = await drawCertificate(certificate, certificate.candidateName);
      pdf.save(`JobPoyt_Certificate_${safeName(certificate.assessmentTitle)}_${new Date(certificate.issueDate).getFullYear()}.pdf`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Unable to prepare this certificate. Please try again.');
    } finally {
      setDownloadingId('');
    }
  };

  const printCertificate = async (certificate: AssessmentCertificate) => {
    setDownloadingId(certificate.id);
    try {
      const pdf = await drawCertificate(certificate, certificate.candidateName);
      const blobUrl = URL.createObjectURL(pdf.output('blob'));
      const frame = document.createElement('iframe');
      frame.style.position = 'fixed'; frame.style.width = '1px'; frame.style.height = '1px'; frame.style.opacity = '0'; frame.setAttribute('aria-hidden', 'true');
      frame.onload = () => { frame.contentWindow?.focus(); frame.contentWindow?.print(); window.setTimeout(() => { URL.revokeObjectURL(blobUrl); frame.remove(); }, 60000); };
      frame.src = blobUrl; document.body.appendChild(frame);
    } catch (printError) {
      setError(printError instanceof Error ? printError.message : 'Unable to print this certificate.');
    } finally { setDownloadingId(''); }
  };

  const verifyCertificate = async (certificate: AssessmentCertificate) => {
    setVerifyingId(certificate.id); setVerification(null);
    try {
      const response = await candidateAssessmentService.verifyCertificate(certificate.verificationId);
      setVerification({ verified: response.verified, certificateId: response.certificate.certificateId });
    } catch {
      setVerification({ verified: false, certificateId: certificate.certificateId });
    } finally { setVerifyingId(''); }
  };

  const statTile = (label: string, value: string | number, detail: string, accent: string) => <Paper variant="outlined" sx={{ height: '100%', px: 1.3, py: 1.1, borderRadius: 1.5, borderColor: '#E2E8F0', borderTop: `2px solid ${accent}` }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h6" sx={{ mt: 0.2, fontSize: 21, fontWeight: 750, lineHeight: 1.15 }}>{value}</Typography><Typography variant="caption" color="text.secondary">{detail}</Typography></Paper>;

  return (
    <Box className="w-full max-w-none" sx={{ minWidth: 0 }}>
      {error ? <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>{error}</Alert> : null}
      <Stack spacing={1.4}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={0.6}>
          <Box><Typography variant="h6" fontWeight={800}>My Certifications</Typography><Typography variant="body2" color="text.secondary">Showcase your verified JobPoyt assessment achievements.</Typography></Box>
          <Button size="small" onClick={() => void refresh()} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</Button>
        </Stack>
        <Grid container spacing={0.9}>
          <Grid item xs={6} md={3}>{statTile('Certificates Earned', stats.earned, 'Issued by JobPoyt', '#2563EB')}</Grid>
          <Grid item xs={6} md={3}>{statTile('Assessments Completed', stats.assessmentsCompleted, 'Career assessments', '#0F766E')}</Grid>
          <Grid item xs={6} md={3}>{statTile('Average Assessment Score', `${stats.averageScore}%`, 'Across completed assessments', '#7C3AED')}</Grid>
          <Grid item xs={6} md={3}>{statTile('Latest Certificate', formatDate(stats.latestIssueDate), 'Issue date', '#B45309')}</Grid>
        </Grid>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={0.8}>
          <Box><Typography variant="subtitle1" fontWeight={750}>Your Certificates</Typography><Typography variant="caption" color="text.secondary">Certificates are issued automatically after an assessment result is saved.</Typography></Box>
          <Stack direction="row" gap={0.7}>
            <FormControl size="small" sx={{ minWidth: 165 }}><InputLabel>Category</InputLabel><Select label="Category" value={filter} onChange={(event) => setFilter(String(event.target.value))}><MenuItem value="all">All Categories</MenuItem>{['Job Readiness', 'Problem Solving', 'Situational Judgment', 'Workplace Communication', 'Aptitude & Analytical Reasoning', 'Role-Based Assessment', 'Career Readiness'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></FormControl>
            <FormControl size="small" sx={{ minWidth: 112 }}><InputLabel>Sort</InputLabel><Select label="Sort" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><MenuItem value="newest">Newest</MenuItem><MenuItem value="oldest">Oldest</MenuItem><MenuItem value="highest">Highest score</MenuItem></Select></FormControl>
          </Stack>
        </Stack>
        {loading ? <LinearProgress /> : visibleCertificates.length ? <Grid container spacing={1}>{visibleCertificates.map((certificate) => <Grid item xs={12} md={6} key={certificate.id}><Card variant="outlined" sx={{ height: '100%', borderColor: '#E2E8F0', borderRadius: 1.5, transition: 'border-color 150ms ease, box-shadow 150ms ease', '&:hover': { borderColor: '#BFDBFE', boxShadow: '0 4px 14px rgba(37,99,235,0.06)' } }}><CardContent sx={{ p: 1.4 }}><Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}><Stack direction="row" spacing={0.8} sx={{ minWidth: 0 }}><AwardIcon sx={{ mt: 0.15, color: '#B45309' }} /><Box sx={{ minWidth: 0 }}><Typography variant="body2" fontWeight={750}>{certificate.assessmentTitle}</Typography><Typography variant="caption" color="text.secondary">JobPoyt Achievement Certificate · {certificate.assessmentCategory}</Typography></Box></Stack><Chip size="small" color="success" variant="outlined" icon={<VerifiedIcon />} label={`${certificate.score} / 100`} /></Stack><Grid container spacing={0.7} sx={{ mt: 1 }}><Grid item xs={6}><Typography variant="caption" color="text.secondary">Issued</Typography><Typography variant="body2">{formatDate(certificate.issueDate)}</Typography></Grid><Grid item xs={6}><Typography variant="caption" color="text.secondary">Certificate ID</Typography><Typography variant="body2" fontWeight={650}>{certificate.certificateId}</Typography></Grid></Grid><Stack direction="row" flexWrap="wrap" gap={0.55} sx={{ mt: 1.1 }}><Button size="small" variant="outlined" startIcon={<ViewIcon />} onClick={() => { setVerification(null); setViewer(certificate); }}>View Certificate</Button><Button size="small" variant="outlined" startIcon={<ScorecardIcon />} onClick={() => setScorecard(certificate)}>Score Card</Button><Button size="small" variant="contained" startIcon={downloadingId === certificate.id ? <CircularProgress size={13} color="inherit" /> : <DownloadIcon />} disabled={Boolean(downloadingId)} onClick={() => void downloadPdf(certificate)}>{downloadingId === certificate.id ? 'Preparing...' : 'Download PDF'}</Button></Stack></CardContent></Card></Grid>)}</Grid> : <Paper variant="outlined" sx={{ p: 1.7, borderRadius: 1.5, borderStyle: 'dashed', borderColor: '#CBD5E1' }}><Typography variant="body2" fontWeight={700}>No assessment certificates yet</Typography><Typography variant="caption" color="text.secondary">Complete an assessment to receive a JobPoyt certificate here. Your certificate remains available to view, verify and download.</Typography></Paper>}
      </Stack>

      <Dialog open={Boolean(viewer)} onClose={() => setViewer(null)} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 1.5, overflow: 'hidden' } }}>
        <DialogTitle sx={{ py: 1.1, fontWeight: 750 }}>Certificate of Achievement</DialogTitle>
        <DialogContent sx={{ bgcolor: '#F1F5F9', p: { xs: 1, sm: 2 } }}>
          {viewer ? <Box sx={{ width: '100%', maxWidth: 920, aspectRatio: '297 / 210', mx: 'auto', p: { xs: 1.1, sm: 2.4, md: 3.2 }, position: 'relative', bgcolor: '#FCFCFA', color: '#17365D', border: '1px solid #A9C2E4', outline: { xs: 'none', sm: '1px solid #17365D' }, outlineOffset: '-8px', boxShadow: '0 10px 30px rgba(15,23,42,0.14)', overflow: 'hidden' }}><Box sx={{ borderTop: '2px solid #17365D', pt: { xs: 0.5, sm: 1 }, textAlign: 'center' }}><Typography sx={{ fontSize: { xs: 10, sm: 13 }, fontWeight: 800, letterSpacing: 1.2 }}>JOBPOYT</Typography><Typography sx={{ fontSize: { xs: 6, sm: 8 }, color: '#64748B' }}>FIND. APPLY. GROW.</Typography><Divider sx={{ maxWidth: '72%', mx: 'auto', my: { xs: 0.4, sm: 1 }, borderColor: '#B9CCE4' }} /><Typography sx={{ fontFamily: 'Georgia, serif', fontSize: { xs: 12, sm: 20, md: 25 }, fontWeight: 700, mt: { xs: 0.4, sm: 1 } }}>CERTIFICATE OF ACHIEVEMENT</Typography><Typography sx={{ fontSize: { xs: 6, sm: 10 }, color: '#64748B', mt: { xs: 0.3, sm: 0.8 } }}>This certificate is proudly presented to</Typography><Typography noWrap sx={{ maxWidth: '90%', mx: 'auto', fontFamily: 'Georgia, serif', fontSize: { xs: 11, sm: 19, md: 25 }, fontWeight: 700, mt: { xs: 0.35, sm: 1 }, color: '#17365D' }}>{viewer.candidateName}</Typography><Typography sx={{ fontSize: { xs: 6, sm: 10 }, color: '#64748B', mt: { xs: 0.2, sm: 0.6 } }}>for successfully completing</Typography><Typography noWrap sx={{ maxWidth: '92%', mx: 'auto', fontSize: { xs: 7, sm: 14, md: 17 }, fontWeight: 750, mt: { xs: 0.2, sm: 0.6 } }}>{viewer.assessmentTitle.toUpperCase()}</Typography><Typography sx={{ fontSize: { xs: 5, sm: 9 }, color: '#64748B' }}>{viewer.assessmentCategory} · {viewer.difficulty} Difficulty</Typography><Paper elevation={0} sx={{ width: { xs: 76, sm: 130 }, mx: 'auto', mt: { xs: 0.4, sm: 0.9 }, py: { xs: 0.2, sm: 0.6 }, bgcolor: '#F0F5FB' }}><Typography sx={{ fontSize: { xs: 5, sm: 7 }, color: '#64748B', fontWeight: 700 }}>FINAL ASSESSMENT SCORE</Typography><Typography sx={{ fontSize: { xs: 11, sm: 20 }, fontWeight: 800, color: '#2563EB' }}>{viewer.score} / {viewer.maxScore}</Typography></Paper><Stack direction="row" justifyContent="center" gap={{ xs: 1, sm: 4 }} sx={{ mt: { xs: 0.35, sm: 0.8 }, fontSize: { xs: 5, sm: 8 }, color: '#64748B' }}><Box>Completed: {formatDate(viewer.completionDate)}</Box><Box>Issued: {formatDate(viewer.issueDate)}</Box></Stack></Box><Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ position: 'absolute', left: { xs: 14, sm: 28 }, right: { xs: 14, sm: 28 }, bottom: { xs: 10, sm: 18 } }}><Box><Typography sx={{ fontSize: { xs: 6, sm: 9 }, fontWeight: 700 }}>Issued by JobPoyt</Typography><Typography sx={{ fontSize: { xs: 5, sm: 7 }, color: '#64748B' }}>Assessment & Career Platform</Typography><Typography sx={{ fontSize: { xs: 5, sm: 7 }, color: '#64748B' }}>{viewer.certificateId}</Typography></Box>{previewQr ? <Box component="img" alt="Certificate verification QR" src={previewQr} sx={{ width: { xs: 24, sm: 44 }, height: { xs: 24, sm: 44 }, bgcolor: '#FFFFFF', border: '1px solid #D8E1EC', p: 0.2 }} /> : null}</Stack></Box> : null}
          {verification ? <Alert severity={verification.verified ? 'success' : 'error'} sx={{ mt: 1 }}>{verification.verified ? `Certificate ${verification.certificateId} is valid and issued by JobPoyt.` : 'Certificate could not be verified.'}</Alert> : null}
        </DialogContent>
        <DialogActions sx={{ p: 1.2, flexWrap: 'wrap' }}>{viewer ? <><Button size="small" onClick={() => void verifyCertificate(viewer)} disabled={Boolean(verifyingId)} startIcon={verifyingId === viewer.id ? <CircularProgress size={13} /> : <VerifiedIcon />}>Verify Certificate</Button><Button size="small" onClick={() => void printCertificate(viewer)} startIcon={<PrintIcon />}>Print</Button><Button size="small" variant="contained" onClick={() => void downloadPdf(viewer)} disabled={Boolean(downloadingId)} startIcon={downloadingId === viewer.id ? <CircularProgress size={13} color="inherit" /> : <DownloadIcon />}>Download PDF</Button></> : null}<Button size="small" onClick={() => setViewer(null)}>Close</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(scorecard)} onClose={() => setScorecard(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 0.4, fontWeight: 750 }}>Assessment Score Card</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>{scorecard ? <ScoreCardContent certificate={scorecard} /> : null}</DialogContent>
        <DialogActions><Button size="small" onClick={() => setScorecard(null)}>Close</Button>{scorecard ? <Button size="small" variant="contained" onClick={() => void downloadPdf(scorecard)} disabled={Boolean(downloadingId)}>Download Certificate</Button> : null}</DialogActions>
      </Dialog>
    </Box>
  );
};

const ScoreCardContent: React.FC<{ certificate: AssessmentCertificate }> = ({ certificate }) => {
  const details = getDetails(certificate);
  const competencies = getCompetencies(certificate);
  const insights = getInsights(certificate);
  const breakdown = details.difficultyBreakdown || { Easy: 0, Medium: 0, Hard: 0 };
  return <Stack spacing={1.1}>
    <Paper variant="outlined" sx={{ p: 1.3, borderRadius: 1.3, bgcolor: '#F8FBFF' }}><Typography variant="caption" color="text.secondary">{certificate.candidateName}</Typography><Typography variant="body2" fontWeight={700}>{certificate.assessmentTitle}</Typography><Typography variant="caption" color="text.secondary">Completed {formatDate(certificate.completionDate)} · Certificate {certificate.certificateId}</Typography><Typography variant="h4" sx={{ mt: 0.7, fontSize: 29, color: '#1D4ED8', fontWeight: 800 }}>{certificate.score}<Typography component="span" sx={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}> / {certificate.maxScore}</Typography></Typography><Typography variant="caption" color="text.secondary">Assessment Score</Typography></Paper>
    <Typography variant="subtitle2" fontWeight={750}>Competency Breakdown</Typography>
    <Grid container spacing={0.8}>{competencies.map((item) => <Grid item xs={12} sm={6} key={item.name}><Paper variant="outlined" sx={{ p: 0.9, borderRadius: 1.2 }}><Stack direction="row" justifyContent="space-between"><Typography variant="body2">{item.name}</Typography><Typography variant="body2" fontWeight={700}>{item.score}%</Typography></Stack><LinearProgress variant="determinate" value={item.score} sx={{ mt: 0.5, height: 5, borderRadius: 3 }} /></Paper></Grid>)}</Grid>
    <Grid container spacing={0.8}>{[['Total Questions', details.totalQuestions], ['Answered', details.answered], ['Correct', details.correct], ['Incorrect', details.incorrect], ['Skipped', details.skipped], ['Time Taken', `${details.durationMinutes || 0} min`]].map(([label, value]) => <Grid item xs={6} sm={4} key={String(label)}><Paper variant="outlined" sx={{ p: 0.8, borderRadius: 1.2 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="body2" fontWeight={700}>{value}</Typography></Paper></Grid>)}</Grid>
    <Typography variant="subtitle2" fontWeight={750}>Difficulty Breakdown</Typography><Stack direction="row" gap={0.6} flexWrap="wrap">{(['Easy', 'Medium', 'Hard'] as CandidateAssessmentDifficulty[]).map((level) => <Chip key={level} size="small" variant="outlined" label={`${level} · ${breakdown[level] || 0}`} />)}</Stack>
    <Typography variant="subtitle2" fontWeight={750}>AI Assessment Insights</Typography>
    <Grid container spacing={0.8}>{[{ label: 'Strengths', values: insights.strengths }, { label: 'Areas to improve', values: insights.improvements }].map((group) => <Grid item xs={12} sm={6} key={group.label}><Paper variant="outlined" sx={{ p: 1, borderRadius: 1.2, height: '100%' }}><Typography variant="body2" fontWeight={700}>{group.label}</Typography>{group.values.length ? group.values.map((item, index) => <Typography variant="body2" key={index} sx={{ mt: 0.35, color: '#475569' }}>• {item}</Typography>) : <Typography variant="caption" color="text.secondary">No supported observations available.</Typography>}</Paper></Grid>)}</Grid>
    {insights.nextStep ? <Alert severity="info">Recommended development: {insights.nextStep}</Alert> : null}
  </Stack>;
};
