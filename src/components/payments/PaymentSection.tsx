import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Divider,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  CreditCard,
  PhonelinkLock,
  AccountBalance,
  QrCode2,
  CheckCircle as CheckCircleIcon,
  LocalAtm,
  ArrowForward,
  SecurityOutlined,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { SUBSCRIPTION_GST_PERCENT } from '@constants/index';
import { PaymentModal } from './PaymentModal';

interface PaymentSectionProps {
  plan: {
    id: string;
    name: string;
    price: number;
    durationMonths: number;
    durationLabel: string;
  };
  onPaymentSuccess?: (paymentData: any) => void;
  onPaymentError?: (error: string) => void;
}

interface PaymentMethod {
  id: 'razorpay' | 'phonepe' | 'credit_card' | 'upi';
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
}

const MotionCard = motion(Card);
const MotionButton = motion(Button);

export const PaymentSection: React.FC<PaymentSectionProps> = ({
  plan,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    'razorpay' | 'phonepe' | 'credit_card' | 'upi'
  >('razorpay');
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'razorpay',
      name: 'Razorpay',
      description: 'Fast & Secure Payment',
      icon: <SecurityOutlined sx={{ fontSize: 32 }} />,
      color: '#1E40AF',
      features: ['Instant Transfer', 'Secure Checkout', 'Multiple Cards'],
    },
    {
      id: 'phonepe',
      name: 'PhonePe',
      description: 'UPI Payment',
      icon: <PhonelinkLock sx={{ fontSize: 32 }} />,
      color: '#7B3FF2',
      features: ['Fast Processing', 'Cashback', 'Easy Refund'],
    },
    {
      id: 'credit_card',
      name: 'Credit Card',
      description: 'Debit or Credit',
      icon: <CreditCard sx={{ fontSize: 32 }} />,
      color: '#F59E0B',
      features: ['All Banks', 'EMI Option', 'Rewards'],
    },
    {
      id: 'upi',
      name: 'UPI',
      description: 'Direct Bank Transfer',
      icon: <QrCode2 sx={{ fontSize: 32 }} />,
      color: '#10B981',
      features: ['Instant Pay', 'No Extra Fee', 'Safe & Secure'],
    },
  ];

  const isCandidatePlan = ['premium_monthly', 'premium_3_month'].includes(plan.id);

  const gstAmount = useMemo(() => {
    if (!isCandidatePlan) return 0;
    return Number(((plan.price * SUBSCRIPTION_GST_PERCENT) / 100).toFixed(2));
  }, [isCandidatePlan, plan.price]);

  const totalAmount = useMemo(() => {
    if (!isCandidatePlan) return plan.price;
    return Number((plan.price + gstAmount).toFixed(2));
  }, [gstAmount, isCandidatePlan, plan.price]);

  const discount = useMemo(() => {
    if (plan.durationMonths > 1) {
      return Math.round(((plan.price / plan.durationMonths - 100) / (plan.price / plan.durationMonths)) * 100);
    }
    return 0;
  }, [plan]);

  return (
    <Box sx={{ py: 4 }}>
      {/* Payment Methods Section */}
      <Box sx={{ mb: 6 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            mb: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Choose Payment Method
        </Typography>

        <Grid container spacing={3}>
          {paymentMethods.map((method, index) => (
            <Grid item xs={12} sm={6} md={3} key={method.id}>
              <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedPaymentMethod(method.id)}
                sx={{
                  cursor: 'pointer',
                  border:
                    selectedPaymentMethod === method.id
                      ? `3px solid ${method.color}`
                      : '2px solid #E5E7EB',
                  transition: 'all 0.3s ease',
                  background:
                    selectedPaymentMethod === method.id
                      ? `linear-gradient(135deg, ${method.color}15 0%, ${method.color}05 100%)`
                      : '#FFFFFF',
                  transform:
                    selectedPaymentMethod === method.id ? 'translateY(-8px)' : 'translateY(0)',
                  boxShadow:
                    selectedPaymentMethod === method.id
                      ? `0 12px 24px ${method.color}30`
                      : '0 2px 8px rgba(0,0,0,0.1)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 16px ${method.color}20`,
                  },
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      mb: 2,
                      color:
                        selectedPaymentMethod === method.id ? method.color : '#9CA3AF',
                      transition: 'color 0.3s ease',
                    }}
                  >
                    {method.icon}
                  </Box>

                  <Typography
                    variant="h6"
                    sx={{
                      textAlign: 'center',
                      fontWeight: 700,
                      mb: 0.5,
                      color:
                        selectedPaymentMethod === method.id ? method.color : '#1F2937',
                    }}
                  >
                    {method.name}
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{
                      textAlign: 'center',
                      display: 'block',
                      color: '#6B7280',
                      mb: 1.5,
                      fontSize: '0.75rem',
                    }}
                  >
                    {method.description}
                  </Typography>

                  {selectedPaymentMethod === method.id && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Selected"
                        size="small"
                        sx={{
                          background: `${method.color}20`,
                          color: method.color,
                          fontWeight: 600,
                          border: `1px solid ${method.color}`,
                        }}
                      />
                    </Box>
                  )}

                  <Divider sx={{ my: 1.5 }} />

                  <Box sx={{ mt: 1.5 }}>
                    {method.features.map((feature, idx) => (
                      <Typography
                        key={idx}
                        variant="caption"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          color: '#6B7280',
                          mb: 0.5,
                          fontSize: '0.7rem',
                        }}
                      >
                        <Box
                          sx={{
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            background: method.color,
                            mr: 1,
                          }}
                        />
                        {feature}
                      </Typography>
                    ))}
                  </Box>
                </CardContent>
              </MotionCard>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Price Breakdown Section */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            mb: 3,
            color: '#1F2937',
          }}
        >
          Price Breakdown
        </Typography>

        <Grid container spacing={3}>
          {/* Left: Breakdown Details */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
                border: '1px solid #D1D5DB',
              }}
            >
              <CardContent>
                <Box sx={{ mb: 2.5 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 1.5,
                    }}
                  >
                    <Typography variant="body2" sx={{ color: '#6B7280' }}>
                      Base Price ({plan.durationLabel})
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: '#1F2937' }}
                    >
                      ₹{plan.price.toLocaleString('en-IN')}
                    </Typography>
                  </Box>

                  {discount > 0 && (
                    <Chip
                      label={`Save ${discount}% per month`}
                      size="small"
                      sx={{
                        background: '#DBEAFE',
                        color: '#1E40AF',
                        fontWeight: 600,
                        height: 24,
                      }}
                    />
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                {isCandidatePlan && (
                  <>
                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ mb: 2.5 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Typography variant="body2" sx={{ color: '#6B7280' }}>
                          GST ({SUBSCRIPTION_GST_PERCENT}%)
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: '#DC2626' }}
                        >
                          + ₹{gstAmount.toLocaleString('en-IN')}
                        </Typography>
                      </Box>
                    </Box>
                  </>
                )}

                <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '16px',
                    borderRadius: '8px',
                    mt: 2.5,
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 700,
                      color: '#FFFFFF',
                    }}
                  >
                    Total Amount
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 800,
                      color: '#FFFFFF',
                    }}
                  >
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Right: Summary & Perks */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #ECFDF5 0%, #DBEAFE 100%)',
                border: '1px solid #A7F3D0',
              }}
            >
              <CardContent>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    mb: 2,
                    color: '#065F46',
                  }}
                >
                  ✨ What You Get
                </Typography>

                <Box sx={{ mb: 2.5 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: '#1F2937',
                      mb: 1,
                    }}
                  >
                    Plan: {plan.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#6B7280',
                    }}
                  >
                    Valid for {plan.durationLabel}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ space: 1 }}>
                  {[
                    'Access to all premium jobs',
                    'Priority job recommendations',
                    'Unlimited saved jobs',
                    'Resume review support',
                    'Early access to new positions',
                    'Priority customer support',
                  ].map((feature, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        mb: 1.5,
                        padding: '8px',
                        borderRadius: '6px',
                        background: '#F0FDF4',
                      }}
                    >
                      <CheckCircleIcon
                        sx={{
                          fontSize: 20,
                          color: '#10B981',
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#047857',
                          fontWeight: 500,
                        }}
                      >
                        {feature}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Divider sx={{ my: 2.5 }} />

                <Paper
                  sx={{
                    padding: '12px',
                    background: '#FEF3C7',
                    border: '1px solid #FBBF24',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <SecurityOutlined
                    sx={{
                      fontSize: 18,
                      color: '#92400E',
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#92400E',
                      fontWeight: 500,
                    }}
                  >
                    100% Secure Payment - SSL Encrypted
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Payment Button */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          justifyContent: 'center',
          mt: 4,
        }}
      >
        <MotionButton
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          component={motion.button}
          onClick={() => setCheckoutOpen(true)}
          variant="contained"
          size="large"
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            fontWeight: 700,
            fontSize: '1rem',
            padding: '14px 48px',
            borderRadius: '12px',
            textTransform: 'none',
            boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 12px 32px rgba(102, 126, 234, 0.6)',
            },
            '&:disabled': {
              background: '#D1D5DB',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Proceed to Pay
            <ArrowForward sx={{ fontSize: 20 }} />
          </Box>
        </MotionButton>
      </Box>

      {/* Trust Badges */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
          mt: 4,
          flexWrap: 'wrap',
        }}
      >
        {['🔒 Secure', '💳 Multiple Payment Methods', '✅ Verified'].map(
          (badge, idx) => (
            <Chip
              key={idx}
              label={badge}
              size="small"
              sx={{
                background: '#F3F4F6',
                color: '#6B7280',
                fontWeight: 500,
              }}
            />
          )
        )}
      </Box>

      <PaymentModal
        open={checkoutOpen}
        plan={plan}
        initialPaymentMethod={selectedPaymentMethod}
        onClose={() => setCheckoutOpen(false)}
        onSuccess={onPaymentSuccess}
        onError={onPaymentError}
      />
    </Box>
  );
};

export default PaymentSection;
