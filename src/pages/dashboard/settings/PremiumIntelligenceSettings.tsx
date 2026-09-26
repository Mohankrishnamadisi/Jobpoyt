import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AutoAwesome as AutoAwesomeIcon,
  RestartAlt as RestartAltIcon,
  Save as SaveIcon,
  TrackChanges as TrackChangesIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@store/index';
import { userService } from '@services/api';
import {
  clamp,
  getWeightsForRole,
  mergePremiumDashboardConfig,
  persistLocalPremiumConfig,
  readLocalPreferencesRole,
  readLocalPremiumConfig,
  ROLE_WEIGHT_PRESETS,
  type DemandWeights,
  type WeeklyGoalTargets,
  type PremiumDashboardConfig,
} from '@utils/premiumDashboardConfig';

export const PremiumIntelligenceSettings: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState('General');
  const [roleWeightMap, setRoleWeightMap] = useState<Record<string, DemandWeights>>({});
  const [weeklyTargets, setWeeklyTargets] = useState<WeeklyGoalTargets>({ applications: 6, interactions: 10, pipeline: 4 });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const profile = await userService.getProfile(user.id);
        const apiConfig = (profile?.dashboard_preferences || profile?.premium_dashboard_config || profile?.dashboard_config || {}) as Partial<PremiumDashboardConfig>;
        const localConfig = readLocalPremiumConfig();
        const merged = mergePremiumDashboardConfig(apiConfig, localConfig, readLocalPreferencesRole());
        setSelectedRole(merged.selectedRole);
        setRoleWeightMap(merged.roleWeights);
        setWeeklyTargets(merged.weeklyTargets);
      } catch {
        const merged = mergePremiumDashboardConfig({}, readLocalPremiumConfig(), readLocalPreferencesRole());
        setSelectedRole(merged.selectedRole);
        setRoleWeightMap(merged.roleWeights);
        setWeeklyTargets(merged.weeklyTargets);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  const roleOptions = useMemo(() => {
    const set = new Set<string>(['General', ...Object.keys(ROLE_WEIGHT_PRESETS), selectedRole]);
    return Array.from(set);
  }, [selectedRole]);

  const activeWeights = useMemo(() => getWeightsForRole(selectedRole, roleWeightMap), [roleWeightMap, selectedRole]);

  const updateWeight = (key: keyof DemandWeights, value: number) => {
    setRoleWeightMap((prev) => {
      const current = getWeightsForRole(selectedRole, prev);
      return {
        ...prev,
        [selectedRole]: {
          ...current,
          [key]: clamp(value, 0.1, 5),
        },
      };
    });
  };

  const handleSave = async () => {
    if (!user?.id) return;

    const payload: PremiumDashboardConfig = {
      selectedRole,
      roleWeights: roleWeightMap,
      weeklyTargets,
    };

    setSaving(true);
    setSaveMessage(null);
    persistLocalPremiumConfig(payload);

    try {
      await userService.updateProfile(user.id, {
        dashboard_preferences: payload,
      });
      setSaveMessage('Saved to cloud and synced across devices.');
      toast.success('Premium intelligence settings saved.');
    } catch {
      setSaveMessage('Saved locally. Cloud sync unavailable right now.');
      toast.success('Settings saved locally.');
    } finally {
      setSaving(false);
    }
  };

  const resetSelectedRole = () => {
    setRoleWeightMap((prev) => ({
      ...prev,
      [selectedRole]: getWeightsForRole(selectedRole, {}),
    }));
  };

  if (loading) {
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Loading premium intelligence settings...
        </Typography>
      </Box>
    );
  }

  return (
    <Box className="premium-settings-shell rounded-3xl bg-slate-50/70 p-3 sm:p-5 lg:p-7" sx={{ minHeight: '100%' }}>
      <Box className="rounded-3xl bg-white px-4 py-5 shadow-sm sm:px-7 sm:py-6" sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Button
          variant="text"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2, px: 0, fontWeight: 700, color: 'text.secondary', '&:hover': { color: 'primary.main', backgroundColor: 'transparent' } }}
        >
          Back to dashboard
        </Button>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <Box>
            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1 }}>
              <Box className="rounded-xl bg-indigo-50 p-2" sx={{ display: 'flex' }}>
                <TuneIcon sx={{ color: '#4F46E5' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                Premium Intelligence Settings
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 720 }}>
              Tune how your demand score is calculated and set weekly goals that appear in your intelligence dashboard.
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, whiteSpace: 'nowrap' }}>
            Changes sync to your profile
          </Typography>
        </Stack>
      </Box>

      <Grid container spacing={3} className="mt-1">
        <Grid item xs={12}>
          <Card className="rounded-2xl shadow-sm" variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5} sx={{ mb: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoAwesomeIcon sx={{ color: '#7C3AED' }} />
                    Role-wise Demand Score Formula
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Choose a role model, then adjust the influence of each live signal.
                  </Typography>
                </Box>
                <Button size="small" variant="text" startIcon={<RestartAltIcon />} onClick={resetSelectedRole} sx={{ fontWeight: 700 }}>
                  Reset role weights
                </Button>
              </Stack>
              <Grid container spacing={2.2} alignItems="stretch">
                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="premium-role-label">Active role preset</InputLabel>
                    <Select
                      labelId="premium-role-label"
                      label="Active role preset"
                      value={selectedRole}
                      onChange={(event: SelectChangeEvent<string>) => setSelectedRole(event.target.value)}
                    >
                      {roleOptions.map((role) => <MenuItem key={role} value={role}>{role}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.8 }}>
                    This preset controls the formula shown on your dashboard.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Profile weight"
                    type="number"
                    value={activeWeights.profileStrength}
                    inputProps={{ step: 0.05, min: 0.1, max: 5, 'aria-label': 'Profile weight' }}
                    InputProps={{ endAdornment: <InputAdornment position="end">×</InputAdornment> }}
                    onChange={(e) => updateWeight('profileStrength', Number(e.target.value))}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Applications"
                    type="number"
                    value={activeWeights.applications}
                    inputProps={{ step: 0.05, min: 0.1, max: 5, 'aria-label': 'Applications weight' }}
                    InputProps={{ endAdornment: <InputAdornment position="end">×</InputAdornment> }}
                    onChange={(e) => updateWeight('applications', Number(e.target.value))}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Interactions"
                    type="number"
                    value={activeWeights.interactions}
                    inputProps={{ step: 0.05, min: 0.1, max: 5, 'aria-label': 'Interactions weight' }}
                    InputProps={{ endAdornment: <InputAdornment position="end">×</InputAdornment> }}
                    onChange={(e) => updateWeight('interactions', Number(e.target.value))}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Skills"
                    type="number"
                    value={activeWeights.skills}
                    inputProps={{ step: 0.05, min: 0.1, max: 5, 'aria-label': 'Skills weight' }}
                    InputProps={{ endAdornment: <InputAdornment position="end">×</InputAdornment> }}
                    onChange={(e) => updateWeight('skills', Number(e.target.value))}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card className="rounded-2xl shadow-sm" variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrackChangesIcon sx={{ color: '#2563EB' }} />
                Weekly Sprint Goals
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Set realistic targets for the activity you want to build this week.
              </Typography>
              <Grid container spacing={2.2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Weekly applications goal"
                    type="number"
                    value={weeklyTargets.applications}
                    inputProps={{ min: 1, max: 50, 'aria-label': 'Weekly applications goal' }}
                    InputProps={{ endAdornment: <InputAdornment position="end">per week</InputAdornment> }}
                    onChange={(e) => setWeeklyTargets((prev) => ({ ...prev, applications: clamp(Number(e.target.value) || prev.applications, 1, 50) }))}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Recruiter interactions goal"
                    type="number"
                    value={weeklyTargets.interactions}
                    inputProps={{ min: 1, max: 80, 'aria-label': 'Recruiter interactions goal' }}
                    InputProps={{ endAdornment: <InputAdornment position="end">per week</InputAdornment> }}
                    onChange={(e) => setWeeklyTargets((prev) => ({ ...prev, interactions: clamp(Number(e.target.value) || prev.interactions, 1, 80) }))}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Interview pipeline goal"
                    type="number"
                    value={weeklyTargets.pipeline}
                    inputProps={{ min: 1, max: 20, 'aria-label': 'Interview pipeline goal' }}
                    InputProps={{ endAdornment: <InputAdornment position="end">per week</InputAdornment> }}
                    onChange={(e) => setWeeklyTargets((prev) => ({ ...prev, pipeline: clamp(Number(e.target.value) || prev.pipeline, 1, 20) }))}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box className="rounded-2xl bg-white p-3 shadow-sm sm:p-4" sx={{ mt: 3, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} justifyContent="flex-end" alignItems="stretch" spacing={1.5}>
          <Button variant="outlined" onClick={resetSelectedRole} startIcon={<RestartAltIcon />} sx={{ fontWeight: 700, minHeight: 48 }}>
            Reset current role
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={<SaveIcon />} sx={{ fontWeight: 800, minHeight: 48, px: 3 }}>
            {saving ? 'Saving settings...' : 'Save settings'}
          </Button>
        </Stack>
      </Box>

      {saveMessage ? (
        <Alert severity={saveMessage.includes('Cloud') ? 'success' : 'info'} sx={{ mt: 2, borderRadius: 2 }}>
          {saveMessage}
        </Alert>
      ) : null}
    </Box>
  );
};

export default PremiumIntelligenceSettings;
