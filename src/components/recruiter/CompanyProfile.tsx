import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Box,
  Typography,
  CircularProgress,
  Avatar,
  Alert,
  Autocomplete,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, Edit as EditIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { recruiterService, userService } from '@services/api';
import { authService } from '@services/supabase';
import { INDUSTRY_TYPES } from '@constants/index';
import toast from 'react-hot-toast';

const LOCATION_SUGGESTIONS = [
  'Hyderabad, Telangana',
  'Bengaluru, Karnataka',
  'Chennai, Tamil Nadu',
  'Mumbai, Maharashtra',
  'Pune, Maharashtra',
  'Delhi NCR',
  'Gurugram, Haryana',
  'Noida, Uttar Pradesh',
  'Ghaziabad, Uttar Pradesh',
  'Faridabad, Haryana',
  'Jaipur, Rajasthan',
  'Jodhpur, Rajasthan',
  'Udaipur, Rajasthan',
  'Ahmedabad, Gujarat',
  'Surat, Gujarat',
  'Vadodara, Gujarat',
  'Rajkot, Gujarat',
  'Kolkata, West Bengal',
  'Bhubaneswar, Odisha',
  'Guwahati, Assam',
  'Patna, Bihar',
  'Ranchi, Jharkhand',
  'Lucknow, Uttar Pradesh',
  'Kanpur, Uttar Pradesh',
  'Varanasi, Uttar Pradesh',
  'Agra, Uttar Pradesh',
  'Chandigarh, Chandigarh',
  'Dehradun, Uttarakhand',
  'Amritsar, Punjab',
  'Ludhiana, Punjab',
  'Srinagar, Jammu and Kashmir',
  'Bhopal, Madhya Pradesh',
  'Indore, Madhya Pradesh',
  'Nagpur, Maharashtra',
  'Nashik, Maharashtra',
  'Aurangabad, Maharashtra',
  'Goa, Goa',
  'Kochi, Kerala',
  'Thiruvananthapuram, Kerala',
  'Kozhikode, Kerala',
  'Coimbatore, Tamil Nadu',
  'Madurai, Tamil Nadu',
  'Tiruchirappalli, Tamil Nadu',
  'Visakhapatnam, Andhra Pradesh',
  'Vijayawada, Andhra Pradesh',
  'Guntur, Andhra Pradesh',
  'Tirupati, Andhra Pradesh',
  'Mysuru, Karnataka',
  'Mangaluru, Karnataka',
  'Hubballi, Karnataka',
  'Puducherry, Puducherry',
  'Remote',
];

interface CompanyProfileProps {
  recruiterId: string;
  onProfileUpdate?: () => void;
}

interface CompanyData {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string;
  companyAddress: string;
  location: string;
  companyLogoUrl: string;
  companyDescription: string;
  industryType: string;
  employeeCount: string;
  hrContactPerson: string;
  hrEmail: string;
  hrPhone: string;
  gstNumber: string;
  cinNumber: string;
}

export const CompanyProfile: React.FC<CompanyProfileProps> = ({ recruiterId, onProfileUpdate }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CompanyData>({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyWebsite: '',
    companyAddress: '',
    location: '',
    companyLogoUrl: '',
    companyDescription: '',
    industryType: '',
    employeeCount: '',
    hrContactPerson: '',
    hrEmail: '',
    hrPhone: '',
    gstNumber: '',
    cinNumber: '',
  });

  useEffect(() => {
    fetchProfile();
  }, [recruiterId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const profile = await recruiterService.getRecruiterProfile(recruiterId);
      if (profile) {
        setFormData({
          companyName: profile.company_name || '',
          companyEmail: profile.company_email || '',
          companyPhone: profile.company_phone || '',
          companyWebsite: profile.company_website || '',
          companyAddress: profile.company_address || '',
          location: profile.location || '',
          companyLogoUrl: profile.company_logo_url || '',
          companyDescription: profile.description || '',
          industryType: profile.industry || '',
          employeeCount: profile.employee_count || '',
          hrContactPerson: profile.hr_name || '',
          hrEmail: profile.hr_email || '',
          hrPhone: profile.hr_phone || '',
          gstNumber: profile.gst_number || '',
          cinNumber: profile.cin_number || '',
        });
        setPreviewUrl(profile.company_logo_url || '');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load company profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target as { name: string; value: unknown };
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let logoUrl = formData.companyLogoUrl;

      if (logoFile) {
        logoUrl = await userService.uploadCompanyLogo(recruiterId, logoFile);
      }

      const savedProfile = await recruiterService.updateRecruiterProfile(recruiterId, {
        ...formData,
        companyLogoUrl: logoUrl,
      });

      if (!savedProfile?.id) {
        throw new Error('Company profile was not saved');
      }

      const recruiterName = formData.hrContactPerson.trim();
      if (recruiterName) {
        await userService.updateProfile(recruiterId, { name: recruiterName });
        await authService.updateUserMetadata({ name: recruiterName });
      }

      toast.success('Company profile updated successfully!');
      setEditMode(false);
      setLogoFile(null);
      fetchProfile();
      onProfileUpdate?.();
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save company profile');
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Company Profile
            </Typography>
            {!editMode && (
              <Button
                startIcon={<EditIcon />}
                variant="outlined"
                size="small"
                onClick={() => setEditMode(true)}
              >
                Edit Profile
              </Button>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {editMode ? (
            <Box>
              {/* Logo Upload */}
              <Box sx={{ mb: 3, textAlign: 'center' }}>
                <Avatar
                  src={previewUrl}
                  sx={{ width: 120, height: 120, mx: 'auto', mb: 2, backgroundColor: '#f5f5f5' }}
                />
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="logo-upload"
                  type="file"
                  onChange={handleLogoChange}
                />
                <label htmlFor="logo-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    size="small"
                  >
                    Upload Logo
                  </Button>
                </label>
              </Box>

              <Grid container spacing={2}>
                {/* Company Info */}
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                    Company Information
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Company Name"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    freeSolo
                    options={INDUSTRY_TYPES}
                    value={formData.industryType}
                    onChange={(_, value) => setFormData((previous) => ({ ...previous, industryType: value || '' }))}
                    onInputChange={(_, value) => setFormData((previous) => ({ ...previous, industryType: value }))}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label="Industry Type"
                        placeholder="Select or type an industry"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Company Website"
                    name="companyWebsite"
                    value={formData.companyWebsite}
                    onChange={handleChange}
                    type="url"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    freeSolo
                    options={LOCATION_SUGGESTIONS}
                    value={formData.location}
                    onChange={(_, value) => setFormData((previous) => ({ ...previous, location: value || '' }))}
                    onInputChange={(_, value) => setFormData((previous) => ({ ...previous, location: value }))}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label="Location"
                        placeholder="Select or type a city"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Company Address"
                    name="companyAddress"
                    value={formData.companyAddress}
                    onChange={handleChange}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Employee Count"
                    name="employeeCount"
                    value={formData.employeeCount}
                    onChange={handleChange}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Company Description"
                    name="companyDescription"
                    value={formData.companyDescription}
                    onChange={handleChange}
                    multiline
                    rows={4}
                  />
                </Grid>

                {/* Contact Info */}
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                    Contact Information
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Company Email"
                    name="companyEmail"
                    value={formData.companyEmail}
                    onChange={handleChange}
                    type="email"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Company Phone"
                    name="companyPhone"
                    value={formData.companyPhone}
                    onChange={handleChange}
                  />
                </Grid>

                {/* HR Contact */}
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                    HR Contact Details
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="HR Contact Person"
                    name="hrContactPerson"
                    value={formData.hrContactPerson}
                    onChange={handleChange}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="HR Phone"
                    name="hrPhone"
                    value={formData.hrPhone}
                    onChange={handleChange}
                  />
                </Grid>

                {/* Tax Info */}
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                    Tax Information
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="GST Number"
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleChange}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="CIN Number"
                    name="cinNumber"
                    value={formData.cinNumber}
                    onChange={handleChange}
                  />
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => setEditMode(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={saving}
                  endIcon={saving ? <CircularProgress size={20} /> : undefined}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Box>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3} sx={{ textAlign: 'center' }}>
                <Avatar
                  src={previewUrl}
                  sx={{ width: 120, height: 120, mx: 'auto', backgroundColor: '#f5f5f5' }}
                />
              </Grid>

              <Grid item xs={12} sm={9}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Company Name
                    </Typography>
                    <Typography sx={{ fontWeight: 600 }}>{formData.companyName}</Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Industry
                    </Typography>
                    <Typography sx={{ fontWeight: 600 }}>{formData.industryType || 'N/A'}</Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Location
                    </Typography>
                    <Typography sx={{ fontWeight: 600 }}>{formData.location || 'N/A'}</Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Email
                    </Typography>
                    <Typography sx={{ fontWeight: 600 }}>{formData.companyEmail}</Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Description
                    </Typography>
                    <Typography sx={{ fontWeight: 500 }}>{formData.companyDescription || 'N/A'}</Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
