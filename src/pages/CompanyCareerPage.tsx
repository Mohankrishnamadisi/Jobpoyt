import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import {
  employerBrandingService,
  EmployerBrandingProfile,
  CareerSectionKey,
} from '@services/employerBranding';
import { jobService } from '@services/api';
import type { Job } from '@types';
import { SEO } from '@components/seo/SEO';
import { siteConfig } from '@config/site';

const getVisitorId = (): string => {
  const key = 'actro_career_visitor_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = `visitor_${Math.random().toString(36).slice(2, 12)}`;
  localStorage.setItem(key, created);
  return created;
};

const asDate = (value: unknown): number => {
  const parsed = new Date(String(value || '')).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const isRemoteJob = (job: Job): boolean => {
  const mode = String(job.work_mode || job.workMode || '').toLowerCase();
  return mode.includes('remote');
};

export const CompanyCareerPage: React.FC = () => {
  const { slug = '' } = useParams();
  const [profile, setProfile] = useState<EmployerBrandingProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const startedAt = Date.now();
    const visitorId = getVisitorId();
    const source = document.referrer ? 'referral' : 'direct';

    const nextProfile = employerBrandingService.getPublicProfileBySlug(slug);
    setProfile(nextProfile);

    if (nextProfile) {
      employerBrandingService.trackPageView(nextProfile.seo.slug, source, visitorId);
      jobService
        .getRecruiterJobs(nextProfile.recruiterId)
        .then((rows) => {
          const published = (rows || []).filter((item) => String(item.status || '').toLowerCase() !== 'draft');
          setJobs(published);
        })
        .catch(() => setJobs([]))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => {
      if (!nextProfile) return;
      const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      employerBrandingService.saveVisitDuration(nextProfile.seo.slug, visitorId, duration);
    };
  }, [slug]);

  const groupedJobs = useMemo(() => {
    const all = [...jobs].sort((a, b) => asDate(b.created_at || b.createdAt) - asDate(a.created_at || a.createdAt));
    const featured = all.filter((item) => Boolean(item.featured)).slice(0, 6);
    const recent = all.slice(0, 8);
    const remote = all.filter(isRemoteJob).slice(0, 8);
    const popular = [...all]
      .sort((a, b) => Number(b.applicationsCount || 0) - Number(a.applicationsCount || 0))
      .slice(0, 8);

    return {
      all,
      featured,
      recent,
      remote,
      popular,
      open: all.filter((item) => String(item.status || '').toLowerCase() !== 'closed'),
    };
  }, [jobs]);

  const onJobClick = (job: Job): void => {
    if (!profile) return;
    employerBrandingService.trackJobClick(profile.seo.slug, String(job.id), String(job.title || 'Untitled Job'));
  };

  const onApplyClick = (): void => {
    if (!profile) return;
    employerBrandingService.trackApplication(profile.seo.slug);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '65vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="warning">Career page is unavailable or not published.</Alert>
      </Container>
    );
  }

  const visibleSections = profile.sectionOrder.filter((section) => profile.sectionEnabled[section]);
  const sectionVisible = (key: CareerSectionKey): boolean => visibleSections.includes(key);
  const pageTitle = profile.seo.pageTitle || `${profile.companyName} Careers`;
  const careerCanonical = profile.seo.canonicalUrl || `${siteConfig.url}/company/${encodeURIComponent(profile.seo.slug || slug)}`;

  return (
    <>
      <SEO
        title={pageTitle}
        description={profile.seo.metaDescription || `${profile.companyName} careers and current job opportunities on JobPoyt.`}
        canonical={careerCanonical}
        image={profile.seo.ogImage || siteConfig.logo}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteConfig.url}/` },
            { '@type': 'ListItem', position: 2, name: `${profile.companyName} Careers`, item: careerCanonical },
          ],
        }}
      />
    <Box
      sx={{
        background: `linear-gradient(165deg, ${profile.theme.primaryColor}10 0%, #FFFFFF 34%, ${profile.theme.secondaryColor}10 100%)`,
        minHeight: '100vh',
      }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        {sectionVisible('hero') && (
          <Card sx={{ mb: 2, borderRadius: `${profile.theme.borderRadius}px`, overflow: 'hidden' }}>
            <Box
              sx={{
                p: { xs: 2.5, md: 4 },
                background: `linear-gradient(120deg, ${profile.theme.primaryColor} 0%, ${profile.theme.secondaryColor} 100%)`,
                color: '#FFFFFF',
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={2} alignItems="center">
                  {profile.logo ? (
                    <Box component="img" src={profile.logo} alt={profile.companyName} sx={{ width: 74, height: 74, borderRadius: 2, objectFit: 'cover', backgroundColor: '#FFF' }} />
                  ) : (
                    <Box sx={{ width: 74, height: 74, borderRadius: 2, backgroundColor: '#FFF', color: profile.theme.primaryColor, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 28 }}>
                      {profile.companyName.charAt(0).toUpperCase()}
                    </Box>
                  )}
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 900, fontSize: { xs: '1.6rem', md: '2.4rem' } }}>{pageTitle}</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5, opacity: 0.95 }}>{profile.tagline}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                      {profile.industry && <Chip label={profile.industry} sx={{ bgcolor: '#FFFFFF22', color: '#FFF' }} />}
                      {profile.companySize && <Chip label={profile.companySize} sx={{ bgcolor: '#FFFFFF22', color: '#FFF' }} />}
                      {profile.headquarters && <Chip label={profile.headquarters} sx={{ bgcolor: '#FFFFFF22', color: '#FFF' }} />}
                    </Stack>
                  </Box>
                </Stack>
                {profile.website && (
                  <Button variant="contained" href={profile.website} target="_blank" rel="noreferrer" sx={{ bgcolor: '#FFF', color: profile.theme.primaryColor, fontWeight: 700 }}>
                    Company Website
                  </Button>
                )}
              </Stack>
            </Box>
          </Card>
        )}

        <Grid container spacing={2}>
          {sectionVisible('about') && (
            <Grid item xs={12} md={7}>
              <Card sx={{ borderRadius: `${profile.theme.borderRadius}px` }}>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>About Us</Typography>
                  {profile.mission && <Typography sx={{ mb: 1 }}><strong>Mission:</strong> {profile.mission}</Typography>}
                  {profile.vision && <Typography sx={{ mb: 1 }}><strong>Vision:</strong> {profile.vision}</Typography>}
                  {profile.story && <Typography color="text.secondary">{profile.story}</Typography>}
                </CardContent>
              </Card>
            </Grid>
          )}

          {sectionVisible('contact') && (
            <Grid item xs={12} md={5}>
              <Card sx={{ borderRadius: `${profile.theme.borderRadius}px` }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Contact</Typography>
                  <Stack spacing={0.6}>
                    {profile.recruitmentEmail && <Typography>Email: {profile.recruitmentEmail}</Typography>}
                    {profile.phoneNumber && <Typography>Phone: {profile.phoneNumber}</Typography>}
                    {profile.officeAddress && <Typography>Address: {profile.officeAddress}</Typography>}
                    {profile.mapLink && <Link href={profile.mapLink} target="_blank" rel="noreferrer">View Map</Link>}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}

          {sectionVisible('benefits') && (
            <Grid item xs={12}>
              <Card sx={{ borderRadius: `${profile.theme.borderRadius}px` }}>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.2 }}>Benefits & Perks</Typography>
                  <Grid container spacing={1.2}>
                    {profile.benefits.length === 0 ? (
                      <Grid item xs={12}><Typography color="text.secondary">Benefits details coming soon.</Typography></Grid>
                    ) : profile.benefits.map((item) => (
                      <Grid key={item.id} item xs={12} sm={6} md={4}>
                        <Box sx={{ p: 1.2, borderRadius: 2, border: `1px solid ${profile.theme.primaryColor}33` }}>
                          <Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>
                          <Typography variant="body2" color="text.secondary">{item.description}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {sectionVisible('culture') && (
            <Grid item xs={12}>
              <Card sx={{ borderRadius: `${profile.theme.borderRadius}px` }}>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Culture</Typography>
                  <Typography color="text.secondary">{profile.workCulture || profile.diversityAndInclusion || 'Culture details will be updated soon.'}</Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {sectionVisible('leadership') && profile.leadershipTeam.length > 0 && (
            <Grid item xs={12}>
              <Card sx={{ borderRadius: `${profile.theme.borderRadius}px` }}>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.2 }}>Leadership</Typography>
                  <Grid container spacing={1.2}>
                    {profile.leadershipTeam.map((leader) => (
                      <Grid key={leader.id} item xs={12} sm={6} md={4}>
                        <Box sx={{ p: 1.2, borderRadius: 2, border: '1px solid #E5E7EB' }}>
                          <Typography sx={{ fontWeight: 700 }}>{leader.name}</Typography>
                          <Typography variant="body2" sx={{ mb: 0.6 }}>{leader.role}</Typography>
                          <Typography variant="caption" color="text.secondary">{leader.bio}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {sectionVisible('gallery') && profile.gallery.length > 0 && (
            <Grid item xs={12}>
              <Card sx={{ borderRadius: `${profile.theme.borderRadius}px` }}>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.2 }}>Life at {profile.companyName}</Typography>
                  <Grid container spacing={1.2}>
                    {profile.gallery.map((item) => (
                      <Grid key={item.id} item xs={12} sm={6} md={3}>
                        <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #E5E7EB', p: 0.8 }}>
                          {item.url ? (
                            <Box component="img" src={item.url} alt={item.title} sx={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 1.5 }} />
                          ) : (
                            <Box sx={{ height: 160, bgcolor: '#F3F4F6', borderRadius: 1.5 }} />
                          )}
                          <Typography variant="body2" sx={{ mt: 0.6, fontWeight: 600 }}>{item.title}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {sectionVisible('open_positions') && (
            <Grid item xs={12}>
              <Card sx={{ borderRadius: `${profile.theme.borderRadius}px` }}>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.6 }}>Open Positions</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>
                    Open Jobs: {groupedJobs.open.length} | Featured Jobs: {groupedJobs.featured.length} | Remote Jobs: {groupedJobs.remote.length}
                  </Typography>

                  <Grid container spacing={1.2}>
                    {groupedJobs.open.slice(0, 10).map((job) => (
                      <Grid key={job.id} item xs={12} md={6}>
                        <Box sx={{ p: 1.2, border: '1px solid #E5E7EB', borderRadius: 2 }}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                            <Box>
                              <Typography sx={{ fontWeight: 700 }}>{job.title}</Typography>
                              <Typography variant="body2" color="text.secondary">{job.location} • {job.work_mode || job.workMode || '-'} • {job.job_type || job.jobType || '-'}</Typography>
                            </Box>
                            {Boolean(job.featured) && <Chip size="small" color="warning" label="Featured" />}
                          </Stack>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Button size="small" variant="outlined" href={`/#/jobs/${job.id}`} onClick={() => onJobClick(job)}>
                              View Job
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              href={String(job.application_link || job.applicationLink || `/#/jobs/${job.id}`)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={onApplyClick}
                              sx={{ backgroundColor: profile.theme.primaryColor }}
                            >
                              Apply
                            </Button>
                          </Stack>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {sectionVisible('testimonials') && profile.testimonials.length > 0 && (
            <Grid item xs={12}>
              <Card sx={{ borderRadius: `${profile.theme.borderRadius}px` }}>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.2 }}>Employee Testimonials</Typography>
                  <Grid container spacing={1.2}>
                    {profile.testimonials.map((item) => (
                      <Grid key={item.id} item xs={12} md={4}>
                        <Box sx={{ p: 1.2, borderRadius: 2, border: '1px solid #E5E7EB' }}>
                          <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{item.role} • {item.department}</Typography>
                          <Typography variant="body2" sx={{ mt: 0.8 }}>{item.experience}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {sectionVisible('awards') && profile.awards.length > 0 && (
            <Grid item xs={12}>
              <Card sx={{ borderRadius: `${profile.theme.borderRadius}px` }}>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.2 }}>Awards & Certifications</Typography>
                  <Grid container spacing={1.2}>
                    {profile.awards.map((award) => (
                      <Grid key={award.id} item xs={12} sm={6} md={4}>
                        <Box sx={{ p: 1.2, borderRadius: 2, border: '1px solid #E5E7EB' }}>
                          <Typography sx={{ fontWeight: 700 }}>{award.title}</Typography>
                          <Typography variant="body2">{award.issuer} ({award.year})</Typography>
                          <Typography variant="caption" color="text.secondary">{award.description}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {sectionVisible('faq') && profile.faqs.length > 0 && (
            <Grid item xs={12}>
              <Card sx={{ borderRadius: `${profile.theme.borderRadius}px` }}>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.2 }}>FAQ</Typography>
                  <Stack spacing={1}>
                    {profile.faqs.map((item) => (
                      <Box key={item.id}>
                        <Typography sx={{ fontWeight: 700 }}>{item.question}</Typography>
                        <Typography variant="body2" color="text.secondary">{item.answer}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}

          {sectionVisible('custom_html') && profile.customHtml && (
            <Grid item xs={12}>
              <Card sx={{ borderRadius: `${profile.theme.borderRadius}px` }}>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Highlights</Typography>
                  <Divider sx={{ mb: 1.2 }} />
                  <Box dangerouslySetInnerHTML={{ __html: profile.customHtml }} />
                </CardContent>
              </Card>
            </Grid>
          )}

          {sectionVisible('cta') && (
            <Grid item xs={12}>
              <Card sx={{ borderRadius: `${profile.theme.borderRadius}px`, overflow: 'hidden' }}>
                <Box sx={{ p: { xs: 2.2, md: 3 }, background: `linear-gradient(120deg, ${profile.theme.secondaryColor} 0%, ${profile.theme.primaryColor} 100%)`, color: '#FFF' }}>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{profile.ctaTitle || 'Join our team'}</Typography>
                  <Typography sx={{ mt: 0.4 }}>{profile.ctaSubtitle || 'Discover opportunities and grow with us.'}</Typography>
                  <Button
                    sx={{ mt: 1.2, bgcolor: '#FFF', color: profile.theme.primaryColor, fontWeight: 800 }}
                    variant="contained"
                    href={profile.ctaButtonLink || '/#/jobs'}
                  >
                    {profile.ctaButtonLabel || 'View Jobs'}
                  </Button>
                </Box>
              </Card>
            </Grid>
          )}
        </Grid>
      </Container>
    </Box>
    </>
  );
};
