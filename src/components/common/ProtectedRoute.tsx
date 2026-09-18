import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@store/index';
import { ROUTES } from '@constants/index';
import { SEO } from '@components/seo/SEO';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user } = useAuthStore();

  // eslint-disable-next-line no-console
  console.log('ProtectedRoute user:', user, 'requiredRole:', requiredRole);

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return (
    <>
      <SEO title="Private JobPoyt Account" description="Private JobPoyt account area." robots="noindex,nofollow" />
      {children}
    </>
  );
};
