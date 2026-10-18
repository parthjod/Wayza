import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/ui/Toast';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { userApi } from '../api/user.api';
import { LOGIN_BG_VIDEO } from '../utils/constants';

// Helper to compress image on client before upload (keeps file under 30KB, ultra fast upload, fits in any NGINX body)
async function compressImage(file: File, maxDim = 320, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [deletingAvatar, setDeletingAvatar] = useState(false);

  // Modals
  const [showPhotoActions, setShowPhotoActions] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const openCamera = async (facing: 'user' | 'environment' = facingMode) => {
    setShowPhotoActions(false);
    setShowCameraModal(true);
    setCameraError(null);
    setCapturedPhoto(null);
    stopCameraStream();

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported on this browser. Please choose from library.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera open failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Unable to open camera: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const closeCameraModal = () => {
    stopCameraStream();
    setShowCameraModal(false);
    setCapturedPhoto(null);
    setCameraError(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;

    if (facingMode === 'user') {
      ctx.translate(600, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, startX, startY, size, size, 0, 0, 600, 600);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPhoto(dataUrl);
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
  };

  const confirmCapturedPhoto = () => {
    if (!capturedPhoto) return;
    fetch(capturedPhoto)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        closeCameraModal();
        setShowPhotoActions(false);
        setPreviewUrl(capturedPhoto);
        setPendingPhotoFile(file);
        setHasChanges(true);
      })
      .catch((err) => {
        console.error('Failed to process captured photo:', err);
        showToast('Failed to process photo', 'error');
      });
  };

  const switchCameraFacing = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    openCamera(nextFacing);
  };

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
      let updatedPicUrl = profilePicUrl;

      // 1. If a new photo was selected, compress and upload
      if (pendingPhotoFile) {
        const compressed = await compressImage(pendingPhotoFile);
        const result = await userApi.uploadAvatar(compressed);
        const rawUrl = result.profilePicUrl;
        updatedPicUrl = rawUrl || null;
        if (updatedPicUrl) {
          setProfilePicUrl(updatedPicUrl);
        }
        setPendingPhotoFile(null);
      }

      // 2. Save full name if provided
      const trimmedName = fullName.trim();
      await userApi.updateMe(trimmedName);

      // 3. Atomically update auth store so all screens (Home, Navbar, Profile) sync instantly
      const currentUser = useAuthStore.getState().user;
      useAuthStore.getState().setUser({
        ...(currentUser || {}),
        id: currentUser?.id || user?.id || '',
        fullName: trimmedName,
        profilePicUrl: updatedPicUrl,
      });

      setPreviewUrl(null);
      setHasChanges(false);
      showToast('Profile updated ✓', 'success');

      // 4. Redirect to home page
      navigate('/home', { replace: true });
    } catch (err: any) {
      console.error('Save profile error:', err);
      showToast(err.response?.data?.error || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      showToast('Image too large. Max 25MB.', 'error');
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setPendingPhotoFile(file);
    setHasChanges(true);
    setShowPhotoActions(false);

    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleRemovePhoto = async () => {
    setShowPhotoActions(false);
    setDeletingAvatar(true);
    try {
      await userApi.deleteAvatar();
      setPreviewUrl(null);
      setProfilePicUrl(null);
      setPendingPhotoFile(null);
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.getState().setUser({ ...currentUser, profilePicUrl: null });
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
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-16">
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
                className="!w-[88px] !h-[88px] text-2xl font-semibold shadow-lg"
              />

              <div className="profile-camera-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth={2} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 7h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" />
                  <circle cx="12" cy="12" r="3.5" />
                </svg>
              </div>

              {saving && (
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
          {/* 1. Take Photo (Live Camera) */}
          <button
            type="button"
            onClick={() => openCamera()}
            className="w-full py-3.5 px-5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-white font-medium text-sm flex items-center gap-3.5 transition-colors cursor-pointer active:scale-98"
          >
            <span className="text-lg">📸</span>
            <span>Take Photo (Camera)</span>
          </button>

          {/* 2. Choose from Library */}
          <button
            type="button"
            onClick={() => {
              setShowPhotoActions(false);
              galleryInputRef.current?.click();
            }}
            className="w-full py-3.5 px-5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-medium text-sm flex items-center gap-3.5 transition-colors cursor-pointer active:scale-98"
          >
            <span className="text-lg">🖼️</span>
            <span>Choose from Library</span>
          </button>

          {/* 3. View Profile Picture (Incorporated alongside the other 2) */}
          <button
            type="button"
            onClick={() => {
              setShowPhotoActions(false);
              setShowViewModal(true);
            }}
            className="w-full py-3.5 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 font-medium text-sm flex items-center gap-3.5 transition-colors cursor-pointer active:scale-98"
          >
            <span className="text-lg">👁️</span>
            <span>View Profile Picture</span>
          </button>

          {/* 4. Remove Profile Picture (if available) */}
          {currentDisplayPhoto && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="w-full py-3.5 px-5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 font-medium text-sm flex items-center gap-3.5 transition-colors cursor-pointer active:scale-98"
            >
              <span className="text-lg">🗑️</span>
              <span>Remove Profile Picture</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowPhotoActions(false)}
            className="w-full py-2.5 px-5 rounded-xl bg-transparent hover:bg-white/5 text-white/50 text-xs font-medium text-center transition-colors cursor-pointer mt-1"
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* Live Camera Viewfinder Modal */}
      {showCameraModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={closeCameraModal}
        >
          <div
            className="relative w-full max-w-sm bg-[#16181d] border border-white/20 rounded-2xl p-5 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <span>📸</span> Take Profile Photo
              </h3>
              <button
                type="button"
                onClick={closeCameraModal}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {cameraError ? (
              <div className="w-full py-6 px-3 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center text-xl mb-3">
                  ⚠️
                </div>
                <p className="text-xs sm:text-sm text-white/80 mb-5 leading-relaxed">{cameraError}</p>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => openCamera()}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeCameraModal();
                      galleryInputRef.current?.click();
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Choose from library
                  </button>
                </div>
              </div>
            ) : capturedPhoto ? (
              <div className="w-full flex flex-col items-center">
                <div className="relative w-60 h-60 rounded-full overflow-hidden border-4 border-blue-500/70 shadow-2xl mb-5">
                  <img src={capturedPhoto} alt="Captured preview" className="w-full h-full object-cover" />
                </div>
                <div className="flex items-center gap-3 w-full justify-center">
                  <button
                    type="button"
                    onClick={retakePhoto}
                    className="flex-1 max-w-[130px] py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold transition-all cursor-pointer active:scale-95"
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={confirmCapturedPhoto}
                    className="flex-1 max-w-[130px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all cursor-pointer active:scale-95"
                  >
                    Use Photo
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                <div className="relative w-60 h-60 rounded-full overflow-hidden border-4 border-white/20 bg-black shadow-inner mb-5">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                  />
                  {/* Subtle face circle guide */}
                  <div className="absolute inset-0 rounded-full border-2 border-white/30 pointer-events-none" />
                </div>

                <div className="flex items-center justify-center gap-6 w-full">
                  <button
                    type="button"
                    onClick={switchCameraFacing}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
                    title="Switch camera"
                  >
                    🔄
                  </button>

                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 ring-4 ring-white/30 flex items-center justify-center text-white text-xl shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    aria-label="Snap photo"
                  >
                    📸
                  </button>

                  <button
                    type="button"
                    onClick={closeCameraModal}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Photo Lightbox Modal */}
      {showViewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setShowViewModal(false)}
        >
          <button
            type="button"
            onClick={() => setShowViewModal(false)}
            className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-xl z-20 transition-all cursor-pointer shadow-lg"
            aria-label="Close"
          >
            ✕
          </button>

          <div
            className="flex flex-col items-center gap-4 max-w-[90vw] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {currentDisplayPhoto ? (
              <img
                src={currentDisplayPhoto}
                alt={fullName || user?.fullName || 'Profile photo'}
                className="max-w-[85vw] max-h-[70vh] rounded-3xl object-contain shadow-2xl border border-white/20 select-none"
              />
            ) : (
              <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-full flex items-center justify-center shadow-2xl border-2 border-white/20 overflow-hidden">
                <Avatar
                  name={fullName || user?.fullName || ''}
                  size="xl"
                  className="!w-full !h-full !text-6xl font-bold"
                />
              </div>
            )}
            <div className="text-center">
              <p className="text-white font-medium text-base tracking-wide">
                {fullName || user?.fullName || 'Profile Picture'}
              </p>
              <p className="text-white/50 text-xs mt-0.5">
                {currentDisplayPhoto ? 'Current photo' : 'Default initials avatar'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
