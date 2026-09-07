import React, { useEffect, useState } from 'react';
import { Box, Button, Paper, TextField, Typography, FormControlLabel, Switch } from '@mui/material';
import { adminService } from '../../services/admin';

const defaultSettings = {
  siteTitle: 'Jobpoyt Admin',
  supportEmail: '',
  maintenanceMode: false,
};

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, any>>(defaultSettings);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await adminService.getAdminSettings();
        setSettings(stored || defaultSettings);
      } catch (err) {
        setSettings(defaultSettings);
      }
    })();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await adminService.saveAdminSettings(settings);
      alert('Settings saved.');
    } catch (err) {
      alert('Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Settings
      </Typography>
      <Paper sx={{ p: 3, maxWidth: 720 }}>
        <TextField
          label="Site Title"
          fullWidth
          margin="normal"
          value={settings.siteTitle || ''}
          onChange={(event) => setSettings({ ...settings, siteTitle: event.target.value })}
        />
        <TextField
          label="Support Email"
          fullWidth
          margin="normal"
          value={settings.supportEmail || ''}
          onChange={(event) => setSettings({ ...settings, supportEmail: event.target.value })}
        />
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(settings.maintenanceMode)}
              onChange={(event) => setSettings({ ...settings, maintenanceMode: event.target.checked })}
            />
          }
          label="Maintenance Mode"
        />
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving…' : 'Save Settings'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SettingsPage;
