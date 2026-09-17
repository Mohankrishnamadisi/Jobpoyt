import React, { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Avatar,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Checkbox,
  FormControlLabel,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Switch,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Edit as EditIcon,
  CloudUpload as CloudUploadIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
  CheckCircle as CheckCircleIcon,
  GitHub as GitHubIcon,
  LinkedIn as LinkedInIcon,
  Language as LanguageIcon,
  CurrencyRupee as CurrencyRupeeIcon,
  Schedule as ScheduleIcon,
  CameraAlt as CameraAltIcon,
} from '@mui/icons-material';
import { Layout } from '@components/layout/Layout';
import { ProfileSkeleton } from '@components/common/LoadingSkeleton';
import { useAuthStore } from '@store/index';
import { notificationService, userService } from '@services/api';
import {
  GENDER_OPTIONS,
  COUNTRIES,
  COUNTRY_STATES,
  NOTICE_PERIOD_OPTIONS,
} from '@constants/index';
import { generatePreferredJobTitleSuggestions } from '../../utils/titleSuggestions';
import {
  formatExperienceString,
  getTotalExperienceMonths,
  parseExperienceStringParts,
} from '../../utils/experience';
import toast from 'react-hot-toast';
import type { Certification, Project, Education, WorkExperience } from '../../types';

// ─── Extended interfaces ───────────────────────────────────────────────────────

interface ITSkill {
  id: string;
  skill: string;
  version: string;
  lastUsed: string;
  experience: string;
}

interface Language {
  id: string;
  name: string;
  proficiency: string;
  canRead: boolean;
  canWrite: boolean;
  canSpeak: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROFICIENCY_OPTIONS = ['Expert', 'Proficient', 'Beginner'];
const MARITAL_OPTIONS = ['Single / unmarried', 'Married', 'Divorced', 'Widowed'];
const CATEGORY_OPTIONS = ['General', 'OBC', 'SC', 'ST', 'PWD'];
const INDUSTRY_OPTIONS = [
  'IT Services & Consulting', 'Software Product', 'Internet', 'BPO / Call Centre',
  'FinTech / Payments', 'Healthcare / Medical', 'Education / EdTech', 'E-Commerce',
  'Retail', 'Manufacturing', 'Automobile', 'Media / Entertainment', 'Other',
];
const DEPARTMENT_OPTIONS = [
  'Engineering - Software & QA', 'Engineering - Hardware & Networks',
  'Data Science & Analytics', 'Product Management', 'Design',
  'Marketing & Communication', 'Sales & Business Development',
  'Finance & Accounting', 'HR & Administration', 'Operations',
  'Customer Success', 'Other',
];
const ROLE_CATEGORY_OPTIONS = [
  'Software Development', 'QA & Testing', 'DevOps', 'Data Science',
  'UI / UX', 'Product', 'Business Analyst', 'Project Management', 'Other',
];
const JOB_TYPE_OPTIONS = ['Permanent', 'Contractual', 'Temporary', 'Freelance', 'Internship'];
const EMPLOYMENT_TYPE_OPTIONS = ['Full Time', 'Part Time'];
const SHIFT_OPTIONS = ['Day', 'Night', 'Flexible', 'Rotational'];
const WORK_PERMIT_OPTIONS = [
  'India', 'Need US H1 Visa', 'Need US L1 Visa',
  'Need UK Visa', 'Need Australia PR', 'Need Canada PR', 'Have US Green Card',
];
const INDIA_CITIES = [
  'Bengaluru', 'Hyderabad', 'Chennai', 'Mumbai', 'Delhi / NCR', 'Pune',
  'Kolkata', 'Ahmedabad', 'Noida', 'Gurgaon', 'Jaipur', 'Chandigarh',
  'Coimbatore', 'Visakhapatnam', 'Kochi', 'Remote',
];

// ─── Section card ─────────────────────────────────────────────────────────────

const SectionCard: React.FC<{
  id: string;
  title: string;
  onEdit?: () => void;
  onAdd?: () => void;
  addLabel?: string;
  children: React.ReactNode;
}> = ({ id, title, onEdit, onAdd, addLabel = 'Add', children }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  return (
  <Card
    id={id}
    sx={{
      mb: 2,
      borderRadius: 3,
      background: isDarkMode ? '#0B0F17' : undefined,
      border: `1px solid ${isDarkMode ? '#263244' : '#e2e8f0'}`,
      boxShadow: isDarkMode ? '0 1px 3px rgba(0,0,0,0.35)' : '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      scrollMarginTop: 80,
      '&:hover': {
        boxShadow: isDarkMode ? '0 4px 16px rgba(0,0,0,0.55)' : '0 4px 16px rgba(0,0,0,0.1)',
        transform: 'translateY(-1px)',
      },
    }}
  >
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 3, height: 20, borderRadius: 2, bgcolor: '#6366f1' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: isDarkMode ? '#FFFFFF' : '#1e293b', letterSpacing: '-0.01em' }}>
            {title}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {onAdd && (
            <Box
              component="span"
              onClick={onAdd}
              sx={{
                color: '#6366f1',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                px: 1.5, py: 0.5,
                borderRadius: 2,
                border: `1px solid ${isDarkMode ? '#334155' : '#e0e7ff'}`,
                bgcolor: isDarkMode ? '#172033' : '#f5f3ff',
                '&:hover': { bgcolor: isDarkMode ? '#263244' : '#ede9fe' },
                transition: 'all 0.15s',
              }}
            >
              + {addLabel}
            </Box>
          )}
          {onEdit && (
            <IconButton
              size="small" onClick={onEdit}
              sx={{
                color: isDarkMode ? '#CBD5E1' : '#94a3b8',
                '&:hover': { color: '#818CF8', bgcolor: isDarkMode ? '#172033' : '#f5f3ff' },
              }}
            >
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>
      </Box>
      {children}
    </CardContent>
  </Card>
  );
};

// ─── Profile completion ring ──────────────────────────────────────────────────

const CompletionRing: React.FC<{ completion: number; src?: string; name: string }> = ({
  completion, src, name,
}) => (
  <Box sx={{ position: 'relative', width: 148, height: 148 }}>
    <CircularProgress variant="determinate" value={100} size={148} thickness={3.5}
      sx={{ color: 'rgba(255,255,255,0.3)', position: 'absolute', top: 0, left: 0 }} />
    <CircularProgress
      variant="determinate" value={completion} size={148} thickness={3.5}
      sx={{
        color: completion === 100 ? '#4ade80' : '#fbbf24',
        position: 'absolute', top: 0, left: 0,
        filter: completion === 100 ? 'drop-shadow(0 0 6px #4ade80)' : 'drop-shadow(0 0 6px #fbbf24)',
      }}
    />
    <Avatar
      src={src}
      sx={{
        width: 122, height: 122, position: 'absolute', top: 13, left: 13,
        bgcolor: '#312e81', fontSize: '2.8rem', fontWeight: 800,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        border: '3px solid rgba(255,255,255,0.9)',
      }}
    >
      {name.charAt(0).toUpperCase()}
    </Avatar>
    <Box
      sx={{
        position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
        bgcolor: completion === 100 ? '#4ade80' : '#fbbf24',
        borderRadius: 10, px: 1.25, py: 0.4, whiteSpace: 'nowrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      <Typography sx={{ fontWeight: 800, color: '#fff', fontSize: '0.7rem', letterSpacing: '0.02em' }}>
        {completion}%
      </Typography>
    </Box>
  </Box>
);

// ─── Checkmark table cell ─────────────────────────────────────────────────────

const CheckCell: React.FC<{ value: boolean }> = ({ value }) => (
  <TableCell align="center">
    {value ? <CheckCircleIcon sx={{ color: '#43a047', fontSize: 20 }} /> : <Box sx={{ width: 20, height: 20 }} />}
  </TableCell>
);

// ═══════════════════════════════════════════════════════════════════════════════
//  Main component
// ═══════════════════════════════════════════════════════════════════════════════

export const ProfilePage: React.FC = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Files
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [resume, setResume] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [resumeUploadDate, setResumeUploadDate] = useState('');

  // Extended (IT skills / languages – persisted in session only until DB migration)
  const [itSkills, setItSkills] = useState<ITSkill[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);

  // Core form (maps to DB columns)
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    currentDesignation: '',
    currentCompany: '',
    currentCTC: '',
    expectedCTC: '',
    noticePeriod: '',
    isFresher: false,
    experienceYears: '' as string | number,
    experienceMonths: '' as string | number,
    resumeHeadline: '',
    profileSummary: '',
    skills: [] as string[],
    preferredJobTitles: [] as string[],
    education: [] as Education[],
    workExperience: [] as WorkExperience[],
    certifications: [] as Certification[],
    projects: [] as Project[],
    linkedinUrl: '',
    portfolioUrl: '',
    githubUrl: '',
    // Career profile (state-only until DB migration)
    currentIndustry: '',
    department: '',
    roleCategory: '',
    desiredJobTypes: [] as string[],
    desiredEmploymentTypes: [] as string[],
    preferredWorkLocations: [] as string[],
    preferredShift: '',
    // Personal details (state-only until DB migration)
    maritalStatus: '',
    workPermit: [] as string[],
    category: '',
    disabilityStatus: 'Do not have disability',
  });

  // Dialog visibility
  const [headlineDialog, setHeadlineDialog] = useState(false);
  const [summaryDialog, setSummaryDialog] = useState(false);
  const [skillsDialog, setSkillsDialog] = useState(false);
  const [workExpDialog, setWorkExpDialog] = useState(false);
  const [educationDialog, setEducationDialog] = useState(false);
  const [itSkillDialog, setItSkillDialog] = useState(false);
  const [projectDialog, setProjectDialog] = useState(false);
  const [certDialog, setCertDialog] = useState(false);
  const [careerProfileDialog, setCareerProfileDialog] = useState(false);
  const [personalDetailsDialog, setPersonalDetailsDialog] = useState(false);
  const [languageDialog, setLanguageDialog] = useState(false);
  const [headerDialog, setHeaderDialog] = useState(false);

  // Item-level edit tracking
  const [editingWorkExpId, setEditingWorkExpId] = useState<string | null>(null);
  const [editingEducationId, setEditingEducationId] = useState<string | null>(null);
  const [editingITSkillId, setEditingITSkillId] = useState<string | null>(null);
  const [editingLanguageId, setEditingLanguageId] = useState<string | null>(null);

  // New-item forms
  const [newWorkExp, setNewWorkExp] = useState({
    company: '', position: '',
    startDate: '', endDate: '',
    expYears: '' as string | number,
    expMonths: '' as string | number,
    isCurrent: false, description: '',
  });
  const [newEducation, setNewEducation] = useState({ degree: '', school: '', year: '', field: '' });
  const [newITSkill, setNewITSkill] = useState({
    skill: '', version: '', lastUsed: new Date().getFullYear().toString(),
    expYears: '' as string | number,
    expMonths: '' as string | number,
  });
  const [newCert, setNewCert] = useState({ name: '', issuer: '', year: '' });
  const [newProject, setNewProject] = useState({ title: '', description: '', url: '' });
  const [newLanguage, setNewLanguage] = useState({
    name: '', proficiency: 'Expert', canRead: true, canWrite: true, canSpeak: true,
  });

  // Skill / preferred-title inputs
  const [skillInput, setSkillInput] = useState('');
  const [preferredTitleInput, setPreferredTitleInput] = useState('');
  const [preferredLocationInput, setPreferredLocationInput] = useState('');
  const [preferredTitleSuggestions, setPreferredTitleSuggestions] = useState<string[]>([]);

  // ── Load profile ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      try {
        const p = await userService.getProfile(user.id);
        if (p) {
          const parsed = parseExperienceStringParts(p.experience || '');
          setFormData((prev) => ({
            ...prev,
            fullName: p.name || user.name,
            email: p.email || user.email,
            phone: p.phone || '',
            gender: p.gender || '',
            dateOfBirth: p.date_of_birth || '',
            address: p.address || '',
            city: p.city || '',
            state: p.state || '',
            country: p.country || 'India',
            currentDesignation: p.current_designation || '',
            currentCompany: p.current_company || '',
            currentCTC: p.current_ctc || '',
            expectedCTC: p.expected_ctc || '',
            noticePeriod: p.notice_period || '',
            isFresher: p.experience === 'Fresher' && p.experience_years === 0 && p.experience_months === 0,
            experienceYears: p.experience_years != null ? p.experience_years : (parsed.years ?? ''),
            experienceMonths: p.experience_months != null ? p.experience_months : (parsed.months ?? ''),
            resumeHeadline: p.bio || '',
            profileSummary: p.bio || '',
            skills: p.skills || [],
            preferredJobTitles: p.preferred_job_titles || [],
            education: p.education_details || [],
            workExperience: p.work_experience || [],
            certifications: p.certifications || [],
            projects: p.projects || [],
            linkedinUrl: p.linkedin_url || '',
            portfolioUrl: p.portfolio_url || '',
            githubUrl: p.github_url || '',
            // Career profile
            currentIndustry: (p as any).current_industry || '',
            department: (p as any).department || '',
            roleCategory: (p as any).role_category || '',
            desiredJobTypes: (p as any).desired_job_types || [],
            desiredEmploymentTypes: (p as any).desired_employment_types || [],
            preferredWorkLocations: (p as any).preferred_work_locations || [],
            preferredShift: (p as any).preferred_shift || '',
            // Personal details extras
            maritalStatus: (p as any).marital_status || '',
            workPermit: (p as any).work_permit || [],
            category: (p as any).category || '',
            disabilityStatus: (p as any).disability_status || 'Do not have disability',
          }));
          setItSkills((p as any).it_skills || []);
          setLanguages((p as any).languages || []);
          setProfileImageUrl(p.profile_image_url || '');
          setResumeUrl(p.resume_url || '');
          if (p.resume_url) {
            const parts = (p.resume_url as string).split('/');
            const raw = parts[parts.length - 1] || 'Resume';
            // Strip UUID + timestamp prefix then decode URI encoding
            const match = raw.match(/^.+-\d{13}-(.+)$/);
            setResumeFileName(decodeURIComponent(match ? match[1] : raw));
            setResumeUploadDate(
              p.updated_at
                ? new Date(p.updated_at as string).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })
                : ''
            );
          }
        }
      } catch {
        // profile may not exist yet
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, user?.name, user?.email]);

  // ── Title suggestions ────────────────────────────────────────────────────────
  useEffect(() => {
    const exp = formatExperienceString(formData.experienceYears, formData.experienceMonths);
    const suggestions = generatePreferredJobTitleSuggestions({
      skills: formData.skills,
      experience: exp,
      profileBio: formData.profileSummary,
    }).filter(
      (t: string) => !formData.preferredJobTitles.some((s) => s.toLowerCase() === t.toLowerCase())
    );
    setPreferredTitleSuggestions(suggestions.slice(0, 10));
  }, [formData.skills, formData.experienceYears, formData.experienceMonths, formData.profileSummary, formData.preferredJobTitles]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  // Section-based completion — each UI section = 10%, all 10 filled = 100%
  const completion = (() => {
    const sections = [
      Boolean(profileImageUrl || profileImage),
      Boolean(resumeUrl || resume),
      Boolean(formData.resumeHeadline),
      formData.skills.length > 0,
      formData.workExperience.length > 0,
      formData.education.length > 0,
      itSkills.length > 0,
      Boolean(formData.profileSummary),
      Boolean(
        formData.currentIndustry ||
        formData.desiredJobTypes.length > 0 ||
        formData.preferredJobTitles.length > 0 ||
        formData.preferredWorkLocations.length > 0
      ),
      Boolean(
        formData.gender &&
        formData.dateOfBirth &&
        formData.phone &&
        (formData.currentDesignation || formData.currentCompany)
      ),
    ];
    return Math.round((sections.filter(Boolean).length / sections.length) * 100);
  })();

  useEffect(() => {
    if (!user?.id || completion >= 80) return undefined;

    let mounted = true;
    const sendProfileReminder = async () => {
      try {
        await notificationService.createNotification(
          user.id,
          'profile_reminder',
          'Please update your profile',
          `Your profile is ${completion}% complete. Update your profile to improve your job matches.`,
          { route: '/dashboard/profile', profileCompletion: completion },
        );
      } catch (error) {
        if (mounted) console.error('Failed to send profile reminder:', error);
      }
    };

    const interval = window.setInterval(sendProfileReminder, 10 * 60 * 1000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [completion, user?.id]);

  const experienceLabel = formData.isFresher
    ? 'Fresher'
    : formatExperienceString(formData.experienceYears, formData.experienceMonths) || 'Not specified';

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const setField = (field: string, value: unknown) =>
    setFormData((p) => ({ ...p, [field]: value }));

  const toggleArrayItem = (field: string, item: string) =>
    setFormData((p) => {
      const arr = p[field as keyof typeof p] as string[];
      return { ...p, [field]: arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item] };
    });

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async (overrides?: Partial<typeof formData>) => {
    if (!user?.id) return;
    const data = overrides ? { ...formData, ...overrides } : formData;
    setSaving(true);
    try {
      let newResumeUrl = resumeUrl;
      let newImageUrl = profileImageUrl;
      if (resume) {
        newResumeUrl = await userService.uploadResume(user.id, resume);
        setResumeFileName(resume.name);
        setResumeUploadDate(
          new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        );
        setResume(null);
      }
      if (profileImage) {
        newImageUrl = await userService.uploadProfileImage(user.id, profileImage);
        setProfileImage(null);
      }

      const updated = await userService.updateProfile(user.id, {
        name: data.fullName,
        phone: data.phone,
        gender: data.gender,
        date_of_birth: data.dateOfBirth,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        location: data.city ? `${data.city}${data.state ? ', ' + data.state : ''}` : '',
        bio: data.profileSummary,
        current_designation: data.currentDesignation,
        current_company: data.currentCompany,
        current_ctc: data.currentCTC,
        expected_ctc: data.expectedCTC,
        notice_period: data.noticePeriod,
        experience: data.isFresher
          ? 'Fresher'
          : formatExperienceString(data.experienceYears, data.experienceMonths),
        experience_years: data.isFresher ? 0 : Number(data.experienceYears) || 0,
        experience_months: data.isFresher ? 0 : Number(data.experienceMonths) || 0,
        total_experience_months: data.isFresher
          ? 0
          : getTotalExperienceMonths(data.experienceYears, data.experienceMonths),
        skills: data.skills,
        preferred_job_titles: data.preferredJobTitles,
        education_details: data.education,
        work_experience: data.workExperience,
        certifications: data.certifications,
        projects: data.projects,
        linkedin_url: data.linkedinUrl,
        portfolio_url: data.portfolioUrl,
        github_url: data.githubUrl,
        resume_url: newResumeUrl,
        profile_image_url: newImageUrl,
        // Career profile (new columns)
        current_industry: data.currentIndustry,
        department: data.department,
        role_category: data.roleCategory,
        desired_job_types: data.desiredJobTypes,
        desired_employment_types: data.desiredEmploymentTypes,
        preferred_work_locations: data.preferredWorkLocations,
        preferred_shift: data.preferredShift,
        // IT skills + languages (new jsonb columns)
        it_skills: itSkills,
        languages: languages,
        // Personal details extras (new columns)
        marital_status: data.maritalStatus,
        work_permit: data.workPermit,
        category: data.category,
        disability_status: data.disabilityStatus,
      });

      setResumeUrl(updated.resume_url || newResumeUrl);
      setProfileImageUrl(updated.profile_image_url || newImageUrl);
      if (overrides) setFormData((p) => ({ ...p, ...overrides }));
      setUser({ ...user, name: data.fullName, avatar: newImageUrl || user.avatar_url || user.avatar });
      toast.success('Saved successfully');
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <ProfileSkeleton />
        </Container>
      </Layout>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  Render
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <Layout>
      <Box
        className={isDarkMode ? 'profile-dark-mode' : undefined}
        sx={{
          bgcolor: isDarkMode ? '#000000' : '#f3f2f0',
          minHeight: '100vh',
          py: 2,
          color: isDarkMode ? '#FFFFFF' : undefined,
          '&.profile-dark-mode .MuiCard-root': { backgroundColor: '#0B0F17', color: '#FFFFFF' },
          '&.profile-dark-mode .MuiTypography-root': { color: '#FFFFFF' },
          '&.profile-dark-mode .MuiTableCell-root': { color: '#FFFFFF', borderColor: '#263244' },
          '&.profile-dark-mode .MuiDivider-root': { borderColor: '#263244' },
          '&.profile-dark-mode .MuiInputBase-root': { color: '#FFFFFF' },
          '&.profile-dark-mode .MuiInputLabel-root': { color: '#CBD5E1' },
          '&.profile-dark-mode .MuiOutlinedInput-notchedOutline': { borderColor: '#475569' },
          '&.profile-dark-mode .MuiFormHelperText-root': { color: '#CBD5E1' },
        }}
      >
        <Container maxWidth="lg">

          {/* ── Profile Header ──────────────────────────────────────────── */}
          <Card
            sx={{
              mb: 2, borderRadius: 2,
              border: `1px solid ${isDarkMode ? '#263244' : '#e0ddd8'}`,
              background: isDarkMode ? '#0B0F17' : undefined,
              boxShadow: isDarkMode ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <Box sx={{ bgcolor: isDarkMode ? '#111827' : '#fdf8f0', px: 3, pt: 3, pb: 2, borderRadius: '8px 8px 0 0' }}>
              <Grid container spacing={2} alignItems="flex-start">

                {/* Avatar with ring */}
                <Grid item xs={12} sm="auto">
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <CompletionRing
                      completion={completion}
                      src={profileImage ? URL.createObjectURL(profileImage) : profileImageUrl}
                      name={formData.fullName}
                    />
                    <input type="file" id="hdr-img-input" accept="image/*" hidden
                      onChange={(e) => e.target.files?.[0] && setProfileImage(e.target.files[0])} />
                    <label htmlFor="hdr-img-input">
                      <IconButton
                        component="span"
                        sx={{
                          position: 'absolute',
                          bottom: 6,
                          right: 6,
                          bgcolor: '#1a73e8',
                          color: '#fff',
                          width: 32,
                          height: 32,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                          '&:hover': { bgcolor: '#1558b0' },
                        }}
                      >
                        <CameraAltIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </label>
                  </Box>
                </Grid>

                {/* Name + info */}
                <Grid item xs>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#1a1a1a', fontSize: '1.4rem' }}>
                      {formData.fullName || 'Your Name'}
                    </Typography>
                    <IconButton size="small" onClick={() => setHeaderDialog(true)} sx={{ color: isDarkMode ? '#CBD5E1' : '#888' }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {/* Designation on its own line, company on next — matching Naukri layout */}
                  {formData.currentDesignation && (
                    <Typography variant="body1" sx={{ fontWeight: 600, color: isDarkMode ? '#FFFFFF' : '#222', lineHeight: 1.3 }}>
                      {formData.currentDesignation}
                    </Typography>
                  )}
                  {formData.currentCompany && (
                    <Typography variant="body2" sx={{ color: isDarkMode ? '#FFFFFF' : '#555', mb: 1.5 }}>
                      at {formData.currentCompany}
                    </Typography>
                  )}
                  {!formData.currentDesignation && !formData.currentCompany && (
                    <Typography
                      variant="body2"
                      sx={{ color: '#1a73e8', cursor: 'pointer', mb: 1.5, fontWeight: 500 }}
                      onClick={() => setHeaderDialog(true)}
                    >
                      + Add designation &amp; company
                    </Typography>
                  )}

                  <Grid container spacing={1.5} sx={{ mt: 0 }}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.9 }}>
                        {formData.city && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <LocationIcon sx={{ fontSize: 15, color: isDarkMode ? '#CBD5E1' : '#888', flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ color: isDarkMode ? '#FFFFFF' : '#555' }}>
                              {[formData.city, formData.state].filter(Boolean).join(', ')}{formData.country ? `, ${formData.country}` : ''}
                            </Typography>
                          </Box>
                        )}
                        {experienceLabel !== 'Not specified' && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <WorkIcon sx={{ fontSize: 15, color: isDarkMode ? '#CBD5E1' : '#888', flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ color: isDarkMode ? '#FFFFFF' : '#555' }}>{experienceLabel}</Typography>
                          </Box>
                        )}
                        {formData.currentCTC && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <CurrencyRupeeIcon sx={{ fontSize: 15, color: isDarkMode ? '#CBD5E1' : '#888', flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ color: isDarkMode ? '#FFFFFF' : '#555' }}>{formData.currentCTC}</Typography>
                          </Box>
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.9 }}>
                        {formData.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <PhoneIcon sx={{ fontSize: 15, color: isDarkMode ? '#CBD5E1' : '#888', flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ color: isDarkMode ? '#FFFFFF' : '#555' }}>{formData.phone}</Typography>
                            <CheckCircleIcon sx={{ fontSize: 14, color: '#43a047' }} />
                          </Box>
                        )}
                        {formData.email && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <EmailIcon sx={{ fontSize: 15, color: isDarkMode ? '#CBD5E1' : '#888', flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ color: isDarkMode ? '#FFFFFF' : '#555' }}>{formData.email}</Typography>
                            <CheckCircleIcon sx={{ fontSize: 14, color: '#43a047' }} />
                          </Box>
                        )}
                        {formData.noticePeriod && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <ScheduleIcon sx={{ fontSize: 15, color: isDarkMode ? '#CBD5E1' : '#888', flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ color: isDarkMode ? '#FFFFFF' : '#555' }}>{formData.noticePeriod} notice period</Typography>
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Top-right meta */}
                <Grid item xs={12} sm="auto" sx={{ textAlign: { sm: 'right' } }}>
                  <Typography variant="caption" sx={{ color: isDarkMode ? '#FFFFFF' : '#94a3b8', fontSize: '0.75rem' }}>
                    Profile last updated · Today
                  </Typography>
                  {user?.subscriptionPlan && user.subscriptionPlan !== 'free' && (
                    <Box
                      sx={{
                        mt: 1, display: 'inline-flex', alignItems: 'center',
                        bgcolor: '#fff8e1', border: '1px solid #ffca28',
                        borderRadius: 10, px: 1.5, py: 0.5,
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#e65100', fontSize: '0.75rem' }}>
                        {user.subscriptionPlan.toUpperCase()} Member
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </Box>

            {completion < 80 && (
              <Alert
                severity="warning"
                action={(
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => document.getElementById('sec-resume')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    sx={{ fontWeight: 800, textTransform: 'none', whiteSpace: 'nowrap' }}
                  >
                    Update Profile
                  </Button>
                )}
                sx={{ mx: 3, mb: 2, alignItems: 'center', '& .MuiAlert-message': { fontWeight: 700 } }}
              >
                Please update your profile to improve your job matches. Current completion: {completion}%.
              </Alert>
            )}

            {/* Photo-save prompt */}
            {profileImage && (
              <Box sx={{ px: 3, pb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: '#555' }}>Photo selected. Save to upload.</Typography>
                <Button size="small" variant="contained" onClick={() => handleSave()} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Photo'}
                </Button>
              </Box>
            )}
          </Card>

          {/* ── Two-column layout ─────────────────────────────────────── */}
          <Grid container spacing={2}>

            {/* Quick Links sidebar */}
            <Grid item xs={12} md={3}>
              <Card
                sx={{
                  borderRadius: 3,
                    border: `1px solid ${isDarkMode ? '#263244' : '#e2e8f0'}`,
                    background: isDarkMode ? '#0B0F17' : undefined,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  position: 'sticky', top: 80,
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)', px: 2.5, py: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', letterSpacing: '0.02em' }}>
                    Quick links
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Box sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)' }}>
                      <Box sx={{ width: `${completion}%`, height: '100%', borderRadius: 2, bgcolor: completion === 100 ? '#4ade80' : '#fbbf24', transition: 'width 0.4s ease' }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, fontSize: '0.7rem', flexShrink: 0 }}>{completion}%</Typography>
                  </Box>
                </Box>
                <CardContent sx={{ p: 0 }}>
                  <List dense disablePadding>
                    {[
                      { label: 'Resume', href: '#sec-resume', badge: resumeUrl ? 'Update' : 'Add' },
                      { label: 'Resume headline', href: '#sec-headline' },
                      { label: 'Key skills', href: '#sec-skills' },
                      { label: 'Employment', href: '#sec-employment', badge: formData.workExperience.length === 0 ? 'Add' : undefined },
                      { label: 'Education', href: '#sec-education', badge: formData.education.length === 0 ? 'Add' : undefined },
                      { label: 'IT skills', href: '#sec-itskills' },
                      { label: 'Projects', href: '#sec-projects', badge: formData.projects.length === 0 ? 'Add' : undefined },
                      { label: 'Profile summary', href: '#sec-summary' },
                      { label: 'Accomplishments', href: '#sec-accomplishments' },
                      { label: 'Career profile', href: '#sec-career' },
                      { label: 'Personal details', href: '#sec-personal' },
                    ].map(({ label, href, badge }) => (
                      <ListItemButton
                        key={label}
                        onClick={(e) => {
                          e.preventDefault();
                          const id = href.replace('#', '');
                          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        sx={{
                          px: 2.5, py: 1,
                          borderBottom: `1px solid ${isDarkMode ? '#263244' : '#f8fafc'}`,
                          '&:hover': { bgcolor: isDarkMode ? '#172033' : '#f5f3ff', color: '#818CF8' },
                          transition: 'all 0.15s',
                          cursor: 'pointer',
                        }}
                      >
                        <ListItemText
                          primary={label}
                          primaryTypographyProps={{ variant: 'body2', color: isDarkMode ? '#FFFFFF' : '#475569', fontSize: '0.83rem' }}
                        />
                        {badge && (
                          <Typography variant="caption"
                            sx={{ color: '#A5B4FC', fontWeight: 700, bgcolor: isDarkMode ? '#1E293B' : '#f0f0ff', px: 1, py: 0.25, borderRadius: 1, fontSize: '0.7rem' }}>
                            {badge}
                          </Typography>
                        )}
                      </ListItemButton>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Main content */}
            <Grid item xs={12} md={9}>

              {/* Resume */}
              <SectionCard id="sec-resume" title="Resume">
                {(resumeUrl || resume) ? (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {resume?.name || resumeFileName || 'Resume.pdf'}
                        </Typography>
                        {resumeUploadDate && (
                          <Typography variant="caption" sx={{ color: isDarkMode ? '#FFFFFF' : '#888' }}>
                            Uploaded on {resumeUploadDate}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {resumeUrl && (
                          <IconButton size="small" href={resumeUrl} target="_blank" sx={{ color: '#1a73e8' }}>
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton
                          size="small" sx={{ color: '#e53935' }}
                          onClick={() => { setResume(null); setResumeUrl(''); setResumeFileName(''); }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        border: `1.5px dashed ${isDarkMode ? '#64748B' : '#ccc'}`, borderRadius: 1,
                        p: 2, textAlign: 'center',
                        '&:hover': { borderColor: '#1a73e8' },
                      }}
                    >
                      <Button
                        component="label"
                        variant="outlined"
                        size="small"
                        startIcon={<CloudUploadIcon />}
                      >
                        Update resume
                        <input
                          type="file" hidden accept=".pdf,.doc,.docx,.rtf"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              setResume(e.target.files[0]);
                              toast.success('Resume selected – click Save Profile to upload');
                            }
                          }}
                        />
                      </Button>
                      <Typography variant="caption" display="block" sx={{ mt: 0.5, color: isDarkMode ? '#FFFFFF' : '#888' }}>
                        Supported Formats: doc, docx, rtf, pdf, upto 2 MB
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      border: `1.5px dashed ${isDarkMode ? '#64748B' : '#ccc'}`, borderRadius: 1,
                      p: 3, textAlign: 'center',
                      '&:hover': { borderColor: '#1a73e8' },
                    }}
                  >
                    <Button
                      component="label"
                      variant="outlined"
                      startIcon={<CloudUploadIcon />}
                    >
                      Upload resume
                      <input
                        type="file" hidden accept=".pdf,.doc,.docx,.rtf"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setResume(e.target.files[0]);
                            toast.success('Resume selected – click Save Profile to upload');
                          }
                        }}
                      />
                    </Button>
                    <Typography variant="caption" display="block" sx={{ mt: 0.5, color: isDarkMode ? '#FFFFFF' : '#888' }}>
                      Supported Formats: doc, docx, rtf, pdf, upto 2 MB
                    </Typography>
                  </Box>
                )}
              </SectionCard>

              {/* Resume headline */}
              <SectionCard id="sec-headline" title="Resume headline" onEdit={() => setHeadlineDialog(true)}>
                {formData.resumeHeadline ? (
                  <Typography variant="body2" sx={{ color: isDarkMode ? '#FFFFFF' : '#444', lineHeight: 1.7 }}>
                    {formData.resumeHeadline}
                  </Typography>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{ color: '#1a73e8', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => setHeadlineDialog(true)}
                  >
                    + Add resume headline
                  </Typography>
                )}
              </SectionCard>

              {/* Key skills */}
              <SectionCard id="sec-skills" title="Key skills" onEdit={() => setSkillsDialog(true)}>
                {formData.skills.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {formData.skills.map((s) => (
                      <Chip key={s} label={s} size="small" variant="outlined"
                        sx={{ borderColor: isDarkMode ? '#64748B' : '#ccc', color: isDarkMode ? '#FFFFFF' : '#333' }} />
                    ))}
                  </Box>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{ color: '#1a73e8', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => setSkillsDialog(true)}
                  >
                    + Add key skills
                  </Typography>
                )}
              </SectionCard>

              {/* Employment */}
              <SectionCard
                id="sec-employment" title="Employment"
                onAdd={() => {
                  setNewWorkExp({ company: '', position: '', startDate: '', endDate: '', expYears: '', expMonths: '', isCurrent: false, description: '' });
                  setEditingWorkExpId(null);
                  setWorkExpDialog(true);
                }}
                addLabel="Add employment"
              >
                {formData.workExperience.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#888' }}>No employment added yet.</Typography>
                ) : (
                  formData.workExperience.map((exp, idx) => (
                    <Box key={exp.id}>
                      {idx > 0 && <Divider sx={{ my: 2 }} />}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{exp.position}</Typography>
                            <IconButton
                              size="small" sx={{ color: '#888' }}
                              onClick={() => {
                                setNewWorkExp({ company: exp.company, position: exp.position, startDate: '', endDate: '', expYears: '', expMonths: '', isCurrent: false, description: exp.description || '' });
                                setEditingWorkExpId(exp.id);
                                setWorkExpDialog(true);
                              }}
                            >
                              <EditIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>{exp.company}</Typography>
                          <Typography variant="body2" sx={{ color: '#888' }}>{exp.duration}</Typography>
                          {exp.description && (
                            <Typography variant="body2" sx={{ color: '#555', mt: 1, lineHeight: 1.7 }}>
                              {exp.description}
                            </Typography>
                          )}
                        </Box>
                        <IconButton
                          size="small" sx={{ color: '#e53935' }}
                          onClick={() => setFormData((p) => ({ ...p, workExperience: p.workExperience.filter((e) => e.id !== exp.id) }))}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </Box>
                  ))
                )}
              </SectionCard>

              {/* Education */}
              <SectionCard
                id="sec-education" title="Education"
                onAdd={() => {
                  setNewEducation({ degree: '', school: '', year: '', field: '' });
                  setEditingEducationId(null);
                  setEducationDialog(true);
                }}
                addLabel="Add education"
              >
                {formData.education.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#888' }}>No education added yet.</Typography>
                ) : (
                  formData.education.map((edu, idx) => (
                    <Box key={edu.id}>
                      {idx > 0 && <Divider sx={{ my: 2 }} />}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {edu.degree}{edu.field ? ` – ${edu.field}` : ''}
                            </Typography>
                            <IconButton
                              size="small" sx={{ color: '#888' }}
                              onClick={() => {
                                setNewEducation({ degree: edu.degree, school: edu.school, year: edu.year, field: edu.field || '' });
                                setEditingEducationId(edu.id);
                                setEducationDialog(true);
                              }}
                            >
                              <EditIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Box>
                          <Typography variant="body2" sx={{ color: '#444' }}>{edu.school}</Typography>
                          <Typography variant="body2" sx={{ color: '#888' }}>{edu.year}</Typography>
                        </Box>
                        <IconButton
                          size="small" sx={{ color: '#e53935' }}
                          onClick={() => setFormData((p) => ({ ...p, education: p.education.filter((e) => e.id !== edu.id) }))}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </Box>
                  ))
                )}
              </SectionCard>

              {/* IT Skills */}
              <SectionCard
                id="sec-itskills" title="IT skills"
                onAdd={() => {
                  setNewITSkill({ skill: '', version: '', lastUsed: new Date().getFullYear().toString(), expYears: '', expMonths: '' });
                  setEditingITSkillId(null);
                  setItSkillDialog(true);
                }}
                addLabel="Add IT skill"
              >
                {itSkills.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#888' }}>
                    Add your technical skills with version and experience details.
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['Skills', 'Version', 'Last used', 'Experience', ''].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 600, color: '#888', borderBottom: '1px solid #f0ede8', py: 1, fontSize: '0.8rem' }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {itSkills.map((s) => (
                        <TableRow key={s.id} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                          <TableCell sx={{ py: 1.5, color: '#333', fontWeight: 500 }}>{s.skill}</TableCell>
                          <TableCell sx={{ py: 1.5, color: '#555' }}>{s.version || '–'}</TableCell>
                          <TableCell sx={{ py: 1.5, color: '#555' }}>{s.lastUsed || '–'}</TableCell>
                          <TableCell sx={{ py: 1.5, color: '#555' }}>{s.experience || '–'}</TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton size="small" sx={{ color: '#888' }}
                                onClick={() => {
                                  // Parse stored "X Years Y Months" back into separate inputs when editing
                                  const yMatch = s.experience?.match(/(\d+)\s*Year/i);
                                  const mMatch = s.experience?.match(/(\d+)\s*Month/i);
                                  setNewITSkill({ skill: s.skill, version: s.version, lastUsed: s.lastUsed, expYears: yMatch ? Number(yMatch[1]) : '', expMonths: mMatch ? Number(mMatch[1]) : '' });
                                  setEditingITSkillId(s.id);
                                  setItSkillDialog(true);
                                }}>
                                <EditIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                              <IconButton size="small" sx={{ color: '#e53935' }}
                                onClick={() => setItSkills((p) => p.filter((x) => x.id !== s.id))}>
                                <DeleteIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </SectionCard>

              {/* Projects */}
              <SectionCard
                id="sec-projects" title="Projects"
                onAdd={() => { setNewProject({ title: '', description: '', url: '' }); setProjectDialog(true); }}
                addLabel="Add project"
              >
                {formData.projects.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#888' }}>
                    Stand out to employers by adding details about projects that you have done so far
                  </Typography>
                ) : (
                  formData.projects.map((proj, idx) => (
                    <Box key={proj.id}>
                      {idx > 0 && <Divider sx={{ my: 2 }} />}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{proj.title}</Typography>
                          <Typography variant="body2" sx={{ color: '#555' }}>{proj.description}</Typography>
                          {proj.url && (
                            <Typography component="a" href={proj.url} target="_blank"
                              variant="caption" sx={{ color: '#1a73e8' }}>
                              {proj.url}
                            </Typography>
                          )}
                        </Box>
                        <IconButton size="small" sx={{ color: '#e53935' }}
                          onClick={() => setFormData((p) => ({ ...p, projects: p.projects.filter((pr) => pr.id !== proj.id) }))}>
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </Box>
                  ))
                )}
              </SectionCard>

              {/* Profile Summary */}
              <SectionCard id="sec-summary" title="Profile summary" onEdit={() => setSummaryDialog(true)}>
                {formData.profileSummary ? (
                  <Typography variant="body2" sx={{ color: '#444', lineHeight: 1.8 }}>
                    {formData.profileSummary}
                  </Typography>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{ color: '#1a73e8', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => setSummaryDialog(true)}
                  >
                    + Add profile summary
                  </Typography>
                )}
              </SectionCard>

              {/* Accomplishments */}
              <SectionCard id="sec-accomplishments" title="Accomplishments">
                {/* Online Profiles */}
                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Online profile</Typography>
                    <Typography
                      variant="caption" sx={{ color: '#1a73e8', cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => setHeaderDialog(true)}
                    >
                      {formData.linkedinUrl || formData.githubUrl || formData.portfolioUrl ? 'Edit' : 'Add'}
                    </Typography>
                  </Box>
                  {formData.linkedinUrl || formData.githubUrl || formData.portfolioUrl ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {formData.linkedinUrl && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinkedInIcon sx={{ fontSize: 18, color: '#0077b5' }} />
                          <Typography component="a" href={formData.linkedinUrl} target="_blank"
                            variant="body2" sx={{ color: '#1a73e8' }}>{formData.linkedinUrl}</Typography>
                        </Box>
                      )}
                      {formData.githubUrl && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <GitHubIcon sx={{ fontSize: 18, color: '#333' }} />
                          <Typography component="a" href={formData.githubUrl} target="_blank"
                            variant="body2" sx={{ color: '#1a73e8' }}>{formData.githubUrl}</Typography>
                        </Box>
                      )}
                      {formData.portfolioUrl && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LanguageIcon sx={{ fontSize: 18, color: '#555' }} />
                          <Typography component="a" href={formData.portfolioUrl} target="_blank"
                            variant="body2" sx={{ color: '#1a73e8' }}>{formData.portfolioUrl}</Typography>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#888' }}>
                      Add link to online professional profiles (e.g. LinkedIn, etc.)
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ my: 1.5 }} />

                {/* Certifications */}
                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Certification</Typography>
                    <Typography variant="caption" sx={{ color: '#1a73e8', cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => { setNewCert({ name: '', issuer: '', year: '' }); setCertDialog(true); }}>
                      Add
                    </Typography>
                  </Box>
                  {formData.certifications.length === 0 ? (
                    <Typography variant="body2" sx={{ color: '#888' }}>
                      Add details of certifications you have completed
                    </Typography>
                  ) : (
                    formData.certifications.map((cert) => (
                      <Box key={cert.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{cert.name}</Typography>
                          <Typography variant="caption" sx={{ color: '#888' }}>
                            {cert.issuer}{cert.year ? ` · ${cert.year}` : ''}
                          </Typography>
                        </Box>
                        <IconButton size="small" sx={{ color: '#e53935' }}
                          onClick={() => setFormData((p) => ({ ...p, certifications: p.certifications.filter((c) => c.id !== cert.id) }))}>
                          <DeleteIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    ))
                  )}
                </Box>

                {/* Static accomplishment placeholders */}
                {[
                  { label: 'Work sample', desc: 'Link relevant work samples (e.g. Github, Behance)' },
                  { label: 'White paper / Research publication / Journal entry', desc: 'Add links to your online publications' },
                  { label: 'Presentation', desc: 'Add links to your online presentations (e.g. Slide-share etc.)' },
                  { label: 'Patent', desc: 'Add details of patents you have filed' },
                ].map(({ label, desc }) => (
                  <Box key={label}>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{label}</Typography>
                        <Typography variant="body2" sx={{ color: '#888' }}>{desc}</Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#1a73e8', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', ml: 2 }}>
                        Add
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </SectionCard>

              {/* Career Profile */}
              <SectionCard id="sec-career" title="Career profile" onEdit={() => setCareerProfileDialog(true)}>
                <Grid container spacing={2}>
                  {[
                    { label: 'Current industry', value: formData.currentIndustry },
                    { label: 'Department', value: formData.department },
                    { label: 'Role category', value: formData.roleCategory },
                    { label: 'Job role', value: formData.currentDesignation },
                    { label: 'Desired job type', value: formData.desiredJobTypes.join(', ') },
                    { label: 'Desired employment type', value: formData.desiredEmploymentTypes.join(', ') },
                    { label: 'Preferred job role', value: formData.preferredJobTitles.join(', ') },
                    { label: 'Preferred work location', value: formData.preferredWorkLocations.join(', ') },
                    { label: 'Preferred annual salary', value: formData.expectedCTC ? `₹ ${formData.expectedCTC}` : '' },
                    { label: 'Preferred shift', value: formData.preferredShift },
                  ].map(({ label, value }) => (
                    <Grid item xs={12} sm={6} key={label}>
                      <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>{label}</Typography>
                      <Typography variant="body2" sx={{ color: value ? '#1a1a1a' : '#bbb', fontWeight: value ? 600 : 400 }}>
                        {value || '—'}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </SectionCard>

              {/* Personal Details + Languages + Diversity */}
              <SectionCard id="sec-personal" title="Personal details" onEdit={() => setPersonalDetailsDialog(true)}>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {[
                    { label: 'Personal', value: [formData.gender, formData.maritalStatus].filter(Boolean).join(', ') },
                    { label: 'Work permit', value: formData.workPermit.join(', ') },
                    {
                      label: 'Date of birth',
                      value: formData.dateOfBirth
                        ? new Date(formData.dateOfBirth).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '',
                    },
                    {
                      label: 'Address',
                      value: [formData.address, formData.city, formData.state, formData.country].filter(Boolean).join(', '),
                    },
                    { label: 'Category', value: formData.category },
                    { label: 'Notice period', value: formData.noticePeriod },
                  ].map(({ label, value }) => (
                    <Grid item xs={12} sm={6} key={label}>
                      <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>{label}</Typography>
                      <Typography variant="body2" sx={{ color: value ? '#1a1a1a' : '#bbb', fontWeight: value ? 600 : 400 }}>
                        {value || '—'}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>

                <Divider sx={{ my: 2 }} />

                {/* Languages */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Languages</Typography>
                    <Typography
                      variant="caption" sx={{ color: '#1a73e8', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => {
                        setNewLanguage({ name: '', proficiency: 'Expert', canRead: true, canWrite: true, canSpeak: true });
                        setEditingLanguageId(null);
                        setLanguageDialog(true);
                      }}
                    >
                      Add languages
                    </Typography>
                  </Box>
                  {languages.length === 0 ? (
                    <Typography variant="body2" sx={{ color: '#888' }}>No languages added yet.</Typography>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {['Languages', 'Proficiency', 'Read', 'Write', 'Speak', ''].map((h) => (
                            <TableCell
                              key={h}
                              align={['Read', 'Write', 'Speak'].includes(h) ? 'center' : 'left'}
                              sx={{ fontWeight: 600, color: '#888', borderBottom: '1px solid #f0ede8', py: 1, fontSize: '0.8rem' }}
                            >
                              {h}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {languages.map((lang) => (
                          <TableRow key={lang.id}>
                            <TableCell sx={{ py: 1.5, fontWeight: 600 }}>{lang.name}</TableCell>
                            <TableCell sx={{ py: 1.5, color: '#555', fontWeight: 600 }}>{lang.proficiency}</TableCell>
                            <CheckCell value={lang.canRead} />
                            <CheckCell value={lang.canWrite} />
                            <CheckCell value={lang.canSpeak} />
                            <TableCell sx={{ py: 1.5 }}>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton size="small" sx={{ color: '#888' }}
                                  onClick={() => {
                                    setNewLanguage({ name: lang.name, proficiency: lang.proficiency, canRead: lang.canRead, canWrite: lang.canWrite, canSpeak: lang.canSpeak });
                                    setEditingLanguageId(lang.id);
                                    setLanguageDialog(true);
                                  }}>
                                  <EditIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                                <IconButton size="small" sx={{ color: '#e53935' }}
                                  onClick={() => setLanguages((p) => p.filter((l) => l.id !== lang.id))}>
                                  <DeleteIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Diversity */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Diversity & inclusion</Typography>
                      <Typography variant="caption" sx={{ color: '#888' }}>
                        Share details to attract recruiters who value people from different backgrounds
                      </Typography>
                    </Box>
                    <IconButton size="small" sx={{ color: '#888' }} onClick={() => setPersonalDetailsDialog(true)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="caption" sx={{ color: '#888' }}>Disability status</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>
                    {formData.disabilityStatus}
                  </Typography>
                </Box>
              </SectionCard>

              {/* Save All */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4 }}>
                <Button
                  variant="contained" size="large"
                  onClick={() => handleSave()} disabled={saving}
                  sx={{
                    px: 6, borderRadius: 3, textTransform: 'none', fontWeight: 700, fontSize: '1rem',
                    background: 'linear-gradient(135deg, #4338ca, #7c3aed)',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                    '&:hover': { background: 'linear-gradient(135deg, #3730a3, #6d28d9)', boxShadow: '0 6px 20px rgba(99,102,241,0.5)' },
                  }}
                >
                  {saving ? 'Saving…' : 'Save Profile'}
                </Button>
              </Box>

            </Grid>{/* end main */}
          </Grid>{/* end two-column */}
        </Container>
      </Box>

      {/* ════════════════════════════════════════════════════════════════════════
          DIALOGS
      ════════════════════════════════════════════════════════════════════════ */}

      {/* Header / Contact Info */}
      <Dialog open={headerDialog} onClose={() => setHeaderDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Profile Info</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField fullWidth label="Full Name" value={formData.fullName}
            onChange={(e) => setField('fullName', e.target.value)} />
          <TextField fullWidth label="Current Designation" value={formData.currentDesignation}
            onChange={(e) => setField('currentDesignation', e.target.value)} />
          <TextField fullWidth label="Current Company" value={formData.currentCompany}
            onChange={(e) => setField('currentCompany', e.target.value)} />
          <TextField fullWidth label="Phone" value={formData.phone}
            onChange={(e) => setField('phone', e.target.value)} />
          <TextField fullWidth label="City" value={formData.city}
            onChange={(e) => setField('city', e.target.value)} />
          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>State</InputLabel>
                <Select value={formData.state} label="State"
                  onChange={(e: SelectChangeEvent) => setField('state', e.target.value)}>
                  {(COUNTRY_STATES[formData.country] || []).map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Country</InputLabel>
                <Select value={formData.country} label="Country"
                  onChange={(e: SelectChangeEvent) => setField('country', e.target.value)}>
                  {COUNTRIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <FormControlLabel
            control={<Switch checked={formData.isFresher} onChange={(e) => setField('isFresher', e.target.checked)} />}
            label="I am a Fresher (0 experience)"
          />
          {!formData.isFresher && (
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Exp. Years</InputLabel>
                  <Select value={String(formData.experienceYears)} label="Exp. Years"
                    onChange={(e: SelectChangeEvent) => setField('experienceYears', e.target.value)}>
                    {Array.from({ length: 31 }, (_, i) => i).map((y) => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Exp. Months</InputLabel>
                  <Select value={String(formData.experienceMonths)} label="Exp. Months"
                    onChange={(e: SelectChangeEvent) => setField('experienceMonths', e.target.value)}>
                    {Array.from({ length: 12 }, (_, i) => i).map((m) => (
                      <MenuItem key={m} value={m}>{m}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}
          <TextField fullWidth label="Current CTC (e.g. 11,00,000)" value={formData.currentCTC}
            onChange={(e) => setField('currentCTC', e.target.value)} />
          <FormControl fullWidth>
            <InputLabel>Notice Period</InputLabel>
            <Select value={formData.noticePeriod} label="Notice Period"
              onChange={(e: SelectChangeEvent) => setField('noticePeriod', e.target.value)}>
              {NOTICE_PERIOD_OPTIONS.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
            </Select>
          </FormControl>
          <Divider />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Online Profiles</Typography>
          <TextField fullWidth label="LinkedIn URL" value={formData.linkedinUrl}
            onChange={(e) => setField('linkedinUrl', e.target.value)}
            InputProps={{ startAdornment: <LinkedInIcon sx={{ mr: 1, color: '#0077b5' }} /> }} />
          <TextField fullWidth label="GitHub URL" value={formData.githubUrl}
            onChange={(e) => setField('githubUrl', e.target.value)}
            InputProps={{ startAdornment: <GitHubIcon sx={{ mr: 1, color: '#333' }} /> }} />
          <TextField fullWidth label="Portfolio URL" value={formData.portfolioUrl}
            onChange={(e) => setField('portfolioUrl', e.target.value)}
            InputProps={{ startAdornment: <LanguageIcon sx={{ mr: 1, color: '#555' }} /> }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHeaderDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => { handleSave(); setHeaderDialog(false); }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Resume Headline */}
      <Dialog open={headlineDialog} onClose={() => setHeadlineDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Resume Headline</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
            It is the first thing recruiters notice when they view your profile. Write concisely what makes you unique as a professional.
          </Typography>
          <TextField
            fullWidth multiline rows={3}
            placeholder="e.g. Python Full Stack Developer with 4+ years of experience..."
            value={formData.resumeHeadline}
            onChange={(e) => setField('resumeHeadline', e.target.value)}
            inputProps={{ maxLength: 250 }}
            helperText={`${formData.resumeHeadline.length}/250`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHeadlineDialog(false)}>Cancel</Button>
          <Button variant="contained"
            onClick={() => {
              // Mirror headline into profileSummary if summary is empty
              const updates: Partial<typeof formData> = { resumeHeadline: formData.resumeHeadline };
              if (!formData.profileSummary) updates.profileSummary = formData.resumeHeadline;
              handleSave(updates);
              setHeadlineDialog(false);
            }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Profile Summary */}
      <Dialog open={summaryDialog} onClose={() => setSummaryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Profile Summary</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
            Give employers a brief overview of your experience, skills, and accomplishments.
          </Typography>
          <TextField
            fullWidth multiline rows={6}
            placeholder="Describe your professional background, key skills, and career goals..."
            value={formData.profileSummary}
            onChange={(e) => setField('profileSummary', e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSummaryDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => { handleSave(); setSummaryDialog(false); }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Key Skills */}
      <Dialog open={skillsDialog} onClose={() => setSkillsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Key Skills</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth size="small" placeholder="Add a skill (press Enter)"
              value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && skillInput.trim()) {
                  e.preventDefault();
                  if (!formData.skills.includes(skillInput.trim())) {
                    setFormData((p) => ({ ...p, skills: [...p.skills, skillInput.trim()] }));
                  }
                  setSkillInput('');
                }
              }}
            />
            <Button variant="contained"
              onClick={() => {
                if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
                  setFormData((p) => ({ ...p, skills: [...p.skills, skillInput.trim()] }));
                }
                setSkillInput('');
              }}>
              <AddIcon />
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {formData.skills.map((s) => (
              <Chip key={s} label={s} size="small"
                onDelete={() => setFormData((p) => ({ ...p, skills: p.skills.filter((x) => x !== s) }))} />
            ))}
          </Box>
          {preferredTitleSuggestions.filter((t) => !formData.skills.includes(t)).length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#555' }}>Suggestions – click to add</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {preferredTitleSuggestions
                  .filter((t) => !formData.skills.includes(t))
                  .map((t) => (
                    <Chip
                      key={t}
                      label={t}
                      variant="outlined"
                      size="small"
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() =>
                        setFormData((p) =>
                          p.skills.includes(t) ? p : { ...p, skills: [...p.skills, t] }
                        )
                      }
                    />
                  ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSkillsDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => { handleSave(); setSkillsDialog(false); }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Work Experience */}
      <Dialog open={workExpDialog} onClose={() => setWorkExpDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingWorkExpId ? 'Edit Employment' : 'Add Employment'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField fullWidth label="Designation / Title *" value={newWorkExp.position}
            onChange={(e) => setNewWorkExp((p) => ({ ...p, position: e.target.value }))} />
          <TextField fullWidth label="Organization *" value={newWorkExp.company}
            onChange={(e) => setNewWorkExp((p) => ({ ...p, company: e.target.value }))} />
          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <TextField fullWidth label="Start Date (e.g. Jun 2022)" value={newWorkExp.startDate}
                onChange={(e) => setNewWorkExp((p) => ({ ...p, startDate: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label={newWorkExp.isCurrent ? 'End Date' : 'End Date (e.g. Jul 2026)'}
                value={newWorkExp.isCurrent ? 'Still working' : newWorkExp.endDate}
                disabled={newWorkExp.isCurrent}
                onChange={(e) => setNewWorkExp((p) => ({ ...p, endDate: e.target.value }))}
                sx={newWorkExp.isCurrent ? { '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#43a047', fontWeight: 600 } } : {}}
              />
            </Grid>
          </Grid>
          <FormControlLabel
            control={
              <Switch checked={newWorkExp.isCurrent}
                onChange={(e) => setNewWorkExp((p) => ({ ...p, isCurrent: e.target.checked, endDate: e.target.checked ? '' : p.endDate }))} />
            }
            label="I currently work here"
          />
          <TextField fullWidth label="Job Description" multiline rows={4} value={newWorkExp.description}
            onChange={(e) => setNewWorkExp((p) => ({ ...p, description: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWorkExpDialog(false)}>Cancel</Button>
          <Button variant="contained"
            onClick={() => {
              if (!newWorkExp.position || !newWorkExp.company) {
                toast.error('Designation and Organization are required');
                return;
              }
              const endLabel = newWorkExp.isCurrent ? 'Still working' : (newWorkExp.endDate || '');
              const duration = newWorkExp.startDate
                ? `${newWorkExp.startDate}${endLabel ? ' – ' + endLabel : ''}`
                : endLabel;
              if (editingWorkExpId) {
                setFormData((p) => ({
                  ...p,
                  workExperience: p.workExperience.map((e) =>
                    e.id === editingWorkExpId
                      ? { ...e, position: newWorkExp.position, company: newWorkExp.company, duration, description: newWorkExp.description }
                      : e
                  ),
                }));
              } else {
                setFormData((p) => ({
                  ...p,
                  workExperience: [
                    ...p.workExperience,
                    { id: Date.now().toString(), position: newWorkExp.position, company: newWorkExp.company, duration, description: newWorkExp.description },
                  ],
                }));
              }
              setWorkExpDialog(false);
            }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Education */}
      <Dialog open={educationDialog} onClose={() => setEducationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingEducationId ? 'Edit Education' : 'Add Education'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField fullWidth label="Degree / Course *" value={newEducation.degree}
            onChange={(e) => setNewEducation((p) => ({ ...p, degree: e.target.value }))} />
          <TextField fullWidth label="Field of Study" value={newEducation.field}
            onChange={(e) => setNewEducation((p) => ({ ...p, field: e.target.value }))} />
          <TextField fullWidth label="School / University *" value={newEducation.school}
            onChange={(e) => setNewEducation((p) => ({ ...p, school: e.target.value }))} />
          <TextField fullWidth label="Year of Passing *" value={newEducation.year}
            onChange={(e) => setNewEducation((p) => ({ ...p, year: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEducationDialog(false)}>Cancel</Button>
          <Button variant="contained"
            onClick={() => {
              if (!newEducation.degree || !newEducation.school || !newEducation.year) {
                toast.error('Fill all required fields');
                return;
              }
              if (editingEducationId) {
                setFormData((p) => ({ ...p, education: p.education.map((e) => e.id === editingEducationId ? { ...e, ...newEducation } : e) }));
              } else {
                setFormData((p) => ({ ...p, education: [...p.education, { id: Date.now().toString(), ...newEducation }] }));
              }
              setEducationDialog(false);
            }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* IT Skill */}
      <Dialog open={itSkillDialog} onClose={() => setItSkillDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingITSkillId ? 'Edit IT Skill' : 'Add IT Skill'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField fullWidth label="Skill *" value={newITSkill.skill}
            onChange={(e) => setNewITSkill((p) => ({ ...p, skill: e.target.value }))} />
          <TextField fullWidth label="Version (e.g. V19, 3.10, LATEST)" value={newITSkill.version}
            onChange={(e) => setNewITSkill((p) => ({ ...p, version: e.target.value }))} />
          <TextField fullWidth label="Last Used (year)" value={newITSkill.lastUsed}
            onChange={(e) => setNewITSkill((p) => ({ ...p, lastUsed: e.target.value }))} />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Experience</Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <TextField
                  fullWidth label="Years" type="number" inputProps={{ min: 0, max: 50 }}
                  value={newITSkill.expYears}
                  onChange={(e) => setNewITSkill((p) => ({ ...p, expYears: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) }))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth label="Months" type="number" inputProps={{ min: 0, max: 11 }}
                  value={newITSkill.expMonths}
                  onChange={(e) => setNewITSkill((p) => ({ ...p, expMonths: e.target.value === '' ? '' : Math.min(11, Math.max(0, Number(e.target.value))) }))}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItSkillDialog(false)}>Cancel</Button>
          <Button variant="contained"
            onClick={() => {
              if (!newITSkill.skill) { toast.error('Skill name is required'); return; }
              const y = Number(newITSkill.expYears) || 0;
              const m = Number(newITSkill.expMonths) || 0;
              const experience = [y ? `${y} Year${y !== 1 ? 's' : ''}` : '', m ? `${m} Month${m !== 1 ? 's' : ''}` : ''].filter(Boolean).join(' ');
              const entry = { skill: newITSkill.skill, version: newITSkill.version, lastUsed: newITSkill.lastUsed, experience };
              if (editingITSkillId) {
                setItSkills((p) => p.map((s) => s.id === editingITSkillId ? { ...s, ...entry } : s));
              } else {
                setItSkills((p) => [...p, { id: Date.now().toString(), ...entry }]);
              }
              setItSkillDialog(false);
            }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Project */}
      <Dialog open={projectDialog} onClose={() => setProjectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Project</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField fullWidth label="Project Title *" value={newProject.title}
            onChange={(e) => setNewProject((p) => ({ ...p, title: e.target.value }))} />
          <TextField fullWidth label="Description" multiline rows={3} value={newProject.description}
            onChange={(e) => setNewProject((p) => ({ ...p, description: e.target.value }))} />
          <TextField fullWidth label="Project URL" value={newProject.url}
            onChange={(e) => setNewProject((p) => ({ ...p, url: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProjectDialog(false)}>Cancel</Button>
          <Button variant="contained"
            onClick={() => {
              if (!newProject.title) { toast.error('Project title is required'); return; }
              setFormData((p) => ({ ...p, projects: [...p.projects, { id: Date.now().toString(), ...newProject }] }));
              setProjectDialog(false);
            }}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Certification */}
      <Dialog open={certDialog} onClose={() => setCertDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Certification</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField fullWidth label="Certification Name *" value={newCert.name}
            onChange={(e) => setNewCert((p) => ({ ...p, name: e.target.value }))} />
          <TextField fullWidth label="Issuer *" value={newCert.issuer}
            onChange={(e) => setNewCert((p) => ({ ...p, issuer: e.target.value }))} />
          <TextField fullWidth label="Year" value={newCert.year}
            onChange={(e) => setNewCert((p) => ({ ...p, year: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCertDialog(false)}>Cancel</Button>
          <Button variant="contained"
            onClick={() => {
              if (!newCert.name || !newCert.issuer) { toast.error('Fill required fields'); return; }
              setFormData((p) => ({ ...p, certifications: [...p.certifications, { id: Date.now().toString(), ...newCert }] }));
              setCertDialog(false);
            }}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Career Profile */}
      <Dialog open={careerProfileDialog} onClose={() => setCareerProfileDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Career Profile</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Current Industry</InputLabel>
            <Select value={formData.currentIndustry} label="Current Industry"
              onChange={(e: SelectChangeEvent) => setField('currentIndustry', e.target.value)}>
              {INDUSTRY_OPTIONS.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Department</InputLabel>
            <Select value={formData.department} label="Department"
              onChange={(e: SelectChangeEvent) => setField('department', e.target.value)}>
              {DEPARTMENT_OPTIONS.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Role Category</InputLabel>
            <Select value={formData.roleCategory} label="Role Category"
              onChange={(e: SelectChangeEvent) => setField('roleCategory', e.target.value)}>
              {ROLE_CATEGORY_OPTIONS.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </Select>
          </FormControl>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Desired Job Type</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
              {JOB_TYPE_OPTIONS.map((t) => (
                <FormControlLabel key={t}
                  control={<Checkbox size="small" checked={formData.desiredJobTypes.includes(t)}
                    onChange={() => toggleArrayItem('desiredJobTypes', t)} />}
                  label={t} />
              ))}
            </Box>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Desired Employment Type</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {EMPLOYMENT_TYPE_OPTIONS.map((t) => (
                <FormControlLabel key={t}
                  control={<Checkbox size="small" checked={formData.desiredEmploymentTypes.includes(t)}
                    onChange={() => toggleArrayItem('desiredEmploymentTypes', t)} />}
                  label={t} />
              ))}
            </Box>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Preferred Work Locations</Typography>
            {/* Selected locations as deletable chips */}
            {formData.preferredWorkLocations.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                {formData.preferredWorkLocations.map((c) => (
                  <Chip key={c} label={c} size="small"
                    onDelete={() => setFormData((p) => ({ ...p, preferredWorkLocations: p.preferredWorkLocations.filter((x) => x !== c) }))} />
                ))}
              </Box>
            )}
            {/* Text input + Add button */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                size="small" placeholder="Type a location and press Enter"
                value={preferredLocationInput}
                onChange={(e) => setPreferredLocationInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && preferredLocationInput.trim()) {
                    e.preventDefault();
                    const val = preferredLocationInput.trim();
                    if (!formData.preferredWorkLocations.includes(val)) {
                      setFormData((p) => ({ ...p, preferredWorkLocations: [...p.preferredWorkLocations, val] }));
                    }
                    setPreferredLocationInput('');
                  }
                }}
                sx={{ flex: 1 }}
              />
              <Button variant="outlined"
                onClick={() => {
                  const val = preferredLocationInput.trim();
                  if (val && !formData.preferredWorkLocations.includes(val)) {
                    setFormData((p) => ({ ...p, preferredWorkLocations: [...p.preferredWorkLocations, val] }));
                  }
                  setPreferredLocationInput('');
                }}>Add</Button>
            </Box>
            {/* City quick-suggestions */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {INDIA_CITIES.filter((c) => !formData.preferredWorkLocations.includes(c)).map((c) => (
                <Chip key={c} label={c} size="small" variant="outlined"
                  sx={{ cursor: 'pointer', fontSize: '0.75rem' }}
                  onClick={() => setFormData((p) => ({ ...p, preferredWorkLocations: [...p.preferredWorkLocations, c] }))} />
              ))}
            </Box>
          </Box>
          <TextField fullWidth label="Preferred Annual Salary (e.g. 15,00,000)" value={formData.expectedCTC}
            onChange={(e) => setField('expectedCTC', e.target.value)} />
          <FormControl fullWidth>
            <InputLabel>Preferred Shift</InputLabel>
            <Select value={formData.preferredShift} label="Preferred Shift"
              onChange={(e: SelectChangeEvent) => setField('preferredShift', e.target.value)}>
              {SHIFT_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Preferred Job Roles</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              {formData.preferredJobTitles.map((t) => (
                <Chip key={t} label={t} size="small"
                  onDelete={() => setFormData((p) => ({ ...p, preferredJobTitles: p.preferredJobTitles.filter((x) => x !== t) }))} />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField size="small" placeholder="Add preferred job role" value={preferredTitleInput}
                onChange={(e) => setPreferredTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && preferredTitleInput.trim()) {
                    e.preventDefault();
                    if (!formData.preferredJobTitles.includes(preferredTitleInput.trim())) {
                      setFormData((p) => ({ ...p, preferredJobTitles: [...p.preferredJobTitles, preferredTitleInput.trim()] }));
                    }
                    setPreferredTitleInput('');
                  }
                }}
                sx={{ flex: 1 }} />
              <Button variant="outlined"
                onClick={() => {
                  if (preferredTitleInput.trim() && !formData.preferredJobTitles.includes(preferredTitleInput.trim())) {
                    setFormData((p) => ({ ...p, preferredJobTitles: [...p.preferredJobTitles, preferredTitleInput.trim()] }));
                  }
                  setPreferredTitleInput('');
                }}>Add</Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCareerProfileDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => { handleSave(); setCareerProfileDialog(false); }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Personal Details */}
      <Dialog open={personalDetailsDialog} onClose={() => setPersonalDetailsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Personal Details</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Gender</InputLabel>
            <Select value={formData.gender} label="Gender"
              onChange={(e: SelectChangeEvent) => setField('gender', e.target.value)}>
              {GENDER_OPTIONS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Marital Status</InputLabel>
            <Select value={formData.maritalStatus} label="Marital Status"
              onChange={(e: SelectChangeEvent) => setField('maritalStatus', e.target.value)}>
              {MARITAL_OPTIONS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField fullWidth label="Date of Birth" type="date" value={formData.dateOfBirth}
            onChange={(e) => setField('dateOfBirth', e.target.value)}
            InputLabelProps={{ shrink: true }} />
          <TextField fullWidth label="Address" multiline rows={2} value={formData.address}
            onChange={(e) => setField('address', e.target.value)} />
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select value={formData.category} label="Category"
              onChange={(e: SelectChangeEvent) => setField('category', e.target.value)}>
              {CATEGORY_OPTIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Work Permit</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
              {WORK_PERMIT_OPTIONS.map((w) => (
                <FormControlLabel key={w}
                  control={<Checkbox size="small" checked={formData.workPermit.includes(w)}
                    onChange={() => toggleArrayItem('workPermit', w)} />}
                  label={w} />
              ))}
            </Box>
          </Box>
          <Divider />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Diversity & Inclusion</Typography>
          <FormControl fullWidth>
            <InputLabel>Disability Status</InputLabel>
            <Select value={formData.disabilityStatus} label="Disability Status"
              onChange={(e: SelectChangeEvent) => setField('disabilityStatus', e.target.value)}>
              {['Do not have disability', 'Have disability'].map((d) => (
                <MenuItem key={d} value={d}>{d}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPersonalDetailsDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => { handleSave(); setPersonalDetailsDialog(false); }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Language */}
      <Dialog open={languageDialog} onClose={() => setLanguageDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingLanguageId ? 'Edit Language' : 'Add Language'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField fullWidth label="Language *" value={newLanguage.name}
            onChange={(e) => setNewLanguage((p) => ({ ...p, name: e.target.value }))} />
          <FormControl fullWidth>
            <InputLabel>Proficiency</InputLabel>
            <Select value={newLanguage.proficiency} label="Proficiency"
              onChange={(e: SelectChangeEvent) => setNewLanguage((p) => ({ ...p, proficiency: e.target.value }))}>
              {PROFICIENCY_OPTIONS.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </Select>
          </FormControl>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Skills</Typography>
            {[
              { key: 'canRead', label: 'Read' },
              { key: 'canWrite', label: 'Write' },
              { key: 'canSpeak', label: 'Speak' },
            ].map(({ key, label }) => (
              <FormControlLabel key={key}
                control={
                  <Checkbox
                    checked={newLanguage[key as keyof typeof newLanguage] as boolean}
                    onChange={(e) => setNewLanguage((p) => ({ ...p, [key]: e.target.checked }))}
                  />
                }
                label={label} />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLanguageDialog(false)}>Cancel</Button>
          <Button variant="contained"
            onClick={() => {
              if (!newLanguage.name) { toast.error('Language name is required'); return; }
              if (editingLanguageId) {
                setLanguages((p) => p.map((l) => l.id === editingLanguageId ? { ...l, ...newLanguage } : l));
              } else {
                setLanguages((p) => [...p, { id: Date.now().toString(), ...newLanguage }]);
              }
              setLanguageDialog(false);
            }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

    </Layout>
  );
};
