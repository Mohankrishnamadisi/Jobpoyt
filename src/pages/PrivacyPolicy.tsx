import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { Layout } from '@components/layout/Layout';

export const PrivacyPolicy: React.FC = () => {
  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h2" sx={{ fontWeight: 700, mb: 4 }}>
          Privacy Policy
        </Typography>

        <Box sx={{ color: 'text.secondary', lineHeight: 1.8, '& p': { mb: 2 }, '& h5': { fontWeight: 600, color: 'text.primary', mt: 4, mb: 2 } }}>
          <Typography variant="body1" component="p">
            Last Updated: {new Date().toLocaleDateString()}
          </Typography>

          <Typography variant="h5">1. Introduction</Typography>
          <Typography variant="body1" component="p">
            Jobpoyt ("we" or "us" or "Company") operates the website. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
          </Typography>

          <Typography variant="h5">2. Information Collection and Use</Typography>
          <Typography variant="body1" component="p">
            We collect several different types of information for various purposes to provide and improve our Service to you.
          </Typography>

          <Typography variant="h5">3. Types of Data Collected</Typography>
          <Typography variant="body1" component="p">
            <strong>Personal Data:</strong> While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data").
          </Typography>

          <Typography variant="h5">4. Security of Data</Typography>
          <Typography variant="body1" component="p">
            The security of your data is important to us, but remember that no method of transmission over the Internet is 100% secure.
          </Typography>

          <Typography variant="h5">5. Contact Us</Typography>
          <Typography variant="body1" component="p">
            If you have any questions about this Privacy Policy, please contact us at privacy@jobpoyt.com
          </Typography>
        </Box>
      </Container>
    </Layout>
  );
};
