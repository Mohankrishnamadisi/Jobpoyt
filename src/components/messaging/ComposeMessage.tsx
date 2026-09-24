import React, { useState, useRef } from 'react';
import { Box, IconButton, TextField } from '@mui/material';
import {
  AttachFile as AttachFileIcon,
  Send as SendIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { messagingService } from '@services/messaging';

interface ComposeMessageProps {
  conversationId: string;
  onSend: (content: string, attachments?: string[]) => void;
  disabled?: boolean;
}

export const ComposeMessage: React.FC<ComposeMessageProps> = ({ conversationId, onSend, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!message.trim() && attachments.length === 0) return;

    try {
      await onSend(message, attachments);
      setMessage('');
      setAttachments([]);
    } catch (error) {
      console.error('Send failed:', error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await messagingService.uploadAttachment(file, conversationId);
        setAttachments((prev) => [...prev, url]);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      {attachments.length > 0 && (
        <Box sx={{ mb: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {attachments.map((attach, idx) => (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 1,
                px: 1.25,
                py: 0.85,
                background: 'rgba(37,99,235,0.06)',
                border: '1px solid rgba(37,99,235,0.12)',
                borderRadius: 2,
                fontSize: 13,
                color: '#0f172a',
              }}
            >
              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📎 {attach.split('/').pop()}
              </Box>
              <IconButton
                size="small"
                onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                sx={{ color: '#475569' }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <IconButton
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || disabled}
          sx={{
            width: 42,
            height: 42,
            borderRadius: 2,
            background: '#E8F1F8',
            color: '#0F6B9A',
            border: '1px solid #C9DCEB',
            '&:hover': { background: '#DCEBF5' },
          }}
        >
          <AttachFileIcon fontSize="small" />
        </IconButton>

        <TextField
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={disabled ? 'This conversation is blocked' : 'Type a message...'}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!disabled) handleSend();
            }
          }}
          multiline
          minRows={1}
          maxRows={4}
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2.5,
              background: '#fff',
              minHeight: 46,
              fontSize: 14,
              '& fieldset': {
                borderColor: '#C9D8E6',
              },
              '&:hover fieldset': {
                borderColor: '#7EA4C5',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#D6A73A',
                boxShadow: '0 0 0 3px rgba(214,167,58,0.12)',
              },
            },
          }}
        />

        <IconButton
          onClick={handleSend}
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          sx={{
            width: 46,
            height: 46,
            borderRadius: 2.5,
            background: 'linear-gradient(135deg, #0B2745, #0F6B9A)',
            color: '#fff',
            boxShadow: '0 10px 20px rgba(15,107,154,0.22)',
            '&:hover': { background: 'linear-gradient(135deg, #123B5D, #0F6B9A)' },
            '&.Mui-disabled': { background: 'rgba(148,163,184,0.25)', color: '#fff', boxShadow: 'none' },
          }}
        >
          <SendIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default ComposeMessage;
