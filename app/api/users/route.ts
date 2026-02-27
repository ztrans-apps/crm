import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

/**
 * GET /api/users
 * Permission: agent.view (enforced by middleware)
 */
export const GET = withAuth(async (req, ctx) => {
  // Get all profiles
  const { data: allProfiles, error: profilesError } = await ctx.supabase
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
  const { data: allRoles } = await ctx.supabase
    .from('roles')
    .select('id, role_name');

  const rolesMap = new Map(allRoles?.map(r => [r.id, r.role_name]) || []);

  // Get all user_roles
  const profileIds = allProfiles.map(p => p.id);
  const { data: allUserRoles } = await ctx.supabase
    .from('user_roles')
    .select('user_id, role_id')
    .in('user_id', profileIds);

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
});

/**
 * POST /api/users
 * Permission: user.manage_roles
 */
export const POST = withAuth(async (req, ctx) => {
  const body = await req.json();
  const { email, password, full_name, role_ids } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const { data: newUser, error: createError } = await ctx.supabase.auth.admin.createUser({
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

  if (role_ids && Array.isArray(role_ids) && role_ids.length > 0) {
    const userRoles = role_ids.map((role_id: string) => ({
      user_id: newUser.user.id,
      role_id,
    }));

    const { error: roleError } = await ctx.supabase
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
}, { permission: 'user.manage_roles' });
