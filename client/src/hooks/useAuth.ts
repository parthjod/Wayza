import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { userApi } from '../api/user.api';
import { authApi } from '../api/auth.api';

export function useAuth() {
  const { user, isLoading, setUser, clearUser } = useAuthStore();

  useEffect(() => {
    // On mount: try to get user profile
    userApi
      .getMe()
      .then((data) => {
        setUser({
          id: data.id,
          fullName: data.fullName,
          profilePicUrl: data.profilePicUrl,
        });
      })
      .catch(() => {
        clearUser();
      });
  }, []);

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      clearUser();
    }
  };

  return { user, isLoading, setUser, clearUser, logout };
}
