import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot, Volume2, VolumeX, Pause, Play, Square,
  Sparkles, X, ChevronRight, Settings, CheckCircle2,
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
          onClick={() => setIsOpen(prev => !prev)}
          style={{
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            background: isSpeaking 
              ? 'linear-gradient(135deg, #2563EB 0%, #4F46E5 50%, #7C3AED 100%)' 
              : 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            border: isSpeaking ? '2px solid rgba(255, 255, 255, 0.8)' : '2px solid rgba(99, 102, 241, 0.4)',
            boxShadow: isSpeaking
              ? '0 0 25px rgba(99, 102, 241, 0.8), 0 8px 20px rgba(0, 0, 0, 0.3)'
              : '0 8px 24px rgba(15, 23, 42, 0.35)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: isOpen ? 'scale(1.06)' : 'scale(1)'
          }}
          title="JARVIS - Personal AI Assistant"
        >
          {/* Animated sound wave bars when speaking */}
          {isSpeaking ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '22px' }}>
              <span className="jarvis-bar-1" style={{ width: '3px', height: '14px', background: '#FFFFFF', borderRadius: '2px', animation: 'jarvisWave 0.8s ease-in-out infinite' }} />
              <span className="jarvis-bar-2" style={{ width: '3px', height: '22px', background: '#FFFFFF', borderRadius: '2px', animation: 'jarvisWave 0.8s ease-in-out infinite 0.2s' }} />
              <span className="jarvis-bar-3" style={{ width: '3px', height: '16px', background: '#FFFFFF', borderRadius: '2px', animation: 'jarvisWave 0.8s ease-in-out infinite 0.4s' }} />
              <span className="jarvis-bar-4" style={{ width: '3px', height: '10px', background: '#FFFFFF', borderRadius: '2px', animation: 'jarvisWave 0.8s ease-in-out infinite 0.1s' }} />
            </div>
          ) : (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={26} color="#60A5FA" strokeWidth={2.2} />
              {/* Glowing center eye */}
              <div style={{
                position: 'absolute',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#38BDF8',
                boxShadow: '0 0 8px #38BDF8'
              }} />
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
              border: '2px solid #FFFFFF'
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
              border: '2px solid #FFFFFF'
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
            maxWidth: 'calc(100vw - 40px)',
            background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: '24px',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5), 0 0 35px rgba(99, 102, 241, 0.15)',
            zIndex: 9998,
            overflow: 'hidden',
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
            color: '#F8FAFC',
            animation: 'jarvisPopup 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(15, 23, 42, 0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 12px rgba(79, 70, 229, 0.4)'
              }}>
                <Bot size={18} color="#FFFFFF" strokeWidth={2.4} />
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

          {/* Subtitle / Live Transcript Display Area */}
          <div style={{
            padding: '16px 20px',
            background: 'rgba(2, 6, 23, 0.4)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            minHeight: '76px',
            maxHeight: '120px',
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
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            background: 'rgba(15, 23, 42, 0.3)',
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

          {/* Quick Announcement Actions (Phase 5 clickable queries) */}
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '10px', letterSpacing: '0.04em' }}>
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

          {/* Footer with Settings Shortcut */}
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#94A3B8'
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
                color: '#818CF8',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              <Settings size={13} /> Voice Settings
            </button>
          </div>
        </div>
      )}

      {/* Global CSS for Keyframe Animations */}
      <style>{`
        @keyframes jarvisWave {
          0%, 100% { height: 6px; }
          50% { height: 22px; }
        }
        @keyframes jarvisPopup {
          0% { opacity: 0; transform: translateY(12px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
};

