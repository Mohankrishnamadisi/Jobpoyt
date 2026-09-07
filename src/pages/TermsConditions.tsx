import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { Layout } from '@components/layout/Layout';

export const TermsConditions: React.FC = () => {
  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h2" sx={{ fontWeight: 700, mb: 4 }}>
          Terms and Conditions
        </Typography>

        <Box sx={{ color: 'text.secondary', lineHeight: 1.8, '& p': { mb: 2 }, '& h5': { fontWeight: 600, color: 'text.primary', mt: 4, mb: 2 } }}>
          <Typography variant="body1" component="p">
            Last Updated: {new Date().toLocaleDateString()}
          </Typography>

          <Typography variant="h5">1. Acceptance of Terms</Typography>
          <Typography variant="body1" component="p">
            By accessing and using Jobpoyt, you accept and agree to be bound by the terms and provision of this agreement.
          </Typography>

          <Typography variant="h5">2. Use License</Typography>
          <Typography variant="body1" component="p">
            Permission is granted to temporarily download one copy of the materials (information or software) on Jobpoyt for personal, non-commercial transitory viewing only.
          </Typography>

          <Typography variant="h5">3. Disclaimer</Typography>
          <Typography variant="body1" component="p">
            The materials on Jobpoyt are provided on an 'as is' basis. Jobpoyt makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </Typography>

          <Typography variant="h5">4. Limitations</Typography>
          <Typography variant="body1" component="p">
            In no event shall Jobpoyt or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Jobpoyt.
          </Typography>

          <Typography variant="h5">5. Contact Information</Typography>
          <Typography variant="body1" component="p">
            If you have any questions about these Terms and Conditions, please contact us at legal@jobpoyt.com
          </Typography>
        </Box>
      </Container>
    </Layout>
  );
};
