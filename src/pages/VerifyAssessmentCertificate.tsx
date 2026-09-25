import React, { useEffect, useState } from 'react';
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Typography } from '@mui/material';
import { CheckCircleOutline as VerifiedIcon, GppBadOutlined as InvalidIcon } from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { candidateAssessmentService } from '@services/candidateAssessments';

type VerifiedCertificate = { certificateId: string; assessmentTitle: string; assessmentCategory: string; candidateName: string; score: number; maxScore: number; issueDate: string; status: string };
const dateLabel = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

const VerifyAssessmentCertificate: React.FC = () => {
  const { verificationId = '' } = useParams();
  const [certificate, setCertificate] = useState<VerifiedCertificate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let current = true;
    candidateAssessmentService.verifyCertificate(verificationId)
      .then((response) => { if (current && response.verified) setCertificate(response.certificate); })
      .catch(() => undefined)
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [verificationId]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F4F7FB', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card variant="outlined" sx={{ width: '100%', maxWidth: 560, borderColor: '#D8E1EC', borderRadius: 2, boxShadow: '0 12px 34px rgba(15,23,42,0.08)' }}>
        <CardContent sx={{ p: { xs: 2.2, sm: 3 } }}>
          <Typography variant="overline" sx={{ color: '#2563EB', fontWeight: 800 }}>JOBPOYT CERTIFICATE VERIFICATION</Typography>
          {loading ? <Box sx={{ py: 4, display: 'grid', placeItems: 'center', gap: 1 }}><CircularProgress size={24} /><Typography variant="body2" color="text.secondary">Verifying certificate...</Typography></Box> : certificate ? <><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.8 }}><VerifiedIcon color="success" /><Typography variant="h6" fontWeight={750}>Certificate Verified</Typography></Box><Typography variant="body2" sx={{ mt: 1.4, fontWeight: 700 }}>{certificate.assessmentTitle}</Typography><Typography variant="caption" color="text.secondary">{certificate.assessmentCategory}</Typography><Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1.5 }}><Box><Typography variant="caption" color="text.secondary">Candidate</Typography><Typography variant="body2">{certificate.candidateName}</Typography></Box><Box><Typography variant="caption" color="text.secondary">Score</Typography><Typography variant="body2" fontWeight={700}>{certificate.score} / {certificate.maxScore}</Typography></Box><Box><Typography variant="caption" color="text.secondary">Certificate ID</Typography><Typography variant="body2">{certificate.certificateId}</Typography></Box><Box><Typography variant="caption" color="text.secondary">Date issued</Typography><Typography variant="body2">{dateLabel(certificate.issueDate)}</Typography></Box></Box><Chip size="small" color="success" variant="outlined" label={certificate.status} sx={{ mt: 1.5 }} /></> : <><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.8 }}><InvalidIcon color="error" /><Typography variant="h6" fontWeight={750}>Certificate Not Verified</Typography></Box><Alert severity="warning" sx={{ mt: 1 }}>This certificate could not be found or is no longer valid.</Alert></>}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>Issued by JobPoyt · Assessment & Career Platform</Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VerifyAssessmentCertificate;
