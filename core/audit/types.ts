/**
 * Core Audit Types
 * Audit logging system type definitions
 */

export type AuditAction = 
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'IMPORT'
  | 'SEND'
  | 'RECEIVE';

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  action: AuditAction;
  resource_type: string;
  resource_id: string | null;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface CreateAuditLogInput {
  action: AuditAction;
  resource_type: string;
  resource_id?: string;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AuditLogFilter {
  tenant_id?: string;
  user_id?: string;
  action?: AuditAction;
  resource_type?: string;
  resource_id?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}
