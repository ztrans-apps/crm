import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/users/[userId]
 * Get a specific user with their roles
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const params = await context.params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at, updated_at')
      .eq('id', params.userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all roles
    const { data: allRoles } = await supabase
      .from('roles')
      .select('id, role_name')
      .returns<Array<{ id: string; role_name: string }>>();

    const rolesMap = new Map(allRoles?.map(r => [r.id, r.role_name]) || []);

    // Get user roles
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', params.userId)
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
  } catch (error) {
    console.error('Error in GET /api/users/[userId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/users/[userId]
 * Update a user
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const params = await context.params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { full_name, email, role_ids } = body;

    // Update profile
    const updateData: any = {
      full_name,
      email,
      updated_at: new Date().toISOString(),
    };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', params.userId)
      .select()
      .single();

    if (profileError) {
      console.error('Error updating user:', profileError);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    // Update auth email if changed
    if (email) {
      await supabase.auth.admin.updateUserById(params.userId, {
        email,
      });
    }

    // Update roles if provided
    if (role_ids && Array.isArray(role_ids)) {
      // Delete existing roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', params.userId);

      // Insert new roles
      if (role_ids.length > 0) {
        const userRoles: any[] = role_ids.map(role_id => ({
          user_id: params.userId,
          role_id,
        }));

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert(userRoles);

        if (roleError) {
          console.error('Error updating roles:', roleError);
          return NextResponse.json({ error: 'Failed to update roles' }, { status: 500 });
        }
      }
    }

    // Get updated roles
    const { data: allRoles } = await supabase
      .from('roles')
      .select('id, role_name')
      .returns<Array<{ id: string; role_name: string }>>();

    const rolesMap = new Map(allRoles?.map(r => [r.id, r.role_name]) || []);

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', params.userId)
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
  } catch (error) {
    console.error('Error in PUT /api/users/[userId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/users/[userId]
 * Delete a user
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const params = await context.params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', params.userId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete user from auth (this will cascade delete profile and user_roles)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(params.userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/users/[userId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
