import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params;
    const { role, adminId } = await request.json();

    const validRoles = ['user', 'admin', 'content_editor', 'moderator', 'org_admin', 'analyst', 'researcher'];
    
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc('change_user_role', {
      target_user_id: userId,
      admin_user_id: adminId,
      new_role: role
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `User role changed to ${role} successfully` 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}