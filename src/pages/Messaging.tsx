import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  useMediaQuery,
  useTheme,
  Box,
  Typography,
} from '@mui/material';
import {
  ChatBubbleOutline as ChatBubbleOutlineIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@store/index';
import { USER_ROLES } from '@constants/index';
import MessageInbox from '@components/messaging/MessageInbox';
import MessageDetail from '@components/messaging/MessageDetail';
import { Conversation } from '@services/messaging';

export const MessagingPageContent: React.FC<{
  userId: string;
  userRole: 'recruiter' | 'candidate';
  embedded?: boolean;
  onClose?: () => void;
}> = ({ userId, userRole, embedded = false, onClose }) => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      className="messaging-page-dialog"
      open
      onClose={() => { if (onClose) onClose(); else if (!embedded) navigate(-1); }}
      disablePortal={embedded}
      hideBackdrop={embedded}
      sx={embedded ? { position: 'relative', inset: 'auto', height: '100%' } : undefined}
      fullWidth
      maxWidth="lg"
      fullScreen={!embedded && isSmall}
      PaperProps={{
        sx: {
          borderRadius: isSmall ? 0 : 3,
          overflow: 'hidden',
          width: isSmall ? '100%' : 'min(1024px, calc(100vw - 40px))',
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: embedded ? 'none' : 'calc(100vh - 40px)',
          height: embedded ? 660 : (isSmall ? '100%' : 720),
          boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          background: '#f8fafc',
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          px: { xs: 2, sm: 2.5 },
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(239,246,255,0.9))',
          borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(37, 99, 235, 0.12)',
              color: '#1d4ed8',
            }}
          >
            <ChatBubbleOutlineIcon sx={{ fontSize: 19 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, color: '#0f172a' }}>
              Messages
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
              Stay connected with recruiters and employers
            </Typography>
          </Box>
        </Box>

        {!embedded && <IconButton
          aria-label="close"
          onClick={() => { if (onClose) onClose(); else if (!embedded) navigate(-1); }}
          size="medium"
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(148, 163, 184, 0.08)',
            color: '#334155',
            '&:hover': { background: 'rgba(37, 99, 235, 0.08)', color: '#0f172a' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>}
      </DialogTitle>

      <DialogContent
        sx={{
          p: 2,
          background: 'linear-gradient(180deg, rgba(248,250,252,0.98), rgba(241,245,249,0.92))',
          height: '100%',
        }}
      >
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <Box className="messaging-dialog-layout" sx={{ display: 'flex', gap: 2, height: '100%', minHeight: 0 }}>
            <Box
              sx={{
                width: 360,
                flexShrink: 0,
                bgcolor: 'rgba(255,255,255,0.72)',
                border: '1px solid rgba(148, 163, 184, 0.18)',
                borderRadius: 3,
                overflow: 'hidden',
                backdropFilter: 'blur(6px)',
              }}
            >
              <MessageInbox
                userId={userId}
                userRole={userRole}
                onSelectConversation={setSelectedConversation}
                selectedConversationId={selectedConversation?.id}
              />
            </Box>

            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: selectedConversation ? 'block' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(255,255,255,0.5)',
                borderRadius: 3,
                border: '1px solid rgba(148, 163, 184, 0.16)',
                overflow: 'hidden',
              }}
            >
              {selectedConversation && !isSmall ? (
                <MessageDetail
                  conversation={selectedConversation}
                  userId={userId}
                  userRole={userRole}
                  onBack={() => setSelectedConversation(null)}
                />
              ) : (
                <Box sx={{ textAlign: 'center', width: '100%', px: 3, py: 6, color: 'text.secondary' }}>
                  <Box
                    sx={{
                      width: 90,
                      height: 90,
                      mx: 'auto',
                      mb: 2,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(124,58,237,0.08))',
                      border: '1px solid rgba(59,130,246,0.15)',
                      color: '#2563eb',
                    }}
                  >
                    <ChatBubbleOutlineIcon sx={{ fontSize: 42 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                    Start a conversation
                  </Typography>
                  <Typography variant="body2" sx={{ maxWidth: 360, mx: 'auto', color: 'text.secondary', lineHeight: 1.7 }}>
                    Select a conversation from your inbox to view messages and continue chatting.
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </motion.div>
      </DialogContent>

      {isSmall && selectedConversation && (
        <Dialog
          className="mobile-message-detail-dialog"
          open
          onClose={() => setSelectedConversation(null)}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              width: 'calc(100vw - 24px)',
              maxWidth: '390px',
              height: 'min(78dvh, 620px)',
              maxHeight: 'calc(100dvh - 32px)',
              borderRadius: 3,
              overflow: 'hidden',
              background: '#f8fafc',
            },
          }}
        >
          <MessageDetail
            conversation={selectedConversation}
            userId={userId}
            userRole={userRole}
            onBack={() => setSelectedConversation(null)}
          />
        </Dialog>
      )}
    </Dialog>
  );
};

export const MessagingPage: React.FC = () => {
  const { user } = useAuthStore();

  if (!user) {
    return <div>Redirecting to login...</div>;
  }

  const userRole = user.role === USER_ROLES.RECRUITER ? 'recruiter' : 'candidate';

  return <MessagingPageContent userId={user.id} userRole={userRole} />;
};

export default MessagingPage;
