import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params;

    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        *,
        admin_actions!admin_actions_target_user_id_fkey (
          action_type,
          action_details,
          created_at,
          admin:admin_id (
            full_name,
            email
          )
        ),
        user_login_logs (
          ip_address,
          user_agent,
          login_success,
          created_at
        )
      `)
      .eq('id', userId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params;
    const body = await request.json();
    const { full_name, email, role, first_name, last_name } = body;

    // Update user profile
    const { data: updatedUser, error } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name,
        email,
        role,
        first_name,
        last_name,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log admin action
    const adminId = request.headers.get('x-admin-id'); // This would come from auth middleware
    if (adminId) {
      await supabaseAdmin.rpc('log_admin_action', {
        admin_id: adminId,
        target_user_id: userId,
        action_type: 'user_updated',
        action_details: { updated_fields: Object.keys(body) }
      });
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params;

    // Delete user (cascades to conversations and messages)
    const { error } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log admin action
    const adminId = request.headers.get('x-admin-id');
    if (adminId) {
      await supabaseAdmin.rpc('log_admin_action', {
        admin_id: adminId,
        target_user_id: userId,
        action_type: 'user_deleted',
        action_details: {}
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}