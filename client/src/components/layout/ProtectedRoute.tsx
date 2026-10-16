import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { userApi } from '../../api/user.api';
import { Spinner } from '../ui/Spinner';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, clearUser } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }

    userApi
      .getMe()
      .then((fresh) => {
        useAuthStore.getState().setUser({
          id: fresh.id,
          fullName: fresh.fullName,
          profilePicUrl: fresh.profilePicUrl,
        });
        setChecking(false);
      })
      .catch(() => {
        clearUser();
        setChecking(false);
      });
  }, [user, clearUser]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wayza-dark">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
