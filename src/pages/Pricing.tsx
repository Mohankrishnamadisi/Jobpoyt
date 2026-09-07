import React, { useMemo, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Button,
  Typography,
} from '@mui/material';
import { CheckCircle as CheckCircleIcon, LocalOffer as LocalOfferIcon } from '@mui/icons-material';
import { Layout } from '@components/layout/Layout';
import { CANDIDATE_SUBSCRIPTION_PLANS } from '@constants/index';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@constants/index';
import toast from 'react-hot-toast';
import { PaymentModal } from '@components/payments/PaymentModal';
import { useTheme } from '@mui/material/styles';

export const Pricing: React.FC = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [selectedPlanId, setSelectedPlanId] = useState(CANDIDATE_SUBSCRIPTION_PLANS[0]?.id || 'premium_monthly');
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const selectedPlan = useMemo(
    () => CANDIDATE_SUBSCRIPTION_PLANS.find((plan) => plan.id === selectedPlanId) ?? CANDIDATE_SUBSCRIPTION_PLANS[0],
    [selectedPlanId]
  );

  const handlePaymentSuccess = () => {
    toast.success('Subscription successful! Your premium access is now active.');
    setTimeout(() => {
      navigate(ROUTES.DASHBOARD);
    }, 1500);
  };

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* Header Section */}
        <Box
          sx={{
            textAlign: 'center',
            mb: 10,
            p: 4,
            borderRadius: 4,
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(59,130,246,0.1))'
              : 'radial-gradient(circle at top, rgba(59,130,246,0.12), transparent 34%), radial-gradient(circle at bottom right, rgba(245,158,11,0.12), transparent 32%)',
            border: isDarkMode 
              ? '1px solid rgba(37, 99, 235, 0.2)' 
              : '1px solid rgba(37, 99, 235, 0.12)',
          }}
        >
          <Typography 
            variant="h2" 
            sx={{ 
              fontWeight: 700, 
              mb: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Unlock Your Career Potential
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'text.secondary', 
              maxWidth: 720, 
              mx: 'auto',
              lineHeight: 1.6,
            }}
          >
            Get instant access to premium remote & hybrid jobs, AI-powered career tools, and exclusive opportunities. Choose your commitment level.
          </Typography>
        </Box>

        {/* Pricing Cards - Two Column Layout */}
        <Box sx={{ mb: 10 }}>
          <Grid container spacing={4} sx={{ justifyContent: 'center' }}>
            {CANDIDATE_SUBSCRIPTION_PLANS.map((plan) => (
              <Grid item xs={12} sm={10} md={6} key={plan.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    border: selectedPlanId === plan.id || plan.recommended 
                      ? '2px solid' 
                      : '1px solid',
                    borderColor: selectedPlanId === plan.id || plan.recommended 
                      ? 'primary.main' 
                      : 'divider',
                    transform: plan.recommended ? 'scale(1.02)' : 'scale(1)',
                    borderRadius: 4,
                    background: isDarkMode
                      ? plan.recommended 
                        ? 'linear-gradient(180deg, rgba(37,99,235,0.15), rgba(15,23,42,0.8))'
                        : 'rgba(15,23,42,0.5)'
                      : plan.recommended 
                        ? 'linear-gradient(180deg, rgba(37,99,235,0.08), #FFFFFF)'
                        : '#FFFFFF',
                    boxShadow: selectedPlanId === plan.id || plan.recommended 
                      ? '0 24px 60px rgba(37,99,235,0.14)' 
                      : '0 12px 32px rgba(15,23,42,0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: plan.recommended ? 'translateY(-8px) scale(1.02)' : 'translateY(-8px)',
                      boxShadow: selectedPlanId === plan.id || plan.recommended 
                        ? '0 32px 80px rgba(37,99,235,0.2)' 
                        : '0 20px 40px rgba(15,23,42,0.12)',
                    },
                  }}
                >
                  {plan.badge && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 15,
                        right: 14,
                        background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                        color: '#FFFFFF',
                        px: 3,
                        py: 0.75,
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.8,
                        boxShadow: '0 8px 16px rgba(249, 115, 22, 0.3)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <LocalOfferIcon sx={{ fontSize: 18 }} />
                      SAVE ₹{plan.savings}
                    </Box>
                  )}

                  <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', pt: plan.recommended ? 4 : 3 }}>
                    {/* Plan Name & Duration */}
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        fontWeight: 700, 
                        mb: 1,
                        color: isDarkMode ? '#fff' : '#1F2937',
                      }}
                    >
                      {plan.name}
                    </Typography>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        color: 'primary.main', 
                        fontWeight: 600,
                        mb: 3,
                        fontSize: '1rem',
                      }}
                    >
                      {plan.planType}
                    </Typography>

                    {/* Pricing Section */}
                    <Box sx={{ mb: 4, pb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                        <Typography 
                          variant="h2" 
                          sx={{ 
                            fontWeight: 700, 
                            color: 'primary.main',
                          }}
                        >
                          ₹{plan.basePriceInr}
                        </Typography>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            color: 'text.secondary',
                            fontWeight: 500,
                          }}
                        >
                          + {plan.gstPercent}% GST
                        </Typography>
                      </Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: 'text.secondary',
                          mb: 2,
                        }}
                      >
                        Gross: ₹{plan.grossPriceInr}
                      </Typography>
                      
                      {plan.durationMonths === 3 && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'success.main',
                            fontWeight: 600,
                            display: 'block',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            lineHeight: 1.6,
                          }}
                        >
                          ₹{plan.monthlyEquivalent}/month equivalent
                        </Typography>
                      )}
                    </Box>

                    {/* Features List */}
                    <Box sx={{ mb: 4, flex: 1 }}>
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          fontWeight: 600, 
                          mb: 2,
                          color: isDarkMode ? 'rgba(255,255,255,0.9)' : '#1F2937',
                        }}
                      >
                        Included Features:
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        {plan.features.map((feature, idx) => (
                          <Box 
                            key={`${plan.id}-${idx}`}
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'flex-start', 
                              gap: 1,
                            }}
                          >
                            <CheckCircleIcon 
                              sx={{ 
                                fontSize: 18, 
                                color: 'success.main',
                                mt: 0.3,
                                flexShrink: 0,
                              }} 
                            />
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                                lineHeight: 1.3,
                              }}
                            >
                              {feature}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>

                    {/* CTA Button */}
                    <Button
                      variant={selectedPlanId === plan.id ? 'contained' : 'outlined'}
                      fullWidth
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        setCheckoutOpen(true);
                      }}
                      size="large"
                      sx={{
                        textTransform: 'none',
                        py: 1.8,
                        fontWeight: 700,
                        fontSize: '1rem',
                        borderRadius: 2,
                        ...(selectedPlanId === plan.id && {
                          background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                          color: '#FFFFFF',
                          boxShadow: '0 8px 16px rgba(37, 99, 235, 0.4)',
                          '&:hover': {
                            boxShadow: '0 12px 24px rgba(37, 99, 235, 0.5)',
                          },
                        }),
                      }}
                    >
                      {selectedPlanId === plan.id ? `Selected: ${plan.cta}` : plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        <PaymentModal
          open={checkoutOpen}
          plan={selectedPlan}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={handlePaymentSuccess}
          onError={(error) => toast.error(error || 'Payment failed. Please try again.')}
        />

        {/* Benefits Section */}
        <Box
          sx={{
            textAlign: 'center',
            p: 4,
            borderRadius: 4,
            background: isDarkMode
              ? 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(59,130,246,0.1))'
              : 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(245,158,11,0.08))',
            border: isDarkMode
              ? '1px solid rgba(37, 99, 235, 0.2)'
              : '1px solid rgba(37, 99, 235, 0.12)',
          }}
        >
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 700, 
              mb: 3,
            }}
          >
            ✨ Why Choose Jobpoyt Premium?
          </Typography>
          <Grid container spacing={3} sx={{ justifyContent: 'center' }}>
            {[
              { title: '🔥 Instant Notifications', desc: 'Get job matches instantly' },
              { title: '🎯 AI-Powered Matching', desc: 'Smart recommendations for you' },
              { title: '📱 Remote Job Focus', desc: 'Access premium remote opportunities' },
              { title: '💼 Career Tools', desc: 'Mock interviews & resume reviews' },
            ].map((benefit, idx) => (
              <Grid item xs={12} sm={6} md={3} key={idx}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                    {benefit.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {benefit.desc}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </Layout>
  );
};
