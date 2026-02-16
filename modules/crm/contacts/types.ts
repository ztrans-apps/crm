/**
 * CRM Contacts Types
 */

export interface Contact {
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

export interface CreateContactInput {
  phone_number: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateContactInput {
  name?: string;
  email?: string;
  avatar_url?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ContactFilter {
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}
