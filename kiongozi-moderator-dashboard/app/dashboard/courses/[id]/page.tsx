"use client";

import { useState, useEffect, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import apiClient from '@/app/utils/apiClient';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X, GripVertical, Check, BookOpen } from 'lucide-react';
import Link from 'next/link';

interface Module {
  id: string;
  module_id: string;
  title: string;
  order_index: number;
  is_required: boolean;
  learning_modules?: {
    title: string;
    difficulty_level: string;
  };
}

interface AvailableModule {
  id: string;
  title: string;
  difficulty_level: string;
  estimated_duration_minutes: number;
}

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [availableModules, setAvailableModules] = useState<AvailableModule[]>([]);
  const [showAddModule, setShowAddModule] = useState(false);
  const [showCreateModule, setShowCreateModule] = useState(false);
  const [selectedModule, setSelectedModule] = useState('');
  const [newModuleData, setNewModuleData] = useState({
    title: '',
    description: '',
    content: '',
    difficulty_level: 'beginner',
    estimated_duration_minutes: 30,
  });

  useEffect(() => {
    loadCourse();
    loadAvailableModules();
  }, [resolvedParams.id]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/content/courses/${resolvedParams.id}`);
      console.log('Course detail API response:', response);

      if (response.success && response.data) {
        setCourse(response.data);
      }

      // Load course modules
      const modulesResponse = await apiClient.get(`/content/courses/${resolvedParams.id}/modules`);
      console.log('Course modules API response:', modulesResponse);
      if (modulesResponse.success && modulesResponse.data) {
        setModules(Array.isArray(modulesResponse.data) ? modulesResponse.data : []);
      }
    } catch (error) {
      console.error('Failed to load course:', error);
      alert('Failed to load course');
      router.push('/dashboard/courses');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableModules = async () => {
    try {
      const response = await apiClient.get('/content/modules', {
        params: { limit: 100 }
      });
      console.log('Available modules API response:', response);
      if (response.success && response.data) {
        setAvailableModules(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Failed to load modules:', error);
    }
  };

  const handleAddModule = async () => {
    if (!selectedModule) return;

    try {
      await apiClient.post(`/content/courses/${resolvedParams.id}/modules`, {
        module_id: selectedModule,
        order_index: modules.length,
        is_required: true
      });

      await loadCourse();
      setShowAddModule(false);
      setSelectedModule('');
      alert('Module added successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add module');
    }
  };

  const handleCreateModule = async () => {
    if (!newModuleData.title || !newModuleData.description || !newModuleData.content) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      console.log('🔧 Creating module with data:', newModuleData);

      // Create the module
      const moduleResponse = await apiClient.post('/content/modules', {
        ...newModuleData,
        category_id: course.category_id, // Use course's category
        status: 'published', // Create as published so it's visible in LMS
      });

      console.log('📡 Module creation response:', moduleResponse);

      if (moduleResponse.success && moduleResponse.data) {
        const createdModule = moduleResponse.data as { id: string };
        console.log('✅ Module created successfully, ID:', createdModule.id);
        console.log('🔗 Adding module to course...');

        // Add the new module to this course
        const linkResponse = await apiClient.post(`/content/courses/${resolvedParams.id}/modules`, {
          module_id: createdModule.id,
          order_index: modules.length,
          is_required: true
        });

        console.log('📡 Link creation response:', linkResponse);

        await loadCourse();
        setShowCreateModule(false);
        setNewModuleData({
          title: '',
          description: '',
          content: '',
          difficulty_level: 'beginner',
          estimated_duration_minutes: 30,
        });
        alert('Module created and added to course!');
      } else {
        console.error('❌ Module creation failed:', moduleResponse);
        alert('Module creation failed: ' + (moduleResponse.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('❌ Exception during module creation:', error);
      alert(error.response?.data?.error || 'Failed to create module');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveModule = async (moduleId: string) => {
    if (!confirm('Remove this module from the course?')) return;

    try {
      await apiClient.delete(`/content/courses/${resolvedParams.id}/modules/${moduleId}`);
      await loadCourse();
      alert('Module removed successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to remove module');
    }
  };

  const handleToggleRequired = async (module: Module) => {
    try {
      await apiClient.put(`/content/courses/${resolvedParams.id}/modules/${module.module_id}`, {
        is_required: !module.is_required
      });
      await loadCourse();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update module');
    }
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    const reordered = [...modules];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    const updates = reordered.map((mod, index) => ({
      module_id: mod.module_id,
      order_index: index
    }));

    try {
      await apiClient.put(`/content/courses/${resolvedParams.id}/modules/order`, { modules: updates });
      setModules(reordered);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to reorder modules');
      await loadCourse();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#c9975b] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/courses"
          className="inline-flex items-center gap-2 text-[#c9975b] hover:text-[#b58647] mb-4"
        >
          <ArrowLeft size={20} />
          Back to Courses
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
        <p className="text-gray-600 mt-2">Manage course modules and structure</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Info */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  course.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {course.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Difficulty</p>
                <p className="font-medium">{course.difficulty_level}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-medium">{course.estimated_duration_hours} hours</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Enrollments</p>
                <p className="font-medium">{course.enrollment_count || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Modules</p>
                <p className="font-medium">{modules.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modules Management */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Course Modules</CardTitle>
                <button
                  onClick={() => {
                    console.log('Add Module clicked');
                    setShowAddModule(true);
                    setShowCreateModule(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#c9975b] hover:bg-[#b58647] text-white rounded-lg font-medium transition-colors text-sm"
                >
                  <Plus size={18} />
                  Add Module
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {showAddModule && !showCreateModule && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Add Module to Course</h3>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => {
                        console.log('Create New Module clicked');
                        setShowCreateModule(true);
                      }}
                      className="flex-1 px-4 py-3 bg-[#c9975b] hover:bg-[#b58647] text-white rounded-lg font-medium transition-colors"
                    >
                      Create New Module
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mb-3 text-center">or select an existing module</p>
                  <div className="flex gap-2">
                    <select
                      value={selectedModule}
                      onChange={(e) => setSelectedModule(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                    >
                      <option value="">Select a module...</option>
                      {availableModules
                        .filter(am => !modules.find(m => m.module_id === am.id))
                        .map(module => (
                          <option key={module.id} value={module.id}>
                            {module.title} ({module.difficulty_level})
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={handleAddModule}
                      disabled={!selectedModule}
                      className="px-4 py-2 bg-[#c9975b] hover:bg-[#b58647] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddModule(false);
                        setSelectedModule('');
                      }}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {showCreateModule && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Create New Module for This Course</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Module Title *"
                      value={newModuleData.title}
                      onChange={(e) => setNewModuleData({ ...newModuleData, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                    />
                    <textarea
                      placeholder="Module Description *"
                      value={newModuleData.description}
                      onChange={(e) => setNewModuleData({ ...newModuleData, description: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                    />
                    <textarea
                      placeholder="Module Content (Markdown) *"
                      value={newModuleData.content}
                      onChange={(e) => setNewModuleData({ ...newModuleData, content: e.target.value })}
                      rows={8}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent font-mono text-sm"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={newModuleData.difficulty_level}
                        onChange={(e) => setNewModuleData({ ...newModuleData, difficulty_level: e.target.value })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Duration (minutes)"
                        value={newModuleData.estimated_duration_minutes}
                        onChange={(e) => setNewModuleData({ ...newModuleData, estimated_duration_minutes: parseInt(e.target.value) || 30 })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateModule}
                        disabled={saving}
                        className="px-4 py-2 bg-[#c9975b] hover:bg-[#b58647] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {saving ? 'Creating...' : 'Create & Add to Course'}
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateModule(false);
                          setNewModuleData({
                            title: '',
                            description: '',
                            content: '',
                            difficulty_level: 'beginner',
                            estimated_duration_minutes: 30,
                          });
                        }}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {modules.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No modules added yet</p>
                  <button
                    onClick={() => setShowAddModule(true)}
                    className="mt-4 text-[#c9975b] hover:text-[#b58647] font-medium"
                  >
                    Add your first module
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {modules.map((module, index) => (
                    <div
                      key={module.id}
                      className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex gap-2">
                        <button
                          onClick={() => index > 0 && handleReorder(index, index - 1)}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => index < modules.length - 1 && handleReorder(index, index + 1)}
                          disabled={index === modules.length - 1}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                          <h4 className="font-medium text-gray-900">
                            {module.learning_modules?.title || module.title}
                          </h4>
                        </div>
                        <p className="text-sm text-gray-500">
                          {module.learning_modules?.difficulty_level}
                        </p>
                      </div>

                      <button
                        onClick={() => handleToggleRequired(module)}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          module.is_required
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {module.is_required && <Check size={14} />}
                        {module.is_required ? 'Required' : 'Optional'}
                      </button>

                      <button
                        onClick={() => handleRemoveModule(module.module_id)}
                        className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
