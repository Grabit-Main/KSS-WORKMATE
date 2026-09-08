import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  User, Mail, Shield, Briefcase, KeyRound, Camera,
  Check, AlertCircle, Eye, EyeOff, Lock, RefreshCw,
  Trash2, Sparkles, CheckCircle2, ArrowRight, Upload
} from 'lucide-react';
import { ImageCropModal } from '../components/profile/ImageCropModal';

const ProfilePage = () => {
  const { user, updateCurrentUser } = useAuth();

  // Name & Profile State
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Avatar Upload & Crop State
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarSuccessMsg, setAvatarSuccessMsg] = useState('');
  const [avatarErrorMsg, setAvatarErrorMsg] = useState('');
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const fileInputRef = useRef(null);
  const cameraMenuRef = useRef(null);

  // Progressive Password Change with OTP State
  // 'idle' -> 'send_otp' -> 'enter_otp' -> 'set_new_password'
  const [passwordFlowStep, setPasswordFlowStep] = useState('idle');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
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

  // Click-outside listener for camera options popover
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (cameraMenuRef.current && !cameraMenuRef.current.contains(e.target)) {
        setShowCameraMenu(false);
      }
    };
    if (showCameraMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCameraMenu]);

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

  // 2. Avatar Selection, Interactive Cropping & Upload
  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarErrorMsg('Please select a valid image file (PNG, JPG, WEBP, GIF)');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setAvatarErrorMsg('Image size exceeds 15MB limit');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setRawImageSrc(objectUrl);
    setCropModalOpen(true);
    setShowCameraMenu(false);
    setAvatarErrorMsg('');
  };

  const handleCroppedAvatarSave = async (croppedBlob, previewUrl) => {
    setUploadingAvatar(true);
    setAvatarErrorMsg('');
    setAvatarSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('file', croppedBlob, 'avatar.jpg');

      const res = await api.post('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updatedUser = { ...user, avatar_url: res.data.url };
      updateCurrentUser(updatedUser);
      setAvatarPreview(res.data.url);
      setCropModalOpen(false);
      setRawImageSrc(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setAvatarSuccessMsg('Profile picture cropped and updated successfully!');
      setTimeout(() => setAvatarSuccessMsg(''), 4000);
    } catch (err) {
      setAvatarErrorMsg(err.response?.data?.detail || 'Failed to upload cropped profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    setAvatarErrorMsg('');
    setAvatarSuccessMsg('');
    setShowCameraMenu(false);

    try {
      const res = await api.put('/auth/me', { avatar_url: '' });
      updateCurrentUser(res.data);
      setAvatarPreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setAvatarSuccessMsg('Profile picture removed.');
      setTimeout(() => setAvatarSuccessMsg(''), 4000);
    } catch (err) {
      setAvatarErrorMsg(err.response?.data?.detail || 'Failed to remove profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 3. Progressive Password Change Flow:
  // Step 1: Send OTP
  const handleSendOtp = async () => {
    if (resendTimer > 0) return;
    setOtpSending(true);
    setPassErrorMsg('');
    setPassSuccessMsg('');

    try {
      await api.post('/auth/send-password-otp');
      setResendTimer(60);
      setPasswordFlowStep('enter_otp');
      setPassSuccessMsg(`A 6-digit OTP code has been sent to ${user?.email}`);
    } catch (err) {
      setPassErrorMsg(err.response?.data?.detail || 'Failed to send OTP code. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setPassErrorMsg('Please enter a valid 6-digit OTP code');
      return;
    }

    setOtpVerifying(true);
    setPassErrorMsg('');
    setPassSuccessMsg('');

    try {
      await api.post('/auth/verify-otp', {
        email: user.email,
        otp: otpCode.trim(),
      });
      setPasswordFlowStep('set_new_password');
      setPassSuccessMsg('OTP verified successfully! Please enter your new password.');
    } catch (err) {
      setPassErrorMsg(err.response?.data?.detail || 'Invalid or expired OTP code. Please try again.');
    } finally {
      setOtpVerifying(false);
    }
  };

  // Step 3: Set New Password & Confirm Password
  const handleFinalPasswordChange = async (e) => {
    e.preventDefault();
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
      setPasswordFlowStep('idle');
      setResendTimer(0);
      setTimeout(() => setPassSuccessMsg(''), 6000);
    } catch (err) {
      setPassErrorMsg(err.response?.data?.detail || 'Failed to update password. Ensure OTP is correct.');
    } finally {
      setChangingPass(false);
    }
  };

  const handleCancelPasswordFlow = () => {
    setPasswordFlowStep('idle');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setPassErrorMsg('');
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

            {/* Quick Camera Trigger with Options Popover */}
            <div ref={cameraMenuRef} style={{ position: 'absolute', bottom: '2px', right: '2px', zIndex: 30 }}>
              <button
                type="button"
                onClick={() => setShowCameraMenu(prev => !prev)}
                title="Profile photo options"
                style={{
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

              {/* Camera Action Menu: Upload and (conditionally) Remove */}
              {showCameraMenu && (
                <div className="card modal-animate" style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '180px',
                  padding: '6px',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-float)',
                  border: '1px solid var(--border)',
                  zIndex: 100,
                  background: 'var(--surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCameraMenu(false);
                      fileInputRef.current?.click();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'background var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--subtle)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Upload size={15} style={{ color: 'var(--brand-600)' }} />
                    <span>Upload Photo</span>
                  </button>

                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCameraMenu(false);
                        handleRemoveAvatar();
                      }}
                      disabled={uploadingAvatar}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'transparent',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--status-blocked)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'background var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--status-blocked-bg)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Trash2 size={15} />
                      <span>Remove Photo</span>
                    </button>
                  )}
                </div>
              )}
            </div>
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

          {/* Card 2: Security & Password Change (Progressive Step Flow) */}
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
                  Change Password
                </h3>
                <p className="text-xs text-secondary">
                  Update your account password securely using email verification.
                </p>
              </div>
            </div>

            {/* Global feedback alerts for password actions */}
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
                gap: '8px',
                marginBottom: '16px'
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
                gap: '8px',
                marginBottom: '16px'
              }}>
                <AlertCircle size={16} />
                <span>{passErrorMsg}</span>
              </div>
            )}

            {/* STEP 0: Idle State - Initial "Change Password" Button */}
            {passwordFlowStep === 'idle' && (
              <div style={{
                padding: '18px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--subtle-glass)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div>
                  <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Account Security Credentials
                  </h4>
                  <p className="text-xs text-secondary" style={{ margin: 0 }}>
                    Requires a one-time OTP verification code sent to your registered email.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPasswordFlowStep('send_otp');
                    setPassErrorMsg('');
                    setPassSuccessMsg('');
                  }}
                  className="btn btn-primary"
                  style={{ gap: '8px', padding: '10px 22px' }}
                >
                  <KeyRound size={16} />
                  <span>Change Password</span>
                </button>
              </div>
            )}

            {/* STEP 1: "Send OTP Code to Email Code will be sent to <Mail>" & "Send OTP" button */}
            {passwordFlowStep === 'send_otp' && (
              <div style={{
                padding: '20px 22px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--subtle-glass)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div>
                  <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Send OTP Code to Email
                  </h4>
                  <p className="text-xs text-secondary">
                    Code will be sent to <strong>{user.email}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleCancelPasswordFlow}
                    className="btn btn-secondary"
                    style={{ fontSize: '13px', padding: '9px 16px' }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpSending}
                    className="btn btn-primary"
                    style={{ gap: '8px', fontSize: '13px', padding: '9px 20px' }}
                  >
                    {otpSending ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <Mail size={14} />
                        <span>Send OTP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Ask for OTP & Submit button */}
            {passwordFlowStep === 'enter_otp' && (
              <form onSubmit={handleVerifyOtp} style={{
                padding: '20px 22px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--subtle-glass)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      Enter 6-Digit Verification OTP
                    </h4>
                    <p className="text-xs text-secondary mt-0.5">
                      Verification code sent to <strong>{user.email}</strong>
                    </p>
                  </div>

                  {resendTimer > 0 ? (
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      Resend in {resendTimer}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--brand-600)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <div>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input"
                    placeholder="_ _ _ _ _ _"
                    style={{
                      letterSpacing: '10px',
                      fontSize: '22px',
                      fontWeight: 700,
                      textAlign: 'center',
                      fontFamily: 'monospace',
                      maxWidth: '280px',
                      margin: '6px auto 0',
                      display: 'block'
                    }}
                    required
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px', textAlign: 'center' }}>
                    Code expires in 10 minutes.
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={handleCancelPasswordFlow}
                    className="btn btn-secondary"
                    style={{ fontSize: '13px', padding: '9px 16px' }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={otpVerifying || otpCode.trim().length !== 6}
                    className="btn btn-primary"
                    style={{ gap: '8px', fontSize: '13px', padding: '9px 22px' }}
                  >
                    {otpVerifying ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Check size={15} />
                        <span>Submit OTP</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: When typed and submitted, New Pass and Confirm Pass come */}
            {passwordFlowStep === 'set_new_password' && (
              <form onSubmit={handleFinalPasswordChange} style={{
                padding: '20px 22px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--subtle-glass)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--status-completed-bg)',
                    color: 'var(--status-completed)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <CheckCircle2 size={13} /> OTP Verified
                  </span>
                  <span className="text-xs text-secondary">
                    Please set your new password below.
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
                        autoFocus
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
                    <label className="text-xs font-semibold text-secondary mb-1.5 block">Confirm Password *</label>
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={handleCancelPasswordFlow}
                    className="btn btn-secondary"
                    style={{ fontSize: '13px', padding: '9px 16px' }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={changingPass || !newPassword || !confirmPassword}
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
                        <span>Save New Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>
      </div>

      {/* Interactive Photo Cropper & Adjust Modal */}
      {cropModalOpen && rawImageSrc && (
        <ImageCropModal
          imageSrc={rawImageSrc}
          onCropSave={handleCroppedAvatarSave}
          onClose={() => {
            setCropModalOpen(false);
            setRawImageSrc(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          isUploading={uploadingAvatar}
        />
      )}
    </div>
  );
};

export default ProfilePage;
