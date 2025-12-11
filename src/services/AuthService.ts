/**
 * Authentication Service - Local authentication stub for demo
 * In production, would integrate with OAuth2/OIDC provider
 */

import { User, UserRole, Permission, RolePermissions, AuthToken } from '../types/auth';
import { nanoid } from 'nanoid';

// Demo users
const DEMO_USERS: User[] = [
  {
    id: 'user-admin',
    email: 'admin@skyeye.com',
    name: 'Admin User',
    role: 'ADMIN',
    isActive: true,
    createdAt: Date.now() - 86400000 * 30, // 30 days ago
  },
  {
    id: 'user-operator',
    email: 'operator@skyeye.com',
    name: 'Operator User',
    role: 'OPERATOR',
    isActive: true,
    createdAt: Date.now() - 86400000 * 15,
  },
  {
    id: 'user-viewer',
    email: 'viewer@skyeye.com',
    name: 'Viewer User',
    role: 'VIEWER',
    isActive: true,
    createdAt: Date.now() - 86400000 * 7,
  },
];

// Demo password (in production, would use proper password hashing)
const DEMO_PASSWORD = 'demo';

export class AuthService {
  private currentToken: AuthToken | null = null;

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthToken> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Find user
    const user = DEMO_USERS.find(u => u.email === email && u.isActive);

    if (!user || password !== DEMO_PASSWORD) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    user.lastLoginAt = Date.now();

    // Create token
    const token: AuthToken = {
      token: `token-${nanoid()}`,
      user,
      expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
    };

    this.currentToken = token;

    // Store in localStorage
    localStorage.setItem('auth_token', JSON.stringify(token));

    return token;
  }

  /**
   * Logout
   */
  logout(): void {
    this.currentToken = null;
    localStorage.removeItem('auth_token');
  }

  /**
   * Restore session from localStorage
   */
  restoreSession(): AuthToken | null {
    try {
      const stored = localStorage.getItem('auth_token');
      if (!stored) return null;

      const token: AuthToken = JSON.parse(stored);

      // Check if expired
      if (token.expiresAt < Date.now()) {
        this.logout();
        return null;
      }

      this.currentToken = token;
      return token;
    } catch (error) {
      console.error('Failed to restore session:', error);
      return null;
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentToken?.user || null;
  }

  /**
   * Get current token
   */
  getCurrentToken(): AuthToken | null {
    return this.currentToken;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentToken !== null && this.currentToken.expiresAt > Date.now();
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission: Permission): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    const permissions = RolePermissions[user.role];
    return permissions.includes(permission);
  }

  /**
   * Check if user has role
   */
  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(...roles: UserRole[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }

  /**
   * Get all demo users (for demo purposes)
   */
  getDemoUsers(): User[] {
    return DEMO_USERS;
  }

  /**
   * Get demo password (for demo purposes)
   */
  getDemoPassword(): string {
    return DEMO_PASSWORD;
  }
}

// Export singleton instance
export const authService = new AuthService();
