import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
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

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    } catch (err) {
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
      showToast('Saved ✓', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image too large. Max 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const result = await userApi.uploadAvatar(file);
      setProfilePicUrl(result.profilePicUrl);
      setUser({ ...user!, profilePicUrl: result.profilePicUrl });
      showToast('Photo updated ✓', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to upload', 'error');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page-shell">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="profile-page-shell">
      {/* Back navigation */}
      <button
        onClick={() => navigate('/home')}
        className="profile-back-btn"
        aria-label="Go back"
      >
        ← Back
      </button>

      {/* Profile card */}
      <div className="profile-card animate-fade-in-up">
        {/* Avatar section */}
        <div className="profile-avatar-section">
          <div className="relative inline-block">
            <Avatar
              name={fullName || user?.fullName || ''}
              imageUrl={previewUrl || profilePicUrl}
              size="xl"
              className="profile-avatar"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                <Spinner size="sm" />
              </div>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="profile-change-photo-btn"
          >
            Change photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        {/* Full Name */}
        <div className="profile-field">
          <label className="profile-label">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setHasChanges(true);
            }}
            className="profile-input profile-input--editable"
            maxLength={100}
            style={{ fontSize: '16px' }}
          />
        </div>

        {/* College Email (readonly) */}
        <div className="profile-field">
          <label className="profile-label">
            College Email&nbsp;<span className="profile-lock">🔒</span>
            {emailVerified && <span className="profile-verified">verified</span>}
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
            Phone Number&nbsp;<span className="profile-lock">🔒</span>
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
    </div>
  );
}
