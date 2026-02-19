"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser } from '@/app/contexts/UserContext';
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  Trophy,
  Users,
  Zap,
  Target,
  Briefcase,
  Code,
  TreePine,
  CheckCircle,
  Star,
  LayoutDashboard,
} from 'lucide-react';

export default function LandingPage() {
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center bg-orange-100 rounded-full px-4 py-2 text-sm font-medium text-orange-700 border border-orange-200 mb-6">
              <Sparkles className="w-4 h-4 mr-2" />
              Empowering Kenya's Future Leaders
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Master Skills in
              <span className="block text-orange-600">
                Green Tech & Innovation
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Interactive courses designed for Kenya's youth. Build real-world skills in sustainability,
              digital innovation, and leadership.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link href="/dashboard">
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center space-x-2 w-full sm:w-auto">
                    <LayoutDashboard className="w-5 h-5" />
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              ) : (
                <Link href="/signup">
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center space-x-2 w-full sm:w-auto">
                    <span>Start Learning Free</span>
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              )}
              <Link href="/browse">
                <Button variant="outline" className="border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-500 px-8 py-6 text-lg rounded-xl transition-all flex items-center space-x-2 w-full sm:w-auto">
                  <BookOpen className="w-5 h-5" />
                  <span>Browse Courses</span>
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">20+</div>
                <div className="text-sm text-gray-600">Expert Courses</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">Free</div>
                <div className="text-sm text-gray-600">To Start</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">24/7</div>
                <div className="text-sm text-gray-600">Access</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Kiongozi?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive learning platform designed specifically for Kenya's green and digital transition
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-orange-500 transition-colors">
                <Target className="w-7 h-7 text-orange-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Leadership Development</h3>
              <p className="text-gray-600">
                Build leadership competencies to drive sustainable change in your community
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500 transition-colors">
                <Briefcase className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Entrepreneurship</h3>
              <p className="text-gray-600">
                Learn to identify opportunities and create solutions for real-world challenges
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-500 transition-colors">
                <Code className="w-7 h-7 text-purple-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Digital Literacy</h3>
              <p className="text-gray-600">
                Master essential digital tools to thrive in Kenya's tech-driven economy
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-500 transition-colors">
                <TreePine className="w-7 h-7 text-green-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Green Innovation</h3>
              <p className="text-gray-600">
                Explore sustainable practices through practical, hands-on learning
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-amber-500 transition-colors">
                <Trophy className="w-7 h-7 text-amber-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Gamified Learning</h3>
              <p className="text-gray-600">
                Earn XP, badges, and certificates as you progress through courses
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-teal-500 transition-colors">
                <Users className="w-7 h-7 text-teal-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Expert Mentorship</h3>
              <p className="text-gray-600">
                Connect with experienced professionals who guide your learning journey
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-orange-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            Join thousands of learners building skills for Kenya's future
          </p>
          <Link href="/signup">
            <Button className="bg-white text-orange-600 hover:bg-gray-50 px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center space-x-2 mx-auto">
              <span>Get Started for Free</span>
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
