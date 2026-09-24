import React, { useState, useEffect, useRef } from 'react';
import { getChat, sendMessage } from '../../api/chat';
import { uploadFile } from '../../api/upload';
import { useRealtime } from '../../realtime/useRealtime';
import { useWebSocket } from '../../context/WebSocketContext';
import { AttachmentCard } from '../common/AttachmentCard';
import { Send, Paperclip, X, Loader2, ShieldCheck, CheckCheck, Lock } from 'lucide-react';
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

export const TaskChat = ({ task, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUploading, setFileUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const { joinRoom, leaveRoom, dispatch } = useWebSocket() || {};

  // Verify privacy membership
  const isAssignee = String(task?.assigned_to) === String(currentUser?.id);
  const isAssigner = String(task?.assigned_by) === String(currentUser?.id);
  const isParticipant = isAssignee || isAssigner;
  const partnerUser = isAssignee ? task?.assigner : task?.assignee;

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const loadMessages = async () => {
    if (!task?.id) return;
    if (!isParticipant) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }
    try {
      setAccessDenied(false);
      const data = await getChat(task.id);
      setMessages(data || []);
    } catch (err) {
      if (err.response?.status === 403) {
        setAccessDenied(true);
      } else {
        console.error('Failed to load task messages:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Join task room for real-time WebSocket events
  useEffect(() => {
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
  }, [task?.id, currentUser?.id, isParticipant]);

  useEffect(() => {
    scrollToBottom('auto');
  }, [messages.length]);

  // Realtime new message listener via WebSocket & EventBus
  useRealtime('chat.new_message', (eventData) => {
    if (String(eventData?.task_id) === String(task?.id) && isParticipant) {
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
    if (!task?.id || !isParticipant) return;
    let isFetching = false;
    const interval = setInterval(() => {
      if (isFetching || document.hidden) return;
      isFetching = true;
      getChat(task.id)
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
  }, [task?.id, isParticipant]);

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

    setSending(true);
    setNewMessage('');

    // Instant 0ms Optimistic Update for WhatsApp-like feel
    let tempId = null;
    if (textToSend && !selectedFile) {
      tempId = 'opt_' + Date.now();
      const optimisticMsg = {
        id: tempId,
        task_id: task.id,
        sender_id: currentUser.id,
        sender_name: currentUser.full_name || `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim(),
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
        const uploadRes = await uploadFile(selectedFile, task.id);
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

      const sentMsg = await sendMessage(task.id, payload);
      setMessages(prev => {
        const withoutOpt = tempId ? prev.filter(m => m.id !== tempId) : prev;
        if (withoutOpt.some(m => String(m.id) === String(sentMsg.id))) return withoutOpt;
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getUserName = (u) => {
    if (!u) return 'User';
    return u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
  };

  const getPartnerFirstName = () => {
    if (!partnerUser) return 'Member';
    return partnerUser.first_name || partnerUser.full_name?.split(' ')[0] || 'Member';
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

  // Handle Privacy Blocked View for non-participants (e.g. PM, CEO, CTO, or other members)
  if (accessDenied || !isParticipant) {
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
        textAlign: 'center'
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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#FAF8F5', // Soft off-white / light cream background as in reference image
      borderLeft: '1px solid #E2E8F0',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      {/* Top Header matching reference image */}
      <div style={{
        padding: '16px 20px',
        background: '#FFFFFF',
        borderBottom: '1px solid #F1F5F9',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0
      }}>
        {partnerUser?.avatar_url ? (
          <img
            src={partnerUser.avatar_url}
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
            {partnerUser?.first_name?.[0]}{partnerUser?.last_name?.[0]}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>
              {getUserName(partnerUser)}
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
              {partnerUser?.role || (isAssignee ? 'TL' : 'TM')}
            </span>
          </div>
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>
            {isAssignee ? 'Team Lead Direct Channel' : 'Assigned Member Channel'}
          </span>
        </div>
      </div>

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
              <ShieldCheck size={22} />
            </div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Private Channel Ready</p>
            <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', maxWidth: '240px' }}>
              Send a direct message regarding this task to {getPartnerFirstName()}.
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
                const senderDisplayName = isMe ? 'You' : (m.sender_name || getUserName(partnerUser));
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
                      background: isMe ? '#EEF2FF' : '#EFECE6', // #EFECE6 matches exact off-white beige bubble in uploaded screenshot
                      border: isMe ? '1px solid #C7D2FE' : '1px solid #E5E0D8',
                      color: isMe ? '#1E1B4B' : '#1E293B',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      wordBreak: 'break-word',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                    }}>
                      {m.message && (
                        <div>{m.message}</div>
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

                    {/* Sub-meta line e.g. "Jingyasha Priyadarsini Rout · 06:39 PM" */}
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

        <input
          type="text"
          placeholder={selectedFile ? 'Add a caption (optional)...' : `Message ${getPartnerFirstName()}...`}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            borderRadius: '9999px',
            border: '1px solid #E2E8F0',
            padding: '10px 18px',
            fontSize: '13px',
            color: '#1E293B',
            outline: 'none',
            background: '#FFFFFF'
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
