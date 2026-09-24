import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useAuthStore } from '@store/index';
import { userService } from '@services/api';
import { authService } from '@services/supabase';
import { validatePassword, validatePhone } from '@utils/index';
import Swal from '@utils/sweetAlert';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@constants/index';

export const AccountSettings: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.name,
        email: user.email,
        phone: user.phone || '',
      }));
    }
  }, [user]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;

    if (formData.phone && !validatePhone(formData.phone)) {
      toast.error('Please enter a valid 10-digit Indian phone number.');
      return;
    }

    if (formData.newPassword || formData.confirmPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        toast.error('New password and confirmation do not match.');
        return;
      }
      if (formData.newPassword && !validatePassword(formData.newPassword)) {
        toast.error('Password must contain at least 8 characters with uppercase, lowercase, and numbers.');
        return;
      }
    }

    setSaving(true);
    try {
      const updates: Record<string, string> = {
        name: formData.fullName,
      };
      if (formData.phone) {
        updates.phone = formData.phone;
      }

      const updatedProfile = await userService.updateProfile(user.id, updates);
      const updatedUser = {
        ...user,
        name: updatedProfile.name || user.name,
        phone: updatedProfile.phone || formData.phone || user.phone,
      };

      if (formData.newPassword) {
        await authService.updatePassword(formData.newPassword);
        toast.success('Password updated successfully.');
      }

      setUser(updatedUser);
      setFormData((prev) => ({ ...prev, newPassword: '', confirmPassword: '' }));
      toast.success('Account settings saved.');
    } catch (error) {
      console.error('Account settings update failed:', error);
      toast.error('Failed to save account settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const result = await Swal.fire({
      title: 'Delete your account permanently?',
      text: 'All profile data, applications, saved jobs, messages, and account access will be permanently deleted. This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete permanently',
      cancelButtonText: 'Keep my account',
      confirmButtonColor: '#B91C1C',
      cancelButtonColor: '#64748B',
    });

    if (!result.isConfirmed) return;

    setDeleting(true);
    try {
      await authService.deleteAccount();
      setUser(null);
      await Swal.fire({
        title: 'Account deleted',
        text: 'Your account has been permanently deleted.',
        icon: 'success',
        confirmButtonColor: '#0B2745',
      });
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (error) {
      console.error('Account deletion failed:', error);
      toast.error('Unable to delete your account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2,
      bgcolor: '#FFFFFF',
      '& fieldset': { borderColor: '#CBD8E5' },
      '&:hover fieldset': { borderColor: '#7EA4C5' },
      '&.Mui-focused fieldset': { borderColor: '#D6A73A', borderWidth: 2 },
    },
    '& .MuiInputLabel-root': { color: '#64748B', fontWeight: 600 },
    '& .MuiInputLabel-root.Mui-focused': { color: '#9A7017' },
    '& .MuiFormHelperText-root': { color: '#64748B', ml: 0.25 },
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2.5, p: { xs: 1.6, md: 2 }, borderRadius: 3, color: '#fff', background: 'linear-gradient(115deg, #071D35 0%, #0B3558 58%, #126B8F 100%)', boxShadow: '0 10px 24px rgba(7,29,53,0.16)', position: 'relative', overflow: 'hidden', '&::after': { content: '""', position: 'absolute', width: 180, height: 180, borderRadius: '50%', right: -70, top: -100, background: 'rgba(214,167,58,0.2)' } }}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography sx={{ display: 'inline-flex', px: 0.8, py: 0.2, mb: 0.45, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.14)', color: '#F7D774', fontSize: 9, fontWeight: 900, letterSpacing: 1 }}>
            ACCOUNT & SECURITY
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.45, display: 'flex', alignItems: 'center', gap: 1, color: '#fff' }}>
            <PersonIcon sx={{ color: '#F7D774', fontSize: 23 }} />
            Account Settings
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.76)' }}>
            Update your display name, contact details, and security settings.
          </Typography>
        </Box>
      </Box>

      {/* Profile Information Section */}
      <Card
        variant="outlined"
        sx={{
          mb: 3,
          borderColor: 'rgba(59, 130, 246, 0.2)',
          backgroundColor: 'rgba(59, 130, 246, 0.03)',
        }}
      >
        <CardContent>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              mb: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: 'primary.main',
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 20 }} />
            Profile Information
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                variant="outlined"
                sx={fieldSx}
                InputProps={{
                  startAdornment: (
                    <PersonIcon
                      sx={{
                        mr: 1,
                        color: 'action.active',
                        fontSize: 20,
                      }}
                    />
                  ),
                }}
                helperText="Your display name in the account menu"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={formData.email}
                disabled
                variant="outlined"
                sx={fieldSx}
                InputProps={{
                  startAdornment: (
                    <EmailIcon
                      sx={{
                        mr: 1,
                        color: 'action.active',
                        fontSize: 20,
                      }}
                    />
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone Number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                variant="outlined"
                sx={fieldSx}
                InputProps={{
                  startAdornment: (
                    <PhoneIcon
                      sx={{
                        mr: 1,
                        color: 'action.active',
                        fontSize: 20,
                      }}
                    />
                  ),
                }}
                helperText="A verified phone number improves security and notifications."
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card
        variant="outlined"
        sx={{
          borderColor: 'rgba(239, 68, 68, 0.2)',
          backgroundColor: 'rgba(239, 68, 68, 0.03)',
        }}
      >
        <CardContent>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: '#EF4444',
            }}
          >
            <LockIcon sx={{ fontSize: 20 }} />
            Change Password
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Update your login password to keep your account secure.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="password"
                label="New Password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                variant="outlined"
                sx={fieldSx}
                helperText="At least 8 characters, with uppercase, lowercase and numbers."
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="password"
                label="Confirm Password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                variant="outlined"
                sx={fieldSx}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button variant="outlined" color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          sx={{
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            textTransform: 'none',
            fontWeight: 600,
            px: 4,
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>

      {saving && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
        </Box>
      )}

      <Card variant="outlined" sx={{ mt: 3, borderColor: 'rgba(185,28,28,0.25)', bgcolor: 'rgba(254,242,242,0.72)' }}>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#991B1B', mb: 0.5 }}>
            Delete account
          </Typography>
          <Typography variant="body2" sx={{ color: '#7F1D1D', mb: 1.6 }}>
            Permanently remove your profile, applications, saved jobs, messages, and all associated account data.
          </Typography>
          <Alert severity="warning" sx={{ mb: 1.6 }}>
            This action is permanent and cannot be undone.
          </Alert>
          <Button
            variant="outlined"
            color="error"
            onClick={handleDeleteAccount}
            disabled={deleting || saving}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}
          >
            {deleting ? 'Deleting account...' : 'Delete my account'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};
