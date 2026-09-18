import React, { useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Divider, List, ListItem, ListItemText, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { adminService } from '../../services/admin';

const REQUIRED_FIELDS = ['title', 'company_name', 'location'];

const normalizeJobRow = (row: any) => ({
  title: String(row.title || row.job_title || row.name || '').trim(),
  company_name: String(row.company_name || row.company || row.companyName || '').trim(),
  location: String(row.location || row.city || row.area || '').trim(),
  experience: String(row.experience || row.experience_level || '').trim(),
  salary_min: Number(row.salary_min ?? row.salary ?? row.min_salary ?? 0) || null,
  salary_max: Number(row.salary_max ?? row.max_salary ?? 0) || null,
  job_type: String(row.job_type || row.jobType || '').trim() || 'full_time',
  employment_type: String(row.employment_type || row.employmentType || '').trim() || 'full_time',
  description: String(row.description || row.job_description || '').trim(),
  requirements: String(row.requirements || '').trim(),
  benefits: String(row.benefits || '').trim(),
  skills: String(row.skills || row.key_skills || '').split(',').map((item: string) => item.trim()).filter(Boolean),
  status: String(row.status || 'published').trim() || 'published',
  posted_by: String(row.posted_by || row.postedBy || '').trim() || 'admin-bulk-import',
});

const BulkImport: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ imported?: number; error?: string } | null>(null);

  const normalizedRows = useMemo(
    () => rows.map((row) => normalizeJobRow(row)),
    [rows],
  );

  const invalidRows = useMemo(
    () => normalizedRows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => !row.title || !row.company_name || !row.location),
    [normalizedRows],
  );

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResult(null);
    setErrors([]);
    setIsValidating(true);

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setRows(results.data as any[]);
            setErrors((results.errors || []).map((item: any) => item.message));
            setIsValidating(false);
          },
          error: (err) => {
            setErrors([err.message]);
            setRows([]);
            setIsValidating(false);
          },
        });
        return;
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
      setRows(data as any[]);
      setErrors([]);
      setIsValidating(false);
    } catch (error: any) {
      setRows([]);
      setErrors([error?.message || 'Unable to parse the uploaded file.']);
      setIsValidating(false);
    }
  };

  const doImport = async () => {
    const validRows = normalizedRows.filter((row) => row.title && row.company_name && row.location);

    if (!validRows.length) {
      setResult({ error: 'No valid job rows found. Add title, company name, and location before deployment.' });
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      const response = await adminService.bulkImportJobs(validRows);
      if (response?.error) {
        throw new Error(String(response.error));
      }

      setResult({ imported: response?.imported ?? validRows.length });
      setRows([]);
    } catch (error: any) {
      setResult({ error: error?.message || 'Bulk job deployment failed.' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Bulk Job Deploy</Typography>
          <Typography variant="body1" color="text.secondary">
            Upload a CSV or Excel file and deploy multiple job posts in one action.
          </Typography>
        </Box>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant="contained" component="label">
                Upload CSV / Excel
                <input hidden type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} />
              </Button>
              <Chip label={rows.length ? `${rows.length} rows detected` : 'No file selected'} color={rows.length ? 'primary' : 'default'} />
              <Button variant="outlined" color="success" onClick={doImport} disabled={!rows.length || isImporting || isValidating || !!invalidRows.length}>
                {isImporting ? 'Deploying...' : `Deploy ${normalizedRows.filter((row) => row.title && row.company_name && row.location).length} jobs`}
              </Button>
            </Box>

            <TextField
              size="small"
              label="Required columns"
              value={REQUIRED_FIELDS.join(', ')}
              InputProps={{ readOnly: true }}
              sx={{ maxWidth: 420 }}
            />

            {errors.length > 0 && (
              <Alert severity="warning">{errors.join(' • ')}</Alert>
            )}

            {!!invalidRows.length && (
              <Alert severity="error">
                {invalidRows.length} rows are missing required values. Each row needs title, company name, and location.
              </Alert>
            )}

            {result && (
              <Alert severity={result.error ? 'error' : 'success'}>
                {result.error ? result.error : `Bulk deployment complete: ${result.imported} jobs were posted successfully.`}
              </Alert>
            )}
          </Stack>
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Preview</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Job Type</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {normalizedRows.slice(0, 8).map((row, index) => (
                  <TableRow key={`${row.title || 'job'}-${index}`}>
                    <TableCell>{row.title || 'Missing title'}</TableCell>
                    <TableCell>{row.company_name || 'Missing company'}</TableCell>
                    <TableCell>{row.location || 'Missing location'}</TableCell>
                    <TableCell>{row.job_type || 'full_time'}</TableCell>
                    <TableCell>
                      {!row.title || !row.company_name || !row.location ? <Chip label="Invalid" color="error" size="small" /> : <Chip label={row.status} color="success" size="small" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {!normalizedRows.length && (
            <Typography color="text.secondary" sx={{ mt: 2 }}>Upload a file to preview jobs before deployment.</Typography>
          )}
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Format guide</Typography>
          <Divider sx={{ mb: 1.5 }} />
          <List dense>
            <ListItem><ListItemText primary="Use column names like: title, company_name, location, job_type, description, skills, salary_min, salary_max, status" /></ListItem>
            <ListItem><ListItemText primary="Recommended columns: title, company_name, location, job_type, experience, salary_min, skills, description" /></ListItem>
            <ListItem><ListItemText primary="Only valid rows with title, company_name, and location are deployed." /></ListItem>
          </List>
        </Paper>
      </Stack>
    </Box>
  );
};

export default BulkImport;
