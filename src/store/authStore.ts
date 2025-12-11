/**
 * Authentication Store - Zustand store for auth state
 */

import { create } from 'zustand';
import { User, AuthToken, Permission } from '../types/auth';
import { authService } from '../services/AuthService';
import { auditLogger } from '../services/AuditLogger';
import { AuditActions } from '../types/auth';

interface AuthState {
  user: User | null;
  token: AuthToken | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => void;
  hasPermission: (permission: Permission) => boolean;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = await authService.login(email, password);
      set({
        user: token.user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });

      // Log successful login
      auditLogger.log(
        token.user.id,
        token.user.name,
        token.user.role,
        AuditActions.USER_LOGIN,
        { email }
      );
    } catch (error: any) {
      set({
        error: error.message || 'Login failed',
        isLoading: false,
      });

      // Log failed login
      auditLogger.log(
        'unknown',
        'Unknown',
        'VIEWER',
        AuditActions.USER_LOGIN,
        { email },
        { success: false, errorMessage: error.message }
      );
    }
  },

  logout: () => {
    const { user } = get();
    if (user) {
      auditLogger.log(
        user.id,
        user.name,
        user.role,
        AuditActions.USER_LOGOUT,
        {}
      );
    }

    authService.logout();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  restoreSession: () => {
    const token = authService.restoreSession();
    if (token) {
      set({
        user: token.user,
        token,
        isAuthenticated: true,
      });
    }
  },

  hasPermission: (permission: Permission) => {
    return authService.hasPermission(permission);
  },

  clearError: () => set({ error: null }),
}));

// Restore session on store creation
useAuthStore.getState().restoreSession();
