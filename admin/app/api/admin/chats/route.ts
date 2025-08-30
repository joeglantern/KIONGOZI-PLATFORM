import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select(`
        *,
        profiles!conversations_user_id_fkey (
          full_name,
          first_name,
          last_name,
          email
        )
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const chats = (conversations || []).map((conv: any) => {
      const profile = conv.profiles;
      const userName = profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.email || 'Unknown User';
      return {
        id: conv.id,
        user: userName,
        user_id: conv.user_id,
        title: conv.title || 'Untitled Conversation',
        created_at: conv.created_at,
        updated_at: conv.updated_at
      };
    });

    return NextResponse.json({ chats, count: chats.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}