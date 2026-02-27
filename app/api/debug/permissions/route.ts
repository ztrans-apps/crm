import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const GET = withAuth(async (req, ctx) => {
  // Get user roles
  const { data: userRoles } = await ctx.supabase
    .from('user_roles')
    .select(`
      role_id,
      roles (
        id,
        role_key,
        role_name
      )
    `)
    .eq('user_id', ctx.user.id);

  // Get all WhatsApp permissions
  const { data: whatsappPermissions } = await ctx.supabase
    .from('permissions')
    .select('*')
    .eq('module', 'whatsapp')
    .order('permission_key');

  // Get user's permissions via RPC
  const { data: userPermissions, error: permError } = await ctx.supabase
    .rpc('get_user_permissions', { p_user_id: ctx.user.id });

  if (permError) {
    console.error('RPC Error:', permError);
  }

  // Filter WhatsApp permissions from user's permissions
  const userWhatsappPerms = userPermissions?.filter((p: any) => 
    p.module === 'whatsapp'
  ) || [];

  // Get role permissions for WhatsApp
  const roleIds = userRoles?.map((ur: any) => ur.role_id) || [];
  const { data: rolePermissions } = await ctx.supabase
    .from('role_permissions')
    .select(`
      permission_id,
      permissions (
        permission_key,
        permission_name,
        module
      )
    `)
    .in('role_id', roleIds);

  const roleWhatsappPerms = rolePermissions?.filter((rp: any) => 
    rp.permissions?.module === 'whatsapp'
  ) || [];

  return NextResponse.json({
    user: {
      id: ctx.user.id,
      email: ctx.user.email,
    },
    profile: {
      role: ctx.profile.role,
    },
    userRoles: userRoles?.map((ur: any) => ({
      role_key: ur.roles?.role_key,
      role_name: ur.roles?.role_name,
    })),
    whatsappPermissions: {
      available: whatsappPermissions,
      userHas: userWhatsappPerms,
      fromRoles: roleWhatsappPerms,
    },
    permissionCheck: {
      'whatsapp.session.view': userWhatsappPerms.some((p: any) => p.permission_key === 'whatsapp.session.view'),
      'whatsapp.session.create': userWhatsappPerms.some((p: any) => p.permission_key === 'whatsapp.session.create'),
      'whatsapp.session.edit': userWhatsappPerms.some((p: any) => p.permission_key === 'whatsapp.session.edit'),
      'whatsapp.session.delete': userWhatsappPerms.some((p: any) => p.permission_key === 'whatsapp.session.delete'),
      'whatsapp.session.connect': userWhatsappPerms.some((p: any) => p.permission_key === 'whatsapp.session.connect'),
      'whatsapp.session.disconnect': userWhatsappPerms.some((p: any) => p.permission_key === 'whatsapp.session.disconnect'),
    },
  });
}, { permission: 'admin.access' });
