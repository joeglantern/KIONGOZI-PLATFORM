"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { FiBarChart2, FiPieChart, FiTrendingUp, FiDownload, FiRefreshCw } from 'react-icons/fi';
import { motion } from 'framer-motion';

interface ChartDisplayProps {
  chartUrl?: string;
  title?: string;
  isLoading?: boolean;
  darkMode?: boolean;
  onRefresh?: () => void;
}

const ChartDisplay: React.FC<ChartDisplayProps> = ({ 
  chartUrl, 
  title = "Data Visualization",
  isLoading = false,
  darkMode = false,
  onRefresh
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // Function to download the chart image
  const downloadChart = () => {
    if (!chartUrl) return;
    
    const link = document.createElement('a');
    link.href = chartUrl;
    link.download = `${title.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`w-full rounded-xl ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} shadow-lg overflow-hidden transition-all duration-300`}>
      {/* Header with title and actions */}
      <div className={`flex justify-between items-center p-3 sm:p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className="text-base sm:text-lg font-semibold truncate pr-2">{title}</h3>
        
        <div className="flex space-x-2 flex-shrink-0">
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className={`p-1.5 rounded-md transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              title="Refresh chart"
              aria-label="Refresh chart"
            >
              <FiRefreshCw size={16} />
            </button>
          )}
          
          <button 
            onClick={downloadChart}
            disabled={!chartUrl}
            className={`p-1.5 rounded-md transition-colors ${
              chartUrl 
                ? darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100' 
                : 'opacity-50 cursor-not-allowed'
            }`}
            title="Download chart"
            aria-label="Download chart"
          >
            <FiDownload size={16} />
          </button>
        </div>
      </div>
      
      {/* Chart display area with improved mobile responsiveness */}
      <div className="relative p-2 sm:p-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-16 sm:py-32">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 mb-4">
                <div className="w-full h-full rounded-full animate-spin border-4 border-white border-t-transparent"></div>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Generating chart...</p>
            </div>
          </div>
        ) : chartUrl ? (
          <div
            className={`relative overflow-hidden rounded-md transition-opacity duration-300 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
          >
            <img
              src={chartUrl}
              alt={title}
              className="w-full h-auto max-w-full"
              onLoad={() => setIsImageLoaded(true)}
            />
            
            {/* Overlay for hover effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 pointer-events-none"></div>
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center py-12 sm:py-16 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="flex space-x-2 mb-4">
              <FiBarChart2 size={24} />
              <FiPieChart size={24} />
              <FiTrendingUp size={24} />
            </div>
            <p className="text-center">No chart data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartDisplay; 