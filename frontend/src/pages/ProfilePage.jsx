import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  User, Mail, Shield, Briefcase, KeyRound, Camera,
  Check, AlertCircle, Eye, EyeOff, Lock, RefreshCw,
  Trash2, Sparkles, CheckCircle2, ArrowRight
} from 'lucide-react';

const ProfilePage = () => {
  const { user, updateCurrentUser } = useAuth();

  // Name & Profile State
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Avatar Upload State
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarSuccessMsg, setAvatarSuccessMsg] = useState('');
  const [avatarErrorMsg, setAvatarErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  // Password Change with OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [passSuccessMsg, setPassSuccessMsg] = useState('');
  const [passErrorMsg, setPassErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setAvatarPreview(user.avatar_url || '');
    }
  }, [user]);

  // Resend OTP countdown timer
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // 1. Update Name
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setProfileErrorMsg('First name and last name are required');
      return;
    }

    setSavingProfile(true);
    setProfileErrorMsg('');
    setProfileSuccessMsg('');

    try {
      const res = await api.put('/auth/me', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      updateCurrentUser(res.data);
      setProfileSuccessMsg('Profile information updated successfully!');
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    } catch (err) {
      setProfileErrorMsg(err.response?.data?.detail || 'Failed to update profile details');
    } finally {
      setSavingProfile(false);
    }
  };

  // 2. Avatar Selection & Upload
  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarErrorMsg('Please select a valid image file (PNG, JPG, WEBP, GIF)');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setAvatarErrorMsg('Image size exceeds 8MB limit');
      return;
    }

    setSelectedAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarErrorMsg('');
  };

  const handleUploadAvatar = async () => {
    if (!selectedAvatarFile) return;

    setUploadingAvatar(true);
    setAvatarErrorMsg('');
    setAvatarSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('file', selectedAvatarFile);

      const res = await api.post('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updatedUser = { ...user, avatar_url: res.data.url };
      updateCurrentUser(updatedUser);
      setSelectedAvatarFile(null);
      setAvatarSuccessMsg('Profile picture updated successfully!');
      setTimeout(() => setAvatarSuccessMsg(''), 4000);
    } catch (err) {
      setAvatarErrorMsg(err.response?.data?.detail || 'Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    setAvatarErrorMsg('');
    setAvatarSuccessMsg('');

    try {
      const res = await api.put('/auth/me', { avatar_url: '' });
      updateCurrentUser(res.data);
      setAvatarPreview('');
      setSelectedAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setAvatarSuccessMsg('Profile picture removed.');
      setTimeout(() => setAvatarSuccessMsg(''), 4000);
    } catch (err) {
      setAvatarErrorMsg(err.response?.data?.detail || 'Failed to remove profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 3. Password Change with OTP
  const handleRequestOtp = async () => {
    if (resendTimer > 0) return;
    setOtpSending(true);
    setPassErrorMsg('');
    setPassSuccessMsg('');

    try {
      await api.post('/auth/send-password-otp');
      setOtpSent(true);
      setResendTimer(60);
      setPassSuccessMsg(`A 6-digit verification code has been sent to ${user?.email}`);
    } catch (err) {
      setPassErrorMsg(err.response?.data?.detail || 'Failed to send OTP code. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setPassErrorMsg('Please enter the 6-digit verification OTP');
      return;
    }
    if (newPassword.length < 6) {
      setPassErrorMsg('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassErrorMsg('New password and confirm password do not match');
      return;
    }

    setChangingPass(true);
    setPassErrorMsg('');
    setPassSuccessMsg('');

    try {
      await api.post('/auth/change-password', {
        otp: otpCode.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setPassSuccessMsg('Password updated successfully! Your account is now secured with the new password.');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpSent(false);
      setResendTimer(0);
    } catch (err) {
      setPassErrorMsg(err.response?.data?.detail || 'Failed to change password. Ensure the OTP is correct.');
    } finally {
      setChangingPass(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 className="text-2xl font-bold" style={{ letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
          Profile & Account Settings
        </h2>
        <p className="text-sm text-secondary mt-1">
          Manage your personal details, profile picture, and secure password settings.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', gap: '28px', alignItems: 'start' }}>
        
        {/* Left Column: Avatar & Quick Info Card */}
        <div className="card" style={{
          padding: '28px 24px',
          background: 'var(--surface-glass)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          {/* Avatar Picture Circle */}
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <div style={{
              width: '124px',
              height: '124px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--brand-gradient)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '36px',
              letterSpacing: '-0.02em',
              overflow: 'hidden',
              boxShadow: '0 8px 24px -4px rgba(99, 102, 241, 0.35)',
              border: '4px solid var(--surface)'
            }}>
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={user.full_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`
              )}
            </div>

            {/* Quick Camera Trigger */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload new photo"
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--brand-600)',
                color: 'white',
                border: '3px solid var(--surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-card)',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Camera size={18} />
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarFileChange}
            accept="image/png,image/jpeg,image/webp,image/gif"
            style={{ display: 'none' }}
          />

          {/* User Name & Badges */}
          <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {user.first_name} {user.last_name}
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--brand-100)',
              color: 'var(--brand-700)',
              letterSpacing: '0.02em'
            }}>
              {user.role}
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--subtle)',
              color: 'var(--text-secondary)'
            }}>
              {user.department || 'General'}
            </span>
          </div>

          <p className="text-xs text-secondary mt-2 text-truncate" style={{ maxWidth: '100%' }}>
            {user.email}
          </p>

          {/* Avatar Actions */}
          <div style={{ marginTop: '20px', width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selectedAvatarFile ? (
              <button
                type="button"
                onClick={handleUploadAvatar}
                disabled={uploadingAvatar}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
              >
                {uploadingAvatar ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Uploading Photo...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Save New Photo</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
              >
                <Camera size={16} />
                <span>Update Profile Pic</span>
              </button>
            )}

            {avatarPreview && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={uploadingAvatar}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--status-blocked)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'opacity var(--transition-fast)'
                }}
              >
                <Trash2 size={14} />
                <span>Remove Photo</span>
              </button>
            )}
          </div>

          {avatarSuccessMsg && (
            <div style={{
              marginTop: '14px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--status-completed-bg)',
              color: 'var(--status-completed)',
              fontSize: '12px',
              fontWeight: 600,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={15} />
              <span>{avatarSuccessMsg}</span>
            </div>
          )}

          {avatarErrorMsg && (
            <div style={{
              marginTop: '14px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--status-blocked-bg)',
              color: 'var(--status-blocked)',
              fontSize: '12px',
              fontWeight: 600,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              justifyContent: 'center'
            }}>
              <AlertCircle size={15} />
              <span>{avatarErrorMsg}</span>
            </div>
          )}
        </div>

        {/* Right Column: Name Edit & OTP Password Change Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Card 1: Personal Details (Edit Name) */}
          <div className="card" style={{
            padding: '28px',
            background: 'var(--surface-glass)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--brand-50)',
                color: 'var(--brand-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <User size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  Personal Information
                </h3>
                <p className="text-xs text-secondary">
                  Update your displayed name and check your organizational role.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">First Name *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input"
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">Last Name *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input"
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="input"
                      style={{ background: 'var(--subtle)', color: 'var(--text-secondary)', cursor: 'not-allowed', paddingLeft: '36px' }}
                    />
                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
                    Primary email used for sign-in and security OTPs.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">Designation & Role</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={`${user.role} · ${user.department || 'Not Specified'}`}
                      disabled
                      className="input"
                      style={{ background: 'var(--subtle)', color: 'var(--text-secondary)', cursor: 'not-allowed', paddingLeft: '36px' }}
                    />
                    <Briefcase size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
                    Assigned by Management / HR.
                  </span>
                </div>
              </div>

              {profileSuccessMsg && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--status-completed-bg)',
                  color: 'var(--status-completed)',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle2 size={16} />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {profileErrorMsg && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--status-blocked-bg)',
                  color: 'var(--status-blocked)',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} />
                  <span>{profileErrorMsg}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="btn btn-primary"
                  style={{ gap: '8px', padding: '10px 24px' }}
                >
                  {savingProfile ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Save Name Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Security & Password Change (with OTP verification) */}
          <div className="card" style={{
            padding: '28px',
            background: 'var(--surface-glass)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(238, 242, 255, 0.9)',
                color: 'var(--brand-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  Change Password (OTP Verification)
                </h3>
                <p className="text-xs text-secondary">
                  For your security, changing your password requires verifying a 6-digit code sent to your registered email.
                </p>
              </div>
            </div>

            {/* Step 1: Request OTP */}
            <div style={{
              padding: '16px 18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--subtle-glass)',
              border: '1px solid var(--border)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              <div>
                <span className="font-semibold text-xs block" style={{ color: 'var(--text-primary)' }}>
                  Send OTP Code to Email
                </span>
                <span className="text-xs text-secondary mt-0.5 block">
                  Code will be sent to <strong>{user.email}</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={otpSending || resendTimer > 0}
                className="btn btn-secondary"
                style={{ gap: '8px', fontSize: '13px' }}
              >
                {otpSending ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : resendTimer > 0 ? (
                  <span>Resend Code ({resendTimer}s)</span>
                ) : (
                  <>
                    <Mail size={14} />
                    <span>{otpSent ? 'Resend OTP Code' : 'Send Verification OTP'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Step 2: Enter OTP & New Password */}
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">
                  6-Digit Verification OTP *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="input"
                    placeholder="e.g. 123456"
                    style={{
                      letterSpacing: '6px',
                      fontSize: '18px',
                      fontWeight: 700,
                      textAlign: 'center',
                      fontFamily: 'monospace',
                      maxWidth: '240px'
                    }}
                    required
                  />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
                  Enter the 6-digit code received on your email. Code expires in 10 minutes.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">New Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input"
                      placeholder="Minimum 6 characters"
                      required
                      style={{ paddingRight: '40px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer'
                      }}
                    >
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">Confirm New Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input"
                      placeholder="Re-enter new password"
                      required
                      style={{ paddingRight: '40px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer'
                      }}
                    >
                      {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {passSuccessMsg && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--status-completed-bg)',
                  color: 'var(--status-completed)',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle2 size={16} />
                  <span>{passSuccessMsg}</span>
                </div>
              )}

              {passErrorMsg && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--status-blocked-bg)',
                  color: 'var(--status-blocked)',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} />
                  <span>{passErrorMsg}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="submit"
                  disabled={changingPass || !otpCode}
                  className="btn btn-primary"
                  style={{ gap: '8px', padding: '10px 24px' }}
                >
                  {changingPass ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>Verify OTP & Change Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
