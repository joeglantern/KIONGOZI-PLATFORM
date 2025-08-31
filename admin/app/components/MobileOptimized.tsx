'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Menu, X, Bell, Search } from 'lucide-react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function MobileMenu({ isOpen, onClose, children }: MobileMenuProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div className="absolute right-0 top-0 h-full w-80 max-w-full bg-white shadow-xl transform transition-transform duration-300">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Menu</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="p-4 overflow-y-auto h-full">
          {children}
        </div>
      </div>
    </div>
  );
}

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export function MobileCard({ children, className = '', padding = 'md' }: MobileCardProps) {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}

interface MobileGridProps {
  children: React.ReactNode;
  cols?: 1 | 2;
  gap?: 'sm' | 'md' | 'lg';
}

export function MobileGrid({ children, cols = 1, gap = 'md' }: MobileGridProps) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4', 
    lg: 'gap-6'
  };

  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2'
  };

  return (
    <div className={`grid ${colClasses[cols]} ${gapClasses[gap]}`}>
      {children}
    </div>
  );
}

interface MobileStatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function MobileStatsCard({ 
  title, 
  value, 
  icon, 
  color = 'blue',
  trend 
}: MobileStatsCardProps) {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-800',
    green: 'from-green-50 to-green-100 border-green-200 text-green-800',
    red: 'from-red-50 to-red-100 border-red-200 text-red-800',
    yellow: 'from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-800',
    purple: 'from-purple-50 to-purple-100 border-purple-200 text-purple-800'
  };

  const iconColorClasses = {
    blue: 'bg-blue-200 text-blue-700',
    green: 'bg-green-200 text-green-700',
    red: 'bg-red-200 text-red-700',
    yellow: 'bg-yellow-200 text-yellow-700',
    purple: 'bg-purple-200 text-purple-700'
  };

  return (
    <MobileCard className={`bg-gradient-to-br ${colorClasses[color]} border hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium opacity-80 truncate">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1">{value}</p>
          {trend && (
            <p className={`text-xs mt-2 flex items-center ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <span className="mr-1">
                {trend.isPositive ? '↗' : '↘'}
              </span>
              {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className={`p-2 sm:p-3 rounded-full flex-shrink-0 ${iconColorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </MobileCard>
  );
}

interface MobileTableProps {
  headers: string[];
  data: Array<Array<string | React.ReactNode>>;
  maxHeight?: string;
}

export function MobileTable({ headers, data, maxHeight = '400px' }: MobileTableProps) {
  return (
    <MobileCard className="overflow-hidden p-0">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-medium text-gray-900">Data Table</h3>
      </div>
      
      {/* Mobile: Card view */}
      <div className="block sm:hidden">
        <div className="divide-y divide-gray-200" style={{ maxHeight, overflowY: 'auto' }}>
          {data.map((row, rowIndex) => (
            <div key={rowIndex} className="p-4 space-y-2">
              {headers.map((header, colIndex) => (
                <div key={colIndex} className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">{header}:</span>
                  <span className="text-sm text-gray-900 text-right max-w-48 truncate">
                    {row[colIndex]}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Table view */}
      <div className="hidden sm:block overflow-x-auto" style={{ maxHeight, overflowY: 'auto' }}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="px-4 py-3 text-sm text-gray-900">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MobileCard>
  );
}

interface MobileTabsProps {
  tabs: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function MobileTabs({ tabs, activeTab, onTabChange }: MobileTabsProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="space-y-4">
      {/* Mobile: Dropdown */}
      <div className="block sm:hidden">
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between p-3 bg-white border border-gray-300 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className="flex items-center space-x-2">
              {activeTabData?.icon}
              <span className="font-medium">{activeTabData?.label}</span>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    onTabChange(tab.id);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center space-x-2 p-3 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                    tab.id === activeTab ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop: Horizontal tabs */}
      <div className="hidden sm:block">
        <nav className="flex space-x-8 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                tab.id === activeTab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                {tab.icon}
                <span>{tab.label}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

// Hook to detect mobile viewport
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
}

// Utility for responsive class names
export function responsiveClass(mobileClass: string, desktopClass: string) {
  return `${mobileClass} md:${desktopClass}`;
}