import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params;
    const { reason, adminId } = await request.json();

    const { data, error } = await supabaseAdmin.rpc('ban_user', {
      target_user_id: userId,
      admin_user_id: adminId,
      reason: reason || 'No reason provided'
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'User banned successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params;
    const { adminId } = await request.json();

    const { data, error } = await supabaseAdmin.rpc('unban_user', {
      target_user_id: userId,
      admin_user_id: adminId
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'User unbanned successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}