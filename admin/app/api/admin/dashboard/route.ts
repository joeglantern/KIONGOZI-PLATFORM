import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify the token with Supabase first
    const { data: user, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch total users
    const { count: totalUsers, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (usersError) throw usersError;

    // Fetch total conversations
    const { count: totalChats, error: chatsError } = await supabaseAdmin
      .from('conversations')
      .select('*', { count: 'exact', head: true });

    if (chatsError) throw chatsError;

    // Fetch active users (updated in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: activeUsers, error: activeError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', sevenDaysAgo.toISOString());

    if (activeError) throw activeError;

    // Fetch today's chats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: todayChats, error: todayError } = await supabaseAdmin
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    if (todayError) throw todayError;

    // Fetch recent chats with user info
    const { data: conversations, error: recentError } = await supabaseAdmin
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
      .order('updated_at', { ascending: false })
      .limit(5);

    if (recentError) throw recentError;

    const recentChats = (conversations || []).map((conv: any) => {
      const profile = conv.profiles;
      const userName = profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.email || 'Unknown User';
      return {
        id: conv.id,
        user: userName,
        title: conv.title || 'Untitled Conversation',
        updated_at: conv.updated_at
      };
    });

    return NextResponse.json({
      metrics: {
        totalUsers: totalUsers || 0,
        totalChats: totalChats || 0,
        activeUsers: activeUsers || 0,
        todayChats: todayChats || 0,
      },
      recentChats
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}