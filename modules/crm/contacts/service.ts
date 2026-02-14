/**
 * CRM Contacts Service
 * Contact management operations
 */

import { createClient } from '@/lib/supabase/server';
import type { Contact, CreateContactInput, UpdateContactInput, ContactFilter } from './types';

export class ContactService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Get all contacts for tenant
   */
  async list(filter: ContactFilter = {}): Promise<Contact[]> {
    const supabase = await createClient();
    let query = supabase
      .from('contacts')
      .select('*')
      .eq('tenant_id', this.tenantId);

    if (filter.search) {
      query = query.or(`name.ilike.%${filter.search}%,phone_number.ilike.%${filter.search}%`);
    }

    if (filter.tags && filter.tags.length > 0) {
      query = query.contains('tags', filter.tags);
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(filter.limit || 100)
      .range(filter.offset || 0, (filter.offset || 0) + (filter.limit || 100) - 1);

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Get contact by ID
   */
  async getById(id: string): Promise<Contact | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get contact by phone number
   */
  async getByPhone(phoneNumber: string): Promise<Contact | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('tenant_id', this.tenantId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  }

  /**
   * Create new contact
   */
  async create(input: CreateContactInput): Promise<Contact> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        tenant_id: this.tenantId,
        phone_number: input.phone_number,
        name: input.name || null,
        email: input.email || null,
        avatar_url: input.avatar_url || null,
        tags: input.tags || [],
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update contact
   */
  async update(id: string, input: UpdateContactInput): Promise<Contact> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('contacts')
      .update(input)
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete contact
   */
  async delete(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
  }

  /**
   * Get or create contact by phone number
   */
  async getOrCreate(phoneNumber: string, name?: string): Promise<Contact> {
    // Try to get existing contact
    const existing = await this.getByPhone(phoneNumber);
    
    if (existing) {
      return existing;
    }

    // Create new contact
    return this.create({
      phone_number: phoneNumber,
      name,
    });
  }
}
