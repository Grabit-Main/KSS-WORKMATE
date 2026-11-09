import React, { useState, useEffect } from 'react';
import {
  Bot, Volume2, VolumeX, Sparkles, Sliders,
  Clock, Play, RotateCcw, Check, CheckCircle2
} from 'lucide-react';
import { useJarvis } from '../../hooks/useJarvis';
import {
  getAvailableVoices,
  jarvisSpeak,
  DEFAULT_JARVIS_PREFS
} from '../../services/jarvisVoiceService';

export const JarvisSettings = () => {
  const {
    isSupported,
    prefs,
    updatePreferences,
    resetIntro,
    speakGreeting
  } = useJarvis();

  const [voices, setVoices] = useState([]);
  const [testPlaying, setTestPlaying] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const list = getAvailableVoices();
    setVoices(list);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const handleVoicesChanged = () => {
        setVoices(window.speechSynthesis.getVoices());
      };
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    }
  }, []);

  const handleToggle = (key) => {
    updatePreferences({ [key]: !prefs[key] });
    triggerSavedFeedback();
  };

  const handleChange = (key, value) => {
    updatePreferences({ [key]: value });
    triggerSavedFeedback();
  };

  const triggerSavedFeedback = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 1800);
  };

  const handleTestVoice = async () => {
    setTestPlaying(true);
    try {
      await jarvisSpeak('Hello! I am JARVIS. Your voice and speech settings are configured successfully.');
    } finally {
      setTestPlaying(false);
    }
  };

  const handleResetDefaults = () => {
    updatePreferences(DEFAULT_JARVIS_PREFS);
    triggerSavedFeedback();
  };

  const handleResetIntro = () => {
    resetIntro();
    speakGreeting(true); // Announce first-time greeting immediately
  };

  if (!isSupported) {
    return (
      <div style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid #E2E8F0',
        padding: '24px 28px',
        marginBottom: '24px',
        color: '#64748B',
        fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
      }}>
        Speech synthesis is not supported by your current browser.
      </div>
    );
  }

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '20px',
      border: '1px solid #E2E8F0',
      padding: '24px 28px',
      marginBottom: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
            flexShrink: 0
          }}>
            <Bot size={22} strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                JARVIS Voice Assistant
              </h3>
              <span style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '20px',
                background: prefs.enabled ? '#ECFDF5' : '#F1F5F9',
                color: prefs.enabled ? '#059669' : '#64748B',
                fontWeight: 700
              }}>
                {prefs.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
              Personalized voice greetings, role-based work summaries, and smart deadline announcements
            </p>
          </div>
        </div>

        {/* Master Enable Toggle */}
        <button
          type="button"
          onClick={() => handleToggle('enabled')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 16px',
            borderRadius: '12px',
            background: prefs.enabled ? '#4F46E5' : '#E2E8F0',
            color: prefs.enabled ? '#FFFFFF' : '#475569',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background 0.2s',
            boxShadow: prefs.enabled ? '0 3px 10px rgba(79, 70, 229, 0.3)' : 'none'
          }}
        >
          {prefs.enabled ? 'JARVIS Enabled' : 'Enable JARVIS'}
        </button>
      </div>

      {prefs.enabled && (
        <>
          {/* Toggles Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '22px' }}>
            {/* Toggle 1: Auto Greeting */}
            <div style={{
              padding: '16px 18px',
              borderRadius: '14px',
              border: '1px solid #F1F5F9',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                  Automatic Login Greeting
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Speak personal introduction & daily work update upon login
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('autoGreeting')}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '99px',
                  background: prefs.autoGreeting ? '#4F46E5' : '#CBD5E1',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  position: 'absolute',
                  top: '3px',
                  left: prefs.autoGreeting ? '23px' : '3px',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </button>
            </div>

            {/* Toggle 2: Task Announcements */}
            <div style={{
              padding: '16px 18px',
              borderRadius: '14px',
              border: '1px solid #F1F5F9',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                  Task Summary Announcements
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Include assigned tasks and progress in daily briefings
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('taskAnnouncements')}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '99px',
                  background: prefs.taskAnnouncements ? '#4F46E5' : '#CBD5E1',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  position: 'absolute',
                  top: '3px',
                  left: prefs.taskAnnouncements ? '23px' : '3px',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </button>
            </div>

            {/* Toggle 3: Deadline Reminders */}
            <div style={{
              padding: '16px 18px',
              borderRadius: '14px',
              border: '1px solid #F1F5F9',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                  Smart Deadline Reminders
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Spoken alerts for tasks approaching deadlines or overdue
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('deadlineReminders')}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '99px',
                  background: prefs.deadlineReminders ? '#4F46E5' : '#CBD5E1',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  position: 'absolute',
                  top: '3px',
                  left: prefs.deadlineReminders ? '23px' : '3px',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </button>
            </div>

            {/* Toggle 4: Quiet Hours */}
            <div style={{
              padding: '16px 18px',
              borderRadius: '14px',
              border: '1px solid #F1F5F9',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                  Quiet Hours
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Mute all spoken voice notifications during resting hours
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('quietHoursEnabled')}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '99px',
                  background: prefs.quietHoursEnabled ? '#4F46E5' : '#CBD5E1',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  position: 'absolute',
                  top: '3px',
                  left: prefs.quietHoursEnabled ? '23px' : '3px',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </button>
            </div>
          </div>

          {/* Voice Engine Adjustments */}
          <div style={{
            padding: '20px',
            borderRadius: '16px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            marginBottom: '22px'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={16} color="#4F46E5" /> Voice Customization & System Synthesizer
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {/* Voice Selection */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Synthesizer Voice
                </label>
                <select
                  value={prefs.voiceURI || ''}
                  onChange={e => handleChange('voiceURI', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontSize: '13px',
                    color: '#0F172A',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="">Default Recommended Natural Voice</option>
                  {voices.map((v, i) => (
                    <option key={v.voiceURI || i} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              {/* Volume Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Volume</label>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>{Math.round((prefs.volume ?? 0.9) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={prefs.volume ?? 0.9}
                  onChange={e => handleChange('volume', parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#4F46E5' }}
                />
              </div>

              {/* Speech Rate Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Speech Rate</label>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>{(prefs.rate ?? 1.0).toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.4"
                  step="0.05"
                  value={prefs.rate ?? 1.0}
                  onChange={e => handleChange('rate', parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#4F46E5' }}
                />
              </div>

              {/* Quiet Hours Times */}
              {prefs.quietHoursEnabled && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Quiet Hours Range
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="time"
                      value={prefs.quietHoursStart || '22:00'}
                      onChange={e => handleChange('quietHoursStart', e.target.value)}
                      style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', flex: 1 }}
                    />
                    <span style={{ fontSize: '12px', color: '#64748B' }}>to</span>
                    <input
                      type="time"
                      value={prefs.quietHoursEnd || '08:00'}
                      onChange={e => handleChange('quietHoursEnd', e.target.value)}
                      style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', flex: 1 }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            paddingTop: '16px',
            borderTop: '1px solid #F1F5F9'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleTestVoice}
                disabled={testPlaying}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  background: '#EEF2FF',
                  color: '#4F46E5',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Play size={14} /> {testPlaying ? 'Speaking...' : 'Test JARVIS Voice'}
              </button>

              <button
                type="button"
                onClick={handleResetIntro}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  background: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Hear JARVIS's full introduction again"
              >
                <Sparkles size={14} color="#818CF8" /> Re-experience Introduction
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetDefaults}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: '10px',
                background: 'transparent',
                color: '#94A3B8',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={13} /> Reset Defaults
            </button>
          </div>
        </>
      )}
    </div>
  );
};

