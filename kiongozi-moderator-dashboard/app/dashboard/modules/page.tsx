"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import apiClient from '@/app/utils/apiClient';
import Link from 'next/link';
import { Search, Plus, FileText, Edit, Trash2 } from 'lucide-react';

interface Module {
  id: string;
  title: string;
  description: string;
  difficulty_level: string;
  status: string;
  estimated_duration_minutes: number;
  category?: { name: string; color: string };
  author_name?: string;
  view_count: number;
}

export default function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/content/modules', {
        params: { limit: 100 }
      });
      console.log('Modules API response:', response);
      if (response.success && response.data) {
        setModules(Array.isArray(response.data) ? response.data : []);
      } else {
        console.error('Unexpected API response format:', response);
        setModules([]);
      }
    } catch (error) {
      console.error('Failed to load modules:', error);
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (moduleId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      await apiClient.delete(`/content/modules/${moduleId}`);
      setModules(modules.filter(m => m.id !== moduleId));
      alert('Module deleted successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete module');
    }
  };

  const filteredModules = modules.filter(module => {
    const matchesSearch = module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         module.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'all' || module.difficulty_level === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#c9975b] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading modules...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Learning Modules</h1>
        <p className="text-gray-600 mt-2">View all learning modules. Create new modules within courses.</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
              />
            </div>

            <div>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
              >
                <option value="all">All Difficulty Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">{modules.length}</div>
            <div className="text-sm text-gray-600">Total Modules</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {modules.filter(m => m.difficulty_level === 'beginner').length}
            </div>
            <div className="text-sm text-gray-600">Beginner</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {modules.filter(m => m.difficulty_level === 'intermediate').length}
            </div>
            <div className="text-sm text-gray-600">Intermediate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {modules.filter(m => m.difficulty_level === 'advanced').length}
            </div>
            <div className="text-sm text-gray-600">Advanced</div>
          </CardContent>
        </Card>
      </div>

      {/* Modules List */}
      <div className="space-y-4">
        {filteredModules.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No modules found</p>
            </CardContent>
          </Card>
        ) : (
          filteredModules.map((module) => (
            <Card key={module.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{module.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(module.difficulty_level)}`}>
                        {module.difficulty_level}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {module.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{module.estimated_duration_minutes} min</span>
                      {module.category && (
                        <>
                          <span>•</span>
                          <span>{module.category.name}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{module.view_count || 0} views</span>
                    </div>
                    {module.author_name && (
                      <p className="text-xs text-gray-500 mt-2">
                        By {module.author_name}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Link
                      href={`/dashboard/modules/${module.id}/edit`}
                      className="px-3 py-2 bg-[#c9975b] hover:bg-[#b58647] text-white rounded-lg transition-colors"
                    >
                      <Edit size={18} />
                    </Link>
                    <button
                      onClick={() => handleDelete(module.id, module.title)}
                      className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
