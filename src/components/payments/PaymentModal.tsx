import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
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
  Tab,
  Tabs,
  TextField,
  InputAdornment,
  IconButton,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Close as CloseIcon,
  CreditCard,
  PhonelinkLock,
  QrCode2,
  Visibility,
  VisibilityOff,
  CheckCircle as CheckCircleIcon,
  Lock as LockIcon,
  ArrowBack,
  ArrowForward,
  ShoppingCart,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '@store/index';
import { razorpayCheckout } from '@services/razorpayCheckout';
import { SUBSCRIPTION_GST_PERCENT } from '@constants/index';

interface PaymentModalProps {
  open: boolean;
  plan: {
    id: string;
    name: string;
    price: number;
    durationMonths: number;
    durationLabel: string;
  };
  onClose: () => void;
  onSuccess?: (paymentData: any) => void;
  onError?: (reason: string) => void;
  initialPaymentMethod?: 'razorpay' | 'phonepe' | 'credit_card' | 'upi';
}

const MotionCard = motion(Card);

export const PaymentModal: React.FC<PaymentModalProps> = ({
  open,
  plan,
  onClose,
  onSuccess,
  onError,
  initialPaymentMethod = 'razorpay',
}) => {
  const { user } = useAuthStore();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    'razorpay' | 'phonepe' | 'credit_card' | 'upi'
  >(initialPaymentMethod);
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    holderName: '',
  });

  const isCandidatePlan = ['premium_monthly', 'premium_3_month'].includes(plan.id);

  const gstAmount = useMemo(() => {
    if (!isCandidatePlan) return 0;
    return Number(((plan.price * SUBSCRIPTION_GST_PERCENT) / 100).toFixed(2));
  }, [isCandidatePlan, plan.price]);

  const totalAmount = useMemo(() => {
    if (!isCandidatePlan) return plan.price;
    return Number((plan.price + gstAmount).toFixed(2));
  }, [gstAmount, isCandidatePlan, plan.price]);

  const steps = ['Select Method', 'Review & Confirm', 'Payment Complete'];

  const handlePayment = async () => {
    if (!user) {
      toast.error('Please login to continue');
      return;
    }

    setLoading(true);
    setPaymentError('');
    try {
      if (selectedPaymentMethod !== 'razorpay') {
        throw new Error('This payment method is not available yet. Please choose Razorpay.');
      }
      await razorpayCheckout.start(plan, (payment) => {
        setActiveStep(2);
        toast.success('Payment verified successfully.');
        onSuccess?.(payment);
      }, (reason) => {
        setPaymentError(reason);
        onError?.(reason);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      console.error('Payment error:', error);
      setPaymentError(errorMessage);
      toast.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (activeStep === 2) {
      setActiveStep(0);
      onClose();
    } else {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px',
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShoppingCart sx={{ color: '#667eea' }} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Complete Payment
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            '&:hover': { background: '#E5E7EB' },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: '24px' }}>
        {/* Stepper */}
        <Stepper
          activeStep={activeStep}
          sx={{
            mb: 3,
            '& .MuiStepLabel-label': {
              fontSize: '0.875rem',
              fontWeight: 500,
            },
          }}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 1: Select Payment Method */}
        {activeStep === 0 && (
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                mb: 2,
                color: '#1F2937',
              }}
            >
              Choose Your Payment Method
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[
                {
                  id: 'razorpay',
                  name: 'Razorpay',
                  icon: '🏦',
                  desc: 'Fast & Secure',
                },
                {
                  id: 'phonepe',
                  name: 'PhonePe',
                  icon: '📱',
                  desc: 'UPI Payment',
                },
                {
                  id: 'credit_card',
                  name: 'Card',
                  icon: '💳',
                  desc: 'Credit/Debit',
                },
                {
                  id: 'upi',
                  name: 'UPI',
                  icon: '📲',
                  desc: 'Direct Transfer',
                },
              ].map((method: any) => (
                <Grid item xs={6} key={method.id}>
                  <MotionCard
                    whileHover={{ scale: 1.05 }}
                    component={motion.div}
                    onClick={() =>
                      setSelectedPaymentMethod(
                        method.id as 'razorpay' | 'phonepe' | 'credit_card' | 'upi'
                      )
                    }
                    sx={{
                      cursor: 'pointer',
                      border:
                        selectedPaymentMethod === method.id
                          ? '2px solid #667eea'
                          : '2px solid #E5E7EB',
                      background:
                        selectedPaymentMethod === method.id
                          ? '#F0F4FF'
                          : '#FFFFFF',
                      transition: 'all 0.3s ease',
                      p: 2,
                    }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography sx={{ fontSize: '32px', mb: 1 }}>
                        {method.icon}
                      </Typography>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 700,
                          color:
                            selectedPaymentMethod === method.id
                              ? '#667eea'
                              : '#1F2937',
                        }}
                      >
                        {method.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: '#6B7280' }}
                      >
                        {method.desc}
                      </Typography>
                    </Box>
                  </MotionCard>
                </Grid>
              ))}
            </Grid>

            {/* Card Details (if Credit Card selected) */}
            {selectedPaymentMethod === 'credit_card' && (
              <MotionCard
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#FFFFFF',
                  mb: 3,
                  p: 2.5,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    opacity: 0.9,
                    mb: 2,
                  }}
                >
                  Card Number
                </Typography>
                <TextField
                  fullWidth
                  placeholder="1234 5678 9012 3456"
                  value={cardData.cardNumber}
                  onChange={(e) =>
                    setCardData({ ...cardData, cardNumber: e.target.value })
                  }
                  size="small"
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      color: '#FFFFFF',
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.5)',
                      },
                    },
                    '& .MuiOutlinedInput-input::placeholder': {
                      color: 'rgba(255,255,255,0.5)',
                      opacity: 1,
                    },
                  }}
                />

                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        opacity: 0.9,
                        mb: 1,
                      }}
                    >
                      Expiry Date
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="MM/YY"
                      value={cardData.expiryDate}
                      onChange={(e) =>
                        setCardData({ ...cardData, expiryDate: e.target.value })
                      }
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#FFFFFF',
                          '& fieldset': {
                            borderColor: 'rgba(255,255,255,0.3)',
                          },
                        },
                        '& .MuiOutlinedInput-input::placeholder': {
                          color: 'rgba(255,255,255,0.5)',
                          opacity: 1,
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        opacity: 0.9,
                        mb: 1,
                      }}
                    >
                      CVV
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="123"
                      type={showCardDetails ? 'text' : 'password'}
                      value={cardData.cvv}
                      onChange={(e) =>
                        setCardData({ ...cardData, cvv: e.target.value })
                      }
                      size="small"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowCardDetails(!showCardDetails)}
                              edge="end"
                              size="small"
                              sx={{ color: '#FFFFFF' }}
                            >
                              {showCardDetails ? (
                                <VisibilityOff fontSize="small" />
                              ) : (
                                <Visibility fontSize="small" />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#FFFFFF',
                          '& fieldset': {
                            borderColor: 'rgba(255,255,255,0.3)',
                          },
                        },
                        '& .MuiOutlinedInput-input::placeholder': {
                          color: 'rgba(255,255,255,0.5)',
                          opacity: 1,
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </MotionCard>
            )}

            {/* Price Summary */}
            <Paper
              sx={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                p: 2,
                borderRadius: '8px',
              }}
            >
              <Box sx={{ mb: 1.5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#6B7280' }}>
                    Base Price
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, color: '#1F2937' }}
                  >
                    ₹{plan.price.toLocaleString('en-IN')}
                  </Typography>
                </Box>
                {isCandidatePlan && (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#6B7280' }}>
                      GST ({SUBSCRIPTION_GST_PERCENT}%)
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 600, color: '#DC2626' }}
                    >
                      +₹{gstAmount.toLocaleString('en-IN')}
                    </Typography>
                  </Box>
                )}
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, color: '#1F2937' }}
                >
                  Total Amount
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  ₹{totalAmount.toLocaleString('en-IN')}
                </Typography>
              </Box>
            </Paper>
          </Box>
        )}

        {/* Step 2: Review & Confirm */}
        {activeStep === 1 && (
          <Box>
            {paymentError && (
              <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Payment could not be completed</Typography>
                <Typography variant="caption">{paymentError}</Typography>
              </Paper>
            )}
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                mb: 2,
                color: '#1F2937',
              }}
            >
              Review Your Order
            </Typography>

            <Card
              sx={{
                mb: 3,
                background: '#F0F4FF',
                border: '1px solid #DBEAFE',
              }}
            >
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#6B7280',
                      fontWeight: 500,
                      mb: 0.5,
                    }}
                  >
                    Plan
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 700,
                      color: '#1F2937',
                    }}
                  >
                    {plan.name} - {plan.durationLabel}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#6B7280',
                      fontWeight: 500,
                      mb: 0.5,
                    }}
                  >
                    Payment Method
                  </Typography>
                  <Chip
                    label={
                      selectedPaymentMethod
                        .charAt(0)
                        .toUpperCase() + selectedPaymentMethod.slice(1)
                    }
                    sx={{
                      background: '#DBEAFE',
                      color: '#1E40AF',
                      fontWeight: 600,
                    }}
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 700,
                      color: '#1F2937',
                    }}
                  >
                    Total Amount
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 800,
                      color: '#667eea',
                    }}
                  >
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            <Paper
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 2,
                background: '#FEF3C7',
                border: '1px solid #FBBF24',
                borderRadius: '8px',
                mb: 3,
              }}
            >
              <LockIcon
                sx={{
                  color: '#92400E',
                  fontSize: 20,
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
                Your payment is 100% secure and encrypted
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Step 3: Payment Complete */}
        {activeStep === 2 && (
          <MotionCard
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            sx={{
              background: 'linear-gradient(135deg, #ECFDF5 0%, #DBEAFE 100%)',
              border: '1px solid #A7F3D0',
              textAlign: 'center',
            }}
          >
            <CardContent>
              <MotionCard
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
                component={motion.div}
                sx={{
                  background: '#10B981',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: 80,
                  height: 80,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  mb: 3,
                  boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)',
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 48 }} />
              </MotionCard>

              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  color: '#065F46',
                  mb: 1,
                }}
              >
                Payment Successful! 🎉
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: '#6B7280',
                  mb: 2,
                }}
              >
                Your premium access is now active
              </Typography>

              <Divider sx={{ my: 2.5 }} />

              <Box sx={{ textAlign: 'left', mb: 2 }}>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    color: '#6B7280',
                    fontWeight: 500,
                    mb: 1,
                  }}
                >
                  What's included:
                </Typography>
                {['Unlimited job access', 'Priority support', 'Resume review'].map(
                  (item, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <CheckCircleIcon
                        sx={{
                          fontSize: 16,
                          color: '#10B981',
                        }}
                      />
                      <Typography variant="caption" sx={{ color: '#047857' }}>
                        {item}
                      </Typography>
                    </Box>
                  )
                )}
              </Box>
            </CardContent>
          </MotionCard>
        )}

        {/* Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            justifyContent: 'flex-end',
            mt: 4,
          }}
        >
          {activeStep < 2 && (
            <Button
              onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
              variant="outlined"
              startIcon={<ArrowBack />}
              disabled={activeStep === 0}
            >
              Back
            </Button>
          )}

          {activeStep === 0 && (
            <Button
              onClick={() => setActiveStep(1)}
              variant="contained"
              endIcon={<ArrowForward />}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              Review
            </Button>
          )}

          {activeStep === 1 && (
            <Button
              onClick={handlePayment}
              disabled={loading}
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} sx={{ color: '#FFFFFF' }} />
                  Processing...
                </Box>
              ) : (
                'Pay Now'
              )}
            </Button>
          )}

          {activeStep === 2 && (
            <Button
              onClick={handleClose}
              variant="contained"
              sx={{
                background: '#10B981',
              }}
            >
              Close
            </Button>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
