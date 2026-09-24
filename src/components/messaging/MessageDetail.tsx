import React, { useState, useEffect, useRef } from 'react';
import Swal from '@utils/sweetAlert';
import { motion } from 'framer-motion';
import {
  Avatar,
  Box,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { messagingService, Message, Conversation } from '@services/messaging';
import ComposeMessage from './ComposeMessage';
import { DeleteActionButton } from '@components/common/DeleteActionButton';

interface MessageDetailProps {
  conversation: Conversation;
  userId: string;
  userRole: 'recruiter' | 'candidate';
  onBack: () => void;
}

const formatMessageTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const MessageDetail: React.FC<MessageDetailProps> = ({
  conversation,
  userId,
  userRole,
  onBack,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    const subscription = messagingService.subscribeToMessages(conversation.id, (newMsg, event) => {
      setMessages((prev) => {
        if (event === 'DELETE') {
          return prev.filter((msg) => msg.id !== newMsg.id);
        }

        if (event === 'UPDATE') {
          return prev.map((msg) => (msg.id === newMsg.id ? newMsg : msg));
        }

        if (prev.some((msg) => msg.id === newMsg.id)) {
          return prev.map((msg) => (msg.id === newMsg.id ? newMsg : msg));
        }

        // Only auto-scroll for new messages (INSERT event)
        if (event === 'INSERT') {
          setShouldAutoScroll(true);
        }

        return [...prev, newMsg];
      });

      if (event === 'DELETE') return;
      if (newMsg.receiverId === userId) {
        messagingService.markAsRead(newMsg.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [conversation.id]);

  useEffect(() => {
    // Only auto-scroll if we should and not on initial load (initial load handled by loadMessages)
    if (shouldAutoScroll) {
      scrollToBottom();
      setShouldAutoScroll(false);
    }
  }, [shouldAutoScroll, messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const msgs = await messagingService.getMessages(conversation.id);
      setMessages(msgs);

      msgs.forEach((msg) => {
        if (msg.receiverId === userId && !msg.isRead) {
          messagingService.markAsRead(msg.id);
        }
      });

      // Auto-scroll to bottom after initial load
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string, attachments?: string[]) => {
    try {
      if (conversation.isBlocked) {
        Swal.fire({
          title: 'Conversation blocked',
          text: 'This conversation is blocked and cannot receive new messages.',
          icon: 'info',
          confirmButtonText: 'Okay',
        });
        return;
      }

      await messagingService.sendMessage(userId, conversation.participantId, content, attachments, userRole);
      loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      Swal.fire({
        title: 'Failed to send message',
        text: error instanceof Error ? error.message : 'Please try again.',
        icon: 'error',
      });
    }
  };

  const handleEditClick = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingId || !editContent.trim()) {
      setEditDialogOpen(false);
      return;
    }

    try {
      const updatedMessage = await messagingService.editMessage(editingId, editContent.trim());
      setMessages((prev) =>
        prev.map((msg) => (msg.id === editingId ? updatedMessage : msg))
      );
      setEditDialogOpen(false);
      setEditingId(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to edit message:', error);
      Swal.fire({
        title: 'Failed to edit message',
        text: 'Unable to update the message. Please try again.',
        icon: 'error',
      });
    }
  };

  const handleEditCancel = () => {
    setEditDialogOpen(false);
    setEditingId(null);
    setEditContent('');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#FFFFFF' }}>
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: '1px solid #DCE6F0',
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          background: 'linear-gradient(115deg, #071D35 0%, #0B3558 65%, #126B8F 100%)',
        }}
      >
        <IconButton
          onClick={onBack}
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            color: '#fff',
            '&:hover': { background: 'rgba(255,255,255,0.2)' },
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>

        <Avatar
          src={conversation.participantAvatar || undefined}
          alt={conversation.participantName}
          sx={{
            width: 42,
            height: 42,
            bgcolor: conversation.participantAvatar ? 'transparent' : '#D6A73A',
            border: '2px solid rgba(255,255,255,0.65)',
            fontWeight: 700,
          }}
        >
          {!conversation.participantAvatar && (conversation.participantName || 'U').slice(0, 2).toUpperCase()}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>
            {conversation.participantName}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)' }}>
            {conversation.participantRole}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.25, color: '#B8F0D0', fontSize: 10, fontWeight: 700 }}><CircleIcon sx={{ fontSize: 7 }} /> Active conversation</Box>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          px: { xs: 1.5, sm: 2.5 },
          py: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 1, sm: 1.2 },
          background: 'radial-gradient(circle at 20% 0%, rgba(214,167,58,0.08), transparent 28%), linear-gradient(180deg, #F7FAFC, #EDF3F7)',
        }}
      >
        {loading && <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>Loading messages...</Typography>}

        {conversation.isBlocked && (
          <Box sx={{ mb: 1, p: 1.25, borderRadius: 2, border: '1px solid rgba(148, 163, 184, 0.2)', background: 'rgba(148,163,184,0.06)', color: '#475569' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
              Messaging is blocked for this conversation.
            </Typography>
          </Box>
        )}

        {messages.map((msg, idx) => {
          const isOutgoing = msg.senderId === userId;
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const senderChanged = !prevMsg || prevMsg.senderId !== msg.senderId;
          const spacingGap = senderChanged ? 1.2 : 0.6;
          const isHovered = hoveredMessageId === msg.id;

          return (
            <Box
              key={msg.id}
              onMouseEnter={() => setHoveredMessageId(msg.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
              sx={{
                display: 'flex',
                justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
                mb: spacingGap,
                mt: idx === 0 ? 0 : 0,
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 0.75,
                    width: 'fit-content',
                    maxWidth: { xs: '90%', sm: '75%', md: '68%' },
                  }}
                >
                  {isOutgoing && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        alignSelf: 'stretch',
                        gap: 0.5,
                        minWidth: 'fit-content',
                        px: 0.5,
                        opacity: isHovered ? 1 : 0,
                        transition: 'opacity 0.2s ease',
                        cursor: 'pointer',
                        pointerEvents: isHovered ? 'auto' : 'none',
                      }}
                    >
                      <DeleteActionButton
                        onClick={async () => {
                          const result = await Swal.fire({
                            title: 'Delete this message?',
                            text: 'This message will be removed permanently.',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Delete',
                            cancelButtonText: 'Cancel',
                            confirmButtonColor: '#d33',
                          });
                          if (!result.isConfirmed) return;
                          try {
                            await messagingService.deleteMessage(msg.id);
                            setMessages((prev) => prev.filter((m) => m.id !== msg.id));
                          } catch (err) {
                            console.error('Failed to delete message:', err);
                            Swal.fire({
                              title: 'Failed to delete',
                              text: 'Unable to remove the message. Please try again.',
                              icon: 'error',
                            });
                          }
                        }}
                        ariaLabel="delete message"
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleEditClick(msg)}
                        sx={{
                          width: 32,
                          height: 32,
                          color: '#2563eb',
                          '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.08)' },
                        }}
                        title="Edit message"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}

                  <Box
                    sx={{
                      flex: 1,
                      p: '10px 14px',
                      borderRadius: isOutgoing ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isOutgoing
                        ? 'linear-gradient(135deg, #2563eb, #4f46e5)'
                        : '#f1f5f9',
                      color: isOutgoing ? '#fff' : '#1f2937',
                      boxShadow: isOutgoing
                        ? '0 4px 12px rgba(37, 99, 235, 0.12)'
                        : '0 2px 8px rgba(15, 23, 42, 0.04)',
                      border: isOutgoing ? 'none' : '1px solid rgba(148, 163, 184, 0.15)',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {msg.content && (
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.95rem',
                          lineHeight: 1.5,
                          mb: msg.attachments?.length ? 1 : 0,
                        }}
                      >
                        {msg.content}
                      </Typography>
                    )}

                    {msg.attachments && msg.attachments.length > 0 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 0.75 }}>
                        {msg.attachments.map((attach, aidx) => {
                          const fileName = attach.split('/').pop() || `Attachment ${aidx + 1}`;
                          const fileExt = fileName.split('.').pop()?.toLowerCase() || 'file';
                          let fileType = 'File';
                          let icon = '📄';

                          if (['pdf'].includes(fileExt)) {
                            fileType = 'PDF';
                            icon = '📄';
                          } else if (['doc', 'docx'].includes(fileExt)) {
                            fileType = 'Document';
                            icon = '📝';
                          } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
                            fileType = 'Image';
                            icon = '🖼️';
                          } else if (['zip', 'rar', '7z'].includes(fileExt)) {
                            fileType = 'Archive';
                            icon = '📦';
                          }

                          return (
                            <Box
                              key={`${msg.id}-attachment-${aidx}`}
                              component="a"
                              href={attach}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                p: '8px 12px',
                                borderRadius: '10px',
                                background: isOutgoing
                                  ? 'rgba(255, 255, 255, 0.15)'
                                  : 'rgba(37, 99, 235, 0.08)',
                                border: isOutgoing
                                  ? '1px solid rgba(255, 255, 255, 0.25)'
                                  : '1px solid rgba(37, 99, 235, 0.2)',
                                color: isOutgoing ? '#fff' : '#2563eb',
                                textDecoration: 'none',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                                '&:hover': {
                                  background: isOutgoing
                                    ? 'rgba(255, 255, 255, 0.25)'
                                    : 'rgba(37, 99, 235, 0.15)',
                                  transform: 'translateY(-1px)',
                                },
                              }}
                            >
                              <Box sx={{ fontSize: '1.1rem', flexShrink: 0 }}>{icon}</Box>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    display: 'block',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  {fileName}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    display: 'block',
                                    opacity: 0.8,
                                    fontSize: '0.7rem',
                                  }}
                                >
                                  {fileType}
                                </Typography>
                              </Box>
                              <Box sx={{ fontSize: '1rem', flexShrink: 0 }}>↓</Box>
                            </Box>
                          );
                        })}
                      </Box>
                    )}

                    <Box
                      sx={{
                        mt: msg.content || msg.attachments?.length ? 0.5 : 0,
                        fontSize: '0.75rem',
                        opacity: isOutgoing ? 0.7 : 0.6,
                        textAlign: 'right',
                        fontWeight: 500,
                      }}
                    >
                      {formatMessageTime(msg.createdAt)}
                      {msg.updatedAt && msg.updatedAt !== msg.createdAt && (
                        <Typography
                          component="span"
                          sx={{
                            display: 'block',
                            fontSize: '0.65rem',
                            opacity: 0.7,
                            fontStyle: 'italic',
                            mt: 0.25,
                          }}
                        >
                          (edited)
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {!isOutgoing && (
                    <Box sx={{ width: 24, flexShrink: 0 }} />
                  )}
                </Box>
              </motion.div>
            </Box>
          );
        })}

        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ borderTop: '1px solid #DCE6F0', p: { xs: 1, sm: 1.4 }, background: '#F8FBFD' }}>
        <ComposeMessage conversationId={conversation.id} onSend={handleSendMessage} disabled={!!conversation.isBlocked} />
      </Box>

      <Dialog
        open={editDialogOpen}
        onClose={handleEditCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#0f172a', pb: 1.5 }}>
          Edit Message
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Edit your message..."
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1.5,
                '&:hover fieldset': {
                  borderColor: '#2563eb',
                },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={handleEditCancel}
            variant="outlined"
            sx={{
              color: '#475569',
              borderColor: 'rgba(148, 163, 184, 0.3)',
              '&:hover': {
                borderColor: '#2563eb',
                bgcolor: 'rgba(37, 99, 235, 0.04)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
              color: '#fff',
              fontWeight: 600,
              '&:hover': {
                opacity: 0.9,
              },
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MessageDetail;
