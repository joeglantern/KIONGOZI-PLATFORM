import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '7d';
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '24h':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Get conversations created in time range
    const { data: conversations, error: convError } = await supabaseAdmin
      .from('conversations')
      .select(`
        *,
        messages(count)
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (convError) throw convError;

    // Get messages created in time range
    const { data: messages, error: msgError } = await supabaseAdmin
      .from('messages')
      .select('created_at, is_user')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (msgError) throw msgError;

    // Get users created in time range
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (usersError) throw usersError;

    // Process data by day for charts
    const days = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const chatVolumeData = [];
    const responseTimeData = [];
    const userGrowthData = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDate = date.toISOString().split('T')[0];

      // Count chats and users for this day
      const dayChats = conversations?.filter(conv => {
        const convDate = new Date(conv.created_at);
        return convDate >= date && convDate < nextDate;
      }).length || 0;

      const dayUsers = users?.filter(user => {
        const userDate = new Date(user.created_at);
        return userDate >= date && userDate < nextDate;
      }).length || 0;

      const dayMessages = messages?.filter(msg => {
        const msgDate = new Date(msg.created_at);
        return msgDate >= date && msgDate < nextDate;
      }).length || 0;

      chatVolumeData.push({
        name: dayName,
        date: fullDate,
        chats: dayChats,
        users: dayUsers,
        messages: dayMessages
      });

      // Mock response time data (would need actual timing data)
      responseTimeData.push({
        name: dayName,
        date: fullDate,
        avgTime: Math.random() * 2 + 0.5, // 0.5-2.5 seconds
        maxTime: Math.random() * 3 + 2     // 2-5 seconds
      });

      userGrowthData.push({
        name: dayName,
        date: fullDate,
        newUsers: dayUsers,
        totalUsers: (users?.filter(user => new Date(user.created_at) <= nextDate).length || 0)
      });
    }

    // Calculate user activity distribution
    const totalUsers = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const activeUsers = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const newUsers = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const inactiveUsers = (totalUsers.count || 0) - (activeUsers.count || 0);

    const userActivityData = [
      { name: 'Active (7 days)', value: activeUsers.count || 0, color: '#10B981' },
      { name: 'New (7 days)', value: newUsers.count || 0, color: '#3B82F6' },
      { name: 'Inactive', value: Math.max(0, inactiveUsers), color: '#6B7280' }
    ];

    // Top conversation topics (based on titles)
    const topTopics = conversations?.reduce((acc: any, conv) => {
      if (!conv.title) return acc;
      
      const topic = conv.title.length > 30 ? conv.title.substring(0, 30) + '...' : conv.title;
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {}) || {};

    const topicsData = Object.entries(topTopics)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([topic, count]) => ({
        topic,
        count,
        percentage: Math.round((count as number) / (conversations?.length || 1) * 100)
      }));

    return NextResponse.json({
      chatVolumeData,
      responseTimeData,
      userGrowthData,
      userActivityData,
      topicsData,
      summary: {
        totalConversations: conversations?.length || 0,
        totalMessages: messages?.length || 0,
        totalUsers: totalUsers.count || 0,
        activeUsers: activeUsers.count || 0,
        timeRange,
        startDate: startDate.toISOString(),
        endDate: now.toISOString()
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}