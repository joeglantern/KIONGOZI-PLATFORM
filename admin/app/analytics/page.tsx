"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { MobileStatsCard, MobileGrid, MobileCard, MobileTabs, useIsMobile } from '../components/MobileOptimized';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MessageSquare, 
  Clock, 
  Download,
  Filter,
  Calendar,
  Bot,
  Activity,
  Shield,
  Star,
  Zap
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface AnalyticsData {
  chatVolumeData: Array<{
    name: string;
    date: string;
    chats: number;
    users: number;
    messages: number;
  }>;
  responseTimeData: Array<{
    name: string;
    date: string;
    avgTime: number;
    maxTime: number;
  }>;
  userGrowthData: Array<{
    name: string;
    date: string;
    newUsers: number;
    totalUsers: number;
  }>;
  userActivityData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  topicsData: Array<{
    topic: string;
    count: number;
    percentage: number;
  }>;
  summary: {
    totalConversations: number;
    totalMessages: number;
    totalUsers: number;
    activeUsers: number;
    timeRange: string;
    startDate: string;
    endDate: string;
  };
}

interface UserEngagement {
  dailyEngagement: Array<{
    date: string;
    activeUsers: number;
    sessions: number;
  }>;
  summary: {
    totalUsers: number;
    activeUsers: number;
    retentionRate: number;
    timeframe: string;
  };
}

interface ChatMetrics {
  dailyMetrics: Array<{
    date: string;
    sessions: number;
    totalMessages: number;
    userMessages: number;
    aiResponses: number;
    tokensUsed: number;
  }>;
  summary: {
    totalSessions: number;
    totalMessages: number;
    avgSessionDuration: number;
    totalTokens: number;
    timeframe: string;
  };
  hourlyActivity: number[];
}

interface AIPerformance {
  summary: {
    totalResponses: number;
    avgResponseTime: number;
    avgTokensPerResponse: number;
    avgRating: number;
    totalFeedback: number;
    timeframe: string;
  };
  ratingDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  dailyPerformance: Array<{
    date: string;
    responses: number;
    avgResponseTime: number;
    avgTokens: number;
  }>;
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [userEngagement, setUserEngagement] = useState<UserEngagement | null>(null);
  const [chatMetrics, setChatMetrics] = useState<ChatMetrics | null>(null);
  const [aiPerformance, setAIPerformance] = useState<AIPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchAllAnalyticsData();
  }, [timeRange]);

  const fetchAllAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchAnalyticsData(),
        fetchUserEngagement(),
        fetchChatMetrics(),
        fetchAIPerformance()
      ]);
    } catch (error) {
      setError('Failed to fetch analytics data');
      console.error('Analytics fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      // Use the existing admin analytics route for overview data
      const response = await fetch(`/api/admin/analytics?timeRange=${timeRange}`);
      
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData({
          chatVolumeData: data.chatVolumeData || [],
          responseTimeData: data.responseTimeData || [],
          userGrowthData: data.userGrowthData || [],
          userActivityData: data.userActivityData || [],
          topicsData: data.topicsData || [],
          summary: data.summary || {
            totalConversations: 0,
            totalMessages: 0,
            totalUsers: 0,
            activeUsers: 0,
            timeRange: getTimeRangeLabel(timeRange),
            startDate: new Date(Date.now() - getTimeRangeDays(timeRange) * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString()
          }
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      throw error;
    }
  };

  const fetchUserEngagement = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/v1/analytics/user-engagement?timeframe=${timeRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserEngagement(data.data);
      } else {
        throw new Error('Failed to fetch user engagement data');
      }
    } catch (error) {
      console.error('Failed to fetch user engagement:', error);
    }
  };

  const fetchChatMetrics = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/v1/analytics/chat-metrics?timeframe=${timeRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setChatMetrics(data.data);
      } else {
        throw new Error('Failed to fetch chat metrics data');
      }
    } catch (error) {
      console.error('Failed to fetch chat metrics:', error);
    }
  };

  const fetchAIPerformance = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/v1/analytics/ai-performance?timeframe=${timeRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAIPerformance(data.data);
      } else {
        throw new Error('Failed to fetch AI performance data');
      }
    } catch (error) {
      console.error('Failed to fetch AI performance:', error);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case '24h': return 'Last 24 Hours';
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      default: return 'Last 7 Days';
    }
  };

  const getTimeRangeDays = (range: string) => {
    switch (range) {
      case '24h': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 7;
    }
  };

  const exportAnalyticsData = () => {
    if (!analyticsData) return;

    const csvData = [
      ['Analytics Report - ' + getTimeRangeLabel(timeRange)],
      ['Generated on: ' + new Date().toLocaleString()],
      [''],
      ['Summary'],
      ['Total Conversations', analyticsData.summary.totalConversations],
      ['Total Messages', analyticsData.summary.totalMessages],
      ['Total Users', analyticsData.summary.totalUsers],
      ['Active Users', analyticsData.summary.activeUsers],
      [''],
      ['Daily Data'],
      ['Date', 'Chats', 'Users', 'Messages'],
      ...analyticsData.chatVolumeData.map(day => [
        day.date,
        day.chats,
        day.users,
        day.messages
      ])
    ];

    const csvContent = csvData.map(row => 
      Array.isArray(row) ? row.join(',') : row
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-500">Loading analytics...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6 bg-red-100 border border-red-200 rounded-lg">
          <p className="text-red-700">Error loading analytics: {error}</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!analyticsData) {
    return (
      <DashboardLayout>
        <div className="text-center text-gray-500">No analytics data available</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Comprehensive insights into your platform performance</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <button 
              onClick={exportAnalyticsData}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors w-full sm:w-auto"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Tabs */}
        <MobileTabs
          tabs={[
            { id: 'overview', label: 'Overview', icon: <TrendingUp className="h-4 w-4" /> },
            { id: 'engagement', label: 'User Engagement', icon: <Users className="h-4 w-4" /> },
            { id: 'chat-metrics', label: 'Chat Metrics', icon: <MessageSquare className="h-4 w-4" /> },
            { id: 'ai-performance', label: 'AI Performance', icon: <Bot className="h-4 w-4" /> }
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <MobileGrid cols={isMobile ? 1 : 2} gap="md">
              <MobileStatsCard
                title="Total Conversations"
                value={formatNumber(analyticsData.summary.totalConversations)}
                icon={<MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />}
                color="blue"
              />
              <MobileStatsCard
                title="Total Messages"
                value={formatNumber(analyticsData.summary.totalMessages)}
                icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />}
                color="green"
              />
              <MobileStatsCard
                title="Total Users"
                value={formatNumber(analyticsData.summary.totalUsers)}
                icon={<Users className="h-5 w-5 sm:h-6 sm:w-6" />}
                color="purple"
              />
              <MobileStatsCard
                title="Active Users"
                value={formatNumber(analyticsData.summary.activeUsers)}
                icon={<Activity className="h-5 w-5 sm:h-6 sm:w-6" />}
                color="yellow"
              />
            </MobileGrid>

            {/* Charts remain the same for overview */}
            <MobileCard>
              <div className="p-2 sm:p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Chat Volume Trend</h3>
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.chatVolumeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="chats" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} />
                      <Area type="monotone" dataKey="users" stroke="#10B981" fill="#10B981" fillOpacity={0.1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </MobileCard>
          </div>
        )}

        {/* User Engagement Tab */}
        {activeTab === 'engagement' && userEngagement && (
          <div className="space-y-6">
            <MobileGrid cols={isMobile ? 1 : 2} gap="md">
              <MobileStatsCard
                title="Total Users"
                value={formatNumber(userEngagement.summary.totalUsers)}
                icon={<Users className="h-5 w-5 sm:h-6 sm:w-6" />}
                color="blue"
              />
              <MobileStatsCard
                title="Active Users"
                value={formatNumber(userEngagement.summary.activeUsers)}
                icon={<Activity className="h-5 w-5 sm:h-6 sm:w-6" />}
                color="green"
              />
              <MobileStatsCard
                title="Retention Rate"
                value={`${userEngagement.summary.retentionRate.toFixed(1)}%`}
                icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />}
                color="purple"
                trend={{ value: userEngagement.summary.retentionRate > 50 ? 5 : -5, isPositive: userEngagement.summary.retentionRate > 50 }}
              />
            </MobileGrid>

            <MobileCard>
              <div className="p-2 sm:p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily User Engagement</h3>
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={userEngagement.dailyEngagement}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="activeUsers" stroke="#3B82F6" strokeWidth={2} />
                      <Line type="monotone" dataKey="sessions" stroke="#10B981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </MobileCard>
          </div>
        )}

        {/* Chat Metrics Tab */}
        {activeTab === 'chat-metrics' && chatMetrics && (
          <div className="space-y-6">
            <MobileGrid cols={isMobile ? 1 : 2} gap="md">
              <MobileStatsCard
                title="Total Sessions"
                value={formatNumber(chatMetrics.summary.totalSessions)}
                icon={<MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />}
                color="blue"
              />
              <MobileStatsCard
                title="Total Messages"
                value={formatNumber(chatMetrics.summary.totalMessages)}
                icon={<Activity className="h-5 w-5 sm:h-6 sm:w-6" />}
                color="green"
              />
              <MobileStatsCard
                title="Avg Session Duration"
                value={`${chatMetrics.summary.avgSessionDuration} min`}
                icon={<Clock className="h-5 w-5 sm:h-6 sm:w-6" />}
                color="purple"
              />
              <MobileStatsCard
                title="Total Tokens"
                value={formatNumber(chatMetrics.summary.totalTokens)}
                icon={<Zap className="h-5 w-5 sm:h-6 sm:w-6" />}
                color="yellow"
              />
            </MobileGrid>

            <MobileCard>
              <div className="p-2 sm:p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Chat Metrics</h3>
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chatMetrics.dailyMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="sessions" fill="#3B82F6" />
                      <Bar dataKey="totalMessages" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </MobileCard>
          </div>
        )}

        {/* AI Performance Tab */}
        {activeTab === 'ai-performance' && aiPerformance && (
          <div className="space-y-6">
            <MobileGrid cols={isMobile ? 1 : 2} gap="md">
              <MobileStatsCard
                title="Total Responses"
                value={formatNumber(aiPerformance.summary.totalResponses)}
                icon={<Bot className="h-5 w-5 sm:h-6 sm:w-6" />}
                color="blue"
              />
              <MobileStatsCard
                title="Avg Response Time"
                value={`${aiPerformance.summary.avgResponseTime.toFixed(2)}s`}
                icon={<Clock className="h-5 w-5 sm:h-6 sm:w-6" />}
                color="green"
                trend={{ value: aiPerformance.summary.avgResponseTime < 2 ? 10 : -5, isPositive: aiPerformance.summary.avgResponseTime < 2 }}
              />
              <MobileStatsCard
                title="Avg Rating"
                value={`${aiPerformance.summary.avgRating.toFixed(1)}/5`}
                icon={<Star className="h-5 w-5 sm:h-6 sm:w-6" />}
                color="yellow"
                trend={{ value: aiPerformance.summary.avgRating > 4 ? 8 : -3, isPositive: aiPerformance.summary.avgRating > 4 }}
              />
              <MobileStatsCard
                title="Avg Tokens/Response"
                value={formatNumber(aiPerformance.summary.avgTokensPerResponse)}
                icon={<Zap className="h-5 w-5 sm:h-6 sm:w-6" />}
                color="purple"
              />
            </MobileGrid>

            <MobileGrid cols={isMobile ? 1 : 2} gap="md">
              <MobileCard>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Distribution</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-600">Positive (4-5⭐)</span>
                      <span className="font-semibold">{aiPerformance.ratingDistribution.positive}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-yellow-600">Neutral (3⭐)</span>
                      <span className="font-semibold">{aiPerformance.ratingDistribution.neutral}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-red-600">Negative (1-2⭐)</span>
                      <span className="font-semibold">{aiPerformance.ratingDistribution.negative}</span>
                    </div>
                  </div>
                </div>
              </MobileCard>

              <MobileCard>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={aiPerformance.dailyPerformance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="avgResponseTime" stroke="#3B82F6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </MobileCard>
            </MobileGrid>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}