import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { RecruiterPageHero } from './RecruiterPageHero';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIndicatorIcon,
  Download as DownloadIcon,
  Preview as PreviewIcon,
  Publish as PublishIcon,
  Save as SaveIcon,
  SmartToy as SmartToyIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { recruiterService } from '@services/api';
import { themeColors } from '@styles/recruiterTheme';
import {
  BrandingAward,
  BrandingBenefit,
  BrandingFaq,
  BrandingGalleryItem,
  BrandingLeader,
  BrandingLocation,
  BrandingTestimonial,
  CareerSectionKey,
  employerBrandingService,
  EmployerBrandingProfile,
} from '@services/employerBranding';
import { ROUTES } from '@constants/index';

interface EmployerBrandingCenterProps {
  recruiterId: string;
  recruiterName?: string;
  recruiterEmail?: string;
  recruiterProfile?: Record<string, unknown> | null;
  jobs: Array<Record<string, unknown>>;
}

type BrandingTab =
  | 'dashboard'
  | 'company'
  | 'about'
  | 'locations'
  | 'benefits'
  | 'life'
  | 'culture'
  | 'leadership'
  | 'builder'
  | 'theme'
  | 'testimonials'
  | 'awards'
  | 'faq'
  | 'contact'
  | 'seo'
  | 'analytics'
  | 'ai';

const MotionBox = motion(Box);

const socialFields: Array<{ key: keyof EmployerBrandingProfile; label: string }> = [
  { key: 'linkedIn', label: 'LinkedIn' },
  { key: 'twitter', label: 'Twitter/X' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
];

const defaultOffice = (): BrandingLocation => ({
  id: `office_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  country: '',
  state: '',
  city: '',
  address: '',
  mapsLink: '',
  remoteHiring: false,
  hybridHiring: false,
});

const defaultBenefit = (): BrandingBenefit => ({
  id: `benefit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  title: '',
  description: '',
});

const defaultGalleryItem = (): BrandingGalleryItem => ({
  id: `gallery_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  type: 'image',
  title: '',
  url: '',
  category: 'Office Photos',
});

const defaultLeader = (): BrandingLeader => ({
  id: `leader_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  photo: '',
  name: '',
  role: '',
  bio: '',
  linkedIn: '',
});

const defaultTestimonial = (): BrandingTestimonial => ({
  id: `testi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  photo: '',
  name: '',
  role: '',
  department: '',
  experience: '',
  rating: 5,
  videoUrl: '',
});

const defaultAward = (): BrandingAward => ({
  id: `award_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  title: '',
  issuer: '',
  year: '',
  description: '',
});

const defaultFaq = (): BrandingFaq => ({
  id: `faq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  question: '',
  answer: '',
});

export const EmployerBrandingCenter: React.FC<EmployerBrandingCenterProps> = ({
  recruiterId,
  recruiterName = 'Company',
  recruiterEmail = '',
  recruiterProfile,
  jobs,
}) => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const [tab, setTab] = useState<BrandingTab>('dashboard');
  const [profile, setProfile] = useState<EmployerBrandingProfile | null>(null);
  const [canEdit, setCanEdit] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [draggingSection, setDraggingSection] = useState<CareerSectionKey | null>(null);

  useEffect(() => {
    const loaded = employerBrandingService.getProfile(recruiterId, recruiterName, recruiterEmail);
    setProfile(loaded);
    setCanEdit(employerBrandingService.canEdit(recruiterProfile, recruiterId, loaded));
  }, [recruiterId, recruiterName, recruiterEmail, recruiterProfile]);

  const scoreData = useMemo(() => (profile ? employerBrandingService.getBrandScore(profile) : null), [profile]);
  const metrics = useMemo(() => (profile ? employerBrandingService.getDashboardMetrics(profile) : null), [profile]);
  const aiPack = useMemo(() => (profile ? employerBrandingService.getAiSuggestions(profile) : null), [profile]);

  const updateProfile = (updater: (current: EmployerBrandingProfile) => EmployerBrandingProfile): void => {
    setProfile((current) => {
      if (!current) return current;
      return updater(current);
    });
  };

  const persist = async (): Promise<void> => {
    if (!profile) return;
    if (!canEdit) {
      toast.error('Only company admins can edit employer branding.');
      return;
    }

    setSaving(true);
    try {
      const nextSlug = employerBrandingService.ensureUniqueSlug(recruiterId, profile.seo.slug || profile.companyName);
      const saved = employerBrandingService.saveProfile(recruiterId, {
        ...profile,
        seo: {
          ...profile.seo,
          slug: nextSlug,
        },
      });

      await recruiterService.updateRecruiterProfile(recruiterId, {
        companyName: saved.companyName,
        companyEmail: saved.companyEmail,
        companyPhone: saved.phoneNumber,
        companyWebsite: saved.website,
        companyAddress: saved.officeAddress || saved.headquarters,
        companyLogoUrl: saved.logo,
        companyDescription: saved.story || saved.tagline,
        industryType: saved.industry,
        employeeCount: saved.companySize,
        hrContactPerson: saved.hrContact,
        hrEmail: saved.recruitmentEmail,
        location: saved.headquarters,
      });

      setProfile(saved);
      toast.success('Employer branding saved successfully');
    } catch (error: any) {
      console.error('Failed to save branding profile:', error);
      toast.error(String(error?.message || 'Failed to save branding profile'));
    } finally {
      setSaving(false);
    }
  };

  const publish = (): void => {
    if (!profile) return;
    if (!canEdit) {
      toast.error('Only company admins can publish.');
      return;
    }

    const next = employerBrandingService.publish(recruiterId);
    setProfile(next);
    toast.success('Career page published');
  };

  const exportPdf = (): void => {
    if (!profile) return;
    const html = `
      <html>
        <head>
          <title>${profile.companyName} Career Page</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 28px; }
            h1, h2 { margin-bottom: 6px; }
            p { line-height: 1.5; color: #333; }
            .section { margin-bottom: 18px; }
          </style>
        </head>
        <body>
          <h1>${profile.companyName} Careers</h1>
          <p>${profile.tagline}</p>
          <div class="section"><h2>Mission</h2><p>${profile.mission || '-'}</p></div>
          <div class="section"><h2>Vision</h2><p>${profile.vision || '-'}</p></div>
          <div class="section"><h2>Story</h2><p>${profile.story || '-'}</p></div>
          <div class="section"><h2>Benefits</h2><p>${profile.benefits.map((item) => item.title).join(', ') || '-'}</p></div>
          <div class="section"><h2>Culture</h2><p>${profile.workCulture || '-'}</p></div>
          <div class="section"><h2>Contact</h2><p>${profile.recruitmentEmail || '-'}</p></div>
        </body>
      </html>
    `;

    const win = window.open('', '_blank', 'width=1200,height=800');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const onSectionDrop = (target: CareerSectionKey): void => {
    if (!profile || !draggingSection || draggingSection === target) return;
    const order = [...profile.sectionOrder];
    const from = order.indexOf(draggingSection);
    const to = order.indexOf(target);
    if (from < 0 || to < 0) return;
    order.splice(from, 1);
    order.splice(to, 0, draggingSection);
    updateProfile((current) => ({ ...current, sectionOrder: order }));
    setDraggingSection(null);
  };

  if (!profile || !metrics || !scoreData || !aiPack) {
    return (
      <Card><CardContent><Typography>Loading employer branding...</Typography></CardContent></Card>
    );
  }

  const publicCareerUrl = `${window.location.origin}/#${ROUTES.COMPANY_CAREER_PAGE.replace(':slug', profile.seo.slug)}`;

  const readOnlyAlert = !canEdit ? (
    <Alert severity="info" sx={{ mb: 2 }}>
      You have view-only access. Only company admins can edit employer branding data.
    </Alert>
  ) : null;

  return (
    <MotionBox initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <RecruiterPageHero
        eyebrow="Company"
        icon={<PreviewIcon />}
        title="Employer Branding"
        description="Build and publish your career page experience, branding assets, and hiring story."
        actions={(
          <>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={() => void persist()} disabled={saving || !canEdit}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outlined" startIcon={<PreviewIcon />} onClick={() => setPreviewOpen(true)}>Preview</Button>
            <Button variant="outlined" startIcon={<PublishIcon />} onClick={publish}>Publish</Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportPdf}>Export PDF</Button>
          </>
        )}
      />

      <Paper sx={{ p: 1.2, borderRadius: 2, border: `1px solid ${themeColors.border}`, mb: 2 }}>
        <Typography variant="caption" sx={{ color: themeColors.text.secondary }}>
          Public Career Page: {publicCareerUrl}
        </Typography>
      </Paper>

      {readOnlyAlert}

      <Paper sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}`, mb: 2 }}>
        <Tabs value={tab} onChange={(_, value: BrandingTab) => setTab(value)} variant={isTablet ? 'scrollable' : 'scrollable'} scrollButtons="auto" allowScrollButtonsMobile sx={{ minHeight: 54, px: 0.5, '& .MuiTabs-scroller': { overflowX: 'auto !important' }, '& .MuiTabs-scrollButtons': { width: 34, borderRadius: 1, mx: 0.5 }, '& .MuiTab-root': { textTransform: 'none', whiteSpace: 'nowrap', minHeight: 54, minWidth: 'max-content', px: 1.8, fontWeight: 700, fontSize: '0.82rem' } }}>
          <Tab value="dashboard" label="Dashboard" />
          <Tab value="company" label="Company Profile" />
          <Tab value="about" label="About" />
          <Tab value="locations" label="Office Locations" />
          <Tab value="benefits" label="Benefits" />
          <Tab value="life" label="Life at Company" />
          <Tab value="culture" label="Culture" />
          <Tab value="leadership" label="Leadership" />
          <Tab value="builder" label="Page Builder" />
          <Tab value="theme" label="Theme" />
          <Tab value="testimonials" label="Testimonials" />
          <Tab value="awards" label="Awards" />
          <Tab value="faq" label="FAQ" />
          <Tab value="contact" label="Contact" />
          <Tab value="seo" label="SEO" />
          <Tab value="analytics" label="Analytics" />
          <Tab value="ai" label="AI Suggestions" />
        </Tabs>
      </Paper>

      {tab === 'dashboard' && (
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={4}><Card><CardContent><Typography variant="body2">Career Page Views</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{metrics.careerPageViews}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={4}><Card><CardContent><Typography variant="body2">Company Followers</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{metrics.companyFollowers}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={4}><Card><CardContent><Typography variant="body2">Job Page Views</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{metrics.jobPageViews}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={4}><Card><CardContent><Typography variant="body2">Applications Generated</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{metrics.applicationsGenerated}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={4}><Card><CardContent><Typography variant="body2">Brand Score</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{metrics.brandScore}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={4}><Card><CardContent><Typography variant="body2">Profile Completion</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{metrics.profileCompletion}%</Typography></CardContent></Card></Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Brand Score Suggestions</Typography>
                <Stack spacing={0.8}>
                  {scoreData.suggestions.length === 0 ? (
                    <Alert severity="success">Great job. Your branding profile is strong.</Alert>
                  ) : scoreData.suggestions.map((tip) => <Alert key={tip} severity="info">{tip}</Alert>)}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'company' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={6}><TextField fullWidth label="Company Name" value={profile.companyName} onChange={(event) => updateProfile((current) => ({ ...current, companyName: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Tagline" value={profile.tagline} onChange={(event) => updateProfile((current) => ({ ...current, tagline: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Logo URL" value={profile.logo} onChange={(event) => updateProfile((current) => ({ ...current, logo: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Cover Banner URL" value={profile.coverBanner} onChange={(event) => updateProfile((current) => ({ ...current, coverBanner: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="Industry" value={profile.industry} onChange={(event) => updateProfile((current) => ({ ...current, industry: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="Company Size" value={profile.companySize} onChange={(event) => updateProfile((current) => ({ ...current, companySize: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="Founded Year" value={profile.foundedYear} onChange={(event) => updateProfile((current) => ({ ...current, foundedYear: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Headquarters" value={profile.headquarters} onChange={(event) => updateProfile((current) => ({ ...current, headquarters: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Website" value={profile.website} onChange={(event) => updateProfile((current) => ({ ...current, website: event.target.value }))} disabled={!canEdit} /></Grid>
          {socialFields.map((field) => (
            <Grid item xs={12} md={4} key={field.key}><TextField fullWidth label={field.label} value={String(profile[field.key] || '')} onChange={(event) => updateProfile((current) => ({ ...current, [field.key]: event.target.value }))} disabled={!canEdit} /></Grid>
          ))}
          <Grid item xs={12} md={4}><TextField fullWidth label="Company Email" value={profile.companyEmail} onChange={(event) => updateProfile((current) => ({ ...current, companyEmail: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="Support Email" value={profile.supportEmail} onChange={(event) => updateProfile((current) => ({ ...current, supportEmail: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="Phone Number" value={profile.phoneNumber} onChange={(event) => updateProfile((current) => ({ ...current, phoneNumber: event.target.value }))} disabled={!canEdit} /></Grid>
        </Grid>
      )}

      {tab === 'about' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Mission" value={profile.mission} onChange={(event) => updateProfile((current) => ({ ...current, mission: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Vision" value={profile.vision} onChange={(event) => updateProfile((current) => ({ ...current, vision: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Core Values" value={profile.coreValues} onChange={(event) => updateProfile((current) => ({ ...current, coreValues: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={4} label="Company Story" value={profile.story} onChange={(event) => updateProfile((current) => ({ ...current, story: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={4} label="Leadership Message" value={profile.leadershipMessage} onChange={(event) => updateProfile((current) => ({ ...current, leadershipMessage: event.target.value }))} disabled={!canEdit} /></Grid>
        </Grid>
      )}

      {tab === 'locations' && (
        <Box>
          {canEdit && <Button startIcon={<AddIcon />} sx={{ mb: 1.2 }} onClick={() => updateProfile((current) => ({ ...current, locations: [...current.locations, defaultOffice()] }))}>Add Office</Button>}
          <Stack spacing={1}>
            {profile.locations.length === 0 ? <Alert severity="info">No office locations added.</Alert> : profile.locations.map((office) => (
              <Paper key={office.id} sx={{ p: 1.2, border: `1px solid ${themeColors.border}` }}>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={3}><TextField fullWidth label="Country" value={office.country} onChange={(event) => updateProfile((current) => ({ ...current, locations: current.locations.map((item) => item.id === office.id ? { ...item, country: event.target.value } : item) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={3}><TextField fullWidth label="State" value={office.state} onChange={(event) => updateProfile((current) => ({ ...current, locations: current.locations.map((item) => item.id === office.id ? { ...item, state: event.target.value } : item) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={3}><TextField fullWidth label="City" value={office.city} onChange={(event) => updateProfile((current) => ({ ...current, locations: current.locations.map((item) => item.id === office.id ? { ...item, city: event.target.value } : item) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={3}><TextField fullWidth label="Google Maps Link" value={office.mapsLink} onChange={(event) => updateProfile((current) => ({ ...current, locations: current.locations.map((item) => item.id === office.id ? { ...item, mapsLink: event.target.value } : item) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={8}><TextField fullWidth label="Address" value={office.address} onChange={(event) => updateProfile((current) => ({ ...current, locations: current.locations.map((item) => item.id === office.id ? { ...item, address: event.target.value } : item) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={4}>
                    <Stack direction="row" spacing={1}>
                      <Button variant={office.remoteHiring ? 'contained' : 'outlined'} onClick={() => canEdit && updateProfile((current) => ({ ...current, locations: current.locations.map((item) => item.id === office.id ? { ...item, remoteHiring: !item.remoteHiring } : item) }))} disabled={!canEdit}>Remote</Button>
                      <Button variant={office.hybridHiring ? 'contained' : 'outlined'} onClick={() => canEdit && updateProfile((current) => ({ ...current, locations: current.locations.map((item) => item.id === office.id ? { ...item, hybridHiring: !item.hybridHiring } : item) }))} disabled={!canEdit}>Hybrid</Button>
                      {canEdit && <IconButton color="error" onClick={() => updateProfile((current) => ({ ...current, locations: current.locations.filter((item) => item.id !== office.id) }))}><DeleteIcon /></IconButton>}
                    </Stack>
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {tab === 'benefits' && (
        <Box>
          {canEdit && <Button startIcon={<AddIcon />} sx={{ mb: 1.2 }} onClick={() => updateProfile((current) => ({ ...current, benefits: [...current.benefits, defaultBenefit()] }))}>Add Benefit Card</Button>}
          <Stack spacing={1}>
            {profile.benefits.length === 0 ? <Alert severity="info">No benefits added yet.</Alert> : profile.benefits.map((benefit) => (
              <Paper key={benefit.id} sx={{ p: 1.2, border: `1px solid ${themeColors.border}` }}>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={4}><TextField fullWidth label="Benefit" value={benefit.title} onChange={(event) => updateProfile((current) => ({ ...current, benefits: current.benefits.map((item) => item.id === benefit.id ? { ...item, title: event.target.value } : item) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={7}><TextField fullWidth label="Description" value={benefit.description} onChange={(event) => updateProfile((current) => ({ ...current, benefits: current.benefits.map((item) => item.id === benefit.id ? { ...item, description: event.target.value } : item) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={1}>{canEdit && <IconButton color="error" onClick={() => updateProfile((current) => ({ ...current, benefits: current.benefits.filter((item) => item.id !== benefit.id) }))}><DeleteIcon /></IconButton>}</Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {tab === 'life' && (
        <Box>
          {canEdit && <Button startIcon={<AddIcon />} sx={{ mb: 1.2 }} onClick={() => updateProfile((current) => ({ ...current, gallery: [...current.gallery, defaultGalleryItem()] }))}>Add Gallery Item</Button>}
          <Grid container spacing={1.2}>
            {profile.gallery.length === 0 ? (
              <Grid item xs={12}><Alert severity="info">Add office photos, videos, and events to build gallery grid.</Alert></Grid>
            ) : profile.gallery.map((item) => (
              <Grid item xs={12} md={6} lg={4} key={item.id}>
                <Card>
                  <CardContent>
                    <Grid container spacing={1}>
                      <Grid item xs={12}><FormControl fullWidth size="small"><InputLabel>Type</InputLabel><Select value={item.type} label="Type" onChange={(event) => updateProfile((current) => ({ ...current, gallery: current.gallery.map((row) => row.id === item.id ? { ...row, type: event.target.value as 'image' | 'video' } : row) }))} disabled={!canEdit}><MenuItem value="image">Image</MenuItem><MenuItem value="video">Video</MenuItem></Select></FormControl></Grid>
                      <Grid item xs={12}><TextField fullWidth size="small" label="Title" value={item.title} onChange={(event) => updateProfile((current) => ({ ...current, gallery: current.gallery.map((row) => row.id === item.id ? { ...row, title: event.target.value } : row) }))} disabled={!canEdit} /></Grid>
                      <Grid item xs={12}><TextField fullWidth size="small" label="URL" value={item.url} onChange={(event) => updateProfile((current) => ({ ...current, gallery: current.gallery.map((row) => row.id === item.id ? { ...row, url: event.target.value } : row) }))} disabled={!canEdit} /></Grid>
                      <Grid item xs={12}><TextField fullWidth size="small" label="Category" value={item.category} onChange={(event) => updateProfile((current) => ({ ...current, gallery: current.gallery.map((row) => row.id === item.id ? { ...row, category: event.target.value } : row) }))} disabled={!canEdit} /></Grid>
                      {canEdit && <Grid item xs={12}><Button color="error" size="small" onClick={() => updateProfile((current) => ({ ...current, gallery: current.gallery.filter((row) => row.id !== item.id) }))}>Remove</Button></Grid>}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {tab === 'culture' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Work Culture" value={profile.workCulture} onChange={(event) => updateProfile((current) => ({ ...current, workCulture: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Engineering Culture" value={profile.engineeringCulture} onChange={(event) => updateProfile((current) => ({ ...current, engineeringCulture: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Design Culture" value={profile.designCulture} onChange={(event) => updateProfile((current) => ({ ...current, designCulture: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Management Style" value={profile.managementStyle} onChange={(event) => updateProfile((current) => ({ ...current, managementStyle: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Learning Environment" value={profile.learningEnvironment} onChange={(event) => updateProfile((current) => ({ ...current, learningEnvironment: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Employee Growth" value={profile.employeeGrowth} onChange={(event) => updateProfile((current) => ({ ...current, employeeGrowth: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Diversity & Inclusion" value={profile.diversityAndInclusion} onChange={(event) => updateProfile((current) => ({ ...current, diversityAndInclusion: event.target.value }))} disabled={!canEdit} /></Grid>
        </Grid>
      )}

      {tab === 'leadership' && (
        <Box>
          {canEdit && <Button startIcon={<AddIcon />} sx={{ mb: 1.2 }} onClick={() => updateProfile((current) => ({ ...current, leadershipTeam: [...current.leadershipTeam, defaultLeader()] }))}>Add Leader</Button>}
          <Stack spacing={1}>
            {profile.leadershipTeam.length === 0 ? <Alert severity="info">No leadership members added.</Alert> : profile.leadershipTeam.map((leader) => (
              <Paper key={leader.id} sx={{ p: 1.2, border: `1px solid ${themeColors.border}` }}>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={3}><TextField fullWidth label="Photo URL" value={leader.photo} onChange={(event) => updateProfile((current) => ({ ...current, leadershipTeam: current.leadershipTeam.map((row) => row.id === leader.id ? { ...row, photo: event.target.value } : row) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={3}><TextField fullWidth label="Name" value={leader.name} onChange={(event) => updateProfile((current) => ({ ...current, leadershipTeam: current.leadershipTeam.map((row) => row.id === leader.id ? { ...row, name: event.target.value } : row) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={3}><TextField fullWidth label="Role" value={leader.role} onChange={(event) => updateProfile((current) => ({ ...current, leadershipTeam: current.leadershipTeam.map((row) => row.id === leader.id ? { ...row, role: event.target.value } : row) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={3}><TextField fullWidth label="LinkedIn" value={leader.linkedIn} onChange={(event) => updateProfile((current) => ({ ...current, leadershipTeam: current.leadershipTeam.map((row) => row.id === leader.id ? { ...row, linkedIn: event.target.value } : row) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={11}><TextField fullWidth multiline minRows={2} label="Bio" value={leader.bio} onChange={(event) => updateProfile((current) => ({ ...current, leadershipTeam: current.leadershipTeam.map((row) => row.id === leader.id ? { ...row, bio: event.target.value } : row) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={1}>{canEdit && <IconButton color="error" onClick={() => updateProfile((current) => ({ ...current, leadershipTeam: current.leadershipTeam.filter((row) => row.id !== leader.id) }))}><DeleteIcon /></IconButton>}</Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {tab === 'builder' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.2 }}>Drag & Drop Career Page Builder</Typography>
                <Stack spacing={0.8}>
                  {profile.sectionOrder.map((section) => {
                    const labels = employerBrandingService.getSectionLabels();
                    return (
                      <Paper
                        key={section}
                        draggable={canEdit}
                        onDragStart={() => setDraggingSection(section)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => onSectionDrop(section)}
                        sx={{
                          p: 1,
                          border: `1px solid ${themeColors.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: canEdit ? 'grab' : 'default',
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <DragIndicatorIcon fontSize="small" />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{labels[section]}</Typography>
                        </Stack>
                        <Button
                          size="small"
                          variant={profile.sectionEnabled[section] ? 'contained' : 'outlined'}
                          onClick={() => canEdit && updateProfile((current) => ({
                            ...current,
                            sectionEnabled: { ...current.sectionEnabled, [section]: !current.sectionEnabled[section] },
                          }))}
                          disabled={!canEdit}
                        >
                          {profile.sectionEnabled[section] ? 'Visible' : 'Hidden'}
                        </Button>
                      </Paper>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.2 }}>Custom HTML Block</Typography>
                <TextField
                  fullWidth
                  multiline
                  minRows={9}
                  value={profile.customHtml}
                  onChange={(event) => updateProfile((current) => ({ ...current, customHtml: event.target.value }))}
                  disabled={!canEdit}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'theme' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}><TextField type="color" fullWidth label="Primary Color" value={profile.theme.primaryColor} onChange={(event) => updateProfile((current) => ({ ...current, theme: { ...current.theme, primaryColor: event.target.value } }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12} md={4}><TextField type="color" fullWidth label="Secondary Color" value={profile.theme.secondaryColor} onChange={(event) => updateProfile((current) => ({ ...current, theme: { ...current.theme, secondaryColor: event.target.value } }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="Fonts" value={profile.theme.fontFamily} onChange={(event) => updateProfile((current) => ({ ...current, theme: { ...current.theme, fontFamily: event.target.value } }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12} md={4}><FormControl fullWidth><InputLabel>Button Style</InputLabel><Select value={profile.theme.buttonStyle} label="Button Style" onChange={(event) => updateProfile((current) => ({ ...current, theme: { ...current.theme, buttonStyle: event.target.value as any } }))} disabled={!canEdit}><MenuItem value="rounded">Rounded</MenuItem><MenuItem value="pill">Pill</MenuItem><MenuItem value="square">Square</MenuItem></Select></FormControl></Grid>
          <Grid item xs={12} md={4}><FormControl fullWidth><InputLabel>Card Style</InputLabel><Select value={profile.theme.cardStyle} label="Card Style" onChange={(event) => updateProfile((current) => ({ ...current, theme: { ...current.theme, cardStyle: event.target.value as any } }))} disabled={!canEdit}><MenuItem value="flat">Flat</MenuItem><MenuItem value="elevated">Elevated</MenuItem><MenuItem value="outlined">Outlined</MenuItem></Select></FormControl></Grid>
          <Grid item xs={12} md={4}><FormControl fullWidth><InputLabel>Mode</InputLabel><Select value={profile.theme.mode} label="Mode" onChange={(event) => updateProfile((current) => ({ ...current, theme: { ...current.theme, mode: event.target.value as any } }))} disabled={!canEdit}><MenuItem value="light">Light</MenuItem><MenuItem value="dark">Dark</MenuItem></Select></FormControl></Grid>
          <Grid item xs={12} md={4}><TextField type="number" fullWidth label="Border Radius" value={profile.theme.borderRadius} onChange={(event) => updateProfile((current) => ({ ...current, theme: { ...current.theme, borderRadius: Number(event.target.value || 12) } }))} disabled={!canEdit} /></Grid>
        </Grid>
      )}

      {tab === 'testimonials' && (
        <Box>
          {canEdit && <Button startIcon={<AddIcon />} sx={{ mb: 1.2 }} onClick={() => updateProfile((current) => ({ ...current, testimonials: [...current.testimonials, defaultTestimonial()] }))}>Add Testimonial</Button>}
          <Stack spacing={1}>
            {profile.testimonials.length === 0 ? <Alert severity="info">No testimonials yet.</Alert> : profile.testimonials.map((item) => (
              <Paper key={item.id} sx={{ p: 1.2, border: `1px solid ${themeColors.border}` }}>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={2}><TextField fullWidth label="Photo" value={item.photo} onChange={(event) => updateProfile((current) => ({ ...current, testimonials: current.testimonials.map((row) => row.id === item.id ? { ...row, photo: event.target.value } : row) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={2}><TextField fullWidth label="Name" value={item.name} onChange={(event) => updateProfile((current) => ({ ...current, testimonials: current.testimonials.map((row) => row.id === item.id ? { ...row, name: event.target.value } : row) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={2}><TextField fullWidth label="Role" value={item.role} onChange={(event) => updateProfile((current) => ({ ...current, testimonials: current.testimonials.map((row) => row.id === item.id ? { ...row, role: event.target.value } : row) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={2}><TextField fullWidth label="Department" value={item.department} onChange={(event) => updateProfile((current) => ({ ...current, testimonials: current.testimonials.map((row) => row.id === item.id ? { ...row, department: event.target.value } : row) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={2}><TextField fullWidth type="number" label="Rating" value={item.rating} onChange={(event) => updateProfile((current) => ({ ...current, testimonials: current.testimonials.map((row) => row.id === item.id ? { ...row, rating: Number(event.target.value || 0) } : row) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={2}><TextField fullWidth label="Video URL" value={item.videoUrl} onChange={(event) => updateProfile((current) => ({ ...current, testimonials: current.testimonials.map((row) => row.id === item.id ? { ...row, videoUrl: event.target.value } : row) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={11}><TextField fullWidth label="Experience" value={item.experience} onChange={(event) => updateProfile((current) => ({ ...current, testimonials: current.testimonials.map((row) => row.id === item.id ? { ...row, experience: event.target.value } : row) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={1}>{canEdit && <IconButton color="error" onClick={() => updateProfile((current) => ({ ...current, testimonials: current.testimonials.filter((row) => row.id !== item.id) }))}><DeleteIcon /></IconButton>}</Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {tab === 'awards' && (
        <Box>
          {canEdit && <Button startIcon={<AddIcon />} sx={{ mb: 1.2 }} onClick={() => updateProfile((current) => ({ ...current, awards: [...current.awards, defaultAward()] }))}>Add Award</Button>}
          <Stack spacing={1}>
            {profile.awards.length === 0 ? <Alert severity="info">No awards or certifications added.</Alert> : profile.awards.map((item) => (
              <Paper key={item.id} sx={{ p: 1.2, border: `1px solid ${themeColors.border}` }}>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={4}><TextField fullWidth label="Award Title" value={item.title} onChange={(event) => updateProfile((current) => ({ ...current, awards: current.awards.map((row) => row.id === item.id ? { ...row, title: event.target.value } : row) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={3}><TextField fullWidth label="Issuer" value={item.issuer} onChange={(event) => updateProfile((current) => ({ ...current, awards: current.awards.map((row) => row.id === item.id ? { ...row, issuer: event.target.value } : row) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={2}><TextField fullWidth label="Year" value={item.year} onChange={(event) => updateProfile((current) => ({ ...current, awards: current.awards.map((row) => row.id === item.id ? { ...row, year: event.target.value } : row) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={2}><TextField fullWidth label="Description" value={item.description} onChange={(event) => updateProfile((current) => ({ ...current, awards: current.awards.map((row) => row.id === item.id ? { ...row, description: event.target.value } : row) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={1}>{canEdit && <IconButton color="error" onClick={() => updateProfile((current) => ({ ...current, awards: current.awards.filter((row) => row.id !== item.id) }))}><DeleteIcon /></IconButton>}</Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {tab === 'faq' && (
        <Box>
          {canEdit && <Button startIcon={<AddIcon />} sx={{ mb: 1.2 }} onClick={() => updateProfile((current) => ({ ...current, faqs: [...current.faqs, defaultFaq()] }))}>Add FAQ</Button>}
          <Stack spacing={1}>
            {profile.faqs.length === 0 ? <Alert severity="info">No FAQs added.</Alert> : profile.faqs.map((item) => (
              <Paper key={item.id} sx={{ p: 1.2, border: `1px solid ${themeColors.border}` }}>
                <Grid container spacing={1}>
                  <Grid item xs={12}><TextField fullWidth label="Question" value={item.question} onChange={(event) => updateProfile((current) => ({ ...current, faqs: current.faqs.map((row) => row.id === item.id ? { ...row, question: event.target.value } : row) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={11}><TextField fullWidth multiline minRows={2} label="Answer" value={item.answer} onChange={(event) => updateProfile((current) => ({ ...current, faqs: current.faqs.map((row) => row.id === item.id ? { ...row, answer: event.target.value } : row) }))} disabled={!canEdit} /></Grid>
                  <Grid item xs={12} md={1}>{canEdit && <IconButton color="error" onClick={() => updateProfile((current) => ({ ...current, faqs: current.faqs.filter((row) => row.id !== item.id) }))}><DeleteIcon /></IconButton>}</Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {tab === 'contact' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={6}><TextField fullWidth label="Recruitment Email" value={profile.recruitmentEmail} onChange={(event) => updateProfile((current) => ({ ...current, recruitmentEmail: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="HR Contact" value={profile.hrContact} onChange={(event) => updateProfile((current) => ({ ...current, hrContact: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12}><TextField fullWidth label="Office Address" value={profile.officeAddress} onChange={(event) => updateProfile((current) => ({ ...current, officeAddress: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12}><TextField fullWidth label="Map Link" value={profile.mapLink} onChange={(event) => updateProfile((current) => ({ ...current, mapLink: event.target.value }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12}><Typography variant="caption" color="text.secondary">Social links are editable in Company Profile tab.</Typography></Grid>
        </Grid>
      )}

      {tab === 'seo' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><TextField fullWidth label="Career Page Title" value={profile.seo.pageTitle} onChange={(event) => updateProfile((current) => ({ ...current, seo: { ...current.seo, pageTitle: event.target.value } }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Meta Description" value={profile.seo.metaDescription} onChange={(event) => updateProfile((current) => ({ ...current, seo: { ...current.seo, metaDescription: event.target.value } }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12}><TextField fullWidth label="Keywords" value={profile.seo.keywords} onChange={(event) => updateProfile((current) => ({ ...current, seo: { ...current.seo, keywords: event.target.value } }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="OpenGraph Image" value={profile.seo.ogImage} onChange={(event) => updateProfile((current) => ({ ...current, seo: { ...current.seo, ogImage: event.target.value } }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Slug" value={profile.seo.slug} onChange={(event) => updateProfile((current) => ({ ...current, seo: { ...current.seo, slug: event.target.value } }))} disabled={!canEdit} /></Grid>
          <Grid item xs={12}><TextField fullWidth label="Canonical URL" value={profile.seo.canonicalUrl} onChange={(event) => updateProfile((current) => ({ ...current, seo: { ...current.seo, canonicalUrl: event.target.value } }))} disabled={!canEdit} /></Grid>
        </Grid>
      )}

      {tab === 'analytics' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={4}><Card><CardContent><Typography variant="body2">Career Page Views</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{profile.analytics.careerPageViews}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={4}><Card><CardContent><Typography variant="body2">Unique Visitors</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{profile.analytics.uniqueVisitors}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={4}><Card><CardContent><Typography variant="body2">Job Clicks</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{profile.analytics.jobClicks}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={4}><Card><CardContent><Typography variant="body2">Applications</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{profile.analytics.applications}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={4}><Card><CardContent><Typography variant="body2">Conversion Rate</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{profile.analytics.jobClicks > 0 ? `${Math.round((profile.analytics.applications / profile.analytics.jobClicks) * 100)}%` : '0%'}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={4}><Card><CardContent><Typography variant="body2">Average Time On Page</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{profile.analytics.averageTimeOnPageSec}s</Typography></CardContent></Card></Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Traffic Sources</Typography>
                <Stack spacing={0.6}>
                  {Object.keys(profile.analytics.trafficSources || {}).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No source data yet.</Typography>
                  ) : Object.entries(profile.analytics.trafficSources).map(([source, count]) => (
                    <Typography key={source} variant="body2">{source}: {count}</Typography>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Popular Jobs</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Job</TableCell>
                        <TableCell>Clicks</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(profile.analytics.popularJobs || []).slice(0, 6).map((item) => (
                        <TableRow key={item.jobId}><TableCell>{item.title}</TableCell><TableCell>{item.clicks}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'ai' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert icon={<SmartToyIcon fontSize="inherit" />} severity="info">{aiPack.companyDescription}</Alert></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth multiline minRows={3} label="AI Mission" value={aiPack.mission} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth multiline minRows={3} label="AI Vision" value={aiPack.vision} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="AI Culture Message" value={aiPack.culture} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="AI Recruitment Message" value={aiPack.recruitmentMessage} /></Grid>
          <Grid item xs={12} md={6}>
            <Card><CardContent><Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Employer Branding Improvements</Typography><Stack spacing={0.6}>{aiPack.brandingImprovements.map((item) => <Alert key={item} severity="info">{item}</Alert>)}</Stack></CardContent></Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card><CardContent><Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>SEO Suggestions</Typography><Stack spacing={0.6}>{aiPack.seoSuggestions.map((item) => <Alert key={item} severity="success">{item}</Alert>)}</Stack></CardContent></Card>
          </Grid>
        </Grid>
      )}

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Career Page Preview</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 1 }}>Use this URL to preview published output:</Typography>
          <Paper sx={{ p: 1, border: `1px solid ${themeColors.border}`, mb: 1.2 }}>
            <Typography variant="caption">{publicCareerUrl}</Typography>
          </Paper>
          <Button
            variant="outlined"
            onClick={() => window.open(publicCareerUrl, '_blank')}
          >
            Open Public Career Page
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" color="text.secondary">
        Job Integration: Open Jobs, Featured Jobs, Recently Posted Jobs, Popular Jobs, and Remote Jobs are auto-rendered in public career page from recruiter jobs.
      </Typography>

      <Stack direction="row" spacing={0.8} flexWrap="wrap" sx={{ mt: 0.8 }}>
        {jobs.slice(0, 8).map((job) => {
          const title = String(job.title || 'Untitled Job');
          return <Chip key={String(job.id)} label={title} size="small" />;
        })}
      </Stack>
    </MotionBox>
  );
};
