"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { 
  Search, 
  Filter, 
  Eye, 
  Trash2, 
  Download,
  MessageSquare,
  User,
  Clock,
  MoreVertical,
  Plus
} from 'lucide-react';
import clsx from 'clsx';
// No longer need direct Supabase import

interface Chat {
  id: string;
  user: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function ChatsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedChatDetails, setSelectedChatDetails] = useState<any>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [chatsPerPage] = useState(10);

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when search changes
  }, [searchTerm]);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/chats');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch chats');
      }

      setChats(data.chats || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chat.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredChats.length / chatsPerPage);
  const startIndex = (currentPage - 1) * chatsPerPage;
  const endIndex = startIndex + chatsPerPage;
  const currentChats = filteredChats.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    setSelectedChats([]); // Clear selected chats when changing pages
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      setSelectedChats([]);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setSelectedChats([]);
    }
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChats(prev => 
      prev.includes(chatId) 
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  const handleSelectAll = () => {
    const currentChatIds = currentChats.map(chat => chat.id);
    const allCurrentSelected = currentChatIds.every(id => selectedChats.includes(id));
    
    if (allCurrentSelected) {
      // Deselect all current page chats
      setSelectedChats(prev => prev.filter(id => !currentChatIds.includes(id)));
    } else {
      // Select all current page chats
      setSelectedChats(prev => {
        const uniqueIds = Array.from(new Set([...prev, ...currentChatIds]));
        return uniqueIds;
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActivityStatus = (updatedAt: string) => {
    const daysSinceUpdate = Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceUpdate <= 1 ? 'active' : daysSinceUpdate <= 7 ? 'recent' : 'inactive';
  };

  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Access denied</div>;
  }

  const viewChatDetails = async (chatId: string, chatTitle: string) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/chats/${chatId}`);
      
      if (response.ok) {
        const result = await response.json();
        setSelectedChatDetails(result.conversation);
        setShowChatModal(true);
      } else {
        const error = await response.json();
        alert(`Failed to load chat details: ${error.error}`);
      }
    } catch (error: any) {
      alert(`Failed to load chat details: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const archiveChats = async (chatIds: string[]) => {
    const adminId = user.id;
    try {
      setActionLoading(true);
      let successCount = 0;
      
      for (const chatId of chatIds) {
        const response = await fetch(`/api/admin/chats/${chatId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'archive', adminId })
        });
        
        if (response.ok) successCount++;
      }
      
      alert(`Successfully archived ${successCount} out of ${chatIds.length} chats`);
      setSelectedChats([]);
      fetchChats();
    } catch (error: any) {
      alert(`Failed to archive chats: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteChats = async (chatIds: string[]) => {
    const adminId = user.id;
    try {
      setActionLoading(true);
      let successCount = 0;
      
      for (const chatId of chatIds) {
        const response = await fetch(`/api/admin/chats/${chatId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminId })
        });
        
        if (response.ok) successCount++;
      }
      
      alert(`Successfully deleted ${successCount} out of ${chatIds.length} chats`);
      setSelectedChats([]);
      fetchChats();
    } catch (error: any) {
      alert(`Failed to delete chats: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const exportChatData = () => {
    try {
      const csvData = [
        ['Chat Export - ' + new Date().toLocaleDateString()],
        ['Generated on: ' + new Date().toLocaleString()],
        [''],
        ['ID', 'User', 'Title', 'Created', 'Updated', 'Status'],
        ...chats.map(chat => [
          chat.id,
          chat.user,
          chat.title,
          new Date(chat.created_at).toLocaleDateString(),
          new Date(chat.updated_at).toLocaleDateString(),
          getActivityStatus(chat.updated_at)
        ])
      ];

      const csvContent = csvData.map(row => 
        Array.isArray(row) ? row.map(field => `"${field}"`).join(',') : row
      ).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chats-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(`Failed to export data: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'recent': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chat Management</h1>
            <p className="text-gray-600">Monitor and manage all chatbot conversations</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportChatData}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button 
              onClick={() => alert('Chat creation would integrate with the chat system - this opens a new chat interface')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search chats by user or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => alert('Would show advanced filters for chats (date range, activity status, etc.)')}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedChats.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedChats.length} chat{selectedChats.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => archiveChats(selectedChats)}
                  disabled={actionLoading}
                  className="text-sm text-blue-700 hover:text-blue-800 font-medium transition-colors disabled:opacity-50"
                >
                  Archive
                </button>
                <button 
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete ${selectedChats.length} selected chats? This cannot be undone.`)) {
                      deleteChats(selectedChats);
                    }
                  }}
                  disabled={actionLoading}
                  className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chats Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-4 p-4">
                    <input
                      type="checkbox"
                      checked={currentChats.length > 0 && currentChats.every(chat => selectedChats.includes(chat.id))}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="text-left p-4 font-medium text-gray-900">User</th>
                  <th className="text-left p-4 font-medium text-gray-900">Title</th>
                  <th className="text-left p-4 font-medium text-gray-900">Activity</th>
                  <th className="text-left p-4 font-medium text-gray-900 hidden lg:table-cell">Updated</th>
                  <th className="w-10 p-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading chats...</td></tr>
                ) : error ? (
                  <tr><td colSpan={6} className="p-8 text-center text-red-500">Error: {error}</td></tr>
                ) : currentChats.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">No chats found</td></tr>
                ) : currentChats.map((chat) => (
                  <tr key={chat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedChats.includes(chat.id)}
                        onChange={() => handleSelectChat(chat.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {chat.user ? chat.user.split(' ').map(n => n[0]).join('') : '??'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{chat.user}</p>
                          <p className="text-sm text-gray-500">{chat.user_id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{chat.title}</p>
                    </td>
                    <td className="p-4">
                      <span className={clsx(
                        'px-2 py-1 rounded-full text-xs font-medium border',
                        getStatusColor(getActivityStatus(chat.updated_at))
                      )}>
                        {getActivityStatus(chat.updated_at)}
                      </span>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{formatDate(chat.updated_at)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => viewChatDetails(chat.id, chat.title)}
                          disabled={actionLoading}
                          className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                          title="View Chat"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => alert(`More options for chat: ${chat.title}`)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
                          title="More Options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
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
                Showing {startIndex + 1} to {Math.min(endIndex, filteredChats.length)} of {filteredChats.length} chats
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

        {/* Chat Details Modal */}
        {showChatModal && selectedChatDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Chat Details</h2>
                <button 
                  onClick={() => setShowChatModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900">{selectedChatDetails.title}</h3>
                  <p className="text-sm text-gray-600">
                    User: {selectedChatDetails.profiles?.full_name || 'Unknown'} ({selectedChatDetails.profiles?.email})
                  </p>
                  <p className="text-sm text-gray-600">
                    Created: {new Date(selectedChatDetails.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-4">
                  {selectedChatDetails.messages?.map((message: any, index: number) => (
                    <div key={message.id} className={`flex ${message.is_user ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-4 rounded-lg ${
                        message.is_user 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className="text-sm font-medium mb-1 opacity-75">
                          {message.is_user ? 'User' : 'Assistant'}
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{message.text}</div>
                        <div className="text-xs opacity-75 mt-2">
                          {new Date(message.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}