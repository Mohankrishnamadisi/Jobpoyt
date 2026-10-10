import React from 'react';
import { ArrowForward, BusinessCenterOutlined, CheckCircleOutline, Search } from '@mui/icons-material';
import { Box, Button, Dialog, DialogContent, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@constants/index';

interface GuestSignInDialogProps {
  open: boolean;
  eyebrow: string;
  panelTitle: string;
  panelDescription: string;
  highlightTitle: string;
  highlightDescription: string;
  title: string;
  description: string;
  benefits: string[];
  signInLabel: string;
}

export const GuestSignInDialog: React.FC<GuestSignInDialogProps> = ({
  open,
  eyebrow,
  panelTitle,
  panelDescription,
  highlightTitle,
  highlightDescription,
  title,
  description,
  benefits,
  signInLabel,
}) => {
  const navigate = useNavigate();

  return (
    <Dialog
      open={open}
      onClose={() => undefined}
      disableEscapeKeyDown
      fullWidth
      maxWidth="lg"
      aria-labelledby="guest-sign-in-title"
      aria-describedby="guest-sign-in-description"
      BackdropProps={{ sx: { backgroundColor: 'rgba(226, 232, 240, 0.84)', backdropFilter: 'blur(5px)' } }}
      PaperProps={{
        sx: {
          width: { xs: 'calc(100% - 28px)', sm: '90vw' },
          maxWidth: 960,
          borderRadius: { xs: 3, sm: 4 },
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.72)',
          backgroundColor: '#fff',
          boxShadow: '0 32px 90px rgba(15, 23, 42, 0.24)',
        },
      }}
    >
      <DialogContent sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'stretch', p: 0 }}>
        <Box
          sx={{
            width: { xs: '100%', sm: '40%' },
            minHeight: { xs: 218, sm: 480 },
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden',
            p: { xs: 3, sm: 4.5 },
            color: '#fff',
            background: 'linear-gradient(145deg, #10264a 0%, #173b75 55%, #2453bd 100%)',
            '&::before': {
              content: '""',
              position: 'absolute',
              width: 280,
              height: 280,
              right: -115,
              top: -115,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 0 0 28px rgba(255,255,255,0.035), 0 0 0 58px rgba(255,255,255,0.025)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              width: 190,
              height: 190,
              left: -110,
              bottom: -120,
              borderRadius: '50%',
              background: 'rgba(56, 189, 248, 0.12)',
              filter: 'blur(2px)',
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.9, mb: { xs: 2.5, sm: 4 } }}>
              <Box sx={{ width: 31, height: 31, display: 'grid', placeItems: 'center', borderRadius: 2, bgcolor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <BusinessCenterOutlined sx={{ fontSize: 18 }} />
              </Box>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.12em' }}>JOBPOYT</Typography>
            </Box>
            <Typography sx={{ color: '#a5d8ff', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', mb: 1.2 }}>
              {eyebrow}
            </Typography>
            <Typography sx={{ maxWidth: 300, fontSize: { xs: '1.7rem', sm: '2.1rem' }, lineHeight: 1.12, fontWeight: 800, letterSpacing: '-0.045em' }}>
              {panelTitle}
            </Typography>
            <Typography sx={{ maxWidth: 300, mt: 1.5, color: 'rgba(235,244,255,0.78)', fontSize: '0.95rem', lineHeight: 1.65 }}>
              {panelDescription}
            </Typography>
          </Box>
          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              mt: { xs: 2.5, sm: 4 },
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              borderRadius: 2.5,
              border: '1px solid rgba(255,255,255,0.18)',
              bgcolor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Box sx={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 2, bgcolor: 'rgba(255,255,255,0.14)' }}>
              <Search sx={{ fontSize: 20, color: '#bfdbfe' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.83rem', fontWeight: 700 }}>{highlightTitle}</Typography>
              <Typography sx={{ mt: 0.25, color: 'rgba(235,244,255,0.72)', fontSize: '0.74rem' }}>
                {highlightDescription}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            px: { xs: 3, sm: 5.5 },
            py: { xs: 3.25, sm: 5 },
            bgcolor: '#fff',
          }}
        >
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, alignSelf: 'flex-start', mb: 2 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#2563eb' }} />
            <Typography sx={{ color: '#3155b8', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase' }}>
              Welcome to JobPoyt
            </Typography>
          </Box>
          <Typography
            id="guest-sign-in-title"
            sx={{ color: '#111827', fontSize: { xs: '1.65rem', sm: '2rem' }, fontWeight: 800, lineHeight: 1.16, letterSpacing: '-0.045em' }}
          >
            {title}
          </Typography>
          <Typography id="guest-sign-in-description" sx={{ mt: 1.25, color: '#64748b', fontSize: '0.96rem', lineHeight: 1.65 }}>
            {description}
          </Typography>
          <Box sx={{ display: 'grid', gap: 1.15, mt: 2.75 }}>
            {benefits.map((benefit) => (
              <Box key={benefit} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleOutline sx={{ color: '#2e63cc', fontSize: 19, flexShrink: 0 }} />
                <Typography sx={{ color: '#3d4b61', fontSize: '0.84rem', fontWeight: 600 }}>{benefit}</Typography>
              </Box>
            ))}
          </Box>
          <Button
            variant="contained"
            endIcon={<ArrowForward />}
            onClick={() => navigate(ROUTES.LOGIN)}
            sx={{
              mt: 3.25,
              minHeight: 54,
              borderRadius: 2,
              background: 'linear-gradient(100deg, #3159d7 0%, #2447b8 100%)',
              fontWeight: 750,
              fontSize: '0.98rem',
              textTransform: 'none',
              boxShadow: '0 10px 22px rgba(40, 76, 190, 0.22)',
              '&:hover': {
                background: 'linear-gradient(100deg, #284ec8 0%, #1e3eaa 100%)',
                boxShadow: '0 13px 26px rgba(40, 76, 190, 0.3)',
                transform: 'translateY(-1px)',
              },
              transition: 'transform 180ms ease, box-shadow 180ms ease',
            }}
          >
            {signInLabel}
          </Button>
          <Typography sx={{ mt: 1.8, color: '#64748b', textAlign: 'center', fontSize: '0.82rem' }}>
            New to JobPoyt?{' '}
            <Box
              component="button"
              type="button"
              onClick={() => navigate(ROUTES.SIGNUP)}
              sx={{ p: 0, border: 0, bgcolor: 'transparent', color: '#2447b8', font: 'inherit', fontWeight: 750, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            >
              Create an account
            </Box>
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
