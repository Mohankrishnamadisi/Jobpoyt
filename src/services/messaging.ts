import { supabase } from './supabase';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  attachments?: string[];
  createdAt: string;
  updatedAt?: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  participantRole: 'recruiter' | 'candidate';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isInitiatedByRecruiter: boolean;
  isBlocked?: boolean;
}

const isGenericDisplayName = (value: unknown): boolean => {
  const text = String(value || '').trim().toLowerCase();
  return !text || text === 'candidate' || text === 'unknown' || text === 'recruiter';
};

const resolveCanonicalUserId = async (rawId: string): Promise<string> => {
  const trimmed = String(rawId || '').trim();
  if (!trimmed) return '';

  try {
    const { data: byId } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('id', trimmed)
      .maybeSingle();

    if (byId) {
      const resolved = String((byId as any).user_id || (byId as any).id || '').trim();
      if (resolved) return resolved;
    }

    const { data: byUserId } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('user_id', trimmed)
      .maybeSingle();

    if (byUserId) {
      const resolved = String((byUserId as any).user_id || (byUserId as any).id || '').trim();
      if (resolved) return resolved;
    }
  } catch {
    // If profiles lookup fails, continue with raw id.
  }

  return trimmed;
};

export const messagingService = {
  async resolveUserId(rawId: string) {
    return resolveCanonicalUserId(rawId);
  },

  // Send message (only recruiter can initiate, candidate can only reply)
  async sendMessage(
    senderId: string,
    receiverId: string,
    content: string,
    attachments?: string[],
    userRole?: 'recruiter' | 'candidate'
  ) {
    try {
      const canonicalSenderId = String(senderId || '').trim();
      const canonicalReceiverId = await resolveCanonicalUserId(receiverId);

      let conversation = await this.getConversation(canonicalSenderId, canonicalReceiverId);

      if (!conversation) {
        if (userRole !== 'recruiter') {
          throw new Error('Only recruiters can initiate conversations');
        }

        const recruiterId = canonicalSenderId;
        const candidateId = canonicalReceiverId;
        const { data, error } = await supabase
          .from('conversations')
          .insert([
            {
              recruiter_id: recruiterId,
              candidate_id: candidateId,
              initiated_by_recruiter: true,
            },
          ])
          .select('id')
          .single();

        if (error) {
          const sqlError = error as any;
          if (sqlError?.code === '23505' || sqlError?.details?.includes('duplicate key value')) {
            console.warn('Conversation already exists after insert race, refetching existing conversation');
            conversation = await this.getConversation(canonicalSenderId, canonicalReceiverId);
          } else {
            throw error;
          }
        } else {
          conversation = data;
        }
      } else {
      }

      if (!conversation?.id) {
        throw new Error('Unable to resolve conversation id');
      }

      const isBlocked = await this.getConversationBlockStatus(conversation.id);
      if (isBlocked) {
        throw new Error('This conversation is blocked and cannot receive new messages');
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversation.id,
            sender_id: canonicalSenderId,
            receiver_id: canonicalReceiverId,
            content,
            attachments: attachments || [],
            is_read: false,
          },
        ])
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  },

  async getConversationBlockStatus(conversationId: string) {
    if (!conversationId) return false;
    try {
      const { data, error } = await supabase
        .from('conversation_blocks')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('active', true)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Failed to load conversation block status', error);
        return false;
      }

      return !!data?.id;
    } catch (error) {
      console.warn('Failed to check conversation block status', error);
      return false;
    }
  },

  async blockConversation(recruiterId: string, conversationId: string, reason?: string) {
    const currentRecruiterId = String(recruiterId || '').trim();
    if (!currentRecruiterId || !conversationId) {
      throw new Error('Recruiter and conversation are required to block a candidate');
    }

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, recruiter_id')
      .eq('id', conversationId)
      .eq('recruiter_id', currentRecruiterId)
      .maybeSingle();

    if (conversationError) throw conversationError;
    if (!conversation?.id) {
      throw new Error('You can only block candidates from conversations you manage');
    }

    const { data, error } = await supabase
      .from('conversation_blocks')
      .upsert(
        {
          conversation_id: conversationId,
          blocked_by: currentRecruiterId,
          active: true,
          reason: reason || 'Recruiter blocked candidate from messaging',
          blocked_at: new Date().toISOString(),
        },
        { onConflict: 'conversation_id' }
      )
      .select('id')
      .single();

    if (error) throw error;
    return data;
  },

  async unblockConversation(recruiterId: string, conversationId: string) {
    const currentRecruiterId = String(recruiterId || '').trim();
    if (!currentRecruiterId || !conversationId) {
      throw new Error('Recruiter and conversation are required to unblock a candidate');
    }

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, recruiter_id')
      .eq('id', conversationId)
      .eq('recruiter_id', currentRecruiterId)
      .maybeSingle();

    if (conversationError) throw conversationError;
    if (!conversation?.id) {
      throw new Error('You can only unblock candidates from conversations you manage');
    }

    const { error } = await supabase
      .from('conversation_blocks')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('blocked_by', currentRecruiterId);

    if (error) throw error;
  },

  // Get conversation between two users
  async getConversation(userId1: string, userId2: string) {
    try {
      const id1 = await resolveCanonicalUserId(userId1);
      const id2 = await resolveCanonicalUserId(userId2);
      const { data, error } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(recruiter_id.eq.${id1},candidate_id.eq.${id2}),and(recruiter_id.eq.${id2},candidate_id.eq.${id1})`
        )
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Get conversation error:', error);
      return null;
    }
  },

  async ensureConversation(recruiterId: string, candidateId: string) {
    const canonicalRecruiterId = String(recruiterId || '').trim();
    const canonicalCandidateId = await resolveCanonicalUserId(candidateId);
    if (!canonicalRecruiterId || !canonicalCandidateId) return null;

    const existing = await this.getConversation(canonicalRecruiterId, canonicalCandidateId);
    if (existing?.id) return existing;

    const { data, error } = await supabase
      .from('conversations')
      .insert([
        {
          recruiter_id: canonicalRecruiterId,
          candidate_id: canonicalCandidateId,
          initiated_by_recruiter: true,
        },
      ])
      .select('id')
      .single();

    if (error) {
      const sqlError = error as any;
      if (sqlError?.code === '23505' || sqlError?.details?.includes('duplicate key value')) {
        return this.getConversation(canonicalRecruiterId, canonicalCandidateId);
      }
      throw error;
    }

    return data;
  },

  // Get all conversations for user
  async getConversations(userId: string) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(
          `
          id,
          recruiter_id,
          candidate_id,
          initiated_by_recruiter,
          created_at,
          messages(id, content, created_at, is_read, sender_id)
        `
        )
        .or(`recruiter_id.eq.${userId},candidate_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to get participant info
      const conversations = await Promise.all(
        data.map(async (conv: any) => {
          const isRecruiter = conv.recruiter_id === userId;
          const participantId = isRecruiter ? conv.candidate_id : conv.recruiter_id;
          const participantRole = isRecruiter ? 'candidate' : 'recruiter';

          // Get participant details - profiles table uses `id` and `name` fields
          let participantName = 'Unknown';
          let participantAvatar: string | undefined;

          if (participantRole === 'candidate') {
            const { data: participantData } = await supabase
              .from('profiles')
              .select('id, name, avatar_url, profile_image_url')
              .eq('id', participantId)
              .maybeSingle();

            participantName = (participantData?.name) || 'Candidate';
            participantAvatar = participantData?.avatar_url || participantData?.profile_image_url || undefined;

            // Fallback: fetch candidate profile through job applications linkage.
            if (isGenericDisplayName(participantName) || !participantAvatar) {
              const { data: linkedApplication } = await supabase
                .from('job_applications')
                .select('profiles(name, full_name, avatar_url)')
                .eq('user_id', participantId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              const linkedProfile = (linkedApplication as any)?.profiles;
              const linkedName = String(linkedProfile?.name || linkedProfile?.full_name || '').trim();
              const linkedAvatar = String(linkedProfile?.avatar_url || '').trim();

              if (linkedName) participantName = linkedName;
              if (!participantAvatar && linkedAvatar) participantAvatar = linkedAvatar;
            }

            if (isGenericDisplayName(participantName)) {
              participantName = `Candidate ${String(participantId || '').slice(0, 6).toUpperCase()}`;
            }
          } else {
            // Prefer matching by recruiters.id (which should equal auth.user.id). If not found, fall back to user_id.
            let recruiterData: any = null;
            try {
              const byId = await supabase
                .from('recruiters')
                .select('id, company_name, company_logo_url, user_id')
                .eq('id', participantId)
                .maybeSingle();
              recruiterData = byId.data || null;
            } catch (err) {
              // ignore and try fallback
            }

            if (!recruiterData) {
              const byUser = await supabase
                .from('recruiters')
                .select('id, company_name, company_logo_url, user_id')
                .eq('user_id', participantId)
                .maybeSingle();
              recruiterData = byUser.data || null;
            }

            participantName = (recruiterData && (recruiterData.company_name || 'Recruiter')) || 'Recruiter';
            participantAvatar = recruiterData?.company_logo_url || undefined;

            if (!participantAvatar) {
              const { data: fallbackProfile } = await supabase
                .from('profiles')
                .select('avatar_url, profile_image_url')
                .eq('id', participantId)
                .maybeSingle();
              participantAvatar = fallbackProfile?.avatar_url || fallbackProfile?.profile_image_url || undefined;
            }
          }

          if (!participantAvatar && participantRole === 'candidate') {
            const { data: fallbackProfile } = await supabase
              .from('profiles')
              .select('avatar_url, profile_image_url')
              .eq('id', participantId)
              .maybeSingle();
            participantAvatar = fallbackProfile?.avatar_url || fallbackProfile?.profile_image_url || undefined;
          }

          // Determine the latest message from the embedded messages array
          const msgs = Array.isArray(conv.messages) ? conv.messages.slice() : [];
          msgs.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

          const unreadCount = (msgs.filter(
            (m: any) => !m.is_read && m.sender_id !== userId
          ).length) || 0;

          const lastMessageTime = lastMsg?.created_at || conv.created_at || new Date().toISOString();

          const isBlocked = await this.getConversationBlockStatus(conv.id);

          return {
            id: conv.id,
            participantId,
            participantName,
            participantAvatar,
            participantRole,
            lastMessage: lastMsg?.content || '',
            lastMessageTime,
            unreadCount,
            isInitiatedByRecruiter: conv.initiated_by_recruiter,
            isBlocked,
          };
        })
      );

      return conversations;
    } catch (error) {
      console.error('Get conversations error:', error);
      throw error;
    }
  },

  // Get messages in conversation
  async getMessages(conversationId: string, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      // Normalize message fields to camelCase for UI consumption
      return (data || []).map((m: any) => ({
        id: m.id,
        senderId: m.sender_id,
        receiverId: m.receiver_id,
        content: m.content,
        attachments: m.attachments || [],
        createdAt: m.created_at,
        updatedAt: m.updated_at,
        isRead: !!m.is_read,
      }));
    } catch (error) {
      console.error('Get messages error:', error);
      throw error;
    }
  },

  // Mark message as read
  async markAsRead(messageId: string) {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  },

  // Delete message
  async deleteMessage(messageId: string) {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Delete message error:', error);
      throw error;
    }
  },

  // Edit message
  async editMessage(messageId: string, newContent: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({ content: newContent })
        .eq('id', messageId)
        .select('*')
        .single();

      if (error) throw error;
      
      // Return normalized message
      return {
        id: data.id,
        senderId: data.sender_id,
        receiverId: data.receiver_id,
        content: data.content,
        attachments: data.attachments || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        isRead: !!data.is_read,
      };
    } catch (error) {
      console.error('Edit message error:', error);
      throw error;
    }
  },

  async deleteConversation(conversationId: string) {
    try {
      const { error: deleteMessagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);
      if (deleteMessagesError) throw deleteMessagesError;

      const { error: deleteConversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      if (deleteConversationError) throw deleteConversationError;
    } catch (error) {
      console.error('Delete conversation error:', error);
      throw error;
    }
  },

  async deleteAllConversations(userId: string) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id')
        .or(`recruiter_id.eq.${userId},candidate_id.eq.${userId}`);
      if (error) throw error;

      const conversationIds = (data || []).map((conv: any) => conv.id).filter(Boolean);
      if (conversationIds.length === 0) return;

      const { error: deleteMessagesError } = await supabase
        .from('messages')
        .delete()
        .in('conversation_id', conversationIds);
      if (deleteMessagesError) throw deleteMessagesError;

      const { error: deleteConversationError } = await supabase
        .from('conversations')
        .delete()
        .in('id', conversationIds);
      if (deleteConversationError) throw deleteConversationError;
    } catch (error) {
      console.error('Delete all conversations error:', error);
      throw error;
    }
  },

  // Subscribe to real-time messages
  subscribeToMessages(
    conversationId: string,
    callback: (message: Message, event?: 'INSERT' | 'UPDATE' | 'DELETE') => void
  ) {
    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as any;
          const normalized: Message = {
            id: m.id,
            senderId: m.sender_id,
            receiverId: m.receiver_id,
            content: m.content,
            attachments: m.attachments || [],
            createdAt: m.created_at,
            updatedAt: m.updated_at,
            isRead: !!m.is_read,
          };
          callback(normalized, 'INSERT');
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as any;
          const normalized: Message = {
            id: m.id,
            senderId: m.sender_id,
            receiverId: m.receiver_id,
            content: m.content,
            attachments: m.attachments || [],
            createdAt: m.created_at,
            updatedAt: m.updated_at,
            isRead: !!m.is_read,
          };
          callback(normalized, 'UPDATE');
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.old as any;
          const normalized: Message = {
            id: m.id,
            senderId: m.sender_id,
            receiverId: m.receiver_id,
            content: m.content,
            attachments: m.attachments || [],
            createdAt: m.created_at,
            updatedAt: m.updated_at,
            isRead: !!m.is_read,
          };
          callback(normalized, 'DELETE');
        }
      )
      .subscribe();

    return subscription;
  },

  // Upload file attachment
  async uploadAttachment(file: File, conversationId: string) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `messages/${conversationId}/${fileName}`;

      const { error } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (error) throw error;

      const { data: signedData, error: signedError } = await supabase.storage
        .from('attachments')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7);

      if (!signedError && signedData?.signedUrl) {
        return signedData.signedUrl;
      }

      // Fallback for buckets that are intentionally public.
      const { data: publicData } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      return publicData.publicUrl;
    } catch (error) {
      console.error('Upload attachment error:', error);
      throw error;
    }
  },

  // Delete attachment
  async deleteAttachment(url: string) {
    try {
      const path = url.split('/').pop();
      if (path) {
        const { error } = await supabase.storage
          .from('attachments')
          .remove([`messages/${path}`]);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Delete attachment error:', error);
    }
  },
};
