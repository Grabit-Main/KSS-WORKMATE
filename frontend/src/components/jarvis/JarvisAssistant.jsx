import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Volume2, VolumeX, Pause, Play, Square,
  Sparkles, X, ChevronRight, Settings,
  Clock, AlertTriangle, Target, BarChart2, MessageSquare
} from 'lucide-react';
import { useJarvis } from '../../hooks/useJarvis';

export const JarvisAssistant = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  const {
    isSupported,
    voiceState, // 'idle' | 'speaking' | 'paused' | 'muted' | 'error'
    subtitle,
    prefs,
    speakGreeting,
    speakTaskSummary,
    speakDueToday,
    speakOverdue,
    speakFocus,
    speakProgress,
    pause,
    resume,
    stop,
    toggleMute
  } = useJarvis();

  // Close panel on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        // Only close if click is not on the floating trigger itself
        const trigger = document.getElementById('jarvis-floating-trigger');
        if (trigger && !trigger.contains(e.target)) {
          setIsOpen(false);
        }
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!isSupported || !prefs.enabled) return null;

  const isSpeaking = voiceState === 'speaking';
  const isPaused = voiceState === 'paused';
  const isMuted = prefs.isMuted || voiceState === 'muted';

  const handleTriggerClick = () => {
    // Automatically play the introduction speech on clicking JARVIS
    speakGreeting(true);
    setIsOpen(prev => !prev);
  };

  return (
    <>
      {/* Floating JARVIS AI Trigger Button */}
      <div style={{
        position: 'fixed',
        bottom: '26px',
        right: '26px',
        zIndex: 9999,
        fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
      }}>
        <button
          id="jarvis-floating-trigger"
          type="button"
          onClick={handleTriggerClick}
          style={{
            width: '62px',
            height: '62px',
            borderRadius: '50%',
            padding: 0,
            overflow: 'hidden',
            background: '#0F172A',
            border: isSpeaking ? '2.5px solid #38BDF8' : '2px solid rgba(56, 189, 248, 0.45)',
            boxShadow: isSpeaking
              ? '0 0 25px rgba(56, 189, 248, 0.9), 0 0 45px rgba(99, 102, 241, 0.6), 0 8px 24px rgba(0, 0, 0, 0.4)'
              : '0 8px 24px rgba(15, 23, 42, 0.4), 0 0 16px rgba(56, 189, 248, 0.25)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: isOpen ? 'scale(1.08)' : 'scale(1)'
          }}
          title="JARVIS - Personal AI Assistant"
        >
          {/* Exact JARVIS Avatar Logo */}
          <img
            src="/jarvis-avatar.jpg"
            alt="JARVIS"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              display: 'block'
            }}
          />

          {/* Animated sound wave bars when speaking */}
          {isSpeaking && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              borderRadius: '50%'
            }}>
              <span className="jarvis-bar-1" style={{ width: '3px', height: '14px', background: '#38BDF8', borderRadius: '2px', animation: 'jarvisWave 0.8s ease-in-out infinite' }} />
              <span className="jarvis-bar-2" style={{ width: '3px', height: '22px', background: '#60A5FA', borderRadius: '2px', animation: 'jarvisWave 0.8s ease-in-out infinite 0.2s' }} />
              <span className="jarvis-bar-3" style={{ width: '3px', height: '16px', background: '#38BDF8', borderRadius: '2px', animation: 'jarvisWave 0.8s ease-in-out infinite 0.4s' }} />
              <span className="jarvis-bar-4" style={{ width: '3px', height: '10px', background: '#93C5FD', borderRadius: '2px', animation: 'jarvisWave 0.8s ease-in-out infinite 0.1s' }} />
            </div>
          )}

          {/* Mute indicator badge */}
          {isMuted && (
            <div style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#EF4444',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #FFFFFF',
              zIndex: 10
            }}>
              <VolumeX size={10} />
            </div>
          )}

          {/* Paused indicator badge */}
          {isPaused && (
            <div style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#F59E0B',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #FFFFFF',
              zIndex: 10
            }}>
              <Pause size={10} />
            </div>
          )}
        </button>
      </div>

      {/* Floating Assistant Control & Transcript Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            bottom: '96px',
            right: '26px',
            width: '380px',
            maxWidth: 'calc(100vw - 36px)',
            maxHeight: 'calc(100vh - 115px)',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(180deg, #0B1120 0%, #0F172A 50%, #1E293B 100%)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '24px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 35px rgba(56, 189, 248, 0.18)',
            zIndex: 9998,
            overflow: 'hidden',
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
            color: '#F8FAFC',
            animation: 'jarvisPopup 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header (Pinned, Non-shrinking) */}
          <div style={{
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(10px)',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid rgba(56, 189, 248, 0.6)',
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.4)',
                flexShrink: 0,
                background: '#0F172A'
              }}>
                <img
                  src="/jarvis-avatar.jpg"
                  alt="JARVIS"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  JARVIS
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 7px',
                    borderRadius: '10px',
                    background: isSpeaking ? 'rgba(74, 222, 128, 0.18)' : 'rgba(99, 102, 241, 0.2)',
                    color: isSpeaking ? '#4ADE80' : '#818CF8',
                    fontWeight: 700
                  }}>
                    {isSpeaking ? 'Speaking' : isPaused ? 'Paused' : isMuted ? 'Muted' : 'Ready'}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                  Personal Workmate AI Assistant
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={toggleMute}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                  border: 'none',
                  color: isMuted ? '#EF4444' : '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title={isMuted ? 'Unmute JARVIS' : 'Mute JARVIS'}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: 'none',
                  color: '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Scrollable Body Content Wrapper */}
          <div
            className="jarvis-scroll"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Subtitle / Live Transcript Display Area */}
            <div style={{
              padding: '14px 18px',
              background: 'rgba(2, 6, 23, 0.45)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              minHeight: '70px',
              maxHeight: '130px',
              overflowY: 'auto'
            }}>
              <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px', letterSpacing: '0.04em' }}>
                {isSpeaking ? 'JARVIS Announcement' : 'Assistant Message'}
              </div>
              <div style={{
                fontSize: '13px',
                lineHeight: 1.5,
                color: subtitle ? '#E2E8F0' : '#64748B',
                fontStyle: subtitle ? 'normal' : 'italic'
              }}>
                {subtitle || 'Click a quick action below to hear your daily update, task summary, or deadlines.'}
              </div>
            </div>

            {/* Voice Controls: Play Greeting, Pause, Resume, Stop */}
            <div style={{
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              background: 'rgba(15, 23, 42, 0.35)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <button
                type="button"
                onClick={() => speakGreeting(false)}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
                }}
              >
                <Sparkles size={13} /> {isSpeaking ? 'Re-announce' : 'Play Greeting'}
              </button>

              {isSpeaking && (
                <button
                  type="button"
                  onClick={pause}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Pause size={13} /> Pause
                </button>
              )}

              {isPaused && (
                <button
                  type="button"
                  onClick={resume}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'rgba(74, 222, 128, 0.2)',
                    color: '#4ADE80',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Play size={13} /> Resume
                </button>
              )}

              {(isSpeaking || isPaused) && (
                <button
                  type="button"
                  onClick={stop}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#EF4444',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Square size={12} /> Stop
                </button>
              )}
            </div>

            {/* Quick Announcement Actions */}
            <div style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.04em' }}>
                Quick Workmate Actions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  type="button"
                  onClick={speakTaskSummary}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    color: '#F1F5F9',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={14} color="#38BDF8" /> Read my task summary
                  </span>
                  <ChevronRight size={14} color="#64748B" />
                </button>

                <button
                  type="button"
                  onClick={speakDueToday}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    color: '#F1F5F9',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={14} color="#FBBF24" /> What is due today?
                  </span>
                  <ChevronRight size={14} color="#64748B" />
                </button>

                <button
                  type="button"
                  onClick={speakOverdue}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    color: '#F1F5F9',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={14} color="#F87171" /> What tasks are overdue?
                  </span>
                  <ChevronRight size={14} color="#64748B" />
                </button>

                <button
                  type="button"
                  onClick={speakFocus}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    color: '#F1F5F9',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Target size={14} color="#A78BFA" /> What should I focus on?
                  </span>
                  <ChevronRight size={14} color="#64748B" />
                </button>

                <button
                  type="button"
                  onClick={speakProgress}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    color: '#F1F5F9',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart2 size={14} color="#34D399" /> Give me my work progress
                  </span>
                  <ChevronRight size={14} color="#64748B" />
                </button>
              </div>
            </div>
          </div>

          {/* Footer (Pinned, Non-shrinking) */}
          <div style={{
            padding: '11px 18px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(15, 23, 42, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11.5px',
            color: '#94A3B8',
            flexShrink: 0
          }}>
            <span>Web Speech Engine Active</span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/profile');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'transparent',
                border: 'none',
                color: '#38BDF8',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '11.5px'
              }}
            >
              <Settings size={13} /> Voice Settings
            </button>
          </div>
        </div>
      )}

      {/* Global CSS for Keyframe Animations & Custom Scrollbar */}
      <style>{`
        @keyframes jarvisWave {
          0%, 100% { height: 6px; }
          50% { height: 22px; }
        }
        @keyframes jarvisPopup {
          0% { opacity: 0; transform: translateY(12px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .jarvis-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .jarvis-scroll::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.4);
        }
        .jarvis-scroll::-webkit-scrollbar-thumb {
          background: rgba(56, 189, 248, 0.35);
          border-radius: 4px;
        }
        .jarvis-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(56, 189, 248, 0.6);
        }
      `}</style>
    </>
  );
};

