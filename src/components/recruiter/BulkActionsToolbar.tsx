import React, { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Archive as PoolIcon,
  Cancel as RejectIcon,
  ClearAll as DeselectIcon,
  Download as ExportIcon,
  Label as TagIcon,
  LabelOff as RemoveTagIcon,
  Mail as MessageIcon,
  PersonAdd as ShortlistIcon,
  PlaylistAddCheck as StageIcon,
  Unarchive as RemovePoolIcon,
} from '@mui/icons-material';
import {
  ATS_STAGES,
  RECRUITER_TAG_PRESETS,
  TALENT_POOL_PRESETS,
  type AtsStage,
} from './bulkActionsApi';

export type BulkToolbarAction =
  | { type: 'shortlist' }
  | { type: 'reject' }
  | { type: 'move_stage'; stage: AtsStage }
  | { type: 'add_tags'; values: string[] }
  | { type: 'remove_tags'; values: string[] }
  | { type: 'add_pool'; values: string[] }
  | { type: 'remove_pool'; values: string[] }
  | { type: 'message' }
  | { type: 'export_csv' };

interface BulkActionsToolbarProps {
  selectedCount: number;
  availableTags: string[];
  availablePools: string[];
  processing: boolean;
  onAction: (action: BulkToolbarAction) => void;
  onClear: () => void;
}

const uniqueOptions = (values: string[], presets: readonly string[]) =>
  Array.from(new Set([...presets, ...values].map((value) => value.trim()).filter(Boolean)));

interface ActionIconProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  disabled: boolean;
  onClick: () => void;
}

const ActionIcon: React.FC<ActionIconProps> = ({ title, icon, color, disabled, onClick }) => (
  <Tooltip title={title} arrow>
    <span>
      <IconButton
        aria-label={title}
        size="small"
        disabled={disabled}
        onClick={onClick}
        sx={{
          width: 34,
          height: 34,
          borderRadius: 1.75,
          color,
          bgcolor: '#FFFFFF',
          border: '1px solid',
          borderColor: `${color}33`,
          transition: 'transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
          '& svg': { fontSize: 18 },
          '&:hover': {
            bgcolor: `${color}14`,
            borderColor: color,
            transform: 'translateY(-2px)',
            boxShadow: `0 6px 14px ${color}33`,
          },
          '&.Mui-disabled': { color: '#B4C0CE', bgcolor: '#F8FAFC', borderColor: '#E2E8F0' },
        }}
      >
        {icon}
      </IconButton>
    </span>
  </Tooltip>
);

const groupSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  p: 0.5,
  borderRadius: 2,
  bgcolor: 'rgba(255,255,255,0.7)',
  border: '1px solid #E4ECF6',
  minWidth: 0,
} as const;

const selectSx = {
  width: { xs: 120, md: 130 },
  '& .MuiInputBase-root': { height: 34, fontSize: 11.5, borderRadius: 1.75, bgcolor: '#FFFFFF' },
  '& .MuiInputLabel-root': { fontSize: 12 },
} as const;

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  availableTags,
  availablePools,
  processing,
  onAction,
  onClear,
}) => {
  const [stage, setStage] = useState<AtsStage>('Screening');
  const [selectedTags, setSelectedTags] = useState<string[]>(['React Expert']);
  const [selectedPools, setSelectedPools] = useState<string[]>(['Frontend Developers']);

  const tagOptions = useMemo(() => uniqueOptions(availableTags, RECRUITER_TAG_PRESETS), [availableTags]);
  const poolOptions = useMemo(() => uniqueOptions(availablePools, TALENT_POOL_PRESETS), [availablePools]);
  const disabled = selectedCount === 0 || processing;

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'sticky',
        top: 12,
        zIndex: 10,
        mb: 1.25,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        border: '1px solid rgba(96, 165, 250, 0.26)',
        borderRadius: 2.5,
        overflow: 'visible',
        boxShadow: '0 16px 38px rgba(15, 45, 85, 0.1)',
        background: 'linear-gradient(145deg, #ffffff 0%, #F4F8FF 100%)',
      }}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 1, px: { xs: 1.25, md: 1.5 }, py: 0.75, borderBottom: '1px solid #E4ECF6', background: 'linear-gradient(90deg, rgba(220,235,255,0.62), rgba(255,255,255,0.5))', borderRadius: '10px 10px 0 0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: selectedCount > 0 ? '#0E9F8E' : '#94A3B8', boxShadow: selectedCount > 0 ? '0 0 0 4px rgba(14,159,142,0.12)' : 'none' }} />
          <Typography sx={{ color: '#16325C', fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Candidate actions</Typography>
        </Box>
        <Chip
          size="small"
          color={selectedCount > 0 ? 'primary' : 'default'}
          label={`${selectedCount} selected`}
          sx={{ fontWeight: 800, borderRadius: 2, height: 26, transition: 'all 0.2s ease', '& .MuiChip-label': { px: 1.25, fontSize: 11.5 } }}
        />
        <Typography sx={{ color: '#71839B', fontSize: '0.68rem', textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>{selectedCount > 0 ? 'Choose an action for selected candidates' : 'Select candidates to enable actions'}</Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 0.75,
          p: 1,
          minWidth: 0,
          '& .MuiInputBase-root.Mui-disabled': { color: '#8A99AA', bgcolor: '#F8FAFC' },
        }}
      >
        <Box sx={groupSx}>
          <ActionIcon title="Shortlist selected candidates" icon={<ShortlistIcon />} color="#0E9F8E" disabled={disabled} onClick={() => onAction({ type: 'shortlist' })} />
          <ActionIcon title="Reject selected candidates" icon={<RejectIcon />} color="#DC2626" disabled={disabled} onClick={() => onAction({ type: 'reject' })} />
        </Box>
        <Box sx={groupSx}>
          <FormControl size="small" disabled={disabled} sx={selectSx}>
            <InputLabel>ATS Stage</InputLabel>
            <Select value={stage} label="ATS Stage" onChange={(event) => setStage(event.target.value as AtsStage)}>
              {ATS_STAGES.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </Select>
          </FormControl>
          <ActionIcon title={`Move to ${stage}`} icon={<StageIcon />} color="#2563EB" disabled={disabled} onClick={() => onAction({ type: 'move_stage', stage })} />
        </Box>
        <Box sx={groupSx}>
          <FormControl size="small" disabled={disabled} sx={selectSx}>
            <InputLabel>Tags</InputLabel>
            <Select
              multiple
              value={selectedTags}
              input={<OutlinedInput label="Tags" />}
              renderValue={(selected) => selected.join(', ')}
              onChange={(event) => setSelectedTags(typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value)}
              sx={{ minWidth: 0 }}
            >
              {tagOptions.map((tag) => <MenuItem key={tag} value={tag}>{tag}</MenuItem>)}
            </Select>
          </FormControl>
          <ActionIcon title="Add tags" icon={<TagIcon />} color="#7C3AED" disabled={disabled || selectedTags.length === 0} onClick={() => onAction({ type: 'add_tags', values: selectedTags })} />
          <ActionIcon title="Remove tags" icon={<RemoveTagIcon />} color="#64748B" disabled={disabled || selectedTags.length === 0} onClick={() => onAction({ type: 'remove_tags', values: selectedTags })} />
        </Box>
        <Box sx={groupSx}>
          <FormControl size="small" disabled={disabled} sx={selectSx}>
            <InputLabel>Talent Pool</InputLabel>
            <Select
              multiple
              value={selectedPools}
              input={<OutlinedInput label="Talent Pool" />}
              renderValue={(selected) => selected.join(', ')}
              onChange={(event) => setSelectedPools(typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value)}
              sx={{ minWidth: 0 }}
            >
              {poolOptions.map((pool) => <MenuItem key={pool} value={pool}>{pool}</MenuItem>)}
            </Select>
          </FormControl>
          <ActionIcon title="Add to talent pool" icon={<PoolIcon />} color="#D97706" disabled={disabled || selectedPools.length === 0} onClick={() => onAction({ type: 'add_pool', values: selectedPools })} />
          <ActionIcon title="Remove from talent pool" icon={<RemovePoolIcon />} color="#64748B" disabled={disabled || selectedPools.length === 0} onClick={() => onAction({ type: 'remove_pool', values: selectedPools })} />
        </Box>
        <Box sx={groupSx}>
          <ActionIcon title="Message selected candidates" icon={<MessageIcon />} color="#0284C7" disabled={disabled} onClick={() => onAction({ type: 'message' })} />
          <ActionIcon title="Export CSV" icon={<ExportIcon />} color="#16A34A" disabled={disabled} onClick={() => onAction({ type: 'export_csv' })} />
          <ActionIcon title="Deselect all" icon={<DeselectIcon />} color="#475569" disabled={processing || selectedCount === 0} onClick={onClear} />
        </Box>
        {processing && <CircularProgress size={18} sx={{ ml: 0.5 }} />}
      </Box>
    </Paper>
  );
};
