/**
 * Audit Logger - Records all significant actions for compliance and security
 */

import { AuditLogEntry, AuditAction, UserRole } from '../types/auth';
import { nanoid } from 'nanoid';

export class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs: number = 1000;
  private listeners: ((entry: AuditLogEntry) => void)[] = [];

  /**
   * Log an action
   */
  log(
    userId: string,
    userName: string,
    userRole: UserRole,
    action: AuditAction,
    details: Record<string, any> = {},
    options: {
      entityType?: string;
      entityId?: string;
      success?: boolean;
      errorMessage?: string;
    } = {}
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: `audit-${nanoid()}`,
      timestamp: Date.now(),
      userId,
      userName,
      userRole,
      action,
      entityType: options.entityType,
      entityId: options.entityId,
      details,
      success: options.success !== undefined ? options.success : true,
      errorMessage: options.errorMessage,
    };

    // Add to logs
    this.logs.push(entry);

    // Trim if exceeds max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Persist to localStorage (last 100 entries)
    this.persistLogs();

    // Notify listeners
    this.notifyListeners(entry);

    // Console log in development
    if (import.meta.env.DEV) {
      console.log(
        `[AUDIT] ${userName} (${userRole}) - ${action}`,
        options.entityType ? `[${options.entityType}:${options.entityId}]` : '',
        entry.success ? '✓' : '✗',
        details
      );
    }

    return entry;
  }

  /**
   * Get all logs
   */
  getAllLogs(): AuditLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by criteria
   */
  filterLogs(criteria: {
    userId?: string;
    action?: AuditAction;
    entityType?: string;
    entityId?: string;
    success?: boolean;
    startTime?: number;
    endTime?: number;
  }): AuditLogEntry[] {
    return this.logs.filter(log => {
      if (criteria.userId && log.userId !== criteria.userId) return false;
      if (criteria.action && log.action !== criteria.action) return false;
      if (criteria.entityType && log.entityType !== criteria.entityType) return false;
      if (criteria.entityId && log.entityId !== criteria.entityId) return false;
      if (criteria.success !== undefined && log.success !== criteria.success) return false;
      if (criteria.startTime && log.timestamp < criteria.startTime) return false;
      if (criteria.endTime && log.timestamp > criteria.endTime) return false;
      return true;
    });
  }

  /**
   * Get logs for specific entity
   */
  getLogsForEntity(entityType: string, entityId: string): AuditLogEntry[] {
    return this.logs.filter(
      log => log.entityType === entityType && log.entityId === entityId
    );
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 50): AuditLogEntry[] {
    return this.logs.slice(-count).reverse();
  }

  /**
   * Subscribe to new log entries
   */
  subscribe(callback: (entry: AuditLogEntry) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Persist logs to localStorage
   */
  private persistLogs(): void {
    try {
      const recentLogs = this.logs.slice(-100);
      localStorage.setItem('audit_logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.error('Failed to persist audit logs:', error);
    }
  }

  /**
   * Restore logs from localStorage
   */
  restoreLogs(): void {
    try {
      const stored = localStorage.getItem('audit_logs');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.logs = parsed;
        }
      }
    } catch (error) {
      console.error('Failed to restore audit logs:', error);
    }
  }

  /**
   * Notify listeners of new entry
   */
  private notifyListeners(entry: AuditLogEntry): void {
    this.listeners.forEach(callback => {
      try {
        callback(entry);
      } catch (error) {
        console.error('Error in audit log listener:', error);
      }
    });
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear all logs (admin only)
   */
  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('audit_logs');
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalLogs: number;
    successRate: number;
    actionCounts: Record<string, number>;
    userCounts: Record<string, number>;
  } {
    const totalLogs = this.logs.length;
    const successCount = this.logs.filter(l => l.success).length;
    const successRate = totalLogs > 0 ? successCount / totalLogs : 0;

    const actionCounts: Record<string, number> = {};
    const userCounts: Record<string, number> = {};

    this.logs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      userCounts[log.userName] = (userCounts[log.userName] || 0) + 1;
    });

    return {
      totalLogs,
      successRate,
      actionCounts,
      userCounts,
    };
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();

// Restore logs on initialization
auditLogger.restoreLogs();
