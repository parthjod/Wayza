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
        {/* Hero Title */}
        <div className="text-center mb-6 sm:mb-8 select-none">
          <h1 className="text-[34px] sm:text-[42px] font-instrument text-white leading-tight">
            Your Wayza <span className="italic font-normal">profile</span>
          </h1>
          <p className="text-xs sm:text-sm text-white/60 mt-1">
            Keep your details up to date.
          </p>
        </div>

        {/* Profile Card */}
        <div className="wayza-profile-card animate-fade-in-up">
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-6">
            <div
              className="relative inline-block cursor-pointer group"
              onClick={() => setShowPhotoActions(true)}
              title="Click to change photo"
            >
              <div className="rounded-full ring-2 ring-white/10 group-hover:ring-blue-400/40 transition-all">
                <Avatar
                  name={fullName || user?.fullName || ''}
                  imageUrl={currentDisplayPhoto}
                  size="xl"
                  className="!w-20 !h-20 text-2xl font-bold shadow-lg"
                />
              </div>

              {/* Camera badge overlay */}
              <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-blue-600 border-2 border-[#121622] flex items-center justify-center text-white text-xs shadow-md group-hover:scale-105 transition-all">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
              </div>

              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs rounded-full">
                  <Spinner size="sm" />
                </div>
              )}
            </div>

            {/* Action buttons under avatar: Change photo & Remove photo */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowPhotoActions(true)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-white text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <svg className="w-3.5 h-3.5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
                <span>Change photo</span>
              </button>

              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={deletingAvatar || !currentDisplayPhoto}
                className={`px-4 py-2 rounded-xl border text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                  currentDisplayPhoto
                    ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/25 text-red-400'
                    : 'bg-red-500/5 border-red-500/15 text-red-400/40 cursor-not-allowed'
                }`}
                title={currentDisplayPhoto ? 'Remove photo' : 'No custom photo to remove'}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                <span>{deletingAvatar ? 'Removing...' : 'Remove photo'}</span>
              </button>
            </div>
          </div>

          {/* Full Name Field */}
          <div className="mb-4 text-left">
            <label className="text-xs text-white/70 font-medium mb-1.5 block">
              Full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setHasChanges(true);
              }}
              placeholder="Your full name"
              className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/15 text-white text-sm focus:border-white/40 focus:outline-none transition-colors"
              maxLength={100}
            />
          </div>

          {/* College Email Field (Readonly) */}
          <div className="mb-4 text-left">
            <label className="text-xs text-white/70 font-medium mb-1.5 block">
              College email
            </label>
            <div className="relative flex items-center w-full">
              <input
                type="email"
                value={email}
                readOnly
                className="w-full px-4 py-3 pr-10 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 text-sm select-none cursor-not-allowed"
              />
              <svg className="absolute right-3.5 w-4 h-4 text-white/35 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <span className="text-[11px] text-white/45 mt-1.5 block">
              Your verified college email can't be edited here.
            </span>
          </div>

          {/* Phone Number Field (Readonly) */}
          <div className="mb-6 text-left">
            <label className="text-xs text-white/70 font-medium mb-1.5 block">
              Phone number
            </label>
            <div className="relative flex items-center w-full">
              <input
                type="text"
                value={formatMaskedPhone(phone)}
                readOnly
                className="w-full px-4 py-3 pr-10 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 text-sm select-none cursor-not-allowed"
              />
              <svg className="absolute right-3.5 w-4 h-4 text-white/35 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <span className="text-[11px] text-white/45 mt-1.5 block">
              Your verified number is linked to your account.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-white/10 pt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="px-6 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white/80 text-sm font-medium transition-all active:scale-95 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold text-sm shadow-[0_4px_16px_rgba(37,99,235,0.4)] transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
            >
              {saving ? <Spinner size="sm" className="border-white/20 border-t-white" /> : 'Save changes'}
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
