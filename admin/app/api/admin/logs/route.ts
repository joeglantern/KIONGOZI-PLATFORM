import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to determine log level based on action type
function getLogLevel(actionType: string): string {
  switch (actionType) {
    case 'user_created':
    case 'user_activated':
    case 'user_unbanned':
    case 'system_initialized':
      return 'success';
    case 'user_updated':
    case 'role_changed':
      return 'info';
    case 'user_deactivated':
    case 'user_banned':
    case 'conversation_archived':
      return 'warning';
    case 'user_deleted':
    case 'conversation_deleted':
    case 'message_deleted':
      return 'error';
    default:
      return 'info';
  }
}

// Helper function to determine category based on action type
function getCategory(actionType: string): string {
  switch (actionType) {
    case 'user_created':
    case 'user_updated':
    case 'user_deleted':
    case 'user_banned':
    case 'user_unbanned':
    case 'user_deactivated':
    case 'user_activated':
    case 'role_changed':
      return 'user_management';
    case 'conversation_deleted':
    case 'conversation_archived':
    case 'message_deleted':
      return 'chat_management';
    case 'system_initialized':
      return 'system';
    default:
      return 'general';
  }
}

// Helper function to format action into readable message
function formatActionMessage(action: any): string {
  const adminName = action.admin_profile?.full_name || action.admin_profile?.email || 'Admin';
  const targetName = action.target_profile?.full_name || action.target_profile?.email || 'Unknown User';
  
  switch (action.action_type) {
    case 'user_created':
      return `${adminName} created user ${targetName}`;
    case 'user_updated':
      return `${adminName} updated user ${targetName}`;
    case 'user_deleted':
      return `${adminName} deleted user ${targetName}`;
    case 'user_banned':
      const reason = action.action_details?.reason ? ` (Reason: ${action.action_details.reason})` : '';
      return `${adminName} banned user ${targetName}${reason}`;
    case 'user_unbanned':
      return `${adminName} unbanned user ${targetName}`;
    case 'user_deactivated':
      return `${adminName} deactivated user ${targetName}`;
    case 'user_activated':
      return `${adminName} activated user ${targetName}`;
    case 'role_changed':
      const oldRole = action.action_details?.old_role || 'unknown';
      const newRole = action.action_details?.new_role || 'unknown';
      return `${adminName} changed ${targetName}'s role from ${oldRole} to ${newRole}`;
    case 'conversation_deleted':
      return `${adminName} deleted conversation ${action.action_details?.conversation_title || 'Untitled'}`;
    case 'conversation_archived':
      return `${adminName} archived conversation ${action.action_details?.conversation_title || 'Untitled'}`;
    case 'message_deleted':
      return `${adminName} deleted a message`;
    case 'system_initialized':
      return 'Admin user management system initialized';
    default:
      return `${adminName} performed ${action.action_type}`;
  }
}

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

    // Build base query
    let query = supabaseAdmin
      .from('admin_actions')
      .select(`
        id,
        created_at,
        action_type,
        action_details,
        admin_profile:admin_id (
          full_name,
          first_name,
          last_name,
          email
        ),
        target_profile:target_user_id (
          full_name,
          first_name,
          last_name,
          email
        )
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    // Apply category filter
    if (category !== 'all') {
      switch (category) {
        case 'user_management':
          query = query.in('action_type', [
            'user_created', 'user_updated', 'user_deleted', 'user_banned', 
            'user_unbanned', 'user_deactivated', 'user_activated', 'role_changed'
          ]);
          break;
        case 'chat_management':
          query = query.in('action_type', [
            'conversation_deleted', 'conversation_archived', 'message_deleted'
          ]);
          break;
        case 'system':
          query = query.eq('action_type', 'system_initialized');
          break;
      }
    }

    // Apply search filter
    if (search) {
      query = query.or(`action_type.ilike.%${search}%`);
    }

    // Get total count for pagination
    const { count } = await supabaseAdmin
      .from('admin_actions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // Get admin actions with pagination
    const { data: adminActions, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform admin actions into log format
    const logs = (adminActions || []).map(action => {
      const logLevel = getLogLevel(action.action_type);
      const logCategory = getCategory(action.action_type);
      const message = formatActionMessage(action);
      
      // Handle admin_profile and target_profile as single objects (not arrays)
      const adminProfile = Array.isArray(action.admin_profile) ? action.admin_profile[0] : action.admin_profile;
      const targetProfile = Array.isArray(action.target_profile) ? action.target_profile[0] : action.target_profile;
      
      return {
        id: action.id,
        timestamp: action.created_at,
        level: logLevel,
        category: logCategory,
        message: message,
        user: adminProfile?.full_name || adminProfile?.email || 'Unknown Admin',
        details: {
          ...action.action_details,
          target_user: targetProfile?.full_name || targetProfile?.email,
          action_type: action.action_type
        }
      };
    }).filter(log => {
      // Apply level filter after transformation
      return level === 'all' || log.level === level;
    });

    // Get stats based on action types within date range
    const { data: statsData, error: statsError } = await supabaseAdmin
      .from('admin_actions')
      .select('action_type')
      .gte('created_at', startDate.toISOString());

    if (statsError) {
      return NextResponse.json({ error: statsError.message }, { status: 500 });
    }

    // Calculate stats based on transformed data
    const allTransformedLogs = (statsData || []).map(action => ({
      level: getLogLevel(action.action_type)
    }));

    const stats = {
      total: allTransformedLogs.length,
      info: allTransformedLogs.filter(log => log.level === 'info').length,
      warning: allTransformedLogs.filter(log => log.level === 'warning').length,
      error: allTransformedLogs.filter(log => log.level === 'error').length,
      success: allTransformedLogs.filter(log => log.level === 'success').length,
    };

    return NextResponse.json({
      logs: logs.slice(0, limit), // Apply limit after filtering
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

    const body = await request.json();
    const { admin_id, target_user_id, action_type, action_details } = body;

    if (!admin_id || !action_type) {
      return NextResponse.json(
        { error: 'Missing required fields: admin_id, action_type' },
        { status: 400 }
      );
    }

    const { data: log, error } = await supabaseAdmin
      .rpc('log_admin_action', {
        admin_id,
        target_user_id,
        action_type,
        action_details: action_details || {}
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, log_id: log }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}