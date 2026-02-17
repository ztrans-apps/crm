import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/users
 * Get all users with their roles
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all profiles
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    if (!allProfiles || allProfiles.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Get all roles
    const { data: allRoles, error: rolesError } = await supabase
      .from('roles')
      .select('id, role_name');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
    }

    const rolesMap = new Map(allRoles?.map(r => [r.id, r.role_name]) || []);

    // Get all user_roles
    const profileIds = allProfiles.map(p => p.id);
    
    const { data: allUserRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('user_id, role_id')
      .in('user_id', profileIds);

    if (userRolesError) {
      console.error('Error fetching user_roles:', userRolesError);
    }

    // Map user roles
    const userRolesMap = new Map<string, string[]>();
    (allUserRoles || []).forEach(ur => {
      const roleName = rolesMap.get(ur.role_id);
      if (roleName) {
        if (!userRolesMap.has(ur.user_id)) {
          userRolesMap.set(ur.user_id, []);
        }
        userRolesMap.get(ur.user_id)!.push(roleName);
      }
    });

    // Transform data
    const transformedUsers = allProfiles.map(profile => {
      const userRoles = userRolesMap.get(profile.id) || [];
      return {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        role: userRoles[0] || 'No role',
        roles: userRoles,
        status: 'offline',
        active_chats: 0,
        total_chats: 0,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      };
    });

    return NextResponse.json({ users: transformedUsers });
  } catch (error) {
    console.error('Error in GET /api/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/users
 * Create a new user
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { email, password, full_name, role_ids } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Create user in auth
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || email.split('@')[0],
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Assign roles if provided
    if (role_ids && Array.isArray(role_ids) && role_ids.length > 0) {
      const userRoles = role_ids.map(role_id => ({
        user_id: newUser.user.id,
        role_id,
      }));

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert(userRoles);

      if (roleError) {
        console.error('Error assigning roles:', roleError);
        return NextResponse.json({ error: 'Failed to assign roles' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name: full_name || email.split('@')[0],
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
