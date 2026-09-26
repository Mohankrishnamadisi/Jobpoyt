import React from 'react';
import { Box, CircularProgress, Container } from '@mui/material';
import { Layout } from '@components/layout/Layout';
import { RemoteJobHub } from '@components/dashboard/RemoteJobHub';
import { useAuthStore } from '@store/index';
import { useSubscription } from '@hooks/index';

export const RemoteJobs: React.FC = () => {
  const { user } = useAuthStore();
  const { subscription, loading } = useSubscription(user?.id || null);

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ py: { xs: 1.5, md: 2.5 }, px: { xs: 1.2, sm: 2, md: 3 } }}>
        {loading ? (
          <Box sx={{ minHeight: 180, display: 'grid', placeItems: 'center' }}><CircularProgress size={26} /></Box>
        ) : <RemoteJobHub subscription={subscription} standalone />}
      </Container>
    </Layout>
  );
};

export default RemoteJobs;
