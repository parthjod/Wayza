import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { userApi } from '../api/user.api';
import { LOGIN_BG_VIDEO } from '../utils/constants';

export default function Profile() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deletingAvatar, setDeletingAvatar] = useState(false);

  // Modals
  const [showPhotoActions, setShowPhotoActions] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await userApi.getMe();
      setFullName(data.fullName);
      setEmail(data.collegeEmail);
      setPhone(data.phone);
      setProfilePicUrl(data.profilePicUrl);
    } catch {
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      showToast('Name must be at least 2 characters', 'error');
      return;
    }
    setSaving(true);
    try {
      await userApi.updateMe(fullName.trim());
      setUser({ ...user!, fullName: fullName.trim() });
      setHasChanges(false);
      showToast('Profile updated ✓', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showToast('Image too large. Max 15MB.', 'error');
      return;
    }

    setShowPhotoActions(false);

    // Read base64 preview for instant visual feedback
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const result = await userApi.uploadAvatar(file);
      const rawUrl = result.profilePicUrl;
      const newPicUrl = rawUrl
        ? (rawUrl.startsWith('data:') ? rawUrl : `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}t=${Date.now()}`)
        : null;
      setPreviewUrl(null);
      setProfilePicUrl(newPicUrl);
      setUser({ ...user!, profilePicUrl: newPicUrl });
      showToast('Photo updated ✓', 'success');
    } catch (err: any) {
      setPreviewUrl(null);
      showToast(err.response?.data?.error || 'Failed to upload photo', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setShowPhotoActions(false);
    setDeletingAvatar(true);
    try {
      await userApi.deleteAvatar();
      setPreviewUrl(null);
      setProfilePicUrl(null);
      if (user) {
        setUser({ ...user, profilePicUrl: null });
      }
      showToast('Profile picture removed ✓', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to remove profile picture', 'error');
    } finally {
      setDeletingAvatar(false);
    }
  };

  const formatMaskedPhone = (num?: string) => {
    if (!num) return '+91 98XXXXXX25';
    const digits = num.replace(/\D/g, '');
    if (digits.length >= 10) {
      const last10 = digits.slice(-10);
      return `+91 ${last10.slice(0, 2)}XXXXXX${last10.slice(8)}`;
    }
    return num;
  };

  const currentDisplayPhoto = previewUrl || profilePicUrl || user?.profilePicUrl;

  if (loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <video autoPlay muted loop playsInline className="video-bg">
          <source src={LOGIN_BG_VIDEO} type="video/mp4" />
        </video>
        <div className="video-scrim" />
        <Spinner size="lg" className="relative z-10" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Background Video — same as Auth page */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="video-bg"
      >
        <source src={LOGIN_BG_VIDEO} type="video/mp4" />
      </video>

      {/* Atmospheric Scrim for video contrast */}
      <div className="video-scrim" />

      {/* Hidden file inputs for Gallery and Camera */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        onChange={handleAvatarChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleAvatarChange}
        className="hidden"
      />

      {/* Top Navbar */}
      <header className="fixed top-0 left-0 right-0 w-full flex items-center justify-between px-8 sm:px-12 md:px-14 py-7 sm:py-8 pointer-events-none z-40">
        <div className="pointer-events-auto select-none cursor-pointer" onClick={() => navigate('/home')}>
          <span
            className="text-white text-[32px] sm:text-[36px] font-instrument tracking-[0.14em] drop-shadow-md leading-none select-none"
            style={{ marginLeft: '10px' }}
          >
            WAYZA
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-24">
        {/* Hero Title Section */}
        <div className="profile-hero select-none">
          <h1 className="profile-title">
            Your Wayza <span>profile</span>
          </h1>
          <p className="profile-subtitle">Keep your details up to date.</p>
        </div>

        {/* Profile Card */}
        <div className="wayza-profile-card animate-fade-in-up">

          {/* Avatar */}
          <div className="profile-avatar-section">
            <div
              className="profile-avatar-wrap"
              onClick={() => setShowPhotoActions(true)}
              title="Click to change photo"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowPhotoActions(true);
                }
              }}
            >
              <Avatar
                name={fullName || user?.fullName || ""}
                imageUrl={currentDisplayPhoto}
                size="xl"
                className="!w-[104px] !h-[104px] text-3xl font-semibold shadow-lg"
              />

              <div className="profile-camera-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth={2} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 7h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" />
                  <circle cx="12" cy="12" r="3.5" />
                </svg>
              </div>

              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-full">
                  <Spinner size="sm" />
                </div>
              )}
            </div>

            <div className="profile-photo-actions">
              <button
                type="button"
                onClick={() => setShowPhotoActions(true)}
                className="profile-photo-btn"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth={1.8} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 7h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" />
                  <circle cx="12" cy="12" r="3.5" />
                </svg>
                Change photo
              </button>

              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={deletingAvatar || !currentDisplayPhoto}
                className="profile-remove-btn"
              >
                {deletingAvatar ? "Removing..." : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth={1.8} className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M4 7h16M10 11v6m4-6v6M5 7l1 13h12l1-13M9 7V4h6v3" />
                    </svg>
                    Remove photo
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="profile-divider" />

          {/* Full name */}
          <div className="profile-field">
            <label htmlFor="profile-full-name">Full name</label>
            <input
              id="profile-full-name"
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setHasChanges(true);
              }}
              placeholder="Your full name"
              maxLength={100}
              className="profile-input"
            />
          </div>

          {/* Locked email */}
          <div className="profile-field">
            <label htmlFor="profile-email">College email</label>
            <div className="profile-input-wrap">
              <input
                id="profile-email"
                type="email"
                value={email}
                readOnly
                aria-describedby="profile-email-help"
                className="profile-input profile-input-locked"
              />
              <svg className="profile-lock-icon" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth={1.8}>
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path strokeLinecap="round"
                  d="M8 10V7a4 4 0 018 0v3" />
              </svg>
            </div>
            <p id="profile-email-help" className="profile-help">
              Your verified college email can't be edited here.
            </p>
          </div>

          {/* Locked phone */}
          <div className="profile-field profile-field-last">
            <label htmlFor="profile-phone">Phone number</label>
            <div className="profile-input-wrap">
              <input
                id="profile-phone"
                type="text"
                value={formatMaskedPhone(phone)}
                readOnly
                aria-describedby="profile-phone-help"
                className="profile-input profile-input-locked"
              />
              <svg className="profile-lock-icon" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth={1.8}>
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path strokeLinecap="round"
                  d="M8 10V7a4 4 0 018 0v3" />
              </svg>
            </div>
            <p id="profile-phone-help" className="profile-help">
              Your verified number is linked to your account.
            </p>
          </div>

          {/* Footer */}
          <div className="profile-footer">
            <button
              type="button"
              onClick={() => navigate("/home")}
              className="profile-cancel-btn"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="profile-save-btn"
            >
              {saving ? (
                <Spinner size="sm" className="border-white/30 border-t-white" />
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Photo Options Modal */}
      <Modal open={showPhotoActions} onClose={() => setShowPhotoActions(false)} className="!max-w-xs !p-6">
        <h3 className="text-lg font-instrument text-white mb-4 text-center tracking-wide">
          Profile Photo
        </h3>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              setShowPhotoActions(false);
              cameraInputRef.current?.click();
            }}
            className="w-full py-3.5 px-5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-white font-medium text-sm flex items-center gap-3.5 transition-colors cursor-pointer"
          >
            <span className="text-lg">📸</span>
            <span>Take Photo (Camera)</span>
          </button>

          <button
            onClick={() => {
              setShowPhotoActions(false);
              galleryInputRef.current?.click();
            }}
            className="w-full py-3.5 px-5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-medium text-sm flex items-center gap-3.5 transition-colors cursor-pointer"
          >
            <span className="text-lg">🖼️</span>
            <span>Choose from Library</span>
          </button>

          {currentDisplayPhoto && (
            <button
              onClick={() => {
                setShowPhotoActions(false);
                setShowViewModal(true);
              }}
              className="w-full py-3.5 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-medium text-sm flex items-center gap-3.5 transition-colors cursor-pointer"
            >
              <span className="text-lg">👁️</span>
              <span>View Profile Picture</span>
            </button>
          )}

          {currentDisplayPhoto && (
            <button
              onClick={handleRemovePhoto}
              className="w-full py-3.5 px-5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 font-medium text-sm flex items-center gap-3.5 transition-colors cursor-pointer"
            >
              <span className="text-lg">🗑️</span>
              <span>Remove Profile Picture</span>
            </button>
          )}

          <button
            onClick={() => setShowPhotoActions(false)}
            className="w-full py-3 px-5 rounded-xl bg-transparent hover:bg-white/5 text-white/50 text-xs font-medium text-center transition-colors cursor-pointer mt-1"
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* View Photo Lightbox Modal */}
      {showViewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setShowViewModal(false)}
        >
          <button
            onClick={() => setShowViewModal(false)}
            className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-xl z-20 transition-all cursor-pointer shadow-lg"
            aria-label="Close"
          >
            ✕
          </button>

          {currentDisplayPhoto ? (
            <img
              src={currentDisplayPhoto}
              alt={fullName || user?.fullName || 'Profile photo'}
              className="max-w-[85vw] max-h-[75vh] rounded-3xl object-contain shadow-2xl border border-white/20 select-none animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              className="w-56 h-56 rounded-3xl flex items-center justify-center bg-white/10 border border-white/20 shadow-2xl animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              <Avatar name={fullName || user?.fullName || ''} size="xl" className="scale-150" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
