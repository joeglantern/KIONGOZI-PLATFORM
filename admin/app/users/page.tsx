"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit3, 
  MoreVertical,
  Mail,
  Calendar,
  Shield,
  ShieldCheck,
  User,
  UserCheck,
  Ban,
  Crown,
  Download
} from 'lucide-react';
import clsx from 'clsx';
// No longer need direct Supabase import

interface User {
  id: string;
  name: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role: string;
  status: string;
  last_login_at?: string;
  login_count: number;
  created_at: string;
  updated_at: string;
  totalChats?: number;
  banned_at?: string;
  ban_reason?: string;
  deactivated_at?: string;
}

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    full_name: '',
    first_name: '',
    last_name: '',
    role: 'user',
    password: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when search or filter changes
  }, [searchTerm, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      setUsers(data.users || []);
      setTotalUsers(data.count || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    setSelectedUsers([]); // Clear selected users when changing pages
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      setSelectedUsers([]);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    const currentUserIds = currentUsers.map(user => user.id);
    const allCurrentSelected = currentUserIds.every(id => selectedUsers.includes(id));
    
    if (allCurrentSelected) {
      // Deselect all current page users
      setSelectedUsers(prev => prev.filter(id => !currentUserIds.includes(id)));
    } else {
      // Select all current page users
      setSelectedUsers(prev => {
        const uniqueIds = Array.from(new Set([...prev, ...currentUserIds]));
        return uniqueIds;
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatus = (user: User) => {
    return user.status || 'active';
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'banned': return 'Banned';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4 text-red-500" />;
      case 'moderator': return <ShieldCheck className="w-4 h-4 text-blue-500" />;
      case 'user': return <User className="w-4 h-4 text-gray-500" />;
      default: return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'moderator': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'banned': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <UserCheck className="w-4 h-4" />;
      case 'inactive': return <User className="w-4 h-4" />;
      case 'banned': return <Ban className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getCurrentAdminId = () => {
    // This would normally come from authentication context
    // For now, we'll try to get the first admin user
    const adminUser = users.find(u => u.role === 'admin');
    return adminUser?.id || null;
  };

  const bulkUserAction = async (action: string, params?: any) => {
    if (selectedUsers.length === 0) {
      alert('Please select users first');
      return;
    }

    const adminId = getCurrentAdminId();
    if (!adminId) {
      alert('Admin authentication required');
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userIds: selectedUsers,
          adminId,
          params
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Successfully ${action}ed ${result.summary.successful} users${result.summary.failed > 0 ? `, ${result.summary.failed} failed` : ''}`);
        setSelectedUsers([]);
        fetchUsers(); // Refresh user list
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      alert(`Failed to ${action} users: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const editUser = (user: User) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This will permanently delete all their conversations and data. This cannot be undone.`)) {
      return;
    }

    const adminId = getCurrentAdminId();
    if (!adminId) {
      alert('Admin authentication required');
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-id': adminId
        }
      });

      if (response.ok) {
        alert(`User ${userName} deleted successfully`);
        fetchUsers();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      alert(`Failed to delete user: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const changeUserStatus = async (userId: string, action: 'activate' | 'deactivate' | 'ban', reason?: string) => {
    const adminId = getCurrentAdminId();
    if (!adminId) {
      alert('Admin authentication required');
      return;
    }

    try {
      setActionLoading(true);
      let endpoint, method, body;

      if (action === 'ban') {
        endpoint = `/api/admin/users/${userId}/ban`;
        method = 'POST';
        body = { adminId, reason: reason || 'Administrative action' };
      } else {
        endpoint = `/api/admin/users/${userId}/status`;
        method = 'POST';
        body = { action, adminId };
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message);
        fetchUsers();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      alert(`Failed to ${action} user: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const exportUserData = () => {
    try {
      const csvData = [
        ['User Export - ' + new Date().toLocaleDateString()],
        ['Generated on: ' + new Date().toLocaleString()],
        [''],
        ['ID', 'Name', 'Email', 'Role', 'Status', 'Created', 'Last Login', 'Login Count'],
        ...filteredUsers.map(user => [
          user.id,
          user.name,
          user.email,
          user.role,
          getStatusDisplayName(getStatus(user)),
          new Date(user.created_at).toLocaleDateString(),
          user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never',
          user.login_count || 0
        ])
      ];

      const csvContent = csvData.map(row => 
        Array.isArray(row) ? row.map(field => `"${field}"`).join(',') : row
      ).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(`Failed to export data: ${error.message}`);
    }
  };

  const addUser = async () => {
    try {
      setActionLoading(true);
      const adminId = getCurrentAdminId();

      if (!newUserData.email || !newUserData.full_name || !newUserData.password) {
        alert('Please fill in all required fields');
        return;
      }

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newUserData,
          adminId
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert('User created successfully!');
        setShowAddUserModal(false);
        setNewUserData({
          email: '',
          full_name: '',
          first_name: '',
          last_name: '',
          role: 'user',
          password: ''
        });
        fetchUsers();
      } else {
        const error = await response.json();
        alert(`Failed to create user: ${error.error}`);
      }
    } catch (error: any) {
      alert(`Failed to create user: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const userCounts = {
    total: users.length,
    active: users.filter(u => getStatus(u) === 'active').length,
    admins: users.filter(u => u.role === 'admin').length,
    inactive: users.filter(u => getStatus(u) === 'inactive').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage user accounts, roles, and permissions</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportUserData}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button 
              onClick={() => setShowAddUserModal(true)}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add User</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{userCounts.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-2xl font-bold">{userCounts.active}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Crown className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Admins</p>
                <p className="text-2xl font-bold">{userCounts.admins}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Ban className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Inactive Users</p>
                <p className="text-2xl font-bold">{userCounts.inactive}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="content_editor">Content Editor</option>
                <option value="moderator">Moderator</option>
                <option value="org_admin">Org Admin</option>
                <option value="analyst">Analyst</option>
                <option value="researcher">Researcher</option>
              </select>
              <button 
                onClick={() => alert('Advanced filters would allow filtering by registration date, activity, etc.')}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowRoleModal(true)}
                  disabled={actionLoading}
                  className="text-sm text-blue-700 hover:text-blue-800 font-medium transition-colors disabled:opacity-50"
                >
                  Change Role
                </button>
                <button 
                  onClick={() => {
                    if (confirm(`Are you sure you want to deactivate ${selectedUsers.length} selected users?`)) {
                      bulkUserAction('deactivate');
                    }
                  }}
                  disabled={actionLoading}
                  className="text-sm text-yellow-600 hover:text-yellow-700 font-medium transition-colors disabled:opacity-50"
                >
                  Deactivate
                </button>
                <button 
                  onClick={() => {
                    const reason = prompt('Reason for banning (optional):');
                    if (confirm(`Are you sure you want to ban ${selectedUsers.length} selected users?`)) {
                      bulkUserAction('ban', { reason });
                    }
                  }}
                  disabled={actionLoading}
                  className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
                >
                  Ban
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-4 p-4">
                    <input
                      type="checkbox"
                      checked={currentUsers.length > 0 && currentUsers.every(user => selectedUsers.includes(user.id))}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="text-left p-4 font-medium text-gray-900">User</th>
                  <th className="text-left p-4 font-medium text-gray-900">Role</th>
                  <th className="text-left p-4 font-medium text-gray-900">Status</th>
                  <th className="text-left p-4 font-medium text-gray-900 hidden md:table-cell">Last Updated</th>
                  <th className="text-left p-4 font-medium text-gray-900 hidden lg:table-cell">Join Date</th>
                  <th className="w-10 p-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-500">Loading users...</td></tr>
                ) : error ? (
                  <tr><td colSpan={7} className="p-8 text-center text-red-500">Error: {error}</td></tr>
                ) : currentUsers.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-500">No users found</td></tr>
                ) : currentUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                          {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : '??'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <div className="flex items-center gap-1 text-gray-500">
                            <Mail className="w-3 h-3" />
                            <span className="text-sm">{user.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <span className={clsx(
                          'px-2 py-1 rounded-full text-xs font-medium border',
                          getRoleColor(user.role)
                        )}>
                          {user.role}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(getStatus(user))}
                        <span className={clsx(
                          'px-2 py-1 rounded-full text-xs font-medium border',
                          getStatusColor(getStatus(user))
                        )}>
                          {getStatusDisplayName(getStatus(user))}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{formatDate(user.updated_at)}</span>
                      </div>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <span className="text-sm text-gray-500">{formatDate(user.created_at)}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => editUser(user)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
                          title="Edit User"
                          disabled={actionLoading}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <div className="relative group">
                          <button 
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
                            title="More Options"
                            disabled={actionLoading}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          <div className="absolute right-0 mt-1 hidden group-hover:block bg-white shadow-lg border rounded-lg py-1 z-10 min-w-32">
                            <button 
                              onClick={() => changeUserStatus(user.id, 'deactivate')}
                              className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 text-yellow-600"
                            >
                              Deactivate
                            </button>
                            <button 
                              onClick={() => {
                                const reason = prompt('Reason for banning:');
                                if (reason !== null) changeUserStatus(user.id, 'ban', reason);
                              }}
                              className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 text-red-600"
                            >
                              Ban User
                            </button>
                            <button 
                              onClick={() => deleteUser(user.id, user.name)}
                              className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {/* Page Numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                  if (page > totalPages) return null;
                  
                  return (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        page === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button 
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add New User</h2>
              <button 
                onClick={() => setShowAddUserModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUserData.full_name}
                  onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={newUserData.first_name}
                    onChange={(e) => setNewUserData({ ...newUserData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newUserData.last_name}
                    onChange={(e) => setNewUserData({ ...newUserData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                  <option value="content_editor">Content Editor</option>
                  <option value="analyst">Analyst</option>
                  <option value="researcher">Researcher</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter password"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAddUserModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addUser}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}