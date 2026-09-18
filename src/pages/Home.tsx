import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Stack,
  Divider,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Card,
  CardContent,
  Chip,
  Autocomplete,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import {
  Search as SearchIcon,
  LocationOn as LocationOnIcon,
  Timeline as TimelineIcon,
  WorkOutline as WorkIcon,
  Code as CodeIcon,
  Storage as StorageIcon,
  Brush as BrushIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  DataObject as DataIcon,
  ArrowForward as ArrowForwardIcon,
  VerifiedUser as VerifiedUserIcon,
  School as SchoolIcon,
  Explore as ExploreIcon,
  EmojiEvents as EmojiEventsIcon,
} from '@mui/icons-material';
import { Layout } from '@components/layout/Layout';
import { ROUTES, JOB_CATEGORIES, INDIAN_CITIES, INTERVIEW_ROLES, INTERVIEW_ROLE_CATEGORIES } from '@constants/index';
import { companyService, jobService } from '@services/api';
import { SEO } from '@components/seo/SEO';
import { knownSocialUrls, siteConfig } from '@config/site';

const MotionBox = motion(Box);
const MotionTypography = motion(Typography);
const MotionButton = motion(Button);
const MotionCard = motion(Card);

const categoryIcons: Record<string, React.ElementType> = {
  'Frontend Developer': CodeIcon,
  'React Developer': CodeIcon,
  'Vue Developer': CodeIcon,
  'Angular Developer': CodeIcon,
  'Full Stack Developer': StorageIcon,
  'Backend Developer': StorageIcon,
  'Python Developer': DataIcon,
  'Java Developer': DataIcon,
  'Testing': SettingsIcon,
  'DevOps': SettingsIcon,
  'Data Analyst': AnalyticsIcon,
  'UI/UX Designer': BrushIcon,
};

const categoryColors = [
  'linear-gradient(180deg, #EFF6FF 0%, #FFFFFF 100%)',
  'linear-gradient(180deg, #ECFDF5 0%, #FFFFFF 100%)',
  'linear-gradient(180deg, #FFFBEB 0%, #FFFFFF 100%)',
  'linear-gradient(180deg, #F0FDFA 0%, #FFFFFF 100%)',
  'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
  'linear-gradient(180deg, #EEF2FF 0%, #FFFFFF 100%)',
];

const darkCategoryColors = ['#111827', '#10231F', '#292313', '#102426', '#111827', '#17152E'];

const suggestedJobs = [
  { title: 'Frontend Developer', company: 'Skyline Labs', location: 'Bangalore', keyword: 'Frontend Developer' },
  { title: 'React Developer', company: 'Nimbus Analytics', location: 'Hyderabad', keyword: 'React Developer' },
  { title: 'Product Designer', company: 'ZetaWorks', location: 'Pune', keyword: 'Product Designer' },
  { title: 'Data Analyst', company: 'Astra Insights', location: 'Gurgaon', keyword: 'Data Analyst' },
];

const topCompanies = [
  { name: 'TCS', hiring: '1.2k roles' },
  { name: 'Infosys', hiring: '950 roles' },
  { name: 'Accenture', hiring: '860 roles' },
  { name: 'Amazon', hiring: '720 roles' },
  { name: 'Microsoft', hiring: '540 roles' },
  { name: 'Wipro', hiring: '430 roles' },
];

const featuredCompanies = [
  { name: 'Unacademy', description: 'Tech and product hiring fast', keyword: 'Unacademy' },
  { name: 'Freshworks', description: 'Engineering & support roles open', keyword: 'Freshworks' },
  { name: 'Delhivery', description: 'Operations and logistics hiring', keyword: 'Delhivery' },
  { name: 'Swiggy', description: 'Growth and product hiring', keyword: 'Swiggy' },
];

const categoryIconColors = [
  '#2563EB',
  '#0F766E',
  '#B7791F',
  '#0E7490',
  '#475569',
  '#4F46E5',
];

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [experience, setExperience] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [selectedRoleCategory, setSelectedRoleCategory] = useState('All');
  const [heroStats, setHeroStats] = useState({ activeJobs: null as number | null, companies: null as number | null });

  useEffect(() => {
    let active = true;

    Promise.all([jobService.getJobs({}, 1, 1), companyService.getCompanyCount()])
      .then(([jobs, companies]) => {
        if (active) setHeroStats({ activeJobs: jobs.total, companies });
      })
      .catch((error) => console.error('Failed to load home hero stats:', error));

    return () => {
      active = false;
    };
  }, []);

  const handleSearch = () => {
    const filters = new URLSearchParams();
    if (searchKeyword) filters.append('keyword', searchKeyword);
    if (searchLocation) filters.append('location', searchLocation);
    if (experience) filters.append('experience', experience);
    navigate(`${ROUTES.JOBS}?${filters.toString()}`);
  };

  const handlePopularSearch = (keyword: string) => {
    setSearchKeyword(keyword);
    const filters = new URLSearchParams();
    filters.append('keyword', keyword);
    navigate(`${ROUTES.JOBS}?${filters.toString()}`);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const roleCardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  const sectionRevealVariants: Variants = {
    hidden: { opacity: 0, y: 22 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.55,
        ease: 'easeOut',
        staggerChildren: 0.08,
        delayChildren: 0.06,
      },
    },
  };

  const sectionItemVariants: Variants = {
    hidden: { opacity: 0, y: 14, scale: 0.985 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.42, ease: 'easeOut' } },
  };

  const filteredInterviewRoles = INTERVIEW_ROLES.filter((role) => {
    const matchesSearch = role.title.toLowerCase().includes(roleSearch.toLowerCase()) ||
      role.description.toLowerCase().includes(roleSearch.toLowerCase());
    const matchesCategory = selectedRoleCategory === 'All' || role.categories.includes(selectedRoleCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <Layout>
      <SEO
        title="JobPoyt – Find Jobs in India, Abroad & Remote Jobs"
        description="JobPoyt helps you find jobs in India, abroad jobs, remote jobs and MNC jobs, while connecting recruiters with talent and supporting learning and upskilling."
        canonical={siteConfig.url}
        structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: siteConfig.name,
            url: `${siteConfig.url}/`,
            logo: siteConfig.logo,
            sameAs: knownSocialUrls,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: siteConfig.name,
            url: `${siteConfig.url}/`,
            potentialAction: {
              '@type': 'SearchAction',
              target: `${siteConfig.url}/jobs?keyword={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          },
        ]}
      />
      <MotionBox
        sx={{
          position: 'relative',
          overflow: 'hidden',
          mb: { xs: 3, md: 4 },
          borderBottom: '1px solid',
          borderColor: 'rgba(148, 197, 255, 0.32)',
          backgroundColor: isDarkMode ? '#0B1930' : '#EAF6FF',
          backgroundImage: "url('/images/home.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          py: { xs: 2.5, sm: 3.5, md: 4.5 },
        }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <MotionBox sx={{ maxWidth: { xs: '100%', md: 860 }, textAlign: 'center', mx: 'auto', transform: { md: 'translateX(-4%)' } }} variants={itemVariants}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.7, mb: 1.5 }}>
              <Chip
                icon={<ExploreIcon sx={{ fontSize: '0.85rem !important' }} />}
                label="India's Career Gateway"
                sx={{
                  px: 0.6,
                  height: 29,
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: '#075985',
                  background: 'rgba(224, 242, 254, 0.88)',
                  border: '1px solid rgba(14, 165, 233, 0.25)',
                }}
              />
            </Box>
            <MotionTypography
              variant="h1"
              sx={{
                maxWidth: { xs: '100%', md: 820 },
                mx: 'auto',
                fontSize: { xs: '1.6rem', sm: '2.1rem', md: '2.55rem' },
                fontWeight: 800,
                mb: 1.5,
                color: '#102A43',
                letterSpacing: 0,
                lineHeight: 1.08,
                cursor: 'default',
              }}
            >
              <Box component="span" sx={{ display: 'block', whiteSpace: { md: 'nowrap' } }}>
                Your Skills. Real Opportunities.
              </Box>
              <Box component="span" sx={{ display: 'block', whiteSpace: { md: 'nowrap' }, background: 'linear-gradient(90deg, #159BEF 0%, #2563EB 52%, #8B5CF6 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                A Better Tomorrow.
              </Box>
            </MotionTypography>
            <MotionTypography
              variant="h5"
              sx={{
                color: '#334E68',
                mb: 2,
                fontSize: { xs: '0.76rem', md: '0.88rem' },
                fontWeight: 400,
                maxWidth: 700,
                mx: 'auto',
                lineHeight: 1.45,
              }}
              variants={itemVariants}
            >
              Explore verified jobs from trusted companies, match your skills, and take the next
              <br />
              step in your career journey. All in one place.
            </MotionTypography>

            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="center" divider={<Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' }, borderColor: 'rgba(71, 85, 105, 0.24)' }} />} sx={{ mb: 3.8 }}>
              {[
                { value: heroStats.activeJobs === null ? '—' : heroStats.activeJobs.toLocaleString(), label: 'Active Jobs', Icon: WorkIcon },
                { value: heroStats.companies === null ? '—' : heroStats.companies.toLocaleString(), label: 'Hiring Companies', Icon: EmojiEventsIcon },
                { value: '500K+', label: 'Job Seekers', Icon: SchoolIcon },
                { value: '100%', label: 'Verified Listings', Icon: VerifiedUserIcon },
              ].map(({ value, label, Icon }) => (
                <Box key={label} sx={{ minWidth: { xs: 135, sm: 130 }, px: { xs: 1.2, sm: 1.6 }, py: 0.45, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.7 }}>
                  <Box sx={{ width: 29, height: 29, borderRadius: 1.3, display: 'grid', placeItems: 'center', color: '#0369A1', bgcolor: 'rgba(186, 230, 253, 0.7)' }}><Icon sx={{ fontSize: 16 }} /></Box>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography sx={{ color: '#102A43', fontWeight: 800, fontSize: '0.92rem', lineHeight: 1.1 }}>{value}</Typography>
                    <Typography sx={{ color: '#486581', fontSize: '0.62rem', mt: 0.2 }}>{label}</Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </MotionBox>

          <MotionBox variants={itemVariants} sx={{ maxWidth: 940, mx: 'auto', mt: { xs: 1.5, md: 2 } }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.2, sm: 1.6, md: 1.8 },
                background: isDarkMode ? 'rgba(17, 24, 39, 0.96)' : 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(191, 219, 254, 0.7)',
                borderRadius: '24px',
                boxShadow: '0 20px 45px rgba(30, 64, 175, 0.14), 0 4px 12px rgba(15, 23, 42, 0.06)',
              }}
            >
              <Grid container spacing={{ xs: 1, md: 1.3 }} alignItems="stretch">
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    placeholder="Search jobs by title, skills, or company"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: 'primary.main' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        height: 52,
                        fontSize: '0.82rem',
                        borderRadius: '14px',
                        background: isDarkMode ? 'rgba(30, 41, 59, 0.72)' : '#F8FBFF',
                        '& fieldset': { borderColor: isDarkMode ? 'rgba(147, 197, 253, 0.25)' : '#D7E7F5' },
                        '&:hover fieldset': { borderColor: '#7DD3FC' },
                        '&.Mui-focused fieldset': { borderColor: '#2563EB', borderWidth: 1.5 },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Autocomplete
                    freeSolo
                    options={INDIAN_CITIES}
                    inputValue={searchLocation}
                    onInputChange={(_, value) => setSearchLocation(value)}
                    filterOptions={(options: string[], state) =>
                      options.filter((option) =>
                        option.toLowerCase().includes(state.inputValue.toLowerCase())
                      )
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        placeholder="Location"
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <LocationOnIcon sx={{ color: 'primary.main' }} />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            height: 52,
                            fontSize: '0.82rem',
                            borderRadius: '14px',
                            background: isDarkMode ? 'rgba(30, 41, 59, 0.72)' : '#F8FBFF',
                            '& fieldset': { borderColor: isDarkMode ? 'rgba(147, 197, 253, 0.25)' : '#D7E7F5' },
                            '&:hover fieldset': { borderColor: '#7DD3FC' },
                            '&.Mui-focused fieldset': { borderColor: '#2563EB', borderWidth: 1.5 },
                          },
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    placeholder="Experience"
                    value={experience}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*$/.test(value)) {
                        setExperience(value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    inputProps={{
                      inputMode: 'numeric',
                      pattern: '[0-9]*',
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <TimelineIcon sx={{ color: 'primary.main' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        height: 52,
                        fontSize: '0.82rem',
                        borderRadius: '14px',
                        background: isDarkMode ? 'rgba(30, 41, 59, 0.72)' : '#F8FBFF',
                        '& fieldset': { borderColor: isDarkMode ? 'rgba(147, 197, 253, 0.25)' : '#D7E7F5' },
                        '&:hover fieldset': { borderColor: '#7DD3FC' },
                        '&.Mui-focused fieldset': { borderColor: '#2563EB', borderWidth: 1.5 },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <MotionButton
                    variant="contained"
                    size="medium"
                    onClick={handleSearch}
                    fullWidth
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    sx={{
                      height: 52,
                      py: 1,
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      borderRadius: '14px',
                      background: 'linear-gradient(90deg, #0284c7, #2563eb)',
                      boxShadow: '0 8px 18px rgba(37, 99, 235, 0.24)',
                      '&:hover': {
                        background: 'linear-gradient(90deg, #0369a1, #1d4ed8)',
                        boxShadow: '0 10px 22px rgba(37, 99, 235, 0.32)',
                      },
                    }}
                  >
                    <SearchIcon sx={{ mr: 1 }} /> Search Jobs
                  </MotionButton>
                </Grid>
              </Grid>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 0.6, mt: 1.4, pt: 1.1, borderTop: '1px solid rgba(191, 219, 254, 0.55)' }}>
                <Typography sx={{ color: '#315477', fontSize: '0.7rem', fontWeight: 800 }}>Popular Searches:</Typography>
                {['Frontend Developer', 'Python Developer', 'Data Analyst', 'DevOps Engineer', 'Product Manager'].map((keyword) => (
                  <Chip key={keyword} label={keyword} onClick={() => handlePopularSearch(keyword)} size="small" sx={{ color: '#1D4ED8', bgcolor: '#F0F7FF', border: '1px solid #C7DDF5', fontWeight: 700, cursor: 'pointer', borderRadius: '9px', '&:hover': { bgcolor: '#DBEAFE', borderColor: '#60A5FA', transform: 'translateY(-1px)' } }} />
                ))}
              </Box>
            </Paper>
          </MotionBox>

          <Grid container spacing={1.1} sx={{ maxWidth: 940, mx: 'auto', mt: { xs: 2.2, md: 2.8 } }}>
            {[
              { title: 'Discover Opportunities', detail: 'Find the right roles for your skills', Icon: ExploreIcon },
              { title: 'Apply with Confidence', detail: 'Verified jobs from trusted employers', Icon: VerifiedUserIcon },
              { title: 'Grow Continuously', detail: 'Access learning & career resources', Icon: SchoolIcon },
              { title: 'Achieve Your Goals', detail: 'Take your career to the next level', Icon: EmojiEventsIcon },
            ].map(({ title, detail, Icon }) => (
              <Grid item xs={12} sm={6} md={3} key={title}>
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', gap: 0.7, p: 0.9, borderRadius: 1.7, background: 'rgba(255,255,255,0.58)', border: '1px solid rgba(148, 197, 255, 0.24)' }}>
                  <Box sx={{ width: 27, height: 27, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#1D4ED8', bgcolor: '#DBEAFE' }}><Icon sx={{ fontSize: 14 }} /></Box>
                  <Box>
                    <Typography sx={{ color: '#102A43', fontSize: '0.68rem', fontWeight: 800, lineHeight: 1.2 }}>{title}</Typography>
                    <Typography sx={{ color: '#627D98', fontSize: '0.58rem', mt: 0.25, lineHeight: 1.25 }}>{detail}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </MotionBox>

      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <MotionBox
          variants={sectionRevealVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <MotionTypography
            variants={sectionItemVariants}
            variant="h4"
            sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}
          >
            Browse by Category
          </MotionTypography>
          <MotionTypography
            variants={sectionItemVariants}
            variant="body1"
            sx={{ color: 'text.secondary', mb: 4, textAlign: 'center' }}
          >
            Explore opportunities in your field of expertise
          </MotionTypography>

          <MotionBox variants={sectionRevealVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <Grid container spacing={2.5}>
            {JOB_CATEGORIES.map((category, index) => {
              const Icon = categoryIcons[category] || WorkIcon;
              return (
                <Grid item xs={6} sm={4} md={3} key={category}>
                  <MotionBox variants={sectionItemVariants}>
                  <MotionCard
                    whileHover={{ y: -6, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const filters = new URLSearchParams();
                      filters.append('keyword', category);
                      navigate(`${ROUTES.JOBS}?${filters.toString()}`);
                    }}
                    sx={{
                      cursor: 'pointer',
                      background: isDarkMode ? darkCategoryColors[index % darkCategoryColors.length] : categoryColors[index % categoryColors.length],
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.2s ease',
                      borderRadius: 3,
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: 4,
                        background: categoryIconColors[index % categoryIconColors.length],
                      },
                      '&:hover': {
                        borderColor: '#AFC1DD',
                        boxShadow: '0 16px 34px rgba(15, 23, 42, 0.10)',
                      },
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 3 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          background: categoryIconColors[index % categoryIconColors.length],
                          boxShadow: '0 12px 22px rgba(15, 23, 42, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 1.5,
                        }}
                      >
                        <Icon sx={{ color: '#fff', fontSize: 24 }} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                        {category}
                      </Typography>
                    </CardContent>
                  </MotionCard>
                  </MotionBox>
                </Grid>
              );
            })}
            </Grid>
          </MotionBox>
        </MotionBox>

        <MotionBox
          sx={{ mt: 8, mb: 6 }}
          variants={sectionRevealVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <MotionTypography variants={sectionItemVariants} variant="h4" sx={{ fontWeight: 700, mb: 2, textAlign: 'center' }}>
            Jobs You May Be Interested In
          </MotionTypography>
          <MotionBox variants={sectionRevealVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <Grid container spacing={2}>
            {suggestedJobs.map((job) => (
              <Grid item xs={12} sm={6} md={3} key={job.title + job.company}>
                <MotionBox variants={sectionItemVariants}>
                <MotionCard
                  whileHover={{ y: -6 }}
                  sx={{
                    borderRadius: 3,
                    p: 2,
                    minHeight: 220,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1px solid rgba(226, 232, 240, 1)',
                    background: isDarkMode ? '#0B0F17' : 'linear-gradient(180deg, #ffffff, #f8fbff)',
                    boxShadow: '0 14px 30px rgba(15, 23, 42, 0.07)',
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 700, mb: 1 }}>
                      Recommended
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      {job.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      {job.company}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {job.location}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => {
                      const filters = new URLSearchParams();
                      filters.append('keyword', job.keyword);
                      navigate(`${ROUTES.JOBS}?${filters.toString()}`);
                    }}
                    sx={{
                      mt: 2,
                      textTransform: 'none',
                      color: '#fff',
                      background: 'linear-gradient(90deg, rgb(2, 132, 199), rgb(37, 99, 235))',
                      '&:hover': {
                        background: 'linear-gradient(90deg, rgb(3, 105, 161), rgb(29, 78, 216))',
                      },
                    }}
                  >
                    View Jobs
                  </Button>
                </MotionCard>
                </MotionBox>
              </Grid>
            ))}
            </Grid>
          </MotionBox>
        </MotionBox>

        <MotionBox
          sx={{ mb: 6 }}
          variants={sectionRevealVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <MotionBox variants={sectionRevealVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <MotionBox variants={sectionItemVariants}>
              <Card sx={{ borderRadius: 3, p: 3, height: '100%', background: isDarkMode ? '#0B0F17' : 'linear-gradient(180deg, #EFF6FF 0%, #FFFFFF 100%)', boxShadow: isDarkMode ? '0 18px 38px rgba(0, 0, 0, 0.42)' : '0 18px 38px rgba(15, 23, 42, 0.08)' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                  Top Companies Hiring Now
                </Typography>
                <Grid container spacing={2}>
                  {topCompanies.map((company) => (
                    <Grid item xs={6} key={company.name}>
                      <Paper sx={{ p: 2, borderRadius: 2, background: isDarkMode ? '#111827' : '#fff', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                          {company.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {company.hiring}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
                <Button
                  variant="text"
                  sx={{ mt: 3, textTransform: 'none', fontWeight: 700 }}
                  onClick={() => {
                    const filters = new URLSearchParams();
                    filters.append('keyword', 'Jobs at top companies');
                    navigate(`${ROUTES.JOBS}?${filters.toString()}`);
                  }}
                >
                  Explore all top company jobs
                </Button>
              </Card>
              </MotionBox>
            </Grid>

            <Grid item xs={12} md={6}>
              <MotionBox variants={sectionItemVariants}>
              <Card sx={{ borderRadius: 3, p: 3, height: '100%', background: isDarkMode ? '#0B0F17' : 'linear-gradient(180deg, #EFF6FF 0%, #FFFFFF 100%)', boxShadow: isDarkMode ? '0 18px 38px rgba(0, 0, 0, 0.42)' : '0 18px 38px rgba(15, 23, 42, 0.08)' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                  Featured Companies Actively Hiring
                </Typography>
                <Grid container spacing={2}>
                  {featuredCompanies.map((company) => (
                    <Grid item xs={12} key={company.name}>
                      <Paper sx={{ p: 2, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid', borderColor: 'divider' }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {company.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {company.description}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => {
                            const filters = new URLSearchParams();
                            filters.append('keyword', company.keyword);
                            navigate(`${ROUTES.JOBS}?${filters.toString()}`);
                          }}
                          sx={{
                            textTransform: 'none',
                            color: '#fff',
                            background: 'linear-gradient(90deg, rgb(2, 132, 199), rgb(37, 99, 235))',
                            '&:hover': {
                              background: 'linear-gradient(90deg, rgb(3, 105, 161), rgb(29, 78, 216))',
                            },
                          }}
                        >
                          See jobs
                        </Button>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Card>
              </MotionBox>
            </Grid>
            </Grid>
          </MotionBox>
        </MotionBox>

        <MotionBox
          sx={{ mb: 8 }}
          variants={sectionRevealVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <MotionBox variants={sectionItemVariants}>
            <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 3, background: isDarkMode ? '#0B0F17' : 'linear-gradient(180deg, #EFF8FF 0%, #FFFFFF 100%)', color: isDarkMode ? '#FFFFFF' : undefined, border: '1px solid', borderColor: 'divider', boxShadow: isDarkMode ? '0 20px 40px rgba(0, 0, 0, 0.42)' : '0 20px 40px rgba(15, 23, 42, 0.08)' }}>
            <MotionTypography variants={sectionItemVariants} variant="h4" sx={{ fontWeight: 700, mb: 2, textAlign: 'center' }}>
              Interview Questions by Role
            </MotionTypography>
            <MotionTypography variants={sectionItemVariants} variant="body1" sx={{ color: 'text.secondary', mb: 3, textAlign: 'center' }}>
              Discover role-specific interview questions and prepare with real AmbitionBox resources.
            </MotionTypography>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3, alignItems: 'center', justifyContent: 'space-between' }}>
              <TextField
                fullWidth
                placeholder="Search roles like React, Java, DevOps, Data Scientist"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'primary.main' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ background: isDarkMode ? '#111827' : '#fff', borderRadius: 2 }}
              />
              <FormControl sx={{ minWidth: 180 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedRoleCategory}
                  label="Category"
                  onChange={(e) => setSelectedRoleCategory(e.target.value)}
                  sx={{ background: isDarkMode ? '#111827' : '#fff', borderRadius: 2 }}
                >
                  {INTERVIEW_ROLE_CATEGORIES.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <MotionBox variants={sectionRevealVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <Grid container spacing={3}>
              {filteredInterviewRoles.slice(0, 4).map((role) => (
                <Grid item xs={12} sm={6} md={3} key={role.title}>
                  <MotionBox variants={sectionItemVariants}>
                  <MotionCard
                    component={'button' as any}
                    type="button"
                    whileHover={{ y: -6, scale: 1.02 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => window.open(role.url, '_blank')}
                    sx={{
                      p: 3,
                      borderRadius: 4,
                      background: isDarkMode ? '#111827' : '#fff',
                      boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
                      border: '1px solid transparent',
                      textAlign: 'left',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: 'rgba(37, 99, 235, 0.18)',
                        boxShadow: '0 22px 58px rgba(15, 23, 42, 0.14)',
                      },
                      '&:focus': {
                        outline: 'none',
                        borderColor: 'rgba(37, 99, 235, 0.28)',
                      },
                    }}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={roleCardVariants}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.25 }}>
                        {role.title}
                      </Typography>
                      <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 700, mb: 1 }}>
                        {role.count}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                        {role.description}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 3 }}>
                      <Box sx={{ color: 'primary.main', fontSize: '1.2rem' }}>
                        <ArrowForwardIcon />
                      </Box>
                    </Box>
                  </MotionCard>
                  </MotionBox>
                </Grid>
              ))}
              {filteredInterviewRoles.length === 0 && (
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                    No matching roles found. Adjust your search or choose another category.
                  </Typography>
                </Grid>
              )}
              </Grid>
            </MotionBox>
            {filteredInterviewRoles.length > 4 && (
              <Box sx={{ mt: 4, overflowX: 'auto', py: 1, mx: -2, px: 2 }}>
                <MotionBox
                  variants={sectionRevealVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  sx={{ display: 'flex', gap: 2, minWidth: 'max-content' }}
                >
                  {filteredInterviewRoles.slice(4).map((role) => (
                    <MotionBox key={role.title} variants={sectionItemVariants}>
                    <MotionCard
                      component={'button' as any}
                      type="button"
                      whileHover={{ y: -6, scale: 1.02 }}
                      transition={{ duration: 0.25 }}
                      onClick={() => window.open(role.url, '_blank')}
                      sx={{
                        p: 3,
                        borderRadius: 4,
                        background: isDarkMode ? '#111827' : '#fff',
                        boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
                        border: '1px solid transparent',
                        textAlign: 'left',
                        minWidth: 300,
                        flex: '0 0 auto',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        '&:hover': {
                          borderColor: 'rgba(37, 99, 235, 0.18)',
                          boxShadow: '0 22px 58px rgba(15, 23, 42, 0.14)',
                        },
                        '&:focus': {
                          outline: 'none',
                          borderColor: 'rgba(37, 99, 235, 0.28)',
                        },
                      }}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      variants={roleCardVariants}
                    >
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.25 }}>
                          {role.title}
                        </Typography>
                        <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 700, mb: 1 }}>
                          {role.count}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                          {role.description}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 3 }}>
                        <Box sx={{ color: 'primary.main', fontSize: '1.2rem' }}>
                          <ArrowForwardIcon />
                        </Box>
                      </Box>
                    </MotionCard>
                    </MotionBox>
                  ))}
                </MotionBox>
              </Box>
            )}
            </Paper>
          </MotionBox>
        </MotionBox>

        <MotionBox
          sx={{
            textAlign: { xs: 'center', md: 'left' },
            mt: 8,
            p: { xs: 4, md: 6 },
            background: isDarkMode
              ? 'radial-gradient(circle at 20% 25%, rgba(56, 189, 248, 0.14), transparent 35%), radial-gradient(circle at 84% 18%, rgba(16, 185, 129, 0.14), transparent 35%), linear-gradient(135deg, #050608 0%, #0B1220 48%, #111827 100%)'
              : 'radial-gradient(circle at 20% 25%, rgba(56, 189, 248, 0.2), transparent 35%), radial-gradient(circle at 84% 18%, rgba(16, 185, 129, 0.2), transparent 35%), linear-gradient(135deg, #ffffff 0%, #f0fdff 48%, #eff6ff 100%)',
            borderRadius: 3,
            border: '1px solid',
            borderColor: isDarkMode ? '#334155' : 'rgba(203, 213, 225, 0.8)',
            boxShadow: isDarkMode ? '0 24px 50px rgba(0, 0, 0, 0.42)' : '0 24px 50px rgba(15, 23, 42, 0.10)',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 3,
          }}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          whileHover={{ y: -4 }}
          viewport={{ once: true }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1.5 }}>
              Ready to start your job search?
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Join thousands of job seekers who have found their dream jobs on Jobpoyt.
            </Typography>
          </Box>
          <MotionButton
            variant="contained"
            size="large"
            onClick={() => navigate(ROUTES.JOBS)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            sx={{
              px: 4.5,
              py: 1.4,
              borderRadius: 2.2,
              textTransform: 'none',
              fontWeight: 700,
              background: 'linear-gradient(90deg, #0284c7, #2563eb)',
              boxShadow: 'none',
              '&:hover': {
                background: 'linear-gradient(90deg, #0369a1, #1d4ed8)',
                boxShadow: 'none',
              },
            }}
          >
            Explore Jobs Now
          </MotionButton>
        </MotionBox>
      </Container>
    </Layout>
  );
};
