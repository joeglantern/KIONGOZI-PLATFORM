"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Folder, Clock, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LearningModule, ModuleCategory } from '../../types/lms';

interface CategoryBrowseProps {
  categoryName: string;
  modules: LearningModule[];
  categories?: ModuleCategory[];
  onModuleSelect: (module: LearningModule) => void;
  onCategorySelect?: (categoryName: string) => void;
}

const CategoryBrowse: React.FC<CategoryBrowseProps> = ({
  categoryName,
  modules,
  categories,
  onModuleSelect,
  onCategorySelect
}) => {
  // If no specific category, show category list
  if (categoryName === 'All Categories' && categories) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Folder className="w-4 h-4 text-blue-500" />
          <span className="font-medium text-gray-900">Browse Categories</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {categories.map((category) => (
            <motion.button
              key={category.id}
              onClick={() => onCategorySelect?.(category.name)}
              className="flex items-center justify-between p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              whileTap={{ scale: 0.98 }}
            >
              <div>
                <div className="font-medium text-gray-900 text-sm">
                  {category.name}
                </div>
                {category.description && (
                  <div className="text-xs text-gray-600 mt-1">
                    {category.description}
                  </div>
                )}
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </motion.button>
          ))}
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Select a category to browse modules, or use{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">/browse [category name]</code>
          </p>
        </div>
      </div>
    );
  }

  // Show modules in category
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Folder className="w-4 h-4 text-blue-500" />
        <span className="font-medium text-gray-900">
          {categoryName} Modules
        </span>
      </div>

      {modules.length === 0 ? (
        <div className="text-center py-6">
          <Folder className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 text-sm">
            No modules found in "{categoryName}" category
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Try browsing other categories with <code className="bg-gray-100 px-1 rounded">/browse</code>
          </p>
        </div>
      ) : (
        <>
          <div className="text-sm text-gray-600 mb-4">
            Found {modules.length} module{modules.length !== 1 ? 's' : ''} in {categoryName}
          </div>

          <div className="space-y-3">
            {modules.map((module, index) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors bg-white"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                      {module.title}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {module.description}
                    </p>
                  </div>

                  {module.is_featured && (
                    <div className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                      Featured
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{module.estimated_duration_minutes} min</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    <span className="capitalize">{module.difficulty_level}</span>
                  </div>

                  {module.view_count && (
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{module.view_count} learners</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onModuleSelect(module)}
                    className="flex-1 h-8 text-xs"
                  >
                    Start Learning
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onModuleSelect(module)}
                    className="h-8 px-3"
                  >
                    Preview
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CategoryBrowse;