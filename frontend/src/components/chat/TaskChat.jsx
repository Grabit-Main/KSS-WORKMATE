import React, { useState, useEffect, useRef } from 'react';
import {
  getChat,
  sendMessage,
  getDirectChat,
  sendDirectMessage,
  getChannelChat,
  sendChannelMessage,
  getProjectChat,
  sendProjectMessage
} from '../../api/chat';
import { uploadFile } from '../../api/upload';
import { useRealtime } from '../../realtime/useRealtime';
import { useWebSocket } from '../../context/WebSocketContext';
import { AttachmentCard } from '../common/AttachmentCard';
import {
  Send, Paperclip, X, Loader2, ShieldCheck, CheckCheck,
  Lock, Hash, Folder, MessageSquare, Megaphone, Users,
  MoreVertical, Smile, AlertCircle
} from 'lucide-react';
import { parseUTC } from '../../utils/dateUtils';

const formatTimeOnly = (dateStr) => {
  const d = parseUTC(dateStr);
  if (!d) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatDateGroup = (dateStr) => {
  const d = parseUTC(dateStr);
  if (!d) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const TaskChat = ({
  task,
  currentUser,
  mode = 'task', // 'task' | 'direct' | 'channel' | 'project'
  partnerUser: partnerUserProp,
  channelId,
  channelName,
  channelSubtitle,
  channelMemberCount,
  channelIconType,
  project,
  showHeader = true,
  headerExtra = null,
  style = {},
  layoutVariant = 'standard'
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [reactionsMap, setReactionsMap] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const { joinRoom, leaveRoom, dispatch } = useWebSocket() || {};

  const handleToggleReaction = (msgId, emoji) => {
    setReactionsMap(prev => {
      const current = prev[msgId] || [];
      const idx = current.findIndex(r => r.emoji === emoji);
      if (idx >= 0) {
        const item = current[idx];
        const updated = {
          ...item,
          count: item.userReacted ? item.count - 1 : item.count + 1,
          userReacted: !item.userReacted
        };
        const list = [...current];
        if (updated.count <= 0) {
          list.splice(idx, 1);
        } else {
          list[idx] = updated;
        }
        return { ...prev, [msgId]: list };
      } else {
        return {
          ...prev,
          [msgId]: [...current, { emoji, count: 1, userReacted: true }]
        };
      }
    });
  };

  // Verify privacy membership for task chat
  const isAssignee = String(task?.assigned_to) === String(currentUser?.id);
  const isAssigner = String(task?.assigned_by) === String(currentUser?.id);
  const isParticipant = mode === 'task' ? (isAssignee || isAssigner) : true;
  const effectivePartnerUser = mode === 'direct' ? partnerUserProp : (isAssignee ? task?.assigner : task?.assignee);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const loadMessages = async () => {
    setFetchError(null);
    if (mode === 'task') {
      if (!task?.id) return;
      if (!isParticipant) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setAccessDenied(false);
        const data = await getChat(task.id);
        setMessages(data || []);
      } catch (err) {
        if (err.response?.status === 403) {
          setAccessDenied(true);
        } else {
          console.error('Failed to load task messages:', err);
          setFetchError('Failed to load messages');
        }
      } finally {
        setLoading(false);
      }
    } else if (mode === 'direct') {
      if (!effectivePartnerUser?.id) {
        setMessages([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setAccessDenied(false);
        const data = await getDirectChat(effectivePartnerUser.id);
        setMessages(data || []);
      } catch (err) {
        console.error('Failed to load direct messages:', err);
        setFetchError('Failed to load direct messages');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'channel') {
      if (!channelId) return;
      try {
        setLoading(true);
        setAccessDenied(false);
        const data = await getChannelChat(channelId);
        setMessages(data || []);
      } catch (err) {
        console.error('Failed to load channel messages:', err);
        setFetchError('Failed to load channel messages');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'project') {
      if (!project?.id) return;
      try {
        setLoading(true);
        setAccessDenied(false);
        const data = await getProjectChat(project.id);
        setMessages(data || []);
      } catch (err) {
        console.error('Failed to load project messages:', err);
        setFetchError('Failed to load project messages');
      } finally {
        setLoading(false);
      }
    }
  };

  // Join rooms and initial load
  useEffect(() => {
    if (mode === 'task') {
      if (task?.id && isParticipant) {
        if (joinRoom) joinRoom(`task:${task.id}`);
        loadMessages();
        return () => {
          if (leaveRoom) leaveRoom(`task:${task.id}`);
        };
      } else {
        setLoading(false);
        if (!isParticipant) setAccessDenied(true);
      }
    } else if (mode === 'project') {
      if (project?.id) {
        if (joinRoom) joinRoom(`project:${project.id}`);
        loadMessages();
        return () => {
          if (leaveRoom) leaveRoom(`project:${project.id}`);
        };
      }
    } else if (mode === 'direct') {
      if (effectivePartnerUser?.id) {
        loadMessages();
      }
    } else if (mode === 'channel') {
      if (channelId) {
        loadMessages();
      }
    }
  }, [mode, task?.id, project?.id, effectivePartnerUser?.id, channelId, currentUser?.id, isParticipant]);

  useEffect(() => {
    scrollToBottom('auto');
  }, [messages.length]);

  // Realtime new message listener via WebSocket & EventBus
  useRealtime('chat.new_message', (eventData) => {
    let isRelevant = false;
    if (mode === 'task') {
      isRelevant = String(eventData?.task_id) === String(task?.id) && isParticipant;
    } else if (mode === 'direct') {
      const isDirect = eventData?.chat_type === 'direct';
      const sId = String(eventData?.sender_id);
      const rId = String(eventData?.receiver_id);
      const myId = String(currentUser?.id);
      const partnerId = String(effectivePartnerUser?.id);
      isRelevant = isDirect && ((sId === partnerId && rId === myId) || (sId === myId && rId === partnerId));
    } else if (mode === 'channel') {
      isRelevant = eventData?.chat_type === `channel:${channelId}` || eventData?.channel_name === channelId;
    } else if (mode === 'project') {
      isRelevant = String(eventData?.project_id) === String(project?.id);
    }

    if (isRelevant) {
      setMessages(prev => {
        const cleaned = prev.filter(m => !m.isOptimistic || m.message !== eventData.message);
        if (cleaned.some(m => String(m.id) === String(eventData.id))) return cleaned;
        return [...cleaned, eventData];
      });
      setTimeout(() => scrollToBottom('smooth'), 50);
    }
  });

  // High-frequency smart fallback sync (every 800ms when chat is open)
  useEffect(() => {
    if (mode === 'task' && (!task?.id || !isParticipant)) return;
    if (mode === 'direct' && !effectivePartnerUser?.id) return;
    if (mode === 'channel' && !channelId) return;
    if (mode === 'project' && !project?.id) return;

    let isFetching = false;
    const fetchFn = () => {
      if (mode === 'task') return getChat(task.id);
      if (mode === 'direct') return getDirectChat(effectivePartnerUser.id);
      if (mode === 'channel') return getChannelChat(channelId);
      if (mode === 'project') return getProjectChat(project.id);
      return Promise.resolve([]);
    };

    const interval = setInterval(() => {
      if (isFetching || document.hidden) return;
      isFetching = true;
      fetchFn()
        .then(data => {
          if (data && Array.isArray(data)) {
            setMessages(prev => {
              const optimisticMsgs = prev.filter(m => m.isOptimistic);
              const realPrev = prev.filter(m => !m.isOptimistic);
              if (data.length !== realPrev.length || JSON.stringify(data.map(d => d.id)) !== JSON.stringify(realPrev.map(p => p.id))) {
                return [...data, ...optimisticMsgs.filter(opt => !data.some(d => d.message === opt.message && String(d.sender_id) === String(opt.sender_id)))];
              }
              return prev;
            });
          }
        })
        .catch(() => {})
        .finally(() => { isFetching = false; });
    }, 800);
    return () => clearInterval(interval);
  }, [mode, task?.id, effectivePartnerUser?.id, channelId, project?.id, isParticipant]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    e.target.value = '';
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const textToSend = newMessage.trim();
    if ((!textToSend && !selectedFile) || sending || fileUploading || !isParticipant) return;
    if (mode === 'direct' && !effectivePartnerUser?.id) return;
    if (mode === 'project' && !project?.id) return;
    if (mode === 'channel' && !channelId) return;

    setSending(true);
    setNewMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Instant 0ms Optimistic Update for WhatsApp-like feel
    let tempId = null;
    if (textToSend && !selectedFile) {
      tempId = 'opt_' + Date.now();
      const optimisticMsg = {
        id: tempId,
        task_id: mode === 'task' ? task?.id : null,
        project_id: mode === 'project' ? project?.id : null,
        receiver_id: mode === 'direct' ? effectivePartnerUser?.id : null,
        chat_type: mode === 'channel' ? `channel:${channelId}` : mode,
        sender_id: currentUser?.id,
        sender_name: currentUser?.full_name || `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim(),
        message: textToSend,
        attachment_url: null,
        attachment_type: null,
        created_at: new Date().toISOString(),
        isOptimistic: true
      };
      setMessages(prev => [...prev, optimisticMsg]);
      setTimeout(() => scrollToBottom('smooth'), 20);
    }

    let attachmentUrl = null;
    let attachmentType = null;
    let storageProvider = null;

    try {
      if (selectedFile) {
        setFileUploading(true);
        const uploadRes = await uploadFile(selectedFile, task?.id || null, project?.id || null);
        attachmentUrl = uploadRes.url;
        attachmentType = uploadRes.file_type;
        storageProvider = uploadRes.storage_provider;
        setSelectedFile(null);
      }

      const payload = {
        message: textToSend || (selectedFile ? `Shared attachment: ${selectedFile.name}` : ''),
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
        storage_provider: storageProvider
      };

      let sentMsg;
      if (mode === 'task') {
        sentMsg = await sendMessage(task.id, payload);
      } else if (mode === 'direct') {
        sentMsg = await sendDirectMessage(effectivePartnerUser.id, payload);
      } else if (mode === 'channel') {
        sentMsg = await sendChannelMessage(channelId, payload);
      } else if (mode === 'project') {
        sentMsg = await sendProjectMessage(project.id, payload);
      }

      setMessages(prev => {
        const withoutOpt = tempId ? prev.filter(m => m.id !== tempId) : prev;
        if (withoutOpt.some(m => String(m.id) === String(sentMsg?.id))) return withoutOpt;
        return [...withoutOpt, sentMsg];
      });
      if (dispatch) {
        dispatch('chat.new_message', sentMsg);
      }
      setTimeout(() => scrollToBottom('smooth'), 50);
    } catch (err) {
      console.error('Failed to send message:', err);
      if (tempId) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
      if (textToSend) setNewMessage(textToSend);
    } finally {
      setSending(false);
      setFileUploading(false);
    }
  };

  const handleTextareaChange = (e) => {
    setNewMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        return;
      }
      e.preventDefault();
      handleSend();
    }
  };

  const getUserName = (u) => {
    if (!u) return 'User';
    return u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
  };

  const getPartnerFirstName = () => {
    if (!effectivePartnerUser) return 'Member';
    return effectivePartnerUser.first_name || effectivePartnerUser.full_name?.split(' ')[0] || 'Member';
  };

  const getPlaceholder = () => {
    if (selectedFile) return 'Add a caption (optional)...';
    if (mode === 'direct') return `Message ${effectivePartnerUser?.first_name || 'team member'}...`;
    if (mode === 'channel') return `Message #${channelName || channelId}...`;
    if (mode === 'project') return `Post discussion note in ${project?.name || 'project'}...`;
    return `Message ${getPartnerFirstName()}...`;
  };

  // Group messages by date for WhatsApp-style date headers
  const groupedMessages = React.useMemo(() => {
    const groups = [];
    let currentGroup = null;

    messages.forEach((msg) => {
      const dateKey = formatDateGroup(msg.created_at);
      if (!currentGroup || currentGroup.dateKey !== dateKey) {
        currentGroup = { dateKey, items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push(msg);
    });

    return groups;
  }, [messages]);

  // Handle Privacy Blocked View for non-participants (only for task mode)
  if (mode === 'task' && (accessDenied || !isParticipant)) {
    const assigneeName = getUserName(task?.assignee);
    const assignerName = getUserName(task?.assigner);
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#FAF8F5',
        borderLeft: '1px solid #E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        textAlign: 'center',
        ...style
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.1)',
          color: '#6366F1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <Lock size={26} />
        </div>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
          Private Task Channel
        </h3>
        <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, maxWidth: '280px' }}>
          This conversation is private strictly between the assigned member (<strong>{assigneeName}</strong>) and the assigner (<strong>{assignerName}</strong>).
        </p>
      </div>
    );
  }

  const isCollabHub = layoutVariant === 'collaboration_hub';

  if (isCollabHub) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#FFFFFF',
        overflow: 'hidden',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        ...style
      }}>
        {/* Top Header strictly matching Image 2 */}
        {showHeader && (
          <div style={{
            padding: '16px 24px',
            background: '#FFFFFF',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {mode === 'direct' ? (
                effectivePartnerUser?.avatar_url ? (
                  <img
                    src={effectivePartnerUser.avatar_url}
                    alt=""
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: '#6366F1',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 700
                  }}>
                    {effectivePartnerUser?.first_name?.[0] || 'U'}{effectivePartnerUser?.last_name?.[0] || ''}
                  </div>
                )
              ) : (
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#EEF2FF',
                  color: '#5551FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {channelIconType === 'users' ? <Users size={22} /> : <Megaphone size={22} />}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
                    {mode === 'direct' ? getUserName(effectivePartnerUser) : (channelName || 'General Announcements')}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#EEF2FF',
                    color: '#5551FF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    {mode === 'direct' ? (effectivePartnerUser?.role || 'MEMBER') : 'TEAM CHANNEL'}
                  </span>
                </div>
                <span style={{ fontSize: '12.5px', color: '#64748B' }}>
                  {mode === 'direct'
                    ? (effectivePartnerUser?.job_title || 'Direct Conversation')
                    : (channelSubtitle || 'Team-wide updates and important information')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {mode === 'channel' && Boolean(channelMemberCount) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', fontSize: '13px', fontWeight: 500 }}>
                  <Users size={16} color="#64748B" />
                  <span>
                    {typeof channelMemberCount === 'number'
                      ? `${channelMemberCount} ${channelMemberCount === 1 ? 'member' : 'members'}`
                      : channelMemberCount}
                  </span>
                </div>
              )}

              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Conversation options"
                >
                  <MoreVertical size={18} />
                </button>
                {showMenuDropdown && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '40px',
                    background: '#FFFFFF',
                    borderRadius: '10px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                    border: '1px solid #E2E8F0',
                    padding: '6px',
                    width: '170px',
                    zIndex: 100
                  }}>
                    <button
                      type="button"
                      onClick={() => setShowMenuDropdown(false)}
                      style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', textAlign: 'left', fontSize: '12.5px', color: '#1E293B', borderRadius: '6px', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.target.style.background = '#F8FAFC'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      Channel details
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMenuDropdown(false)}
                      style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', textAlign: 'left', fontSize: '12.5px', color: '#1E293B', borderRadius: '6px', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.target.style.background = '#F8FAFC'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      Mute notifications
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMenuDropdown(false)}
                      style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', textAlign: 'left', fontSize: '12.5px', color: '#1E293B', borderRadius: '6px', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.target.style.background = '#F8FAFC'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      Export history
                    </button>
                  </div>
                )}
              </div>

              {headerExtra}
            </div>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div style={{
          flex: 1,
          padding: '20px 24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF'
        }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94A3B8', fontSize: '13px', gap: '8px' }}>
              <Loader2 size={18} className="spinner" />
              <span>Loading messages...</span>
            </div>
          ) : fetchError ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              padding: '24px'
            }}>
              <AlertCircle size={32} color="#EF4444" style={{ marginBottom: '8px' }} />
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginBottom: '4px' }}>{fetchError}</p>
              <button
                type="button"
                onClick={loadMessages}
                style={{
                  marginTop: '8px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: '#5551FF',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              padding: '32px',
              color: '#94A3B8'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: '#EEF2FF',
                color: '#5551FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px'
              }}>
                {mode === 'channel' ? (channelIconType === 'users' ? <Users size={24} /> : <Megaphone size={24} />) : <MessageSquare size={24} />}
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                {mode === 'channel' ? `Welcome to #${channelName || 'channel'}` : `Conversation with ${getUserName(effectivePartnerUser)}`}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '300px', margin: 0, lineHeight: 1.5 }}>
                {mode === 'channel'
                  ? 'No messages in this channel yet. Start the discussion with your team!'
                  : 'No direct messages yet. Send a message below to start chatting!'}
              </p>
            </div>
          ) : (
            groupedMessages.map((group, gIdx) => (
              <React.Fragment key={group.dateKey || gIdx}>
                {/* Dynamic Date Separator based on actual message timestamps */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', margin: '8px 0 20px 0' }}>
                  <div style={{ position: 'absolute', left: 0, right: 0, height: '1px', background: '#F1F5F9' }} />
                  <span style={{
                    position: 'relative',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '3px 14px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#64748B',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    {group.dateKey}
                  </span>
                </div>

                {group.items.map((m, idx) => {
                  const isMe = String(m.sender_id) === String(currentUser?.id);
                  const senderName = isMe
                    ? 'You'
                    : (m.sender ? `${m.sender.first_name || ''} ${m.sender.last_name || ''}`.trim() : (m.sender_name || (mode === 'direct' ? getUserName(effectivePartnerUser) : 'Team Member')));
                  const senderAvatar = isMe ? currentUser?.avatar_url : (m.sender?.avatar_url || (mode === 'direct' ? effectivePartnerUser?.avatar_url : null));
                  const timeDisplay = formatTimeOnly(m.created_at);
                  const reactions = reactionsMap[m.id] || [];

                  // Dynamic initials for avatar fallback
                  const initials = isMe
                    ? `${currentUser?.first_name?.[0] || 'U'}${currentUser?.last_name?.[0] || ''}`.toUpperCase()
                    : m.sender
                    ? `${m.sender.first_name?.[0] || 'T'}${m.sender.last_name?.[0] || ''}`.toUpperCase()
                    : senderName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'TM';

                  return (
                    <div key={m.id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px' }}>
                      {/* Left Avatar from real user data */}
                      {senderAvatar ? (
                        <img
                          src={senderAvatar}
                          alt=""
                          style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: isMe ? '#4F46E5' : '#6366F1',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          {initials}
                        </div>
                      )}

                      {/* Message Body */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        {/* Header: Sender Name + Timestamp */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                            {senderName}
                          </span>
                          <span style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 400 }}>
                            {timeDisplay}
                          </span>
                          {isMe && (
                            <CheckCheck size={14} color="#5551FF" style={{ marginLeft: '2px' }} />
                          )}
                        </div>

                        {/* Bubble */}
                        <div style={{
                          background: isMe ? '#EEF2FF' : '#F1F5F9',
                          border: isMe ? '1px solid #E0E7FF' : 'none',
                          borderRadius: '14px',
                          padding: '12px 18px',
                          color: '#1E293B',
                          fontSize: '13.5px',
                          lineHeight: '1.5',
                          maxWidth: '85%',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {m.message}

                          {m.attachment_url && (
                            <div style={{ marginTop: m.message ? '8px' : '0' }}>
                              <AttachmentCard url={m.attachment_url} type={m.attachment_type} storage={m.storage_provider} />
                            </div>
                          )}
                        </div>

                        {/* Emoji Reactions (only rendered when real reactions exist) */}
                        {reactions.length > 0 && (
                          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                            {reactions.map((r, rIdx) => (
                              <button
                                key={rIdx}
                                type="button"
                                onClick={() => handleToggleReaction(m.id, r.emoji)}
                                style={{
                                  background: r.userReacted ? '#EEF2FF' : '#FFFFFF',
                                  border: r.userReacted ? '1px solid #5551FF' : '1px solid #E2E8F0',
                                  borderRadius: '14px',
                                  padding: '2px 8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '12px',
                                  color: r.userReacted ? '#5551FF' : '#475569',
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <span>{r.emoji}</span>
                                <span style={{ fontWeight: 600 }}>{r.count}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Attachment Selected Banner */}
        {selectedFile && (
          <div style={{
            padding: '8px 24px',
            background: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#475569'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <Paperclip size={14} color="#5551FF" />
              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                {selectedFile.name}
              </span>
              <span style={{ fontSize: '10px', color: '#94A3B8' }}>
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8',
                padding: '2px'
              }}
              title="Remove attachment"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Footer Composer strictly matching Image 2 */}
        <form
          onSubmit={handleSend}
          style={{
            padding: '14px 24px',
            background: '#FFFFFF',
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0,
            position: 'relative'
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: selectedFile ? '#EEF2FF' : 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: selectedFile ? '#5551FF' : '#64748B',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
            title="Add attachment"
            disabled={sending || fileUploading}
          >
            <Paperclip size={18} />
          </button>

          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Type a message..."
              value={newMessage}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                borderRadius: '24px',
                border: '1px solid #E2E8F0',
                padding: '10px 44px 10px 18px',
                fontSize: '13.5px',
                color: '#1E293B',
                outline: 'none',
                background: '#FFFFFF',
                resize: 'none',
                fontFamily: 'inherit',
                lineHeight: '1.4',
                maxHeight: '120px'
              }}
              disabled={sending || fileUploading}
            />
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{
                position: 'absolute',
                right: '12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: showEmojiPicker ? '#5551FF' : '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px'
              }}
              title="Insert emoji"
            >
              <Smile size={19} />
            </button>
          </div>

          {showEmojiPicker && (
            <div style={{
              position: 'absolute',
              bottom: '68px',
              right: '76px',
              background: '#FFFFFF',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              border: '1px solid #E2E8F0',
              padding: '8px 12px',
              display: 'flex',
              gap: '8px',
              zIndex: 100
            }}>
              {['👍', '🎉', '❤️', '🙌', '🚀', '😊', '👏', '🔥'].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setNewMessage(prev => prev + emoji);
                    setShowEmojiPicker(false);
                    textareaRef.current?.focus();
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={(!newMessage.trim() && !selectedFile) || sending || fileUploading}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#5551FF',
              opacity: (!newMessage.trim() && !selectedFile) || sending || fileUploading ? 0.7 : 1,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: (!newMessage.trim() && !selectedFile) || sending || fileUploading ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(85, 81, 255, 0.28)',
              transition: 'all 0.15s ease'
            }}
            title="Send message"
          >
            {sending || fileUploading ? (
              <Loader2 size={16} className="spinner" />
            ) : (
              <Send size={16} style={{ transform: 'translateX(1px)' }} />
            )}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#FAF8F5', // Soft off-white / light cream background as in reference image
      borderLeft: mode === 'task' && !showHeader ? '1px solid #E2E8F0' : 'none',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      ...style
    }}>
      {/* Top Header matching reference image */}
      {showHeader && (
        <div style={{
          padding: '16px 20px',
          background: '#FFFFFF',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {mode === 'direct' ? (
              effectivePartnerUser?.avatar_url ? (
                <img
                  src={effectivePartnerUser.avatar_url}
                  alt=""
                  style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#6366F1',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700
                }}>
                  {effectivePartnerUser?.first_name?.[0] || 'U'}{effectivePartnerUser?.last_name?.[0] || ''}
                </div>
              )
            ) : mode === 'channel' ? (
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.12)',
                color: '#6366F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Hash size={20} />
              </div>
            ) : mode === 'project' ? (
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.12)',
                color: '#6366F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Folder size={20} />
              </div>
            ) : (
              effectivePartnerUser?.avatar_url ? (
                <img
                  src={effectivePartnerUser.avatar_url}
                  alt=""
                  style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#6366F1',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700
                }}>
                  {effectivePartnerUser?.first_name?.[0]}{effectivePartnerUser?.last_name?.[0]}
                </div>
              )
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>
                  {mode === 'direct'
                    ? getUserName(effectivePartnerUser)
                    : mode === 'channel'
                    ? (channelName || `#${channelId}`)
                    : mode === 'project'
                    ? (project?.name || 'Project Discussion')
                    : getUserName(effectivePartnerUser)}
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '6px',
                  background: '#EEF2FF',
                  color: '#6366F1',
                  textTransform: 'uppercase'
                }}>
                  {mode === 'direct'
                    ? (effectivePartnerUser?.role || 'MEMBER')
                    : mode === 'channel'
                    ? 'TEAM CHANNEL'
                    : mode === 'project'
                    ? 'PROJECT'
                    : (effectivePartnerUser?.role || (isAssignee ? 'TL' : 'TM'))}
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                {mode === 'direct'
                  ? (effectivePartnerUser?.job_title || 'Direct Conversation')
                  : mode === 'channel'
                  ? 'Team-wide Communication Channel'
                  : mode === 'project'
                  ? (project?.aim || 'Milestones, Requirements & Coordination')
                  : (isAssignee ? 'Team Lead Direct Channel' : 'Assigned Member Channel')}
              </span>
            </div>
          </div>

          {headerExtra && (
            <div>{headerExtra}</div>
          )}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94A3B8', fontSize: '13px' }}>
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            color: '#94A3B8',
            padding: '20px'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#EEF2FF',
              color: '#6366F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '10px'
            }}>
              {mode === 'channel' ? <Hash size={22} /> : mode === 'project' ? <Folder size={22} /> : <ShieldCheck size={22} />}
            </div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>
              {mode === 'direct' ? 'Direct Conversation Ready' : mode === 'channel' ? `Welcome to #${channelName || channelId}` : mode === 'project' ? 'Project Discussion Ready' : 'Private Channel Ready'}
            </p>
            <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', maxWidth: '240px' }}>
              {mode === 'direct'
                ? `Send a direct message to ${effectivePartnerUser?.first_name || 'this team member'}.`
                : mode === 'channel'
                ? 'Start the discussion with the squad.'
                : mode === 'project'
                ? 'Share notes, questions, and updates with the team.'
                : `Send a direct message regarding this task to ${getPartnerFirstName()}.`}
            </p>
          </div>
        ) : (
          groupedMessages.map((group, gIdx) => (
            <React.Fragment key={group.dateKey || gIdx}>
              {/* Date Header Pill */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 8px 0' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#64748B',
                  background: '#FFFFFF',
                  padding: '3px 12px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}>
                  {group.dateKey}
                </span>
              </div>

              {group.items.map((m, idx) => {
                const isMe = String(m.sender_id) === String(currentUser?.id);
                const senderDisplayName = isMe
                  ? 'You'
                  : (m.sender_name || (m.sender ? `${m.sender.first_name} ${m.sender.last_name}`.trim() : (mode === 'direct' ? getUserName(effectivePartnerUser) : 'Team Member')));
                const timeFormatted = formatTimeOnly(m.created_at);

                return (
                  <div
                    key={m.id || idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start',
                      maxWidth: '82%',
                      alignSelf: isMe ? 'flex-end' : 'flex-start'
                    }}
                  >
                    {/* Message Bubble matching exact design in screenshot */}
                    <div style={{
                      padding: m.attachment_url ? '10px' : '14px 18px',
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isMe ? '#EEF2FF' : '#EFECE6', // #EFECE6 matches exact off-white beige bubble in screenshot
                      border: isMe ? '1px solid #C7D2FE' : '1px solid #E5E0D8',
                      color: isMe ? '#1E1B4B' : '#1E293B',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      wordBreak: 'break-word',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                    }}>
                      {m.message && (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{m.message}</div>
                      )}

                      {/* Attachment preview if present */}
                      {m.attachment_url && (
                        <div style={{ marginTop: m.message ? '8px' : '0' }}>
                          <AttachmentCard
                            url={m.attachment_url}
                            type={m.attachment_type}
                            storage={m.storage_provider}
                          />
                        </div>
                      )}
                    </div>

                    {/* Sub-meta line e.g. "Name · 06:39 PM" */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '4px',
                      fontSize: '11px',
                      color: '#94A3B8'
                    }}>
                      <span>{senderDisplayName}</span>
                      <span>·</span>
                      <span>{timeFormatted}</span>
                      {isMe && (
                        <CheckCheck size={14} color="#6366F1" style={{ marginLeft: '2px' }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Selected Banner */}
      {selectedFile && (
        <div style={{
          padding: '8px 16px',
          background: '#FFFFFF',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#475569'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
            <Paperclip size={14} color="#6366F1" />
            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
              {selectedFile.name}
            </span>
            <span style={{ fontSize: '10px', color: '#94A3B8' }}>
              ({(selectedFile.size / 1024).toFixed(1)} KB)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: '2px'
            }}
            title="Remove attachment"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Footer Input matching reference image pill design */}
      <form
        onSubmit={handleSend}
        style={{
          padding: '14px 20px',
          background: '#FFFFFF',
          borderTop: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexShrink: 0
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: selectedFile ? '#EEF2FF' : '#F1F5F9',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: selectedFile ? '#6366F1' : '#64748B',
            transition: 'all 0.15s ease',
            flexShrink: 0
          }}
          title="Add attachment"
          disabled={sending || fileUploading}
        >
          <Paperclip size={18} />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={getPlaceholder()}
          value={newMessage}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            padding: '10px 18px',
            fontSize: '13px',
            color: '#1E293B',
            outline: 'none',
            background: '#FFFFFF',
            resize: 'none',
            fontFamily: 'inherit',
            lineHeight: '1.4',
            maxHeight: '120px',
            overflowY: 'auto'
          }}
          disabled={sending || fileUploading}
        />

        <button
          type="submit"
          disabled={(!newMessage.trim() && !selectedFile) || sending || fileUploading}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: (!newMessage.trim() && !selectedFile) || sending || fileUploading ? '#94A3B8' : '#6366F1',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            cursor: (!newMessage.trim() && !selectedFile) || sending || fileUploading ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            transition: 'background 0.15s ease'
          }}
          title="Send message"
        >
          {sending || fileUploading ? (
            <Loader2 size={16} className="spinner" />
          ) : (
            <Send size={16} style={{ transform: 'translateX(1px)' }} />
          )}
        </button>
      </form>
    </div>
  );
};

export default TaskChat;
