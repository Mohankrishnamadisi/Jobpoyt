import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, Grid, InputLabel, LinearProgress, MenuItem, Paper, Select, Stack, Typography,
} from '@mui/material';
import {
  ArticleOutlined as ScorecardIcon, CheckCircleOutline as VerifiedIcon, Download as DownloadIcon,
  EmojiEventsOutlined as AwardIcon, Print as PrintIcon,
  VisibilityOutlined as ViewIcon,
} from '@mui/icons-material';
import { candidateAssessmentService, type AssessmentCertificate, type CandidateAssessmentDifficulty } from '@services/candidateAssessments';
import { CertificateArtwork } from '@components/dashboard/CertificateArtwork';

const verificationUrl = (verificationId: string) => `${window.location.origin}/verify-certificate/${encodeURIComponent(verificationId)}`;
const safeName = (value: string) => value.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Candidate';
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date unavailable';
const getDetails = (certificate: AssessmentCertificate) => certificate.scorecard?.scoreDetails || certificate.scoreDetails || {};
const getCompetencies = (certificate: AssessmentCertificate) => certificate.scorecard?.competencyScores || certificate.competencyScores || [];
const getInsights = (certificate: AssessmentCertificate) => certificate.scorecard?.insights || certificate.insights || { strengths: [], improvements: [], nextStep: '' };

const loadBrandImage = async (src: string) => {
  try {
    const image = new Image();
    image.src = src;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(image, 0, 0);
    return { data: canvas.toDataURL('image/png'), ratio: image.naturalWidth / image.naturalHeight };
  } catch {
    return null;
  }
};

const loadBrandLogo = () => loadBrandImage('/Jobpoyt.png');
const loadAchievementBadge = () => loadBrandImage('/images/achivement.png');

const drawCertificate = async (certificate: AssessmentCertificate) => {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const qr = await QRCode.toDataURL(verificationUrl(certificate.verificationId), { errorCorrectionLevel: 'M', margin: 1, width: 200, color: { dark: '#0F172A', light: '#FFFFFF' } });
  const [logo, badge] = await Promise.all([loadBrandLogo(), loadAchievementBadge()]);
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  const navy = '#0F172A';
  const purple = '#7C3AED';
  const muted = '#64748B';
  const score = Number(certificate.score) || 0;
  const maxScore = Number(certificate.maxScore) || 0;
  const percentage = maxScore > 0 ? `${Math.round((score / maxScore) * 100)}% achieved` : '';

  pdf.setFillColor('#F8FAFC');
  pdf.rect(0, 0, width, height, 'F');
  pdf.setFillColor('#FFFFFF');
  pdf.rect(7, 7, width - 14, height - 14, 'F');
  pdf.setDrawColor(navy);
  pdf.setLineWidth(0.75);
  pdf.rect(7, 7, width - 14, height - 14, 'S');
  pdf.setDrawColor(purple);
  pdf.setLineWidth(0.3);
  pdf.rect(10, 10, width - 20, height - 20, 'S');

  if (logo) {
    const logoWidth = 43;
    pdf.addImage(logo.data, 'PNG', 19, 15, logoWidth, logoWidth / logo.ratio);
  } else {
    pdf.setTextColor(navy);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.text('JOBPOYT', 19, 24);
  }
  pdf.setTextColor(muted);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.text('FIND. APPLY. GROW.', 19, 33);

  if (badge) pdf.addImage(badge.data, 'PNG', width - 48, 13, 28, 28);

  pdf.setTextColor(purple);
  pdf.setFont('times', 'bold');
  pdf.setFontSize(25);
  pdf.text('CERTIFICATE OF ACHIEVEMENT', width / 2, 51, { align: 'center', maxWidth: width - 80 });
  pdf.setTextColor(muted); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11);
  pdf.text('This certificate is proudly presented to', width / 2, 64, { align: 'center' });

  const candidateLines = pdf.splitTextToSize(certificate.candidateName, width - 76).slice(0, 2);
  pdf.setTextColor(navy); pdf.setFont('times', 'bold'); pdf.setFontSize(candidateLines.length > 1 ? 27 : 32);
  pdf.text(candidateLines, width / 2, 79, { align: 'center', lineHeightFactor: 1.05 });
  pdf.setTextColor(muted); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
  pdf.text('for successfully completing the', width / 2, 96, { align: 'center' });

  const assessmentLines = pdf.splitTextToSize(certificate.assessmentTitle, width - 86).slice(0, 2);
  pdf.setTextColor('#312E81'); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(assessmentLines.length > 1 ? 16 : 19);
  pdf.text(assessmentLines, width / 2, 107, { align: 'center', lineHeightFactor: 1.05 });
  pdf.setTextColor(muted); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
  pdf.text(`${certificate.assessmentCategory}  |  ${certificate.difficulty} difficulty`, width / 2, 119, { align: 'center' });

  const scoreX = width / 2;
  pdf.setFillColor('#FFFFFF'); pdf.setDrawColor('#CBD5E1'); pdf.setLineWidth(0.4);
  pdf.roundedRect(scoreX - 42, 125, 84, 31, 1.5, 1.5, 'FD');
  pdf.setTextColor(muted); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8);
  pdf.text('FINAL ASSESSMENT SCORE', scoreX, 132, { align: 'center' });
  pdf.setTextColor(navy); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(19);
  pdf.text(`${score} / ${maxScore}`, scoreX, 143, { align: 'center' });
  if (percentage) { pdf.setTextColor(muted); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.text(percentage, scoreX, 151, { align: 'center' }); }

  const metadata = [
    { label: 'ASSESSMENT CATEGORY', value: certificate.assessmentCategory },
    { label: 'DIFFICULTY', value: certificate.difficulty },
    { label: 'COMPLETED', value: formatDate(certificate.completionDate) },
    { label: 'ISSUED', value: formatDate(certificate.issueDate) },
  ];
  const metaY = 165;
  const metaWidth = 220;
  const cellWidth = metaWidth / metadata.length;
  const metaStart = (width - metaWidth) / 2;
  pdf.setDrawColor('#CBD5E1'); pdf.setLineWidth(0.3);
  pdf.line(metaStart, metaY - 5, metaStart + metaWidth, metaY - 5);
  pdf.line(metaStart, metaY + 7, metaStart + metaWidth, metaY + 7);
  metadata.forEach((item, index) => {
    const center = metaStart + (index * cellWidth) + (cellWidth / 2);
    if (index > 0) pdf.line(metaStart + index * cellWidth, metaY - 4, metaStart + index * cellWidth, metaY + 6);
    pdf.setTextColor(muted); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7);
    pdf.text(item.label, center, metaY - 0.5, { align: 'center', maxWidth: cellWidth - 3 });
    pdf.setTextColor(navy); pdf.setFontSize(9);
    pdf.text(item.value, center, metaY + 4.5, { align: 'center', maxWidth: cellWidth - 3 });
  });

  pdf.setDrawColor(navy); pdf.setLineWidth(0.35); pdf.line(22, 183, 50, 183);
  pdf.setTextColor(navy); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.text('JobPoyt', 22, 188);
  pdf.setTextColor(muted); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6); pdf.text('Authorized Issuer', 22, 193);
  pdf.setFontSize(6.2); pdf.text(`Certificate ID: ${certificate.certificateId}`, width / 2, 193, { align: 'center', maxWidth: 120 });
  pdf.addImage(qr, 'PNG', width - 44, 174, 22, 22);
  pdf.setTextColor(muted); pdf.setFontSize(5.8); pdf.text('VERIFY THIS CERTIFICATE', width - 30, 175, { align: 'center' });

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
      const pdf = await drawCertificate(certificate);
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
      const pdf = await drawCertificate(certificate);
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
          {viewer ? <CertificateArtwork certificate={viewer} qrCode={previewQr} /> : null}
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
