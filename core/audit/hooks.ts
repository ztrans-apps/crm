/**
 * Core Audit Hooks
 * React hooks for audit logging
 */

'use client';

import { useCallback } from 'react';
import { useTenantId } from '../tenant/context';
import type { CreateAuditLogInput } from './types';

export function useAuditLog() {
  const tenantId = useTenantId();

  const logAction = useCallback(
    async (input: CreateAuditLogInput) => {
      if (!tenantId) {
        console.warn('No tenant ID available for audit log');
        return;
      }

      try {
        const response = await fetch('/api/audit/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId,
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          throw new Error('Failed to create audit log');
        }

        return await response.json();
      } catch (error) {
        console.error('Error creating audit log:', error);
        throw error;
      }
    },
    [tenantId]
  );

  return { logAction };
}
