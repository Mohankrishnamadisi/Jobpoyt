import { Box, Typography } from '@mui/material';
import type { AssessmentCertificate } from '@services/candidateAssessments';

type CertificateArtworkProps = {
  certificate: AssessmentCertificate;
  qrCode: string;
};

const dateLabel = (value?: string | null) => value
  ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  : 'Date unavailable';

export const CertificateArtwork = ({ certificate, qrCode }: CertificateArtworkProps) => {
  const score = Number(certificate.score) || 0;
  const maxScore = Number(certificate.maxScore) || 0;
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : null;
  const metadata = [
    { label: 'ASSESSMENT CATEGORY', value: certificate.assessmentCategory },
    { label: 'DIFFICULTY', value: certificate.difficulty },
    { label: 'COMPLETED', value: dateLabel(certificate.completionDate) },
    { label: 'ISSUED', value: dateLabel(certificate.issueDate) },
  ];

  return (
    <Box
      className="certificate-artwork"
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: 1050,
        aspectRatio: '297 / 210',
        mx: 'auto',
        p: { xs: 1.8, sm: 3.2, md: 4.5 },
        overflow: 'hidden',
        color: '#0F172A',
        bgcolor: '#FFFFFF',
        border: '1.5px solid #0F172A',
        boxShadow: '0 16px 38px rgba(15,23,42,0.16)',
      }}
    >
      <Box aria-hidden="true" sx={{ position: 'absolute', inset: 9, border: '1px solid rgba(124,58,237,0.36)', pointerEvents: 'none' }} />

      <Box sx={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: { xs: 25, sm: 42 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.15 }}>
            <Box component="img" src="/Jobpoyt.png" alt="JobPoyt" sx={{ width: { xs: 100, sm: 150, md: 175 }, height: 'auto', objectFit: 'contain' }} />
            <Typography sx={{ pl: 0.3, color: '#64748B', fontSize: { xs: 5, sm: 7 }, fontWeight: 700, letterSpacing: 1.1 }}>
              FIND. APPLY. GROW.
            </Typography>
          </Box>
          <Box component="img" src="/images/achivement.png" alt="JobPoyt achievement badge" sx={{ width: { xs: 54, sm: 76, md: 92 }, height: { xs: 54, sm: 76, md: 92 }, objectFit: 'contain', flexShrink: 0 }} />
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 1 }}>
          <Typography sx={{ color: '#7C3AED', fontSize: { xs: 12, sm: 22, md: 30 }, fontWeight: 800, letterSpacing: { xs: 0.6, sm: 1.5 }, lineHeight: 1.1 }}>
            CERTIFICATE OF ACHIEVEMENT
          </Typography>
          <Typography sx={{ color: '#64748B', fontSize: { xs: 8.5, sm: 11, md: 13 }, mt: { xs: 0.4, sm: 0.8 }, mb: { xs: 0.2, sm: 0.45 } }}>
            This certificate is proudly presented to
          </Typography>
          <Typography
            sx={{
              maxWidth: '88%',
              color: '#0F172A',
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: { xs: 20, sm: 31, md: 40 },
              fontWeight: 700,
              lineHeight: 1.15,
              overflowWrap: 'anywhere',
            }}
          >
            {certificate.candidateName}
          </Typography>
          <Typography sx={{ color: '#64748B', fontSize: { xs: 8, sm: 10, md: 12 }, mt: { xs: 0.35, sm: 0.65 } }}>
            for successfully completing the
          </Typography>
          <Typography
            sx={{
              maxWidth: '78%',
              color: '#312E81',
              fontSize: { xs: 14, sm: 20, md: 24 },
              fontWeight: 800,
              lineHeight: 1.2,
              mt: { xs: 0.2, sm: 0.45 },
              overflowWrap: 'anywhere',
            }}
          >
            {certificate.assessmentTitle}
          </Typography>
          <Typography sx={{ color: '#64748B', fontSize: { xs: 8, sm: 10, md: 12 }, mt: { xs: 0.35, sm: 0.65 } }}>
            {certificate.assessmentCategory} | {certificate.difficulty} difficulty
          </Typography>
          <Box sx={{ mt: { xs: 0.65, sm: 1.1 }, px: { xs: 2, sm: 3 }, py: { xs: 0.55, sm: 0.85 }, minWidth: { xs: 130, sm: 220 }, border: '1px solid #CBD5E1', borderTop: '2px solid #7C3AED', bgcolor: '#FFFFFF', textAlign: 'center' }}>
            <Typography sx={{ color: '#64748B', fontSize: { xs: 7, sm: 9, md: 10 }, fontWeight: 800, letterSpacing: 0.5 }}>FINAL ASSESSMENT SCORE</Typography>
            <Typography sx={{ color: '#0F172A', fontSize: { xs: 14, sm: 21, md: 26 }, fontWeight: 800, lineHeight: 1.2 }}>{score} / {maxScore}</Typography>
            {percentage !== null ? <Typography sx={{ color: '#64748B', fontSize: { xs: 7, sm: 9, md: 10 } }}>{percentage}%</Typography> : null}
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', borderTop: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1', py: { xs: 0.45, sm: 0.9 } }}>
          {metadata.map((item) => (
            <Box key={item.label} sx={{ minWidth: 0, px: { xs: 0.35, sm: 1 }, textAlign: 'center' }}>
              <Typography sx={{ color: '#64748B', fontSize: { xs: 6, sm: 8, md: 10 }, fontWeight: 800, letterSpacing: { xs: 0, sm: 0.3 } }}>{item.label}</Typography>
              <Typography sx={{ color: '#0F172A', fontSize: { xs: 7, sm: 10, md: 12 }, fontWeight: 700, mt: 0.15, overflowWrap: 'anywhere' }}>{item.value}</Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1, pt: { xs: 0.4, sm: 0.75 } }}>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ width: { xs: 30, sm: 48 }, borderTop: '1px solid #0F172A', mb: 0.2 }} />
            <Typography sx={{ color: '#0F172A', fontSize: { xs: 5.5, sm: 8, md: 9 }, fontWeight: 800 }}>JobPoyt</Typography>
            <Typography sx={{ color: '#64748B', fontSize: { xs: 4.5, sm: 6.5, md: 7 } }}>Authorized Issuer</Typography>
          </Box>
          <Box sx={{ minWidth: 0, textAlign: 'right', display: 'flex', alignItems: 'center', gap: { xs: 0.35, sm: 0.7 } }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: '#64748B', fontSize: { xs: 4.2, sm: 6, md: 7 }, fontWeight: 800 }}>VERIFY THIS CERTIFICATE</Typography>
              <Typography sx={{ color: '#0F172A', fontSize: { xs: 4.2, sm: 6, md: 7 }, overflowWrap: 'anywhere' }}>{certificate.certificateId}</Typography>
              <Typography sx={{ color: '#64748B', fontSize: { xs: 3.6, sm: 5.5 } }}>jobpoyt.com/verify-certificate</Typography>
            </Box>
            {qrCode ? <Box component="img" alt="QR code to verify this certificate" src={qrCode} sx={{ width: { xs: 36, sm: 58, md: 68 }, height: { xs: 36, sm: 58, md: 68 }, flexShrink: 0, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', p: 0.15 }} /> : null}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
