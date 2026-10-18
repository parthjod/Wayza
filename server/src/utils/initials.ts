import { env } from '../config/env';

/**
 * Generate initials from a full name (max 2 characters)
 */
export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Generate a consistent color from a name (for avatar backgrounds)
 */
export function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

/**
 * Safely resolve a stored profilePicKey into a usable browser URL
 */
export function resolveProfilePicUrl(profilePicKey?: string | null, userId?: string): string | null {
  if (!profilePicKey) return null;
  if (profilePicKey.startsWith('http://') || profilePicKey.startsWith('https://') || profilePicKey.startsWith('data:')) {
    return profilePicKey;
  }
  const isCloudFrontValid = env.AWS_CLOUDFRONT_DOMAIN && !env.AWS_CLOUDFRONT_DOMAIN.includes('your-cloudfront');
  if (isCloudFrontValid) {
    return `https://${env.AWS_CLOUDFRONT_DOMAIN}/${profilePicKey}`;
  }
  if (userId) {
    return `/api/user/avatar/${userId}`;
  }
  return null;
}

