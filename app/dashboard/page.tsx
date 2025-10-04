"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabaseClient";
import { User } from "@supabase/supabase-js";

interface UserProfile {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
}

interface UserStats {
  topics_learned: number;
  days_active: number;
  conversations_count: number;
  join_date: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      fetchProfile(user.id);
      fetchStats(user.id);
    };

    fetchUser();
  }, [router]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, full_name, email")
        .eq("id", userId)
        .single();

      if (!error && data) {
        setUserProfile(data);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (userId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/stats`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const getUserInitial = () => {
    return (
      userProfile?.first_name?.charAt(0).toUpperCase() ||
      userProfile?.full_name?.charAt(0).toUpperCase() ||
      user?.email?.charAt(0).toUpperCase() ||
      "U"
    );
  };

  const getUserName = () => {
    return (
      userProfile?.full_name ||
      (userProfile?.first_name && userProfile?.last_name
        ? `${userProfile.first_name} ${userProfile.last_name}`
        : user?.email?.split("@")[0]) ||
      "User"
    );
  };

  const getJoinDate = () => {
    if (stats?.join_date) {
      return new Date(stats.join_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return "N/A";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Welcome back, {getUserName()}</p>
      </div>

      {/* User Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-2xl sm:text-3xl font-bold text-white">{getUserInitial()}</span>
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center">
              <span className="text-white text-xs">•</span>
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{getUserName()}</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{user?.email}</p>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 font-medium">Active Learner</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Joined {getJoinDate()}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Topics Learned */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xl sm:text-2xl">📚</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {stats?.topics_learned ?? 0}
              </p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Topics Learned</p>
            </div>
          </div>
        </div>

        {/* Day Streak */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xl sm:text-2xl">🔥</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {stats?.days_active ?? 0}
              </p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Day Streak</p>
            </div>
          </div>
        </div>

        {/* AI Chats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xl sm:text-2xl">💬</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {stats?.conversations_count ?? 0}
              </p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">AI Chats</p>
            </div>
          </div>
        </div>

        {/* Join Date */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xl sm:text-2xl">📅</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.join_date
                  ? new Date(stats.join_date).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })
                  : "N/A"}
              </p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Joined</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Quick Actions</h3>

        <div className="space-y-3">
          {/* Export Conversations */}
          <button className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left">
            <div className="flex items-center gap-4">
              <span className="text-2xl">📤</span>
              <div>
                  <p className="font-medium text-gray-900 dark:text-white">Export Conversations</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Download your chat history</p>
                </div>
              </div>
              <span className="text-gray-400 dark:text-gray-500 text-xl">›</span>
            </button>

            {/* Privacy & Security */}
            <button className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left">
              <div className="flex items-center gap-4">
                <span className="text-2xl">🔒</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Privacy & Security</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Manage your data and privacy settings</p>
                </div>
              </div>
              <span className="text-gray-400 dark:text-gray-500 text-xl">›</span>
            </button>

          {/* Help & Support */}
          <button className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left">
            <div className="flex items-center gap-4">
              <span className="text-2xl">❓</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Help & Support</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Get help and contact support</p>
              </div>
            </div>
            <span className="text-gray-400 dark:text-gray-500 text-xl">›</span>
          </button>
        </div>
      </div>
    </div>
  );
}
