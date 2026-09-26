
export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  return (
    <div
      className={`${sizeClasses[size]} border-2 border-white/20 border-t-white rounded-full animate-spin-slow ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
