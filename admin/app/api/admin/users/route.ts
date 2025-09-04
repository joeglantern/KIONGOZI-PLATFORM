import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const users = (profiles || []).map((profile: any) => ({
      id: profile.id,
      name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'Unknown User',
      email: profile.email || '',
      first_name: profile.first_name,
      last_name: profile.last_name,
      full_name: profile.full_name,
      role: profile.role,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    }));

    return NextResponse.json({ users, count: users.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, full_name, first_name, last_name, role, password, adminId } = await request.json();

    if (!email || !full_name || !password) {
      return NextResponse.json({ error: 'Email, full name, and password are required' }, { status: 400 });
    }

    // Create auth user first
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      return NextResponse.json({ error: `Failed to create auth user: ${authError.message}` }, { status: 400 });
    }

    // Create profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email,
        full_name,
        first_name,
        last_name,
        role: role || 'user'
      })
      .select()
      .single();

    if (profileError) {
      // Cleanup: delete auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: `Failed to create profile: ${profileError.message}` }, { status: 400 });
    }

    // Log admin action
    if (adminId) {
      await supabaseAdmin.rpc('log_admin_action', {
        admin_id: adminId,
        target_user_id: profile.id,
        action_type: 'user_created',
        action_details: { 
          email: profile.email,
          role: profile.role 
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      user: profile 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}