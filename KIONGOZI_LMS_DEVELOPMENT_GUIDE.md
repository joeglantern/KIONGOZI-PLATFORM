# Kiongozi LMS Platform - Complete Development Guide

> **For Developers**: This guide provides everything you need to build the Kiongozi Learning Management System, consisting of two separate applications: the Student LMS Frontend and the Moderator Dashboard.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Environment Setup](#environment-setup)
4. [Architecture Overview](#architecture-overview)
5. [Part A: LMS Frontend (Student Platform)](#part-a-lms-frontend-student-platform)
6. [Part B: Moderator Dashboard](#part-b-moderator-dashboard)
7. [Authentication & Authorization](#authentication--authorization)
8. [API Integration](#api-integration)
9. [Database Schema](#database-schema)
10. [Deployment Strategy](#deployment-strategy)
11. [Best Practices](#best-practices)

---

## System Overviewno i dont 

The Kiongozi Platform consists of three main applications:

1. **API Server** (Already Built) - Node.js/Express backend at `https://kiongozi-api.onrender.com/api/v1`
2. **LMS Frontend** (To Build) - Student-facing learning platform
3. **Moderator Dashboard** (To Build) - Separate admin interface for content management

### Key Features

**LMS Frontend (Students)**:
- Browse courses and learning modules
- Enroll in courses
- Track learning progress
- Complete modules and earn certificates
- View personalized recommendations
- Interactive learning dashboard
- Mobile-responsive design

**Moderator Dashboard (Admins/Moderators)**:
- Create and manage courses
- Upload and edit learning modules
- Manage course-module relationships
- Monitor enrollments and user progress
- View analytics and reports
- User management (if admin)
- Content moderation

---

## Technology Stack

### Core Technologies

```json
{
  "frontend": {
    "framework": "Next.js 14",
    "language": "TypeScript",
    "styling": "TailwindCSS",
    "ui-components": "Radix UI + shadcn/ui",
    "state": "React Hooks + Context API",
    "forms": "Native HTML with validation"
  },
  "backend": {
    "runtime": "Node.js",
    "framework": "Express",
    "database": "Supabase (PostgreSQL)",
    "auth": "Supabase Auth + JWT",
    "ai": "OpenAI GPT-4o-mini"
  },
  "deployment": {
    "frontend": "Vercel (recommended)",
    "backend": "Render (already deployed)",
    "database": "Supabase Cloud"
  }
}
```

### Package Dependencies

```bash
# Core Next.js & React
next@^14.1.0
react@^18.2.0
react-dom@^18.2.0
typescript@5.9.2

# Supabase
@supabase/supabase-js@^2.54.0

# UI Components
@radix-ui/react-*  # Various Radix UI components
lucide-react@^0.542.0  # Icons
tailwindcss@^3.4.17
clsx@^2.1.1
class-variance-authority@^0.7.1

# Utilities
axios@^1.9.0
framer-motion@^10.18.0  # Animations
react-markdown@^10.1.0  # Markdown rendering
```

---

## Environment Setup

### Prerequisites

- Node.js 18+ and npm/yarn
- Git
- Code editor (VS Code recommended)
- Supabase account
- Basic understanding of Next.js, React, and TypeScript

### Environment Variables

Create `.env.local` files in both projects:

#### LMS Frontend `.env.local`

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API Configuration
NEXT_PUBLIC_API_BASE_URL=https://kiongozi-api.onrender.com/api/v1
API_BASE_URL=https://kiongozi-api.onrender.com/api/v1

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Kiongozi LMS
```

#### Moderator Dashboard `.env.local`

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API Configuration
NEXT_PUBLIC_API_BASE_URL=https://kiongozi-api.onrender.com/api/v1
API_BASE_URL=https://kiongozi-api.onrender.com/api/v1

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=Kiongozi Moderator Dashboard

# Admin Configuration
NEXT_PUBLIC_ALLOWED_ROLES=admin,moderator,content_editor
```

---

## Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  Kiongozi Platform                       │
└─────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐
│  LMS Frontend    │       │ Moderator        │
│  (Port 3000)     │       │ Dashboard        │
│                  │       │ (Port 3001)      │
│  - Browse        │       │ - Create Courses │
│  - Enroll        │       │ - Upload Modules │
│  - Learn         │       │ - Manage Users   │
│  - Track         │       │ - Analytics      │
└────────┬─────────┘       └────────┬─────────┘
         │                          │
         │    ┌─────────────────┐   │
         ├────┤   API Server    ├───┤
         │    │   (Port 3001)   │   │
         │    │                 │   │
         │    │  /api/v1/*      │   │
         │    └────────┬────────┘   │
         │             │            │
         │    ┌────────┴────────┐   │
         └────┤   Supabase      ├───┘
              │   PostgreSQL    │
              │   + Auth        │
              └─────────────────┘
```

### Data Flow

1. **Authentication**: User logs in → Supabase Auth → JWT token
2. **Token Management**: `SupabaseTokenBridge` stores token in `window.supabaseToken`
3. **API Calls**: Frontend → API Client → API Server (with JWT) → Supabase
4. **Response**: API Server → Frontend → Update UI

---

## Part A: LMS Frontend (Student Platform)

### Project Structure

```
lms-frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Dashboard home
│   │   ├── courses/
│   │   │   ├── page.tsx       # Browse courses
│   │   │   └── [courseId]/
│   │   │       ├── page.tsx   # Course detail
│   │   │       └── modules/
│   │   │           └── [moduleId]/
│   │   │               └── page.tsx  # Module viewer
│   │   ├── my-learning/
│   │   │   └── page.tsx       # My enrolled courses
│   │   ├── progress/
│   │   │   └── page.tsx       # Learning progress
│   │   ├── browse/
│   │   │   └── page.tsx       # Browse all content
│   │   └── profile/
│   │       └── page.tsx       # User profile
│   ├── api-proxy/
│   │   └── lms/
│   │       ├── courses/
│   │       ├── modules/
│   │       ├── progress/
│   │       └── enrollments/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MobileNav.tsx
│   │   │   └── Footer.tsx
│   │   ├── courses/
│   │   │   ├── CourseCard.tsx
│   │   │   ├── CourseGrid.tsx
│   │   │   ├── CourseDetail.tsx
│   │   │   ├── EnrollButton.tsx
│   │   │   └── CourseProgress.tsx
│   │   ├── modules/
│   │   │   ├── ModuleCard.tsx
│   │   │   ├── ModuleViewer.tsx
│   │   │   ├── ModuleContent.tsx
│   │   │   └── ModuleNavigation.tsx
│   │   ├── progress/
│   │   │   ├── ProgressCard.tsx
│   │   │   ├── ProgressChart.tsx
│   │   │   ├── StatsOverview.tsx
│   │   │   └── StreakIndicator.tsx
│   │   └── ui/
│   │       └── ... (shadcn components)
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── LMSContext.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCourses.ts
│   │   ├── useEnrollment.ts
│   │   └── useProgress.ts
│   ├── lib/
│   │   └── utils.ts
│   ├── types/
│   │   ├── course.ts
│   │   ├── module.ts
│   │   ├── progress.ts
│   │   └── user.ts
│   ├── utils/
│   │   ├── apiClient.ts
│   │   └── supabaseClient.ts
│   ├── layout.tsx
│   └── page.tsx
├── public/
├── styles/
├── .env.local
├── next.config.js
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

### Core Components Implementation

#### 1. Authentication Context (`contexts/AuthContext.tsx`)

```typescript
"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  supabase: any;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      setUser({
        id: userId,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role || 'user',
      });
    }
    setIsLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut, supabase }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

#### 2. API Client (`utils/apiClient.ts`)

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api-proxy';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return (window as any).supabaseToken || null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getAuthToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
        };
      }

      return data;
    } catch (error: any) {
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Course Methods
  async getCourses(params?: any) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/lms/courses${query ? `?${query}` : ''}`);
  }

  async getCourse(courseId: string) {
    return this.get(`/lms/courses/${courseId}`);
  }

  // Enrollment Methods
  async enrollInCourse(courseId: string) {
    return this.post(`/lms/courses/${courseId}/enroll`, {});
  }

  async getCourseEnrollment(courseId: string) {
    return this.get(`/lms/courses/${courseId}/enrollment`);
  }

  async getUserEnrollments(params?: any) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/lms/enrollments${query ? `?${query}` : ''}`);
  }

  // Progress Methods
  async getUserProgress() {
    return this.get('/lms/progress');
  }

  async updateProgress(data: any) {
    return this.post('/lms/progress', data);
  }

  async getLearningStats() {
    return this.get('/lms/progress/stats');
  }
}

const apiClient = new ApiClient();
export default apiClient;
```

#### 3. Supabase Token Bridge (`components/SupabaseTokenBridge.tsx`)

```typescript
"use client";

import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SupabaseTokenBridge() {
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    (async () => {
      const { data } = await supabase.auth.getSession();
      (window as any).supabaseToken = data.session?.access_token || '';

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          (window as any).supabaseToken = session?.access_token || '';
        }
      );

      unsubscribe = () => subscription.unsubscribe();
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return null;
}
```

#### 4. Root Layout (`app/layout.tsx`)

```typescript
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from './contexts/AuthContext';
import SupabaseTokenBridge from './components/SupabaseTokenBridge';

export const metadata: Metadata = {
  title: 'Kiongozi LMS - Learn, Grow, Excel',
  description: 'Transform your learning journey with Kiongozi LMS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <AuthProvider>
          <SupabaseTokenBridge />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Key Pages Implementation

#### Login Page (`app/(auth)/login/page.tsx`)

```typescript
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signIn(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600">Sign in to continue your learning</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
```

#### Dashboard Home (`app/(dashboard)/page.tsx`)

```typescript
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import apiClient from '@/app/utils/apiClient';
import { BookOpen, TrendingUp, Award, Clock } from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, enrollmentsRes] = await Promise.all([
        apiClient.getLearningStats(),
        apiClient.getUserEnrollments({ status: 'active', limit: 5 }),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (enrollmentsRes.success) setEnrollments(enrollmentsRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.full_name || 'Learner'}!
        </h1>
        <p className="text-gray-600 mt-2">
          Continue your learning journey
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={BookOpen}
          label="Courses Enrolled"
          value={stats?.overview?.total_modules_started || 0}
          color="blue"
        />
        <StatCard
          icon={Award}
          label="Completed"
          value={stats?.overview?.completed_modules || 0}
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          label="In Progress"
          value={stats?.overview?.in_progress_modules || 0}
          color="purple"
        />
        <StatCard
          icon={Clock}
          label="Learning Streak"
          value={`${stats?.overview?.current_streak_days || 0} days`}
          color="orange"
        />
      </div>

      {/* Continue Learning */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Continue Learning</h2>
        {enrollments.length > 0 ? (
          <div className="grid gap-4">
            {enrollments.map((enrollment: any) => (
              <CourseProgressCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No active enrollments. Start learning now!</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className={`w-12 h-12 ${colors[color]} rounded-lg flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function CourseProgressCard({ enrollment }: any) {
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:border-blue-300 transition-colors">
      <div className="flex-1">
        <h3 className="font-medium">{enrollment.courses?.title}</h3>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${enrollment.progress_percentage}%` }}
            />
          </div>
          <span className="text-sm text-gray-600">
            {enrollment.progress_percentage}%
          </span>
        </div>
      </div>
      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        Continue
      </button>
    </div>
  );
}
```

#### Browse Courses (`app/(dashboard)/courses/page.tsx`)

```typescript
"use client";

import { useEffect, useState } from 'react';
import apiClient from '@/app/utils/apiClient';
import { Search, Filter } from 'lucide-react';
import CourseCard from '@/app/components/courses/CourseCard';

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');

  useEffect(() => {
    fetchCourses();
  }, [selectedCategory, selectedDifficulty]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedCategory) params.category_id = selectedCategory;
      if (selectedDifficulty) params.difficulty_level = selectedDifficulty;
      if (searchQuery) params.search = searchQuery;

      const response = await apiClient.getCourses(params);
      if (response.success) {
        setCourses(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCourses();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Browse Courses</h1>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses..."
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
              <div className="h-40 bg-gray-200 rounded-lg mb-4" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No courses found</p>
        </div>
      )}
    </div>
  );
}
```

#### Course Detail Page (`app/(dashboard)/courses/[courseId]/page.tsx`)

```typescript
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/app/utils/apiClient';
import { Clock, BookOpen, Award, Users } from 'lucide-react';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      const [courseRes, enrollmentRes] = await Promise.all([
        apiClient.getCourse(courseId),
        apiClient.getCourseEnrollment(courseId).catch(() => ({ success: false })),
      ]);

      if (courseRes.success) setCourse(courseRes.data);
      if (enrollmentRes.success) setEnrollment(enrollmentRes.data);
    } catch (error) {
      console.error('Failed to fetch course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const response = await apiClient.enrollInCourse(courseId);
      if (response.success) {
        setEnrollment(response.data);
        alert('Successfully enrolled!');
      } else {
        alert(response.error || 'Failed to enroll');
      }
    } catch (error) {
      alert('Failed to enroll in course');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Course not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white mb-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                {course.difficulty_level}
              </span>
              {course.featured && (
                <span className="px-3 py-1 bg-yellow-400/20 rounded-full text-sm">
                  ⭐ Featured
                </span>
              )}
            </div>
            <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
            <p className="text-lg opacity-90 mb-6">{course.description}</p>

            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {course.estimated_duration_hours} hours
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {course.module_count || 0} modules
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {course.enrollment_count || 0} enrolled
              </div>
            </div>
          </div>

          {!enrollment ? (
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="px-8 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {enrolling ? 'Enrolling...' : 'Enroll Now'}
            </button>
          ) : (
            <div className="px-8 py-3 bg-green-500 text-white rounded-lg">
              Enrolled ✓
            </div>
          )}
        </div>
      </div>

      {/* Course Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Overview */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Overview</h2>
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: course.overview || course.description }}
            />
          </div>

          {/* Learning Outcomes */}
          {course.learning_outcomes?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">What You'll Learn</h2>
              <ul className="space-y-2">
                {course.learning_outcomes.map((outcome: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <Award className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Modules */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-2xl font-bold mb-4">Course Modules</h2>
            {course.modules?.length > 0 ? (
              <div className="space-y-3">
                {course.modules.map((module: any, index: number) => (
                  <div
                    key={module.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{module.learning_modules?.title}</h3>
                      <p className="text-sm text-gray-500">
                        {module.learning_modules?.estimated_duration_minutes} min
                        {module.is_required && (
                          <span className="ml-2 text-xs text-red-600">• Required</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No modules available yet</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Prerequisites */}
          {course.prerequisites?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h3 className="font-bold mb-3">Prerequisites</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {course.prerequisites.map((prereq: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    {prereq}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Course Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold mb-3">Course Information</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Level</p>
                <p className="font-medium capitalize">{course.difficulty_level}</p>
              </div>
              <div>
                <p className="text-gray-600">Duration</p>
                <p className="font-medium">{course.estimated_duration_hours} hours</p>
              </div>
              <div>
                <p className="text-gray-600">Category</p>
                <p className="font-medium">{course.category?.name || 'General'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### TypeScript Types

Create comprehensive types in `app/types/`:

#### `course.ts`
```typescript
export interface Course {
  id: string;
  title: string;
  description: string;
  overview?: string;
  category_id?: string;
  category?: Category;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration_hours: number;
  prerequisites: string[];
  learning_outcomes: string[];
  author_id: string;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  enrollment_count: number;
  view_count: number;
  module_count?: number;
  modules?: CourseModule[];
  created_at: string;
  updated_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  module_id: string;
  order_index: number;
  is_required: boolean;
  learning_modules?: Module;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  content: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration_minutes: number;
  learning_objectives: string[];
  keywords: string[];
}
```

#### `enrollment.ts`
```typescript
export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  status: 'active' | 'completed' | 'dropped' | 'suspended';
  progress_percentage: number;
  completed_at?: string;
  certificate_issued: boolean;
  last_accessed_at: string;
  courses?: Course;
}
```

---

## Part B: Moderator Dashboard

### Project Structure

```
moderator-dashboard/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard home
│   │   ├── courses/
│   │   │   ├── page.tsx          # Manage courses
│   │   │   ├── create/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Edit course
│   │   │       └── modules/
│   │   │           └── page.tsx  # Manage course modules
│   │   ├── modules/
│   │   │   ├── page.tsx          # Manage modules
│   │   │   ├── create/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Edit module
│   │   ├── categories/
│   │   │   └── page.tsx
│   │   ├── enrollments/
│   │   │   └── page.tsx
│   │   ├── analytics/
│   │   │   └── page.tsx
│   │   ├── users/                # Admin only
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── DashboardLayout.tsx
│   │   ├── courses/
│   │   │   ├── CourseForm.tsx
│   │   │   ├── CourseList.tsx
│   │   │   ├── ModulePicker.tsx
│   │   │   └── CourseStats.tsx
│   │   ├── modules/
│   │   │   ├── ModuleForm.tsx
│   │   │   ├── ModuleEditor.tsx
│   │   │   ├── ContentEditor.tsx
│   │   │   └── ModuleList.tsx
│   │   └── ui/
│   │       └── ... (shadcn components)
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── utils/
│   │   ├── apiClient.ts
│   │   └── supabaseClient.ts
│   ├── layout.tsx
│   └── page.tsx
├── public/
├── .env.local
├── next.config.js
├── package.json
└── tsconfig.json
```

### Key Differences from LMS Frontend

1. **Role-Based Access**: Only users with `admin`, `moderator`, or `content_editor` roles
2. **Different Port**: Run on port 3001 (separate deployment)
3. **Content Creation Focus**: Rich text editors, file uploads, complex forms
4. **Admin Features**: User management, system settings, detailed analytics

### Core Components

#### Dashboard Layout (`components/layout/DashboardLayout.tsx`)

```typescript
"use client";

import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }

    // Check if user has required role
    if (user && !['admin', 'moderator', 'content_editor'].includes(user.role)) {
      router.push('/unauthorized');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

#### Sidebar (`components/layout/Sidebar.tsx`)

```typescript
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Users,
  Settings,
  BarChart3,
  FolderTree,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Courses', href: '/courses', icon: BookOpen },
  { name: 'Modules', href: '/modules', icon: FileText },
  { name: 'Categories', href: '/categories', icon: FolderTree },
  { name: 'Enrollments', href: '/enrollments', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const adminOnlyNav = [
  { name: 'Users', href: '/users', icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">Kiongozi</h1>
        <p className="text-sm text-gray-400">Moderator Dashboard</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-4 border-t border-gray-800" />
            {adminOnlyNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="mb-4">
          <p className="text-sm font-medium">{user?.full_name}</p>
          <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
```

#### Course Form Component (`components/courses/CourseForm.tsx`)

```typescript
"use client";

import { useState, useEffect } from 'react';
import apiClient from '@/app/utils/apiClient';

interface CourseFormProps {
  courseId?: string;
  initialData?: any;
  onSuccess?: () => void;
}

export default function CourseForm({ courseId, initialData, onSuccess }: CourseFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    overview: '',
    category_id: '',
    difficulty_level: 'beginner',
    estimated_duration_hours: 10,
    prerequisites: [] as string[],
    learning_outcomes: [] as string[],
    status: 'draft',
    featured: false,
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories();
    if (initialData) {
      setFormData({
        ...initialData,
        prerequisites: initialData.prerequisites || [],
        learning_outcomes: initialData.learning_outcomes || [],
      });
    }
  }, [initialData]);

  const fetchCategories = async () => {
    const response = await apiClient.get('/lms/categories');
    if (response.success) {
      setCategories(response.data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = courseId
        ? await apiClient.put(`/lms/courses/${courseId}`, formData)
        : await apiClient.post('/lms/courses', formData);

      if (response.success) {
        alert(courseId ? 'Course updated!' : 'Course created!');
        onSuccess?.();
      } else {
        setError(response.error || 'Failed to save course');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addPrerequisite = () => {
    setFormData((prev) => ({
      ...prev,
      prerequisites: [...prev.prerequisites, ''],
    }));
  };

  const updatePrerequisite = (index: number, value: string) => {
    const updated = [...formData.prerequisites];
    updated[index] = value;
    setFormData((prev) => ({ ...prev, prerequisites: updated }));
  };

  const removePrerequisite = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      prerequisites: prev.prerequisites.filter((_, i) => i !== index),
    }));
  };

  const addLearningOutcome = () => {
    setFormData((prev) => ({
      ...prev,
      learning_outcomes: [...prev.learning_outcomes, ''],
    }));
  };

  const updateLearningOutcome = (index: number, value: string) => {
    const updated = [...formData.learning_outcomes];
    updated[index] = value;
    setFormData((prev) => ({ ...prev, learning_outcomes: updated }));
  };

  const removeLearningOutcome = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      learning_outcomes: prev.learning_outcomes.filter((_, i) => i !== index),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Course Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Short Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Detailed Overview
            </label>
            <textarea
              value={formData.overview}
              onChange={(e) => setFormData({ ...formData, overview: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Difficulty Level *
              </label>
              <select
                value={formData.difficulty_level}
                onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Estimated Duration (hours) *
            </label>
            <input
              type="number"
              value={formData.estimated_duration_hours}
              onChange={(e) => setFormData({ ...formData, estimated_duration_hours: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              min="1"
              required
            />
          </div>
        </div>
      </div>

      {/* Prerequisites */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Prerequisites</h3>
          <button
            type="button"
            onClick={addPrerequisite}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Prerequisite
          </button>
        </div>

        <div className="space-y-3">
          {formData.prerequisites.map((prereq, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={prereq}
                onChange={(e) => updatePrerequisite(index, e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="E.g., Basic understanding of programming"
              />
              <button
                type="button"
                onClick={() => removePrerequisite(index)}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Learning Outcomes */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Learning Outcomes</h3>
          <button
            type="button"
            onClick={addLearningOutcome}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Outcome
          </button>
        </div>

        <div className="space-y-3">
          {formData.learning_outcomes.map((outcome, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={outcome}
                onChange={(e) => updateLearningOutcome(index, e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="E.g., Build a complete web application"
              />
              <button
                type="button"
                onClick={() => removeLearningOutcome(index)}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Status & Visibility */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Status & Visibility</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured"
              checked={formData.featured}
              onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="featured" className="text-sm font-medium">
              Mark as Featured Course
            </label>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : courseId ? 'Update Course' : 'Create Course'}
        </button>
      </div>
    </form>
  );
}
```

#### Module Editor (`components/modules/ModuleEditor.tsx`)

```typescript
"use client";

import { useState, useEffect } from 'react';
import apiClient from '@/app/utils/apiClient';
import dynamic from 'next/dynamic';

// Import rich text editor dynamically (client-side only)
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

interface ModuleEditorProps {
  moduleId?: string;
  initialData?: any;
  onSuccess?: () => void;
}

export default function ModuleEditor({ moduleId, initialData, onSuccess }: ModuleEditorProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    category_id: '',
    difficulty_level: 'beginner',
    estimated_duration_minutes: 30,
    learning_objectives: [] as string[],
    keywords: [] as string[],
    status: 'draft',
    featured: false,
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keywordInput, setKeywordInput] = useState('');

  useEffect(() => {
    fetchCategories();
    if (initialData) {
      setFormData({
        ...initialData,
        learning_objectives: initialData.learning_objectives || [],
        keywords: initialData.keywords || [],
      });
    }
  }, [initialData]);

  const fetchCategories = async () => {
    const response = await apiClient.get('/lms/categories');
    if (response.success) {
      setCategories(response.data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = moduleId
        ? await apiClient.put(`/lms/modules/${moduleId}`, formData)
        : await apiClient.post('/lms/modules', formData);

      if (response.success) {
        alert(moduleId ? 'Module updated!' : 'Module created!');
        onSuccess?.();
      } else {
        setError(response.error || 'Failed to save module');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addObjective = () => {
    setFormData((prev) => ({
      ...prev,
      learning_objectives: [...prev.learning_objectives, ''],
    }));
  };

  const updateObjective = (index: number, value: string) => {
    const updated = [...formData.learning_objectives];
    updated[index] = value;
    setFormData((prev) => ({ ...prev, learning_objectives: updated }));
  };

  const removeObjective = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      learning_objectives: prev.learning_objectives.filter((_, i) => i !== index),
    }));
  };

  const addKeyword = () => {
    if (keywordInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()],
      }));
      setKeywordInput('');
    }
  };

  const removeKeyword = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Module Information</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Level *</label>
              <select
                value={formData.difficulty_level}
                onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Duration (min) *</label>
              <input
                type="number"
                value={formData.estimated_duration_minutes}
                onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min="5"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content Editor */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Module Content *</h3>
        <ReactQuill
          theme="snow"
          value={formData.content}
          onChange={(value) => setFormData({ ...formData, content: value })}
          className="h-64 mb-12"
        />
      </div>

      {/* Learning Objectives */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Learning Objectives</h3>
          <button
            type="button"
            onClick={addObjective}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Objective
          </button>
        </div>

        <div className="space-y-3">
          {formData.learning_objectives.map((obj, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={obj}
                onChange={(e) => updateObjective(index, e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="E.g., Understand core concepts"
              />
              <button
                type="button"
                onClick={() => removeObjective(index)}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Keywords */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Keywords (for search)</h3>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Type keyword and press Enter"
          />
          <button
            type="button"
            onClick={addKeyword}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {formData.keywords.map((keyword, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-2"
            >
              {keyword}
              <button
                type="button"
                onClick={() => removeKeyword(index)}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Publication</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured"
              checked={formData.featured}
              onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="featured" className="text-sm font-medium">
              Featured Module
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-2 border rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : moduleId ? 'Update Module' : 'Create Module'}
        </button>
      </div>
    </form>
  );
}
```

---

## Authentication & Authorization

### Authentication Flow

```
1. User Login → Supabase Auth
2. JWT Token Generated
3. SupabaseTokenBridge stores in window.supabaseToken
4. API Client includes token in all requests
5. Backend validates JWT with Supabase
6. Returns user data with role
```

### Role-Based Access Control

**Roles in System**:
- `user` - Regular students (LMS Frontend only)
- `content_editor` - Can create/edit modules
- `moderator` - Can create/edit courses and modules
- `admin` - Full system access
- `org_admin` - Organization admin privileges

**Moderator Dashboard Access**:
```typescript
// Middleware check
const allowedRoles = ['admin', 'moderator', 'content_editor'];

if (!allowedRoles.includes(user.role)) {
  redirect('/unauthorized');
}
```

**API Authorization**:
```typescript
// Backend checks role for specific operations
// Creating course requires moderator+
if (!['admin', 'moderator'].includes(req.user.role)) {
  return res.status(403).json({ error: 'Insufficient permissions' });
}
```

---

## API Integration

### API Proxy Pattern

Both applications use Next.js API routes as proxies to the backend:

```typescript
// app/api-proxy/lms/courses/route.ts
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'https://kiongozi-api.onrender.com/api/v1';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get('authorization');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  const response = await fetch(
    `${API_BASE_URL}/content/courses?${searchParams.toString()}`,
    { method: 'GET', headers }
  );

  const data = await response.json();
  return NextResponse.json(data);
}
```

### API Endpoints Reference

**Base URL**: `https://kiongozi-api.onrender.com/api/v1`

#### Courses
- `GET /content/courses` - List courses
- `GET /content/courses/:id` - Get course details
- `POST /content/courses` - Create course (moderator+)
- `PUT /content/courses/:id` - Update course
- `DELETE /content/courses/:id` - Delete course (admin)

#### Modules
- `GET /content/modules` - List modules
- `GET /content/modules/:id` - Get module
- `POST /content/modules` - Create module
- `PUT /content/modules/:id` - Update module
- `DELETE /content/modules/:id` - Delete module

#### Enrollments
- `GET /content/enrollments` - User's enrollments
- `POST /content/courses/:id/enroll` - Enroll in course
- `GET /content/courses/:id/enrollment` - Get enrollment status
- `PUT /content/courses/:id/enrollment` - Update enrollment

#### Progress
- `GET /progress` - Get user progress
- `POST /progress` - Update progress
- `GET /progress/stats` - Get learning statistics
- `GET /progress/recommendations` - Get recommendations

---

## Database Schema

### Key Tables

#### profiles
```sql
- id (uuid, primary key)
- email (text)
- full_name (text)
- first_name (text)
- last_name (text)
- role (text) -- 'user', 'admin', 'moderator', 'content_editor'
- status (text) -- 'active', 'inactive', 'banned'
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### courses
```sql
- id (uuid, primary key)
- title (text)
- description (text)
- overview (text)
- category_id (uuid, foreign key)
- difficulty_level (text) -- 'beginner', 'intermediate', 'advanced'
- estimated_duration_hours (integer)
- prerequisites (text[])
- learning_outcomes (text[])
- author_id (uuid, foreign key)
- status (text) -- 'draft', 'published', 'archived'
- featured (boolean)
- enrollment_count (integer)
- view_count (integer)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### learning_modules
```sql
- id (uuid, primary key)
- title (text)
- description (text)
- content (text)
- category_id (uuid, foreign key)
- author_id (uuid, foreign key)
- difficulty_level (text)
- estimated_duration_minutes (integer)
- learning_objectives (text[])
- keywords (text[])
- status (text)
- featured (boolean)
- view_count (integer)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### course_modules
```sql
- id (uuid, primary key)
- course_id (uuid, foreign key)
- module_id (uuid, foreign key)
- order_index (integer)
- is_required (boolean)
- created_at (timestamptz)
```

#### course_enrollments
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- course_id (uuid, foreign key)
- enrolled_at (timestamptz)
- status (text) -- 'active', 'completed', 'dropped', 'suspended'
- progress_percentage (integer)
- completed_at (timestamptz)
- certificate_issued (boolean)
- last_accessed_at (timestamptz)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### user_progress
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- module_id (uuid, foreign key)
- status (text) -- 'not_started', 'in_progress', 'completed', 'bookmarked'
- progress_percentage (integer)
- time_spent_minutes (integer)
- notes (text)
- started_at (timestamptz)
- completed_at (timestamptz)
- updated_at (timestamptz)
```

---

## Deployment Strategy

### Production Deployments

#### 1. LMS Frontend (Students)
```bash
# Vercel deployment (recommended)
vercel --prod

# Environment variables in Vercel dashboard:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- API_BASE_URL
- NEXT_PUBLIC_APP_URL

# Custom domain: lms.kiongozi.com
```

#### 2. Moderator Dashboard
```bash
# Separate Vercel project
vercel --prod

# Different environment variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- API_BASE_URL
- NEXT_PUBLIC_APP_URL

# Custom domain: moderator.kiongozi.com
```

#### 3. API Server
Already deployed at `https://kiongozi-api.onrender.com`

### Deployment Checklist

**Before Deployment**:
- [ ] Configure environment variables
- [ ] Test authentication flow
- [ ] Verify API endpoints
- [ ] Test role-based access
- [ ] Check mobile responsiveness
- [ ] Enable error tracking (Sentry recommended)
- [ ] Set up analytics (optional)
- [ ] Configure CDN for assets
- [ ] Enable compression
- [ ] Set up monitoring

**Post-Deployment**:
- [ ] Test production URLs
- [ ] Verify database connections
- [ ] Check SSL certificates
- [ ] Test payment integration (if any)
- [ ] Monitor error rates
- [ ] Set up automated backups
- [ ] Create admin users
- [ ] Seed initial categories
- [ ] Upload sample content

---

## Best Practices

### Code Organization

**Component Structure**:
```typescript
// Use functional components with TypeScript
export default function ComponentName({ prop }: PropsInterface) {
  // 1. State declarations
  const [state, setState] = useState();

  // 2. Context/hooks
  const { user } = useAuth();

  // 3. Effects
  useEffect(() => {}, []);

  // 4. Handlers
  const handleClick = () => {};

  // 5. Render
  return <div>...</div>;
}
```

**File Naming**:
- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Pages: `page.tsx` (Next.js App Router)
- API routes: `route.ts`

### Error Handling

```typescript
try {
  const response = await apiClient.getCourses();

  if (!response.success) {
    // Handle API error
    setError(response.error || 'Something went wrong');
    return;
  }

  // Success
  setData(response.data);
} catch (error) {
  // Handle network error
  setError('Network error. Please try again.');
  console.error('API Error:', error);
}
```

### Loading States

```typescript
const [loading, setLoading] = useState(true);

// Show skeleton loaders
if (loading) {
  return <SkeletonLoader />;
}

// Show empty state
if (!data || data.length === 0) {
  return <EmptyState message="No courses found" />;
}

// Show data
return <CourseGrid courses={data} />;
```

### Security

1. **Never expose service role keys** in frontend
2. **Always validate user input** before API calls
3. **Use parameterized queries** (handled by Supabase)
4. **Implement rate limiting** (already in API)
5. **Sanitize HTML content** from rich text editors
6. **Check user roles** before sensitive operations
7. **Use HTTPS** everywhere
8. **Enable CORS** only for known domains

### Performance

1. **Code splitting**: Use dynamic imports for large components
2. **Image optimization**: Use Next.js Image component
3. **Caching**: Implement SWR or React Query
4. **Pagination**: Load data in chunks
5. **Lazy loading**: Load images and components on demand
6. **Memoization**: Use `useMemo` and `useCallback` wisely
7. **Bundle size**: Monitor and optimize regularly

### Testing

```typescript
// Unit tests (Jest + React Testing Library)
describe('CourseCard', () => {
  it('renders course title', () => {
    render(<CourseCard course={mockCourse} />);
    expect(screen.getByText('Course Title')).toBeInTheDocument();
  });
});

// Integration tests
describe('Course Enrollment', () => {
  it('allows user to enroll in course', async () => {
    // Test enrollment flow
  });
});
```

---

## Development Workflow

### Getting Started

**1. Clone and Setup**:
```bash
# Create project
npx create-next-app@latest lms-frontend --typescript --tailwind --app

# Install dependencies
cd lms-frontend
npm install @supabase/supabase-js axios lucide-react

# Setup environment
cp .env.example .env.local
```

**2. Configure Supabase**:
- Create project at supabase.com
- Copy URL and anon key
- Add to `.env.local`
- Run database migrations

**3. Start Development**:
```bash
npm run dev
```

**4. Build Components**:
- Start with layout components
- Build authentication
- Create course browsing
- Implement enrollment
- Add progress tracking

### Development Phases

**Phase 1: Foundation** (Week 1)
- Project setup
- Authentication
- Layout components
- API client
- Type definitions

**Phase 2: Core Features** (Week 2-3)
- Course browsing
- Course detail pages
- Enrollment system
- Module viewer
- Progress tracking

**Phase 3: Dashboard** (Week 4)
- User dashboard
- Learning statistics
- Recommendations
- Profile management

**Phase 4: Moderator Dashboard** (Week 5-6)
- Separate project setup
- Course management
- Module editor
- Analytics
- User management (admin)

**Phase 5: Polish** (Week 7)
- Mobile optimization
- Performance tuning
- Testing
- Bug fixes
- Documentation

**Phase 6: Deployment** (Week 8)
- Production setup
- Environment configuration
- Database seeding
- User acceptance testing
- Go live

---

## Troubleshooting

### Common Issues

**1. Authentication not working**:
```typescript
// Check if SupabaseTokenBridge is mounted
// Verify token in browser console
console.log((window as any).supabaseToken);

// Check API client is using token
// Look for Authorization header in Network tab
```

**2. API calls failing**:
```typescript
// Check API base URL
console.log(process.env.NEXT_PUBLIC_API_BASE_URL);

// Verify JWT token validity
// Check backend logs for errors

// Test API directly with curl
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://kiongozi-api.onrender.com/api/v1/content/courses
```

**3. Role permissions error**:
```sql
-- Check user role in database
SELECT id, email, role FROM profiles WHERE email = 'user@example.com';

-- Update role if needed
UPDATE profiles SET role = 'moderator' WHERE email = 'user@example.com';
```

**4. TypeScript errors**:
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check tsconfig.json is properly configured
```

---

## Resources & References

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Supabase Docs](https://supabase.com/docs)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### UI Components
- [Radix UI](https://www.radix-ui.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Lucide Icons](https://lucide.dev/)

### Tools
- [Vercel](https://vercel.com) - Deployment
- [Supabase](https://supabase.com) - Database & Auth
- [Postman](https://www.postman.com/) - API testing

---

## Contact & Support

For questions or issues:
1. Check API documentation
2. Review existing code examples
3. Test with API directly using Postman
4. Check Supabase logs for database errors
5. Review browser console for frontend errors

---

## Conclusion

This guide provides everything needed to build the Kiongozi LMS Platform. Follow the structure, use the provided code examples, and maintain best practices throughout development.

**Key Takeaways**:
- Two separate applications with different purposes
- Authentication handled by Supabase
- API client pattern for all backend communication
- Role-based access control throughout
- Mobile-first responsive design
- TypeScript for type safety
- Best practices for security and performance

**Success Checklist**:
- ✅ Complete authentication system
- ✅ Course browsing and enrollment
- ✅ Module viewing and progress tracking
- ✅ Student dashboard with analytics
- ✅ Moderator dashboard for content management
- ✅ Mobile responsive on all devices
- ✅ Production ready deployment

Good luck building the Kiongozi LMS! 🚀
