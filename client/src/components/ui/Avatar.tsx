import { useState, useEffect } from 'react';
import { getInitials, getColorFromName } from '../../utils/initials';

interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export function Avatar({ name, imageUrl, size = 'md', className = '' }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(name);
  const color = getColorFromName(name);

  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt={`${name}'s avatar`}
        onError={() => setImgError(true)}
        className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold text-white ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: color }}
      aria-label={`${name}'s avatar`}
    >
      {initials}
    </div>
  );
}
