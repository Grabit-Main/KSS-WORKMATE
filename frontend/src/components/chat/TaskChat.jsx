import React, { useState, useEffect, useRef } from 'react';
import { getChat, sendMessage } from '../../api/chat';
import { useRealtime } from '../../realtime/useRealtime';
import { Send, MessageSquare, Shield, Clock } from 'lucide-react';

export const TaskChat = ({ task, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

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

  useEffect(() => {
    if (task?.id) {
      loadMessages();
    }
  }, [task?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Realtime new message listener
  useRealtime('chat.new_message', (eventData) => {
    if (String(eventData?.task_id) === String(task.id)) {
      setMessages(prev => {
        // Prevent duplicate messages if already appended
        if (prev.some(m => String(m.id) === String(eventData.id))) return prev;
        return [...prev, eventData];
      });
    }
  });

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const textToSend = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const sentMsg = await sendMessage(task.id, { message: textToSend });
      setMessages(prev => {
        if (prev.some(m => String(m.id) === String(sentMsg.id))) return prev;
        return [...prev, sentMsg];
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      // restore unsent message
      setNewMessage(textToSend);
    } finally {
      setSending(false);
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
                  padding: '10px 14px',
                  borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isMe ? 'var(--brand-gradient)' : 'var(--subtle)',
                  color: isMe ? '#fff' : 'var(--text-primary)',
                  fontSize: '13px',
                  lineHeight: 1.45,
                  wordBreak: 'break-word',
                  boxShadow: isMe ? 'var(--brand-glow)' : 'var(--shadow-subtle)'
                }}>
                  {m.message}
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
                    {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form
        onSubmit={handleSend}
        style={{
          padding: '14px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexShrink: 0
        }}
      >
        <input
          type="text"
          placeholder={`Message ${getUserName(partnerUser)}...`}
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
          disabled={sending}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!newMessage.trim() || sending}
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
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default TaskChat;
