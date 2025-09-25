'use client';

import { useState, useEffect } from 'react';
import { Shield, Activity, AlertTriangle, Users, Clock, Eye, Ban, CheckCircle, TrendingUp, Settings } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { MobileStatsCard, MobileGrid, MobileCard, MobileTabs, MobileTable, useIsMobile } from '../components/MobileOptimized';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SecurityStats {
  security: {
    blockedIPs: string[];
    recentAttacks: number;
    suspiciousPatterns: number;
    blockedUserAgents: number;
  };
  rateLimiting: {
    chat: { totalEntries: number; blockedClients: number; suspiciousClients: number; };
    api: { totalEntries: number; blockedClients: number; suspiciousClients: number; };
    auth: { totalEntries: number; blockedClients: number; suspiciousClients: number; };
    admin: { totalEntries: number; blockedClients: number; suspiciousClients: number; };
  };
  recentLogs: Array<{
    id: string;
    level: string;
    message: string;
    created_at: string;
    details: any;
  }>;
}

interface ThreatData {
  totalThreats: number;
  uniqueIPs: number;
  topThreats: Array<[string, number]>;
  hourlyDistribution: number[];
}

export default function SecurityPage() {
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [threatData, setThreatData] = useState<ThreatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [blockIpForm, setBlockIpForm] = useState({ ip: '', reason: '' });
  const [unblockIpForm, setUnblockIpForm] = useState({ ip: '' });
  const [unblocking, setUnblocking] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchSecurityData();
    // Auto-refresh security data every 30 seconds
    const interval = setInterval(fetchSecurityData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get Supabase session to authenticate with API server
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session. Please login again.');
      }

      // Use Supabase JWT token for API server authentication
      const token = session.access_token;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [overviewRes, threatsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE}/admin/security/overview`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE}/admin/security/threats`, { headers })
      ]);

      if (overviewRes.ok && threatsRes.ok) {
        const overview = await overviewRes.json();
        const threats = await threatsRes.json();

        setSecurityStats(overview.data);
        setThreatData(threats.data);
      } else {
        // Get error details
        const overviewError = !overviewRes.ok ? await overviewRes.text() : null;
        const threatsError = !threatsRes.ok ? await threatsRes.text() : null;

        const errorMsg = overviewError || threatsError || `API Error - Overview: ${overviewRes.status}, Threats: ${threatsRes.status}`;
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Security data fetch failed:', error);
      setError(`${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockIP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockIpForm.ip.trim() || !blockIpForm.reason.trim()) {
      alert('Please provide both IP address and reason');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please login again');
        return;
      }
      const token = session.access_token;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/admin/security/block-ip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(blockIpForm)
      });

      if (response.ok) {
        alert(`IP ${blockIpForm.ip} blocked successfully`);
        setBlockIpForm({ ip: '', reason: '' });
        fetchSecurityData(); // Refresh data
      } else {
        throw new Error('Failed to block IP');
      }
    } catch (error) {
      console.error('Failed to block IP:', error);
      alert('Failed to block IP. Make sure the API server is running.');
    }
  };

  const handleUnblockIP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unblockIpForm.ip.trim()) {
      alert('Please provide IP address to unblock');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please login again');
        return;
      }
      const token = session.access_token;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/admin/security/unblock-ip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(unblockIpForm)
      });

      if (response.ok) {
        alert(`IP ${unblockIpForm.ip} unblocked successfully`);
        setUnblockIpForm({ ip: '' });
        fetchSecurityData(); // Refresh data
      } else {
        throw new Error('Failed to unblock IP');
      }
    } catch (error) {
      console.error('Failed to unblock IP:', error);
      alert('Failed to unblock IP. Make sure the API server is running.');
    }
  };

  const handleDirectUnblock = async (ip: string) => {
    if (!confirm(`Are you sure you want to unblock IP: ${ip}?`)) {
      return;
    }

    setUnblocking(ip);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please login again');
        return;
      }
      const token = session.access_token;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/admin/security/unblock-ip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ip })
      });

      if (response.ok) {
        alert(`IP ${ip} unblocked successfully`);
        fetchSecurityData(); // Refresh data
      } else {
        const errorData = await response.text();
        throw new Error(`Failed to unblock IP: ${errorData}`);
      }
    } catch (error) {
      console.error('Failed to unblock IP:', error);
      alert(`Failed to unblock IP: ${(error as Error).message}`);
    } finally {
      setUnblocking(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading security data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center max-w-md">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-800 mb-2">Connection Error</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={fetchSecurityData}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Security Center</h1>
            <p className="text-gray-600">Monitor and manage platform security</p>
          </div>
          <button 
            onClick={fetchSecurityData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <MobileTabs
          tabs={[
            { id: 'overview', label: 'Overview', icon: <Shield className="h-4 w-4" /> },
            { id: 'threats', label: 'Threats', icon: <AlertTriangle className="h-4 w-4" /> },
            { id: 'logs', label: 'Logs', icon: <Activity className="h-4 w-4" /> },
            { id: 'management', label: 'Management', icon: <Settings className="h-4 w-4" /> }
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {activeTab === 'overview' && (
          securityStats ? (
          <div className="space-y-6">
            {/* Security Overview Cards */}
            <MobileGrid cols={isMobile ? 1 : 2} gap="md">
              <MobileStatsCard
                title="Blocked IPs"
                value={securityStats.security.blockedIPs.length}
                icon={<Shield className="h-5 w-5 sm:h-6 sm:w-6" />}
                color="green"
              />
              <MobileStatsCard
                title="Recent Attacks"
                value={securityStats.security.recentAttacks}
                icon={<AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />}
                color="red"
              />
              <MobileStatsCard
                title="Rate Limited"
                value={Object.values(securityStats.rateLimiting).reduce((sum, rl) => sum + rl.blockedClients, 0)}
                icon={<Activity className="h-5 w-5 sm:h-6 sm:w-6" />}
                color="blue"
              />
              <MobileStatsCard
                title="Suspicious Activity"
                value={Object.values(securityStats.rateLimiting).reduce((sum, rl) => sum + rl.suspiciousClients, 0)}
                icon={<Eye className="h-5 w-5 sm:h-6 sm:w-6" />}
                color="purple"
              />
            </MobileGrid>

            {/* Rate Limiting Status */}
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                  Rate Limiting Status
                </h3>
                <p className="text-gray-600 mt-1">Current rate limiting metrics across all endpoints</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Object.entries(securityStats.rateLimiting).map(([type, stats]) => (
                    <div key={type} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900 capitalize">{type}</h4>
                        <div className={`w-3 h-3 rounded-full ${
                          stats.blockedClients > 0 ? 'bg-red-500' : 'bg-green-500'
                        }`}></div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Entries:</span>
                          <span className="font-medium">{stats.totalEntries}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Blocked:</span>
                          <span className={`font-medium ${stats.blockedClients > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            {stats.blockedClients}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Suspicious:</span>
                          <span className={`font-medium ${stats.suspiciousClients > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
                            {stats.suspiciousClients}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">No Security Data Available</h3>
            <p className="text-gray-400 mb-4">Unable to load security statistics</p>
            <button
              onClick={fetchSecurityData}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry Loading
            </button>
          </div>
        ))}

        {activeTab === 'threats' && (
          threatData ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl shadow-sm border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-red-600 mb-1">Total Threats (24h)</h3>
                    <p className="text-4xl font-bold text-red-800">{threatData.totalThreats}</p>
                  </div>
                  <div className="bg-red-200 p-3 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-red-700" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl shadow-sm border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-orange-600 mb-1">Unique IPs</h3>
                    <p className="text-4xl font-bold text-orange-800">{threatData.uniqueIPs}</p>
                  </div>
                  <div className="bg-orange-200 p-3 rounded-full">
                    <Users className="h-6 w-6 text-orange-700" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl shadow-sm border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-yellow-600 mb-1">Top Threat</h3>
                    <p className="text-lg font-semibold text-yellow-800 truncate">
                      {threatData.topThreats[0]?.[0] || 'None'}
                    </p>
                    <p className="text-sm text-yellow-600">
                      {threatData.topThreats[0]?.[1] || 0} incidents
                    </p>
                  </div>
                  <div className="bg-yellow-200 p-3 rounded-full">
                    <Activity className="h-6 w-6 text-yellow-700" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900">Top Threat Types</h3>
                <p className="text-gray-600 mt-1">Most common security threats in the last 24 hours</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {threatData.topThreats.slice(0, 5).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="font-medium text-gray-900">{type}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-semibold text-red-600">{count}</span>
                        <p className="text-xs text-gray-500">incidents</p>
                      </div>
                    </div>
                  ))}
                  {threatData.topThreats.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No threats detected in the last 24 hours</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertTriangle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">No Threat Data Available</h3>
            <p className="text-gray-400 mb-4">Unable to load threat intelligence</p>
            <button
              onClick={fetchSecurityData}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry Loading
            </button>
          </div>
        ))}

      {activeTab === 'logs' && (
        securityStats ? (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Security Events</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {securityStats.recentLogs.slice(0, 20).map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.level === 'error' ? 'bg-red-100 text-red-800' :
                          log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.message}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.details?.ip || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ) : (
          <div className="text-center py-12">
            <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">No Security Logs Available</h3>
            <p className="text-gray-400 mb-4">Unable to load security event logs</p>
            <button
              onClick={fetchSecurityData}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry Loading
            </button>
          </div>
        )
      )}

        {activeTab === 'management' && (
          <div className="space-y-6">
            <MobileGrid cols={isMobile ? 1 : 2} gap="md">
              {/* Block IP Form */}
              <MobileCard>
                <div className="flex items-center mb-4">
                  <Ban className="h-5 w-5 mr-2 text-red-600" />
                  <h3 className="text-lg font-medium text-gray-900">Block IP Address</h3>
                </div>
                <form onSubmit={handleBlockIP} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IP Address
                    </label>
                    <input
                      type="text"
                      value={blockIpForm.ip}
                      onChange={(e) => setBlockIpForm({ ...blockIpForm, ip: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                      placeholder="192.168.1.1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason
                    </label>
                    <textarea
                      value={blockIpForm.reason}
                      onChange={(e) => setBlockIpForm({ ...blockIpForm, reason: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                      rows={3}
                      placeholder="Reason for blocking this IP..."
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition-colors font-medium"
                  >
                    Block IP Address
                  </button>
                </form>
              </MobileCard>

              {/* Unblock IP Form */}
              <MobileCard>
                <div className="flex items-center mb-4">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  <h3 className="text-lg font-medium text-gray-900">Unblock IP Address</h3>
                </div>
                <form onSubmit={handleUnblockIP} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IP Address
                    </label>
                    <input
                      type="text"
                      value={unblockIpForm.ip}
                      onChange={(e) => setUnblockIpForm({ ...unblockIpForm, ip: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                      placeholder="192.168.1.1"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors font-medium"
                  >
                    Unblock IP Address
                  </button>
                </form>
              </MobileCard>
            </MobileGrid>

          {/* Blocked IPs List */}
          {securityStats && securityStats.security.blockedIPs.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Currently Blocked IPs</h3>
                <span className="text-sm text-gray-500">{securityStats.security.blockedIPs.length} blocked</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {securityStats.security.blockedIPs.map((ip) => (
                  <div key={ip} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-sm font-mono font-medium text-gray-900">{ip}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setUnblockIpForm({ ip })}
                        className="text-xs px-2 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                        title="Fill unblock form"
                      >
                        Fill Form
                      </button>
                      <button
                        onClick={() => handleDirectUnblock(ip)}
                        disabled={unblocking === ip}
                        className="text-xs px-2 py-1 bg-green-600 text-white hover:bg-green-700 rounded disabled:opacity-50"
                        title="Unblock immediately"
                      >
                        {unblocking === ip ? 'Unblocking...' : 'Unblock Now'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}