import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Get user roles
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        roles (
          id,
          role_key,
          role_name
        )
      `)
      .eq('user_id', user.id);

    // Get all WhatsApp permissions
    const { data: whatsappPermissions } = await supabase
      .from('permissions')
      .select('*')
      .eq('module', 'whatsapp')
      .order('permission_key');

    // Get user's permissions via RPC
    const { data: userPermissions, error: permError } = await supabase
      .rpc('get_user_permissions', { p_user_id: user.id });

    if (permError) {
      console.error('RPC Error:', permError);
    }

    // Filter WhatsApp permissions from user's permissions
    const userWhatsappPerms = userPermissions?.filter((p: any) => 
      p.module === 'whatsapp'
    ) || [];

    // Get role permissions for WhatsApp
    const roleIds = userRoles?.map((ur: any) => ur.role_id) || [];
    const { data: rolePermissions } = await supabase
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
        id: user.id,
        email: user.email,
      },
      profile: {
        role: profile?.role,
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
  } catch (error: any) {
    console.error('Debug permissions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
