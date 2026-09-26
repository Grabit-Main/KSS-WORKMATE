import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Send, Users, Sparkles, Hash, Pin, User } from 'lucide-react';
import api from '../api/axios';

export default function CollaborationPage() {
  const { user } = useAuth();
  const [channels, setChannels] = useState([
    { id: 'general', name: 'General Announcements', icon: '📢', desc: 'Company-wide updates and official notices' },
    { id: 'tech', name: 'Engineering & Tech Hub', icon: '💻', desc: 'Architecture, codebase, and technical discussions' },
    { id: 'projects', name: 'Project Delivery & Reviews', icon: '🚀', desc: 'Sprint updates, deliverables, and progress' },
    { id: 'kpi', name: 'Daily Standup & KPI Updates', icon: '📈', desc: 'Daily logs, velocity, and blocker resolutions' }
  ]);
  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const fetchChannelMessages = async (channelId) => {
    setLoading(true);
    try {
      const res = await api.get(`/chat/messages?channel=${channelId}`).catch(() => null);
      if (res && res.data && Array.isArray(res.data)) {
        setMessages(res.data);
      } else {
        // Fallback default channels messages
        setMessages([
          {
            id: 1,
            user_name: 'Satya Ranjan Das',
            user_role: 'TL',
            content: 'Welcome everyone to the KSS Workmate Collaboration hub! Please post your daily sync updates here.',
            created_at: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: 2,
            user_name: 'Prakash Sahoo',
            user_role: 'TM',
            content: 'Database backup and PITR recovery verification completed. System is operating normally.',
            created_at: new Date(Date.now() - 1800000).toISOString()
          }
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannelMessages(activeChannel);
  }, [activeChannel]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const newMsg = {
      id: Date.now(),
      user_name: `${user?.first_name || 'User'} ${user?.last_name || ''}`.trim(),
      user_role: user?.role || 'TM',
      content: inputMsg.trim(),
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMsg]);
    const textToSend = inputMsg.trim();
    setInputMsg('');

    try {
      await api.post('/chat/messages', {
        channel: activeChannel,
        content: textToSend
      }).catch(() => {});
    } catch (err) {
      console.error(err);
    }
  };

  const currentChannelObj = channels.find(c => c.id === activeChannel);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '20px 28px',
        marginBottom: '20px',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'var(--brand-500)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>
            💬
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Team Collaboration Hub
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
              Real-time workspace channels and discussions for KSS Workmate teams.
            </p>
          </div>
        </div>
      </div>

      {/* Main Chat Layout */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: '20px',
        minHeight: 0
      }}>
        {/* Sidebar Channels */}
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em', padding: '0 8px' }}>
            Channels
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {channels.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: activeChannel === ch.id ? '1px solid var(--brand-500)' : '1px solid transparent',
                  background: activeChannel === ch.id ? 'var(--brand-50)' : 'transparent',
                  color: activeChannel === ch.id ? 'var(--brand-600)' : 'var(--text-primary)',
                  fontWeight: activeChannel === ch.id ? 600 : 500,
                  fontSize: '13px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{ch.icon}</span>
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {/* Channel Info Bar */}
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{currentChannelObj?.icon}</span> {currentChannelObj?.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {currentChannelObj?.desc}
              </div>
            </div>
          </div>

          {/* Messages Feed */}
          <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--brand-500)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                  flexShrink: 0
                }}>
                  {msg.user_name ? msg.user_name.charAt(0) : 'U'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{msg.user_name}</span>
                    <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: 'var(--brand-50)', color: 'var(--brand-600)', fontWeight: 600 }}>
                      {msg.user_role}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div style={{
                    background: 'var(--surface-glass)',
                    padding: '10px 14px',
                    borderRadius: '0 12px 12px 12px',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    lineHeight: 1.4,
                    border: '1px solid var(--border)'
                  }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Message Input Box */}
          <form onSubmit={handleSendMessage} style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder={`Message #${currentChannelObj?.name}...`}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Send size={16} /> Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
