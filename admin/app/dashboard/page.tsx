"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import clsx from 'clsx';


interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down';
  icon: React.ComponentType<any>;
  color: string;
  loading?: boolean;
}

function MetricCard({ title, value, change, trend, icon: Icon, color, loading }: MetricCardProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {change && trend && (
          <div className={clsx(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
            trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          )}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900">
          {loading ? (
            <span className="animate-pulse">...</span>
          ) : (
            value
          )}
        </p>
      </div>
    </div>
  );
}

interface RecentChat {
  id: string;
  user: string;
  title: string;
  updated_at: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalChats: 0,
    activeUsers: 0,
    todayChats: 0,
  });
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState({
    healthy: true,
    lastUpdate: new Date(),
    services: {
      database: 'healthy',
      api: 'healthy',
      auth: 'healthy'
    }
  });

  useEffect(() => {
    fetchDashboardData();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get the current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch dashboard data');
      }

      setMetrics(data.metrics);
      setRecentChats(data.recentChats || []);
      
      // Update system status based on API response
      setSystemStatus({
        healthy: true,
        lastUpdate: new Date(),
        services: {
          database: 'healthy',
          api: 'healthy', 
          auth: 'healthy'
        }
      });

    } catch (err: any) {
      setError(err.message);
      setSystemStatus(prev => ({
        ...prev,
        healthy: false,
        lastUpdate: new Date(),
        services: {
          ...prev.services,
          api: 'error'
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) !== 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) !== 1 ? 's' : ''} ago`;
  };

  const metricCards = [
    {
      title: 'Total Users',
      value: metrics.totalUsers.toLocaleString(),
      icon: Users,
      color: 'bg-blue-500',
      loading
    },
    {
      title: 'Total Conversations',
      value: metrics.totalChats.toLocaleString(),
      icon: MessageSquare,
      color: 'bg-green-500',
      loading
    },
    {
      title: 'Active Users (7 days)',
      value: metrics.activeUsers.toLocaleString(),
      icon: Activity,
      color: 'bg-purple-500',
      loading
    },
    {
      title: 'Today\'s Chats',
      value: metrics.todayChats.toLocaleString(),
      icon: Clock,
      color: 'bg-orange-500',
      loading
    }
  ];

  const generateSystemAlerts = () => {
    const alerts = [];
    
    if (systemStatus.healthy) {
      alerts.push({
        id: '1',
        type: 'success',
        message: 'All systems operational',
        time: formatTimeAgo(systemStatus.lastUpdate.toISOString())
      });
    } else {
      alerts.push({
        id: '1',
        type: 'error',
        message: 'API service experiencing issues',
        time: formatTimeAgo(systemStatus.lastUpdate.toISOString())
      });
    }

    if (metrics.totalUsers > 0) {
      alerts.push({
        id: '2',
        type: 'info',
        message: `${metrics.totalUsers} total users registered`,
        time: '5 min ago'
      });
    }

    if (metrics.todayChats > 0) {
      alerts.push({
        id: '3',
        type: 'info',
        message: `${metrics.todayChats} conversations started today`,
        time: '10 min ago'
      });
    }

    alerts.push({
      id: '4',
      type: 'info',
      message: 'Dashboard data auto-refreshes every 30 seconds',
      time: '1 hour ago'
    });

    return alerts.slice(0, 4);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
            <p className="text-gray-600">Monitor your chatbot performance and user activity</p>
            {error && (
              <div className="mt-2 p-3 bg-red-100 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">Error loading data: {error}</p>
              </div>
            )}
          </div>
          <button 
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metricCards.map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.title}
              value={metric.value}
              icon={metric.icon}
              color={metric.color}
              loading={metric.loading}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Chats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Conversations</h3>
              <button 
                onClick={() => router.push('/chats')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
              >
                View all
              </button>
            </div>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center text-gray-500 py-8">Loading recent chats...</div>
              ) : recentChats.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No conversations yet</div>
              ) : (
                recentChats.map((chat) => (
                  <div key={chat.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {chat.user ? chat.user.split(' ').map(n => n[0]).join('') : '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900">{chat.user}</p>
                        <span className="px-2 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                          active
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate mb-1">{chat.title}</p>
                      <p className="text-xs text-gray-400">{formatTimeAgo(chat.updated_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* System Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors">
                View all
              </button>
            </div>
            <div className="space-y-4">
              {generateSystemAlerts().map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 mb-1">{alert.message}</p>
                    <p className="text-xs text-gray-500">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button 
              onClick={() => router.push('/chats')}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Monitor Chats</p>
                <p className="text-sm text-gray-500">View active conversations</p>
              </div>
            </button>
            
            <button 
              onClick={() => router.push('/users')}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center transition-colors">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Manage Users</p>
                <p className="text-sm text-gray-500">User accounts & permissions</p>
              </div>
            </button>
            
            <button 
              onClick={() => router.push('/analytics')}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-purple-100 group-hover:bg-purple-200 rounded-lg flex items-center justify-center transition-colors">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">View Analytics</p>
                <p className="text-sm text-gray-500">Performance insights</p>
              </div>
            </button>
            
            <button 
              onClick={() => router.push('/security')}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-orange-100 group-hover:bg-orange-200 rounded-lg flex items-center justify-center transition-colors">
                <Activity className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Security Center</p>
                <p className="text-sm text-gray-500">Monitor security & threats</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}