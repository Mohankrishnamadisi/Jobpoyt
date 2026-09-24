import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Button,
  Chip,
  Typography,
} from '@mui/material';
import {
  DeleteOutline as DeleteOutlineIcon,
  ForumOutlined as ForumOutlinedIcon,
} from '@mui/icons-material';
import Swal from '@utils/sweetAlert';
import { messagingService, Conversation } from '@services/messaging';
import { userService } from '@services/api';
import { DeleteActionButton } from '@components/common/DeleteActionButton';

interface MessageInboxProps {
  userId: string;
  userRole: 'recruiter' | 'candidate';
  onSelectConversation: (conv: Conversation) => void;
  selectedConversationId?: string;
}

const formatConversationTimestamp = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getInitials = (name?: string) => {
  const safeName = (name || 'Unknown').trim();
  if (!safeName) return 'U';

  const parts = safeName.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return 'U';
  return parts.map((part) => part[0]?.toUpperCase() || '').join('');
};

export const MessageInbox: React.FC<MessageInboxProps> = ({
  userId,
  userRole,
  onSelectConversation,
  selectedConversationId,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const convs = await messagingService.getConversations(userId);
      const normalized: Conversation[] = (convs || []).map((c: any) => ({
        id: c.id,
        participantId: c.participantId,
        participantName: c.participantName || 'Unknown',
        participantAvatar: c.participantAvatar,
        participantRole: c.participantRole,
        lastMessage: c.lastMessage,
        lastMessageTime: c.lastMessageTime,
        unreadCount: c.unreadCount || 0,
        isInitiatedByRecruiter: c.isInitiatedByRecruiter || c.initiated_by_recruiter || false,
        isBlocked: !!c.isBlocked,
      }));

      await Promise.all(
        normalized.map(async (c) => {
          const needsFallbackName = !c.participantName || c.participantName === 'Candidate' || c.participantName === 'Recruiter' || c.participantName === 'Unknown';
          if (needsFallbackName && c.participantId) {
            try {
              const profile = await userService.getProfile(c.participantId);
              const fallbackName = profile && (profile.name || profile.full_name);
              if (fallbackName) {
                c.participantName = fallbackName;
              }
              c.participantAvatar = c.participantAvatar || profile?.avatar_url || profile?.profile_image_url || null;
            } catch (e) {
              // ignore and keep existing fallback label
            }
          }
        })
      );

      setConversations(normalized as Conversation[]);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        Loading conversations...
      </Box>
    );
  }

  if (conversations.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="subtitle2" sx={{ color: '#0f172a', fontWeight: 700, mb: 1 }}>
          No conversations yet
        </Typography>
        {userRole === 'recruiter' && (
          <Typography variant="body2">Start messaging candidates to build relationships</Typography>
        )}
        {userRole === 'candidate' && (
          <Typography variant="body2">Wait for recruiters to message you</Typography>
        )}
      </Box>
    );
  }

  const handleDeleteConversation = async (conversationId: string) => {
    const result = await Swal.fire({
      title: 'Delete this conversation?',
      text: 'This will remove the entire chat history.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
    });

    if (!result.isConfirmed) return;

    try {
      await messagingService.deleteConversation(conversationId);
      setConversations((prev) => prev.filter((conv) => conv.id !== conversationId));
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      Swal.fire({
        title: 'Failed to delete',
        text: 'Unable to delete the conversation. Please try again.',
        icon: 'error',
      });
    }
  };

  const handleDeleteAll = async () => {
    const result = await Swal.fire({
      title: 'Delete all conversations?',
      text: 'This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete all',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
    });

    if (!result.isConfirmed) return;

    try {
      await messagingService.deleteAllConversations(userId);
      setConversations([]);
      Swal.fire({
        title: 'All conversations deleted',
        icon: 'success',
      });
    } catch (err) {
      console.error('Failed to delete all conversations:', err);
      Swal.fire({
        title: 'Failed to delete',
        text: 'Unable to delete all conversations. Please try again.',
        icon: 'error',
      });
    }
  };

  return (
    <Box className="message-inbox" sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid #DCE6F0',
          background: 'linear-gradient(180deg, #FBFDFF 0%, #F1F7FB 100%)',
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <ForumOutlinedIcon sx={{ color: '#0F6B9A', fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0B2745' }}>
              Inbox
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.2 }}>
            {conversations.length} conversation{conversations.length === 1 ? '' : 's'}
          </Typography>
        </Box>

        <Button
          size="small"
          variant="text"
          onClick={handleDeleteAll}
          startIcon={<DeleteOutlineIcon fontSize="small" />}
          sx={{
            minWidth: 'auto',
            color: '#B91C1C',
            borderRadius: 2,
            px: 1,
            py: 0.5,
            fontWeight: 700,
            textTransform: 'none',
            '&:hover': { background: 'rgba(220,38,38,0.06)' },
          }}
        >
          Clear all
        </Button>
      </Box>

      <Box
        sx={{
          p: 1.1,
          bgcolor: '#F7FAFC',
          height: 'calc(100% - 73px)',
          minHeight: 0,
          overflowY: 'scroll',
          overscrollBehavior: 'contain',
          scrollbarWidth: 'thin',
          scrollbarColor: '#9CB4C7 transparent',
          '&::-webkit-scrollbar': { width: 8 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: '#9CB4C7', borderRadius: 999, border: '2px solid #F7FAFC' },
          '&::-webkit-scrollbar-thumb:hover': { background: '#6F91AA' },
        }}
      >
        {conversations.map((conv, idx) => {
          const isSelected = selectedConversationId === conv.id;

          return (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => onSelectConversation(conv)}
              style={{
                position: 'relative',
                cursor: 'pointer',
                marginBottom: 8,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  gap: 1.25,
                  alignItems: 'center',
                  p: 1.25,
                  borderRadius: 3,
                  border: isSelected ? '1px solid #B8D7EA' : '1px solid #DCE6F0',
                  borderLeft: isSelected ? '4px solid #D6A73A' : '4px solid transparent',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(59,130,246,0.10), rgba(124,58,237,0.06))'
                    : '#FFFFFF',
                  boxShadow: isSelected ? '0 10px 18px rgba(15,107,154,0.1)' : '0 3px 10px rgba(15,35,63,0.035)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: isSelected ? '#F0F8FC' : '#F8FBFD',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: conv.participantAvatar
                      ? `url(${conv.participantAvatar}) center/cover no-repeat`
                      : 'linear-gradient(135deg, #2563eb, #7c3aed)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 800,
                    border: '1px solid rgba(255,255,255,0.7)',
                  }}
                >
                  {!conv.participantAvatar && getInitials(conv.participantName)}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 800,
                        color: '#0f172a',
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {conv.participantName || 'Unknown'}
                    </Typography>

                    {conv.unreadCount > 0 && (
                      <Chip
                        label={conv.unreadCount}
                        size="small"
                        sx={{
                          height: 20,
                          minWidth: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                          color: '#fff',
                          '& .MuiChip-label': { px: 0.75 },
                        }}
                      />
                    )}
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.4,
                      mb: 0.5,
                    }}
                  >
                    {conv.lastMessage || 'No messages yet'}
                  </Typography>

                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {formatConversationTimestamp(conv.lastMessageTime)}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    opacity: 0.8,
                    transition: 'opacity 0.2s ease',
                    '&:hover': { opacity: 1 },
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <DeleteActionButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv.id);
                    }}
                    ariaLabel="delete conversation"
                  />
                </Box>
              </Box>
            </motion.div>
          );
        })}
      </Box>
    </Box>
  );
};

export default MessageInbox;
