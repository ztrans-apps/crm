import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

/**
 * GET /api/users/[userId]
 * Get a specific user with their roles
 */
export const GET = withAuth(async (req, ctx, params) => {
  const { userId } = await params;

  // Get profile
  const { data: profile, error: profileError } = await ctx.supabase
    .from('profiles')
    .select('id, full_name, email, created_at, updated_at')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get all roles
  const { data: allRoles } = await ctx.supabase
    .from('roles')
    .select('id, role_name')
    .returns<Array<{ id: string; role_name: string }>>();

  const rolesMap = new Map(allRoles?.map(r => [r.id, r.role_name]) || []);

  // Get user roles
  const { data: userRoles } = await ctx.supabase
    .from('user_roles')
    .select('role_id')
    .eq('user_id', userId)
    .returns<Array<{ role_id: string }>>();

  const roles = (userRoles || [])
    .map(ur => rolesMap.get(ur.role_id))
    .filter(Boolean) as string[];

  const userProfile = profile as any;

  return NextResponse.json({ 
    user: {
      id: userProfile.id,
      full_name: userProfile.full_name,
      email: userProfile.email,
      roles,
      created_at: userProfile.created_at,
      updated_at: userProfile.updated_at,
    }
  });
});

/**
 * PUT /api/users/[userId]
 * Update a user
 */
export const PUT = withAuth(async (req, ctx, params) => {
  const { userId } = await params;
  const body = await req.json();
  const { full_name, email, role_ids } = body;

  // Update profile
  const updateData: any = {
    full_name,
    email,
    updated_at: new Date().toISOString(),
  };

  const { data: profile, error: profileError } = await ctx.supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (profileError) {
    console.error('Error updating user:', profileError);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }

  // Update auth email if changed (requires service role)
  if (email) {
    await ctx.serviceClient.auth.admin.updateUserById(userId, {
      email,
    });
  }

  // Update roles if provided
  if (role_ids && Array.isArray(role_ids)) {
    // Delete existing roles
    await ctx.supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    // Insert new roles
    if (role_ids.length > 0) {
      const userRoles: any[] = role_ids.map(role_id => ({
        user_id: userId,
        role_id,
      }));

      const { error: roleError } = await ctx.supabase
        .from('user_roles')
        .insert(userRoles);

      if (roleError) {
        console.error('Error updating roles:', roleError);
        return NextResponse.json({ error: 'Failed to update roles' }, { status: 500 });
      }
    }
  }

  // Get updated roles
  const { data: allRoles } = await ctx.supabase
    .from('roles')
    .select('id, role_name')
    .returns<Array<{ id: string; role_name: string }>>();

  const rolesMap = new Map(allRoles?.map(r => [r.id, r.role_name]) || []);

  const { data: userRoles } = await ctx.supabase
    .from('user_roles')
    .select('role_id')
    .eq('user_id', userId)
    .returns<Array<{ role_id: string }>>();

  const roles = (userRoles || [])
    .map(ur => rolesMap.get(ur.role_id))
    .filter(Boolean) as string[];

  return NextResponse.json({ 
    user: {
      ...(profile as any),
      roles,
    }
  });
});

/**
 * DELETE /api/users/[userId]
 * Delete a user
 */
export const DELETE = withAuth(async (req, ctx, params) => {
  const { userId } = await params;

  // Check if user exists
  const { data: existing } = await ctx.supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Delete user from auth (requires service role, will cascade delete profile and user_roles)
  const { error: deleteError } = await ctx.serviceClient.auth.admin.deleteUser(userId);

  if (deleteError) {
    console.error('Error deleting user:', deleteError);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
