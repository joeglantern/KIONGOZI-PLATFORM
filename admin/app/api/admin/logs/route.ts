import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') || 'all';
    const category = searchParams.get('category') || 'all';
    const timeRange = searchParams.get('timeRange') || '24h';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '1h':
        startDate.setHours(now.getHours() - 1);
        break;
      case '24h':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setDate(now.getDate() - 1);
    }

    // Build query
    let query = supabaseAdmin
      .from('system_logs')
      .select(`
        *,
        profiles:user_id (
          full_name,
          first_name,
          last_name,
          email
        )
      `, { count: 'exact' })
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (level !== 'all') {
      query = query.eq('level', level);
    }

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`message.ilike.%${search}%,category.ilike.%${search}%`);
    }

    const { data: logs, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format logs for frontend
    const formattedLogs = (logs || []).map((log: any) => {
      const profile = log.profiles;
      const userName = profile ? (
        profile.full_name || 
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
        profile.email || 
        'Unknown User'
      ) : undefined;

      return {
        id: log.id,
        timestamp: log.created_at,
        level: log.level,
        category: log.category,
        message: log.message,
        user: userName,
        ip: log.ip_address,
        details: log.details,
        resolved_at: log.resolved_at,
        stack_trace: log.stack_trace
      };
    });

    // Get summary stats
    const { data: levelStats } = await supabaseAdmin
      .from('system_logs')
      .select('level')
      .gte('created_at', startDate.toISOString());

    const stats = {
      total: count || 0,
      info: levelStats?.filter(l => l.level === 'info').length || 0,
      warning: levelStats?.filter(l => l.level === 'warning').length || 0,
      error: levelStats?.filter(l => l.level === 'error').length || 0,
      success: levelStats?.filter(l => l.level === 'success').length || 0
    };

    return NextResponse.json({
      logs: formattedLogs,
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level, category, message, details, user_id, conversation_id } = body;

    if (!level || !category || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: level, category, message' },
        { status: 400 }
      );
    }

    const { data: log, error } = await supabaseAdmin
      .from('system_logs')
      .insert({
        level,
        category,
        message,
        details,
        user_id,
        conversation_id,
        ip_address: request.ip,
        user_agent: request.headers.get('user-agent')
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ log }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}