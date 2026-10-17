import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { userApi } from '../api/user.api';

export default function Profile() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
      setEmailVerified(data.emailVerified);
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

  const [deletingAvatar, setDeletingAvatar] = useState(false);

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

  const currentDisplayPhoto = previewUrl || profilePicUrl || user?.profilePicUrl;

  if (loading) {
    return (
      <div className="profile-page-shell flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="profile-page-shell">
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

      {/* Top Header / Back navigation */}
      <div className="w-full max-w-md flex items-center justify-between mb-5 z-20">
        <button
          onClick={() => navigate('/home')}
          className="profile-back-btn flex items-center gap-2 cursor-pointer hover:opacity-90 transition-all"
          aria-label="Go back to Home"
        >
          <span className="text-base leading-none">←</span>
          <span className="font-instrument tracking-widest text-sm font-normal text-white">WAYZA</span>
        </button>
      </div>

      {/* Profile Card */}
      <div className="profile-card animate-fade-in-up">
        {/* Avatar section */}
        <div className="profile-avatar-section">
          <div
            className="relative inline-block cursor-pointer group"
            onClick={() => setShowPhotoActions(true)}
            title="Click to change photo"
          >
            <div className="rounded-full ring-4 ring-blue-500/25 group-hover:ring-blue-500/50 transition-all p-0.5">
              <Avatar
                name={fullName || user?.fullName || ''}
                imageUrl={currentDisplayPhoto}
                size="xl"
                className="profile-avatar"
              />
            </div>

            {/* Camera badge overlay */}
            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 border-2 border-[#0b101e] flex items-center justify-center text-white text-xs shadow-md group-hover:scale-105 transition-all">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>

            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs rounded-full">
                <Spinner size="sm" />
              </div>
            )}
          </div>

          {/* Quick action buttons under avatar */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
            <button
              type="button"
              onClick={() => setShowPhotoActions(true)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 text-xs font-semibold tracking-wide border border-white/15 cursor-pointer transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <span>📷</span>
              <span>{currentDisplayPhoto ? 'Change photo' : 'Add photo'}</span>
            </button>

            {currentDisplayPhoto && (
              <button
                type="button"
                onClick={() => setShowViewModal(true)}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium tracking-wide border border-white/10 cursor-pointer transition-all flex items-center gap-1.5 active:scale-95"
              >
                <span>👁️</span>
                <span>View</span>
              </button>
            )}

            {currentDisplayPhoto && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={deletingAvatar}
                className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium tracking-wide border border-red-500/20 cursor-pointer transition-all flex items-center gap-1.5 active:scale-95"
                title="Remove profile picture"
              >
                <span>🗑️</span>
                <span>{deletingAvatar ? 'Removing...' : 'Remove'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Full Name */}
        <div className="profile-field">
          <label className="profile-label">
            <span>Full Name</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setHasChanges(true);
            }}
            placeholder="Your name"
            className="profile-input profile-input--editable"
            maxLength={100}
          />
        </div>

        {/* College Email (readonly) */}
        <div className="profile-field">
          <label className="profile-label">
            <span>College Email</span>
            {emailVerified ? (
              <span className="profile-verified">✓ Verified</span>
            ) : (
              <span className="text-[10px] text-white/40">🔒 Locked</span>
            )}
          </label>
          <input
            type="email"
            value={email}
            readOnly
            className="profile-input profile-input--locked"
          />
        </div>

        {/* Phone (readonly) */}
        <div className="profile-field profile-field--last">
          <label className="profile-label">
            <span>Phone Number</span>
            <span className="text-[10px] text-white/40">🔒 Locked</span>
          </label>
          <input
            type="tel"
            value={phone}
            readOnly
            className="profile-input profile-input--locked"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="profile-save-btn"
        >
          {saving ? <Spinner size="sm" className="mx-auto border-white/20 border-t-white" /> : 'Save Changes'}
        </button>
      </div>

      {/* Photo Options Modal / Bottom Sheet */}
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

      {/* View Photo Lightbox Modal — shows ONLY the profile picture with dark blurred background */}
      {showViewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setShowViewModal(false)}
        >
          {/* Floating close button */}
          <button
            onClick={() => setShowViewModal(false)}
            className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-xl z-20 transition-all cursor-pointer shadow-lg"
            aria-label="Close"
          >
            ✕
          </button>

          {/* Profile photo only */}
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
