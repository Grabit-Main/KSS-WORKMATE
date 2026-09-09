import React, { useState, useEffect, useRef } from 'react';
import { getChat, sendMessage } from '../../api/chat';
import { uploadFile } from '../../api/upload';
import { useRealtime } from '../../realtime/useRealtime';
import { useWebSocket } from '../../context/WebSocketContext';
import { AttachmentCard } from '../common/AttachmentCard';
import { formatTime } from '../../utils/dateUtils';
import { Send, MessageSquare, Paperclip, X, Loader2 } from 'lucide-react';

export const TaskChat = ({ task, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUploading, setFileUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const { joinRoom, leaveRoom, dispatch } = useWebSocket();

  // Identify counterpart
  const isAssignee = String(task.assigned_to) === String(currentUser.id);
  const partnerUser = isAssignee ? task.assigner : task.assignee;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const data = await getChat(task.id);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load task messages:', err);
    } finally {
      setLoading(false);
    }
  };

  // Join task room for real-time WebSocket events
  useEffect(() => {
    if (task?.id) {
      joinRoom(`task:${task.id}`);
      loadMessages();
      return () => {
        leaveRoom(`task:${task.id}`);
      };
    }
  }, [task?.id, joinRoom, leaveRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Realtime new message listener via WebSocket & EventBus
  useRealtime('chat.new_message', (eventData) => {
    if (String(eventData?.task_id) === String(task.id)) {
      setMessages(prev => {
        // Replace optimistic placeholder if matching message already present
        const cleaned = prev.filter(m => !m.isOptimistic || m.message !== eventData.message);
        if (cleaned.some(m => String(m.id) === String(eventData.id))) return cleaned;
        return [...cleaned, eventData];
      });
      setTimeout(scrollToBottom, 50);
    }
  });

  // High-frequency smart fallback sync (every 600ms when chat is open) to guarantee near-instant message receipt
  useEffect(() => {
    if (!task?.id) return;
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
    }, 600);
    return () => clearInterval(interval);
  }, [task?.id]);

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
    if ((!textToSend && !selectedFile) || sending || fileUploading) return;

    setSending(true);
    setNewMessage('');

    // 0 ms Optimistic update for instant feedback
    let tempId = null;
    if (textToSend && !selectedFile) {
      tempId = 'opt_' + Date.now();
      const optimisticMsg = {
        id: tempId,
        task_id: task.id,
        sender_id: currentUser.id,
        sender_name: currentUser.full_name || `${currentUser.first_name} ${currentUser.last_name}`,
        message: textToSend,
        attachment_url: null,
        attachment_type: null,
        created_at: new Date().toISOString(),
        isOptimistic: true
      };
      setMessages(prev => [...prev, optimisticMsg]);
      setTimeout(scrollToBottom, 20);
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
      setTimeout(scrollToBottom, 50);
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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--subtle-glass)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {partnerUser?.avatar_url ? (
            <img
              src={partnerUser.avatar_url}
              alt=""
              style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--brand-gradient)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700
            }}>
              {partnerUser?.first_name?.[0]}{partnerUser?.last_name?.[0]}
            </div>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                {getUserName(partnerUser)}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 'var(--radius-full)',
                background: partnerUser?.role === 'TL' ? 'var(--brand-100)' : 'var(--subtle)',
                color: partnerUser?.role === 'TL' ? 'var(--brand-700)' : 'var(--text-secondary)'
              }}>
                {partnerUser?.role || (isAssignee ? 'Lead' : 'Member')}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              {isAssignee ? 'Team Lead Direct Channel' : 'Assigned Member Channel'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-tertiary)', fontSize: '13px' }}>
            Loading conversation...
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            color: 'var(--text-tertiary)',
            padding: '20px'
          }}>
            <MessageSquare size={32} strokeWidth={1.5} style={{ marginBottom: '10px', color: 'var(--brand-300)' }} />
            <p className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>No messages yet</p>
            <p className="text-xs text-tertiary mt-1" style={{ maxWidth: '240px' }}>
              Start the discussion regarding this deliverable with {getUserName(partnerUser)}.
            </p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMe = String(m.sender_id) === String(currentUser.id);
            return (
              <div
                key={m.id || idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  alignSelf: isMe ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  padding: m.attachment_url ? '8px' : '10px 14px',
                  borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isMe ? 'var(--brand-gradient)' : 'var(--subtle)',
                  color: isMe ? '#fff' : 'var(--text-primary)',
                  fontSize: '13px',
                  lineHeight: 1.45,
                  wordBreak: 'break-word',
                  boxShadow: isMe ? 'var(--brand-glow)' : 'var(--shadow-subtle)'
                }}>
                  {m.message && (
                    <div style={{ marginBottom: m.attachment_url ? '6px' : '0', padding: m.attachment_url ? '2px 4px' : '0' }}>
                      {m.message}
                    </div>
                  )}

                  {/* Render attachment in a clickable small box */}
                  {m.attachment_url && (
                    <div style={{ marginTop: m.message ? '4px' : '0' }}>
                      <AttachmentCard
                        url={m.attachment_url}
                        type={m.attachment_type}
                        storage={m.storage_provider}
                      />
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '3px',
                  fontSize: '10px',
                  color: 'var(--text-tertiary)'
                }}>
                  <span>{isMe ? 'You' : (m.sender_name || getUserName(partnerUser))}</span>
                  <span>•</span>
                  <span>
                    {m.created_at ? formatTime(m.created_at) : 'Now'}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview (if selected) */}
      {selectedFile && (
        <div style={{
          padding: '8px 16px',
          background: 'var(--subtle)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
            <Paperclip size={14} color="var(--brand-600)" />
            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
              {selectedFile.name}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
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
              color: 'var(--text-tertiary)',
              padding: '2px',
              borderRadius: 'var(--radius-full)'
            }}
            title="Remove attachment"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input Box */}
      <form
        onSubmit={handleSend}
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
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
            background: selectedFile ? 'var(--brand-50)' : 'transparent',
            border: '1px solid ' + (selectedFile ? 'var(--brand-400)' : 'var(--border)'),
            borderRadius: 'var(--radius-full)',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: selectedFile ? 'var(--brand-600)' : 'var(--text-secondary)',
            transition: 'all var(--transition-fast)'
          }}
          title="Add attachment (image, document, video)"
          disabled={sending || fileUploading}
        >
          <Paperclip size={16} />
        </button>

        <input
          type="text"
          placeholder={selectedFile ? 'Add a caption (optional)...' : `Message ${getUserName(partnerUser)}...`}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="input"
          style={{
            flex: 1,
            borderRadius: 'var(--radius-full)',
            padding: '9px 16px',
            fontSize: '13px'
          }}
          disabled={sending || fileUploading}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={(!newMessage.trim() && !selectedFile) || sending || fileUploading}
          style={{
            borderRadius: 'var(--radius-full)',
            width: '38px',
            height: '38px',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
          title="Send message"
        >
          {sending || fileUploading ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
};

export default TaskChat;
