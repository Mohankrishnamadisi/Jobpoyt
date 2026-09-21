import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Avatar,
  Badge,
  Link,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  LocationOnOutlined as LocationOnOutlinedIcon,
  WorkOutlineOutlined as WorkOutlineOutlinedIcon,
  TrendingUpOutlined as TrendingUpOutlinedIcon,
  BoltOutlined as BoltOutlinedIcon,
  LockOutlined as LockOutlinedIcon,
} from '@mui/icons-material';
import { getTimeAgo, formatJobSalary, truncateAtWord } from '@utils/index';
import type { Job } from '../../types';

interface HorizontalJobListItemProps {
  job: Job;
  isPremiumUser?: boolean;
  isApplied?: boolean;
}

const companyLogoAliases: Record<string, string> = {
  cisco: 'cisco.png',
  deloitte: 'deloitte.png',
  ibm: 'ibm.png',
  infosys: 'infosys.png',
  'jp morgan': 'JP-Morgan-Chase-Emblem.png',
  'jp morgan chase': 'JP-Morgan-Chase-Emblem.png',
  jpmorgan: 'JP-Morgan-Chase-Emblem.png',
  'jpmorgan chase': 'JP-Morgan-Chase-Emblem.png',
  oracle: 'oracle.png',
  sap: 'sap.jpg',
  genomines: 'GENOMINES.png',
  hypotos: 'Hypatos Gmbh.png',
  'hypotos gmbh': 'Hypatos Gmbh.png',
  'hypertrics gmph': 'Hypertrics GmbH.jpg',
  margo: 'MARGO.jpg',
  nuuenegy: 'Nuuenergy.png',
  platoapp: 'Platoapp.jpg',
  twice: 'TWAICE.jpg',
  capgemini: 'Capgemini.png',
};

export const HorizontalJobListItem: React.FC<HorizontalJobListItemProps> = ({
  job,
  isPremiumUser = false,
  isApplied = false,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [isHovered, setIsHovered] = React.useState(false);
  const [applied, setApplied] = React.useState(isApplied);
  const workMode = job.workMode || job.work_mode;
  const normalizedWorkMode = String(workMode || '').trim().toLowerCase();
  const showRemotePremium = normalizedWorkMode === 'remote' && !isPremiumUser;
  const postedDate = getTimeAgo(job.createdAt || job.created_at || new Date().toISOString());
  const skills = Array.isArray(job.skills) ? job.skills.slice(0, 3) : [];
  const skillsCount = Array.isArray(job.skills) ? job.skills.length : 0;
  const jobType = job.jobType || job.job_type || 'Type unavailable';
  const companyName = String(job.company_name || '').trim();
  const [logoExtensionIndex, setLogoExtensionIndex] = React.useState(0);
  const normalizedCompanyName = companyName.toLowerCase().replace(/\s+/g, ' ');
  const logoAliasKey = Object.keys(companyLogoAliases).find(
    (alias) => normalizedCompanyName === alias || normalizedCompanyName.startsWith(`${alias} `),
  );
  const logoNames = [
    logoAliasKey ? companyLogoAliases[logoAliasKey] : companyName,
    companyName,
    normalizedCompanyName,
  ];
  const logoCandidates = [...new Set(logoNames)].flatMap((name) =>
    ['png', 'jpg', 'jpeg'].map(
      (extension) => name.includes('.')
        ? `/logos/${encodeURIComponent(name)}`
        : `/logos/${encodeURIComponent(name)}.${extension}`,
    ),
  );
  const companyInitials = companyName
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'N/A';

  React.useEffect(() => {
    setApplied(isApplied);
  }, [isApplied]);

  const handleApplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (applied) return;
    navigate(`/jobs/${job.id}`, { state: { from: `${window.location.pathname}${window.location.search}` } });
  };

  const handleViewDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/jobs/${job.id}`, { state: { from: `${window.location.pathname}${window.location.search}` } });
  };

  const salary = job.salaryMin || job.salary_min || job.salaryMax || job.salary_max
    ? formatJobSalary(job.salaryMin || job.salary_min, job.salaryMax || job.salary_max)
    : null;

  const description = truncateAtWord(job.description, 180);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box
        className="find-jobs-card"
        onClick={handleApplyClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: { xs: 1, sm: 2.5 },
          p: { xs: 1.2, sm: 2.5 },
          bgcolor: isDarkMode ? (isHovered ? '#172033' : '#111827') : (isHovered ? 'rgba(241, 248, 255, 0.98)' : undefined),
          background: isDarkMode
            ? (isHovered ? 'linear-gradient(180deg, #172033, #111827)' : 'linear-gradient(180deg, #111827, #0F172A)')
            : 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(241, 248, 255, 0.96))',
          border: '1px solid',
          borderColor: isHovered ? '#bfdbfe' : (isDarkMode ? '#334155' : '#e2e8f0'),
          borderRadius: { xs: 1.5, sm: 2.25 },
          transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          cursor: 'pointer',
          boxShadow: isHovered ? '0 12px 32px rgba(15, 23, 42, 0.1)' : '0 5px 20px rgba(15, 23, 42, 0.04)',
          transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
        }}
      >
        {/* LEFT: Company Logo */}
        <Box
          sx={{
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.35 }}>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                job.featured && !showRemotePremium ? (
                  <Box
                    sx={{
                      width: { xs: 16, sm: 24 },
                      height: { xs: 16, sm: 24 },
                      bgcolor: '#FCD34D',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid white',
                    }}
                  >
                    <BoltOutlinedIcon sx={{ fontSize: { xs: 10, sm: 14 }, color: '#92400E' }} />
                  </Box>
                ) : null
              }
            >
              <Avatar
                src={showRemotePremium ? undefined : (companyName && logoExtensionIndex < logoCandidates.length ? logoCandidates[logoExtensionIndex] : undefined)}
                alt={showRemotePremium ? 'Premium company details' : (companyName ? `${companyName} logo` : 'Company logo')}
                imgProps={{
                  onError: () => setLogoExtensionIndex((index) => index + 1),
                }}
                sx={{
                  width: { xs: 38, sm: 56 },
                  height: { xs: 38, sm: 56 },
                  bgcolor: showRemotePremium ? (isDarkMode ? '#1e3a8a' : '#dbeafe') : (isDarkMode ? '#334155' : '#d1d5db'),
                  color: showRemotePremium ? (isDarkMode ? '#bfdbfe' : '#2563eb') : undefined,
                  fontSize: { xs: '0.82rem', sm: '1.3rem' },
                  fontWeight: 700,
                  flexShrink: 0,
                  '& img': {
                    objectFit: 'contain',
                    backgroundColor: '#FFFFFF',
                  },
                }}
              >
                {showRemotePremium ? <LockOutlinedIcon /> : companyInitials}
              </Avatar>
            </Badge>
            {showRemotePremium && (
              <Typography variant="caption" sx={{ color: isDarkMode ? '#93c5fd' : '#2563eb', fontWeight: 800, lineHeight: 1 }}>
                Premium
              </Typography>
            )}
          </Box>
        </Box>

        {/* CENTER: Job Details */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: { xs: 0.4, sm: 0.75 },
          }}
        >
          {/* Job Title */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 900,
              fontSize: { xs: '0.9rem', sm: '1.2rem' },
              lineHeight: 1.25,
              color: isDarkMode ? '#FFFFFF' : '#0f172a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              letterSpacing: '-0.3px',
            }}
          >
            {job.title}
          </Typography>

          {/* Company Name */}
          <Typography
            variant="body2"
            sx={{
              color: isDarkMode ? '#60A5FA' : '#2563eb',
              fontWeight: 700,
              fontSize: { xs: '0.75rem', sm: '0.95rem' },
              display: 'flex',
              alignItems: 'center',
              gap: 0.6,
              mt: 0.1,
              ...(showRemotePremium ? { filter: 'blur(4px)', userSelect: 'none' } : {}),
            }}
          >
            <Box
              sx={{
                width: { xs: 4, sm: 5 },
                height: { xs: 4, sm: 5 },
                borderRadius: '50%',
                bgcolor: '#3b82f6',
              }}
            />
            {showRemotePremium ? 'Upgrade to view company' : job.company_name}
          </Typography>

          {/* Location + Work Mode Row */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.6, sm: 1.5 },
              flexWrap: 'wrap',
              mt: 0.25,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: isDarkMode ? '#CBD5E1' : '#4b5563' }}>
              <LocationOnOutlinedIcon sx={{ fontSize: { xs: 14, sm: 18 }, color: '#3b82f6' }} />
              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: { xs: '0.68rem', sm: '0.875rem' }, color: isDarkMode ? '#FFFFFF' : '#374151' }}>
                {job.location}
              </Typography>
            </Box>

            {workMode && (
              <Chip
                icon={<WorkOutlineOutlinedIcon />}
                label={workMode}
                size="small"
                sx={{
                  height: { xs: 20, sm: 26 },
                  fontSize: { xs: '0.65rem', sm: '0.8rem' },
                  fontWeight: 700,
                  bgcolor: isDarkMode ? 'rgba(34, 197, 94, 0.16)' : '#d1fae5',
                  color: isDarkMode ? '#86EFAC' : '#065f46',
                  border: isDarkMode ? '1px solid rgba(74, 222, 128, 0.35)' : '1px solid #a7f3d0',
                  '& .MuiChip-icon': {
                    fontSize: { xs: 10, sm: 16 },
                    marginLeft: '6px !important',
                    color: isDarkMode ? '#4ADE80' : '#059669',
                  },
                }}
              />
            )}
          </Box>

          {/* Salary */}
          {salary && (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '0.72rem', sm: '0.95rem' },
                color: '#059669',
                mt: 0.25,
                letterSpacing: '-0.2px',
                ...(showRemotePremium ? { filter: 'blur(4px)', userSelect: 'none' } : {}),
              }}
            >
              💰 {salary}
            </Typography>
          )}

          {job.positionsAvailable || job.positions_available ? (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '0.65rem', sm: '0.8rem' },
                color: isDarkMode ? '#CBD5E1' : '#374151',
                ...(showRemotePremium ? { filter: 'blur(4px)', userSelect: 'none' } : {}),
              }}
            >
              {showRemotePremium ? 'Positions hidden - Upgrade' : `Hiring ${job.positionsAvailable || job.positions_available} position${(job.positionsAvailable || job.positions_available) === 1 ? '' : 's'}`}
            </Typography>
          ) : null}

          {/* Posted Time + Experience */}
          <Box sx={{ display: 'flex', gap: { xs: 0.6, sm: 1.5 }, alignItems: 'center', flexWrap: 'wrap', mt: { xs: 0.15, sm: 0.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#6b7280' }}>
              <TrendingUpOutlinedIcon sx={{ fontSize: { xs: 13, sm: 16 }, color: '#3b82f6' }} />
              <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.8rem' }, fontWeight: 600, color: isDarkMode ? '#FFFFFF' : '#4b5563' }}>
                {job.experience || 'Not specified'} exp.
              </Typography>
            </Box>

            {jobType && jobType !== 'Type unavailable' && (
              <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.8rem' }, color: isDarkMode ? '#FFFFFF' : '#4b5563', fontWeight: 600 }}>
                · {jobType}
              </Typography>
            )}

            <Typography variant="caption" sx={{ color: isDarkMode ? '#CBD5E1' : '#6b7280', fontSize: { xs: '0.65rem', sm: '0.8rem' }, fontWeight: 500 }}>
              · Added {postedDate}
            </Typography>
          </Box>

          {/* Skills Row */}
          {skills.length > 0 && (
            <Box sx={{ display: 'flex', gap: { xs: 0.4, sm: 0.75 }, flexWrap: 'wrap', alignItems: 'center', mt: 0.25 }}>
              {skills.map((skill, idx) => (
                <Chip
                  key={idx}
                  label={skill}
                  size="small"
                  sx={{
                    height: { xs: 20, sm: 26 },
                    fontSize: { xs: '0.64rem', sm: '0.78rem' },
                    fontWeight: 700,
                    bgcolor: isDarkMode ? 'rgba(96, 165, 250, 0.16)' : '#dbeafe',
                    color: isDarkMode ? '#BFDBFE' : '#1e40af',
                    border: isDarkMode ? '1.5px solid rgba(96, 165, 250, 0.55)' : '1.5px solid #60a5fa',
                    borderRadius: 1,
                  }}
                />
              ))}
              {skillsCount > 3 && (
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: isDarkMode ? '#BFDBFE' : '#1e40af',
                    fontSize: { xs: '0.64rem', sm: '0.78rem' },
                    px: 0.75,
                    py: 0.3,
                    borderRadius: 1,
                    bgcolor: isDarkMode ? 'rgba(96, 165, 250, 0.16)' : '#dbeafe',
                    border: isDarkMode ? '1.5px solid rgba(96, 165, 250, 0.55)' : '1.5px solid #60a5fa',
                  }}
                >
                  +{skillsCount - 3} more
                </Typography>
              )}
            </Box>
          )}

          {/* Hover-revealed description */}
          <Box
            sx={{
              overflow: 'hidden',
              maxHeight: isHovered ? 60 : 0,
              opacity: isHovered ? 1 : 0,
              transition: 'max-height 0.35s ease, opacity 0.3s ease',
              mt: isHovered ? 0.75 : 0,
            }}
          >
            {description && (
              <Typography
                variant="body2"
                sx={{
                  color: isDarkMode ? '#FFFFFF' : '#1f2937',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontWeight: 500,
                  ...(showRemotePremium ? { filter: 'blur(4px)', userSelect: 'none' } : {}),
                }}
              >
                {description}
              </Typography>
            )}
          </Box>
        </Box>

        {/* RIGHT: Action Buttons */}
        <Box
          sx={{
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            alignItems: { xs: 'flex-start', sm: 'flex-end' },
            justifyContent: 'flex-start',
            pointerEvents: 'auto',
            minWidth: { xs: 'auto', sm: 120 },
            gap: { xs: 0.3, sm: 1 },
          }}
        >
          {/* Apply Button */}
          <Button
            onClick={handleApplyClick}
            variant="contained"
            disabled={applied}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 1,
              fontSize: { xs: '0.72rem', sm: '0.95rem' },
              px: { xs: 1.2, sm: 2.5 },
              py: { xs: 0.45, sm: 0.75 },
              minWidth: { xs: 0, sm: 64 },
              minHeight: { xs: 30, sm: 'auto' },
              lineHeight: { xs: 1, sm: 'inherit' },
              bgcolor: applied ? '#16a34a' : '#3b82f6',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: 'none',
              transition: 'all 0.25s ease',
              '&:hover': {
                bgcolor: applied ? '#16a34a' : '#2563eb',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4)',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
              '&.Mui-disabled': {
                bgcolor: applied ? '#16a34a' : undefined,
                color: '#ffffff',
              },
            }}
          >
            {applied ? 'Applied' : 'Apply'}
          </Button>

          {/* Details Link */}
          <Link
            onClick={handleViewDetailsClick}
            sx={{
              cursor: 'pointer',
              fontSize: { xs: '0.72rem', sm: '0.9rem' },
              fontWeight: 600,
              color: '#3b82f6',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              '&:hover': {
                textDecoration: 'underline',
                color: '#2563eb',
              },
            }}
          >
            Details
          </Link>
        </Box>
      </Box>
    </motion.div>
  );
};
