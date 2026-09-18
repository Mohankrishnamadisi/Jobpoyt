import React, { useState } from 'react';
import {
  Box,
  Container,
  Card,
  TextField,
  Button,
  Typography,
  Link,
  Grid,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  Chip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CloudUpload as CloudUploadIcon,
  Add as AddIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { Layout } from '@components/layout/Layout';
import { useAuthStore } from '@store/index';
import { authService } from '@services/supabase';
import { userService } from '@services/api';
import {
  ROUTES,
  USER_ROLES,
  GENDER_OPTIONS,
  INDIAN_STATES,
  NOTICE_PERIOD_OPTIONS,
  COUNTRIES,
  COUNTRY_CITIES,
  COUNTRY_STATES,
} from '@constants/index';
import { formatExperienceString, getTotalExperienceMonths } from '@utils/experience';
import {
  validateEmail,
  validatePassword,
  validatePhone,
  validateURL,
  validateDateOfBirth,
  validateFileSize,
} from '@utils/index';
import toast from 'react-hot-toast';

const MotionCard = motion(Card);
const steps = ['Personal Info', 'Education & Skills', 'Professional Details'];
const EXPERIENCE_YEARS_OPTIONS = Array.from({ length: 31 }, (_, i) => i);
const EXPERIENCE_MONTHS_OPTIONS = Array.from({ length: 12 }, (_, i) => i);

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, setLoading } = useAuthStore();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoadingState] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [existingDialogOpen, setExistingDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [resume, setResume] = useState<File | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    gender: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    education: '',
    skills: [] as string[],
    experience: '',
    experienceYears: '',
    experienceMonths: '',
    currentCompany: '',
    currentCtc: '',
    expectedCtc: '',
    noticePeriod: '',
    linkedinUrl: '',
    portfolioUrl: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>
  ) => {
    const { name, value } = ('target' in e ? e.target : { name: undefined, value: undefined }) as {
      name?: string;
      value: unknown;
    };
    if (!name) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name in errors) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData((prev) => ({ ...prev, skills: [...prev.skills, skillInput.trim()] }));
      setSkillInput('');
    }
  };

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
      if (!validateEmail(formData.email)) newErrors.email = 'Valid email is required';
      if (!validatePhone(formData.phone)) newErrors.phone = 'Valid 10-digit mobile number required';
      if (!validatePassword(formData.password)) {
        newErrors.password = 'Min 8 chars with uppercase, lowercase & number';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
      if (!formData.gender) newErrors.gender = 'Gender is required';
      if (!formData.dateOfBirth) {
        newErrors.dateOfBirth = 'Date of birth is required';
      } else if (!validateDateOfBirth(formData.dateOfBirth)) {
        newErrors.dateOfBirth = 'Must be between 16 and 80 years old';
      }
      if (!formData.address.trim()) newErrors.address = 'Address is required';
      if (!formData.city.trim()) newErrors.city = 'City is required';
      if (!formData.state) newErrors.state = 'State is required';
      if (!formData.country.trim()) newErrors.country = 'Country is required';
    }

    if (step === 1) {
      if (!formData.education) newErrors.education = 'Education is required';
      if (formData.skills.length === 0) newErrors.skills = 'Add at least one skill';
    }

    if (step === 2) {
      const years = Number(formData.experienceYears);
      const months = Number(formData.experienceMonths);
      if ((Number.isNaN(years) || years <= 0) && (Number.isNaN(months) || months <= 0)) {
        newErrors.experience = 'Experience is required';
      }
      if (!formData.noticePeriod) newErrors.noticePeriod = 'Notice period is required';
      if (formData.linkedinUrl && !validateURL(formData.linkedinUrl)) {
        newErrors.linkedinUrl = 'Invalid LinkedIn URL';
      }
      if (formData.portfolioUrl && !validateURL(formData.portfolioUrl)) {
        newErrors.portfolioUrl = 'Invalid portfolio URL';
      }
      if (!resume) newErrors.resume = 'Resume upload is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleSignup = async () => {
    if (!validateStep(2)) return;

    setLoadingState(true);
    setLoading(true);

    try {
      const response = await authService.signUp(formData.email, formData.password, {
        name: formData.fullName,
        role: USER_ROLES.JOB_SEEKER,
      });

      if (response.user) {
        let resumeUrl = '';
        let profileImageUrl = '';

        if (resume) {
          resumeUrl = await userService.uploadResume(response.user.id, resume);
        }
        if (profileImage) {
          profileImageUrl = await userService.uploadProfileImage(response.user.id, profileImage);
        }

        await userService.createProfile(response.user.id, {
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          role: USER_ROLES.JOB_SEEKER,
          gender: formData.gender,
          date_of_birth: formData.dateOfBirth,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          education: formData.education,
          skills: formData.skills,
          experience: formatExperienceString(formData.experienceYears, formData.experienceMonths),
          experience_years: Number(formData.experienceYears) || 0,
          experience_months: Number(formData.experienceMonths) || 0,
          total_experience_months: getTotalExperienceMonths(formData.experienceYears, formData.experienceMonths),
          current_company: formData.currentCompany,
          current_ctc: formData.currentCtc,
          expected_ctc: formData.expectedCtc,
          notice_period: formData.noticePeriod,
          resume_url: resumeUrl,
          profile_image_url: profileImageUrl,
          linkedin_url: formData.linkedinUrl,
          portfolio_url: formData.portfolioUrl,
        } as Record<string, unknown>);

        setUser({
          id: response.user.id,
          email: formData.email,
          name: formData.fullName,
          role: USER_ROLES.JOB_SEEKER,
          avatar: profileImageUrl || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        setSnackbarMessage('Registration successful.');
        setSnackbarOpen(true);
        setVerifyDialogOpen(true);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      // detect existing account
      if (typeof msg === 'string' && /already/i.test(msg)) {
        setExistingDialogOpen(true);
      } else {
        setSnackbarMessage(msg || 'Registration failed');
        setSnackbarOpen(true);
      }
    } finally {
      setLoadingState(false);
      setLoading(false);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'resume' | 'profile'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'resume') {
      if (!validateFileSize(file, 10)) {
        toast.error('Resume must be under 10MB');
        return;
      }
      setResume(file);
      if (errors.resume) setErrors((prev) => ({ ...prev, resume: '' }));
    } else {
      if (!validateFileSize(file, 5)) {
        toast.error('Image must be under 5MB');
        return;
      }
      setProfileImage(file);
    }
  };

  return (
    <Layout footer={false}>
      <Box
        sx={{
          minHeight: '100vh',
          py: 6,
          background: 'radial-gradient(circle at top left, rgba(59,130,246,0.18), transparent 28%), radial-gradient(circle at bottom right, rgba(234, 179, 8, 0.16), transparent 28%), linear-gradient(180deg, #F8FAFC 0%, #EFF6FF 100%)',
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 750,
                mb: 1,
                color: 'text.primary',
              }}
            >
              Create Your Account
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Join India's leading job portal — complete your profile in 3 easy steps.
            </Typography>
          </Box>

          <Card
            sx={{
              borderRadius: 5,
              boxShadow: '0 28px 80px rgba(15, 23, 42, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.12)',
              mb: 4,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 4, background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(245,158,11,0.12))' }}>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                Create Your Account
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                Join India's leading job portal — complete your profile in 3 easy steps.
              </Typography>
            </Box>
            <Box sx={{ p: 4 }}>
              <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((label, index) => (
                  <Step key={label}>
                    <StepLabel
                      StepIconComponent={() => (
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: activeStep >= index ? '#1D4ED8' : '#D9E2EF',
                            color: activeStep >= index ? '#FFFFFF' : '#64748B',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                          }}
                        >
                          {index === 0 ? <PersonIcon sx={{ fontSize: 18 }} /> :
                           index === 1 ? <SchoolIcon sx={{ fontSize: 18 }} /> :
                           <WorkIcon sx={{ fontSize: 18 }} />}
                        </Box>
                      )}
                    >
                      {label}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>

              <MotionCard
                sx={{
                  p: { xs: 3, md: 4 },
                  borderRadius: 4,
                  border: '1px solid rgba(37, 99, 235, 0.12)',
                  background: '#FFFFFF',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                {activeStep === 0 && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Full Name *"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        error={!!errors.fullName}
                        helperText={errors.fullName}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Email *"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        error={!!errors.email}
                        helperText={errors.email}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Mobile Number *"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        error={!!errors.phone}
                        helperText={errors.phone}
                        placeholder="10-digit mobile number"
                        InputProps={{ startAdornment: <InputAdornment position="start">+91</InputAdornment> }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth error={!!errors.gender}>
                        <InputLabel>Gender *</InputLabel>
                        <Select name="gender" value={formData.gender} onChange={handleChange} label="Gender *">
                          {GENDER_OPTIONS.map((g) => (
                            <MenuItem key={g} value={g}>
                              {g}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.gender && (
                          <Typography variant="caption" color="error">
                            {errors.gender}
                          </Typography>
                        )}
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Password *"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleChange}
                        error={!!errors.password}
                        helperText={errors.password}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                onClick={() => setShowPassword((visible) => !visible)}
                                edge="end"
                              >
                                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Confirm Password *"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        error={!!errors.confirmPassword}
                        helperText={errors.confirmPassword}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                onClick={() => setShowConfirmPassword((visible) => !visible)}
                                edge="end"
                              >
                                {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Date of Birth *"
                        name="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        error={!!errors.dateOfBirth}
                        helperText={errors.dateOfBirth}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box>
                        <input
                          type="file"
                          id="profile-img"
                          accept="image/*"
                          hidden
                          onChange={(e) => handleFileChange(e, 'profile')}
                        />
                        <Button
                          component="label"
                          htmlFor="profile-img"
                          variant="outlined"
                          fullWidth
                          startIcon={<CloudUploadIcon />}
                          sx={{ height: 56 }}
                        >
                          Profile Photo (Optional)
                        </Button>
                        {profileImage && (
                          <Typography variant="caption" color="success.main">
                            ✓ {profileImage.name}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Address *"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        error={!!errors.address}
                        helperText={errors.address}
                        multiline
                        rows={2}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="City *"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        error={!!errors.city}
                        helperText={errors.city}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth error={!!errors.state}>
                        <InputLabel>State / Province *</InputLabel>
                        <Select
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          label="State / Province *"
                        >
                          {(COUNTRY_STATES[formData.country] || []).map((s) => (
                            <MenuItem key={s} value={s}>
                              {s}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth error={!!errors.country}>
                        <InputLabel>Country *</InputLabel>
                        <Select
                          name="country"
                          value={formData.country}
                          onChange={handleChange}
                          label="Country *"
                        >
                          {COUNTRIES.map((country) => (
                            <MenuItem key={country} value={country}>
                              {country}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.country && (
                          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                            {errors.country}
                          </Typography>
                        )}
                      </FormControl>
                    </Grid>
                  </Grid>
                )}

                {activeStep === 1 && (
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControl fullWidth error={!!errors.education}>
                        <InputLabel>Highest Education *</InputLabel>
                        <Select
                          name="education"
                          value={formData.education}
                          onChange={handleChange}
                          label="Highest Education *"
                        >
                          {['10th', '12th', 'Diploma', "Bachelor's", "Master's", 'PhD'].map((e) => (
                            <MenuItem key={e} value={e}>
                              {e}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.education && (
                          <Typography variant="caption" color="error">
                            {errors.education}
                          </Typography>
                        )}
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        Skills *
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="e.g. React, Python, SQL"
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                        />
                        <Button variant="contained" onClick={handleAddSkill} startIcon={<AddIcon />}>
                          Add
                        </Button>
                      </Box>
                      {errors.skills && (
                        <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                          {errors.skills}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {formData.skills.map((skill) => (
                          <Chip
                            key={skill}
                            label={skill}
                            color="primary"
                            variant="outlined"
                            onDelete={() =>
                              setFormData((prev) => ({
                                ...prev,
                                skills: prev.skills.filter((s) => s !== skill),
                              }))
                            }
                          />
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                )}

                {activeStep === 2 && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <FormControl fullWidth error={!!errors.experience}>
                        <InputLabel>Years *</InputLabel>
                        <Select
                          name="experienceYears"
                          value={formData.experienceYears}
                          onChange={handleChange}
                          label="Years *"
                        >
                          {EXPERIENCE_YEARS_OPTIONS.map((years) => (
                            <MenuItem key={years} value={years}>
                              {years}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <FormControl fullWidth error={!!errors.experience}>
                        <InputLabel>Months *</InputLabel>
                        <Select
                          name="experienceMonths"
                          value={formData.experienceMonths}
                          onChange={handleChange}
                          label="Months *"
                        >
                          {EXPERIENCE_MONTHS_OPTIONS.map((months) => (
                            <MenuItem key={months} value={months}>
                              {months}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ pt: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Selected Experience
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatExperienceString(formData.experienceYears, formData.experienceMonths) || 'Select total experience'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth error={!!errors.noticePeriod}>
                        <InputLabel>Notice Period *</InputLabel>
                        <Select
                          name="noticePeriod"
                          value={formData.noticePeriod}
                          onChange={handleChange}
                          label="Notice Period *"
                        >
                          {NOTICE_PERIOD_OPTIONS.map((n) => (
                            <MenuItem key={n} value={n}>
                              {n}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Current Company"
                        name="currentCompany"
                        value={formData.currentCompany}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Current CTC (LPA)"
                        name="currentCtc"
                        value={formData.currentCtc}
                        onChange={handleChange}
                        placeholder="e.g. 8"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Expected CTC (LPA)"
                        name="expectedCtc"
                        value={formData.expectedCtc}
                        onChange={handleChange}
                        placeholder="e.g. 12"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="LinkedIn URL"
                        name="linkedinUrl"
                        value={formData.linkedinUrl}
                        onChange={handleChange}
                        error={!!errors.linkedinUrl}
                        helperText={errors.linkedinUrl}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Portfolio URL"
                        name="portfolioUrl"
                        value={formData.portfolioUrl}
                        onChange={handleChange}
                        error={!!errors.portfolioUrl}
                        helperText={errors.portfolioUrl}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Box
                        sx={{
                          p: 3,
                          border: '2px dashed',
                          borderColor: errors.resume ? 'error.main' : 'primary.main',
                          borderRadius: 2,
                          textAlign: 'center',
                          background: '#F8FAFC',
                        }}
                      >
                        <input
                          type="file"
                          id="resume-upload"
                          accept=".pdf,.doc,.docx"
                          hidden
                          onChange={(e) => handleFileChange(e, 'resume')}
                        />
                        <Button component="label" htmlFor="resume-upload" variant="contained" startIcon={<CloudUploadIcon />}>
                          Upload Resume *
                        </Button>
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                          PDF or Word document (Max 10MB)
                        </Typography>
                        {resume && (
                          <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 1 }}>
                            ✓ {resume.name}
                          </Typography>
                        )}
                        {errors.resume && (
                          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                            {errors.resume}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                  <Button disabled={activeStep === 0} onClick={handleBack} variant="outlined">
                    Back
                  </Button>
                  {activeStep < steps.length - 1 ? (
                    <Button variant="contained" onClick={handleNext}>
                      Continue
                    </Button>
                  ) : (
                    <Button variant="contained" onClick={handleSignup} disabled={loading}>
                      {loading ? 'Creating Account...' : 'Complete Registration'}
                    </Button>
                  )}
                </Box>

                <Box sx={{ textAlign: 'center', mt: 3 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Already have an account?{' '}
                    <Link component={RouterLink} to={ROUTES.LOGIN}>
                      Login
                    </Link>
                  </Typography>
                </Box>
              </MotionCard>
            </Box>
          </Card>
        </Container>
      </Box>
      {/* Verify Email Dialog */}
      <Dialog open={verifyDialogOpen} onClose={() => setVerifyDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Verify Your Email</DialogTitle>
        <DialogContent>
          A confirmation email has been sent to your registered email address. Please verify your email before logging in.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => window.open('https://mail.google.com', '_blank')}>Open Gmail</Button>
          <Button onClick={() => setVerifyDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Existing account dialog */}
      <Dialog open={existingDialogOpen} onClose={() => setExistingDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Account Already Exists</DialogTitle>
        <DialogContent>
          You have already registered with this email address. If you have already verified your email, please login to continue.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate(ROUTES.LOGIN)}>Login</Button>
          <Button onClick={() => setExistingDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
        <Alert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Layout>
  );
};
