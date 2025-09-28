"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import apiClient from '../../utils/apiClient';
import type { ModuleCategory } from '../../types/lms';

interface CategorySelectorProps {
  selectedCategory?: string;
  onCategorySelect: (categoryId: string | null, categoryName: string) => void;
  className?: string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  onCategorySelect,
  className = ''
}) => {
  const [categories, setCategories] = useState<ModuleCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.getModuleCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryClick = (category: ModuleCategory | null) => {
    if (category) {
      onCategorySelect(category.id, category.name);
    } else {
      onCategorySelect(null, 'All');
    }
  };

  if (isLoading) {
    return (
      <div className={`flex gap-2 overflow-x-auto pb-1 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 h-8 w-20 bg-gray-200 rounded-full animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Scrollable category container */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {/* All categories option */}
        <button
          onClick={() => handleCategoryClick(null)}
          className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-full transition-colors duration-200 ${
            !selectedCategory
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>

        {/* Category pills */}
        {categories.map((category) => (
          <motion.button
            key={category.id}
            onClick={() => handleCategoryClick(category)}
            className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-full transition-colors duration-200 ${
              selectedCategory === category.id
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            whileTap={{ scale: 0.98 }}
          >
            {category.name}
          </motion.button>
        ))}
      </div>

      {/* Subtle scroll indicator */}
      <div className="flex justify-center mt-2">
        <div className="flex gap-1">
          {categories.length > 3 && (
            <>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategorySelector;