/**
 * CRM Contacts Types
 * 
 * Re-exports from DTO layer for frontend consumption.
 * Ensures type safety across frontend-backend boundary.
 * 
 * **Requirement 9.10**: UI components use TypeScript types from DTO definitions
 */

// Re-export DTO types for frontend use
export type {
  ContactOutput as Contact,
  CreateContactInput,
  UpdateContactInput,
  ContactFilters as ContactFilter,
  ContactListOutput,
} from '@/lib/dto/contact.dto'

// Legacy interface for backward compatibility (deprecated - use ContactOutput)
export interface LegacyContact {
  id: string;
  tenant_id: string;
  phone_number: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  tags: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}
