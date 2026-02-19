# ✅ Implementation Checklist - Kiongozi LMS New Features

## 🎯 Quick Start (15 minutes)

### Step 1: Database Setup (5 min)
```bash
# 1. Open Supabase Dashboard
# 2. Go to SQL Editor
# 3. Copy contents of: database-schema-features.sql
# 4. Click "Run"
# 5. Wait for "✅ Kiongozi LMS Feature Tables Created Successfully!"
```

**Verify:**
- [ ] Tables created (16 new tables)
- [ ] RLS policies enabled
- [ ] Triggers created
- [ ] Sample data inserted

---

### Step 2: Test Database (5 min)

Run these queries in Supabase SQL Editor to verify:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%quiz%' OR table_name LIKE '%certificate%';

-- Check sample data
SELECT * FROM certificate_templates;
SELECT * FROM course_tags;
```

**Verify:**
- [ ] Default certificate template exists
- [ ] 5 course tags exist
- [ ] No errors

---

### Step 3: Test Quiz Feature (5 min)

Create a test quiz in Supabase:

```sql
-- Insert test quiz
INSERT INTO quizzes (module_id, title, description, passing_score)
VALUES (
  'YOUR_MODULE_ID_HERE',
  'Test Quiz',
  'This is a test quiz to verify the system works',
  70
);

-- Insert test question
INSERT INTO quiz_questions (quiz_id, question_text, question_type, points, order_index)
VALUES (
  (SELECT id FROM quizzes WHERE title = 'Test Quiz'),
  'What is 2 + 2?',
  'multiple_choice',
  1,
  1
);

-- Insert answer options
INSERT INTO quiz_answer_options (question_id, option_text, is_correct, order_index)
VALUES
  ((SELECT id FROM quiz_questions WHERE question_text = 'What is 2 + 2?'), '3', false, 1),
  ((SELECT id FROM quiz_questions WHERE question_text = 'What is 2 + 2?'), '4', true, 2),
  ((SELECT id FROM quiz_questions WHERE question_text = 'What is 2 + 2?'), '5', false, 3);
```

**Verify:**
- [ ] Quiz created
- [ ] Question created
- [ ] Options created

---

## 🔧 Integration Tasks

### Task 1: Add Quiz to Module Viewer

**File:** `app/lms/courses/[courseId]/modules/[moduleId]/page.tsx`

**Add imports:**
```typescript
import QuizTaker from '@/app/components/QuizTaker';
import { getQuizByModuleId } from '@/app/utils/quizClient';
```

**Add after module content:**
```tsx
{/* Quiz Section */}
{quiz && (
  <div className="my-12 p-8 bg-gradient-to-br from-orange-50 to-blue-50 rounded-2xl border-2 border-orange-200">
    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
      📝 <span>Test Your Knowledge</span>
    </h2>
    <QuizTaker
      quiz={quiz}
      userId={user.id}
      onComplete={async (attempt) => {
        if (attempt.passed) {
          await updateModuleProgress(moduleId, courseId, user.id, 'completed');
          toast.success('🎉 Module completed!');
        } else {
          toast.info('Try again to pass!');
        }
      }}
    />
  </div>
)}
```

**Test:**
- [ ] Quiz appears at bottom of module
- [ ] Can start quiz
- [ ] Can answer questions
- [ ] Can submit quiz
- [ ] Results display correctly

---

### Task 2: Add Certificate Generation

**File:** `app/lms/courses/[courseId]/page.tsx`

**Add certificate check after course completion:**
```typescript
import { generateCertificate, getUserCertificates } from '@/app/utils/certificateClient';

// After user completes course
if (enrollment.progress_percentage === 100 && enrollment.status === 'completed') {
  // Generate certificate
  const certResult = await generateCertificate(user.id, courseId);

  if (certResult.success) {
    toast.success('🎓 Certificate earned!');
    // Show certificate
  }
}
```

**Test:**
- [ ] Certificate generates on 100% completion
- [ ] Certificate number is unique
- [ ] Verification code works

---

### Task 3: Create Certificates Page

**File:** `app/lms/certificates/page.tsx`

```tsx
"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@/app/contexts/UserContext';
import { getUserCertificates } from '@/app/utils/certificateClient';
import CertificateCard from '@/app/components/CertificateCard';
import { Award } from 'lucide-react';

export default function CertificatesPage() {
  const { user } = useUser();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCertificates();
    }
  }, [user]);

  async function loadCertificates() {
    const result = await getUserCertificates(user.id);
    if (result.success) {
      setCertificates(result.data || []);
    }
    setLoading(false);
  }

  if (loading) {
    return <div className="p-8 text-center">Loading certificates...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <Award className="w-8 h-8 text-orange-600" />
          My Certificates
        </h1>
        <p className="text-gray-600">
          Your achievements and completed courses
        </p>
      </div>

      {certificates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No Certificates Yet
          </h3>
          <p className="text-gray-600">
            Complete a course to earn your first certificate!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map(cert => (
            <CertificateCard key={cert.id} certificate={cert} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Add to navigation in `app/lms/layout.tsx`:**
```typescript
{ name: 'Certificates', href: '/lms/certificates', icon: Award },
```

**Test:**
- [ ] Certificates page loads
- [ ] Shows all earned certificates
- [ ] Can share certificate
- [ ] Verification code displays

---

### Task 4: Add Reviews to Course Page

**File:** `app/lms/courses/[courseId]/page.tsx`

**Add at bottom of course detail:**
```tsx
import { getCourseReviews, getCourseRatingStats, createReview } from '@/app/utils/reviewsClient';
import { Star } from 'lucide-react';

// Load reviews
const { data: ratingStats } = await getCourseRatingStats(courseId);
const { data: reviews } = await getCourseReviews(courseId, { limit: 10 });

{/* Reviews Section */}
<div className="mt-12 p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
  <h2 className="text-2xl font-bold mb-6">⭐ Reviews & Ratings</h2>

  {/* Rating Summary */}
  <div className="flex items-center gap-6 mb-8 p-6 bg-gradient-to-r from-orange-50 to-blue-50 rounded-xl">
    <div className="text-center">
      <div className="text-5xl font-bold text-orange-600">
        {ratingStats.average_rating.toFixed(1)}
      </div>
      <div className="flex justify-center my-2">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={star <= Math.round(ratingStats.average_rating) ? 'fill-orange-500 text-orange-500' : 'text-gray-300'}
            size={20}
          />
        ))}
      </div>
      <div className="text-sm text-gray-600">
        {ratingStats.total_reviews} reviews
      </div>
    </div>

    <div className="flex-1">
      {[5, 4, 3, 2, 1].map(rating => (
        <div key={rating} className="flex items-center gap-2 mb-1">
          <span className="text-sm w-8">{rating} ⭐</span>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all"
              style={{
                width: `${(ratingStats.rating_distribution[rating] / ratingStats.total_reviews) * 100}%`
              }}
            />
          </div>
          <span className="text-sm text-gray-600 w-12 text-right">
            {ratingStats.rating_distribution[rating]}
          </span>
        </div>
      ))}
    </div>
  </div>

  {/* Review List */}
  <div className="space-y-4">
    {reviews.map(review => (
      <div key={review.id} className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={star <= review.rating ? 'fill-orange-500 text-orange-500' : 'text-gray-300'}
                    size={16}
                  />
                ))}
              </div>
              {review.is_verified_completion && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                  ✓ Verified
                </span>
              )}
            </div>
            {review.review_title && (
              <h4 className="font-semibold text-gray-900">{review.review_title}</h4>
            )}
          </div>
        </div>

        {review.review_text && (
          <p className="text-gray-700 mb-3">{review.review_text}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="font-medium">{review.user?.full_name || 'Anonymous'}</span>
          <span>•</span>
          <span>{new Date(review.created_at).toLocaleDateString()}</span>
          <span>•</span>
          <button className="hover:text-orange-600 transition-colors">
            👍 Helpful ({review.helpful_count})
          </button>
        </div>
      </div>
    ))}
  </div>
</div>
```

**Test:**
- [ ] Rating stats display
- [ ] Distribution bars show correctly
- [ ] Reviews list displays
- [ ] Verified badges show

---

### Task 5: Add Search Page

**File:** `app/lms/search/page.tsx`

```tsx
"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { searchContent, getAllTags } from '@/app/utils/searchClient';
import { Search, Filter } from 'lucide-react';
import Link from 'next/link';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [tags, setTags] = useState([]);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTags();
    if (query) {
      handleSearch();
    }
  }, []);

  async function loadTags() {
    const result = await getAllTags();
    if (result.success) {
      setTags(result.data || []);
    }
  }

  async function handleSearch() {
    setLoading(true);
    const result = await searchContent(query, filters);
    if (result.success) {
      setResults(result.data || []);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 w-6 h-6" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search courses and modules..."
            className="w-full pl-14 pr-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 sticky top-20">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </h3>

            {/* Difficulty */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Difficulty</label>
              <select
                onChange={(e) => setFilters({...filters, difficulty_levels: [e.target.value]})}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Tags */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 10).map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => setFilters({...filters, tags: [tag.id]})}
                    className="px-3 py-1 text-xs rounded-full border hover:bg-orange-50 hover:border-orange-300 transition-colors"
                    style={{ borderColor: tag.color }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSearch}
              className="w-full py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl">
              <p className="text-gray-600">No results found. Try different keywords.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 mb-4">
                Found {results.length} results for "{query}"
              </p>

              {results.map(result => (
                <Link key={result.id} href={result.url}>
                  <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg hover:border-orange-300 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold uppercase">
                        {result.type}
                      </span>
                      <span className="text-sm text-gray-500">
                        Relevance: {result.relevance_score}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-2 hover:text-orange-600">
                      {result.title}
                    </h3>

                    <p className="text-gray-600 mb-3 line-clamp-2">
                      {result.description}
                    </p>

                    {result.metadata && (
                      <div className="flex gap-3 text-sm text-gray-600">
                        {result.metadata.difficulty && (
                          <span className="px-2 py-1 bg-gray-100 rounded">
                            {result.metadata.difficulty}
                          </span>
                        )}
                        {result.metadata.duration && (
                          <span className="px-2 py-1 bg-gray-100 rounded">
                            {result.metadata.duration} {result.type === 'course' ? 'hours' : 'min'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Test:**
- [ ] Search works
- [ ] Filters apply correctly
- [ ] Results display
- [ ] Tags filter works

---

## 📱 Mobile Testing

Test all features on mobile:
- [ ] Quiz interface responsive
- [ ] Certificate cards stack properly
- [ ] Search filters collapse
- [ ] Reviews readable
- [ ] Navigation works

---

## 🎨 UI Polish

- [ ] Add loading states
- [ ] Add error messages
- [ ] Add success toasts
- [ ] Add empty states
- [ ] Add hover effects

---

## 🐛 Bug Testing

Test edge cases:
- [ ] Quiz with no questions
- [ ] Course with no reviews
- [ ] Search with no results
- [ ] Certificate generation fails
- [ ] Bookmark already exists

---

## 📝 Final Checklist

- [ ] All database tables created
- [ ] Quiz feature working
- [ ] Certificate generation working
- [ ] Reviews displaying
- [ ] Search functioning
- [ ] Navigation updated
- [ ] Mobile responsive
- [ ] Error handling added
- [ ] Loading states added
- [ ] Documentation reviewed

---

## 🎉 You're Done!

Your LMS now has:
✅ Quizzes & Assessments
✅ Certificates
✅ Discussions (database ready)
✅ Notes & Bookmarks (database ready)
✅ Reviews & Ratings
✅ Advanced Search

**Next:** Create UI components for Discussions and Notes!

---

## 💡 Tips

1. **Start with quiz** - Easiest to test and most visible
2. **Then certificates** - Automatically generated
3. **Then reviews** - Good for social proof
4. **Then search** - Improves UX significantly
5. **Save discussions/notes** - More complex UI

**Good luck! 🚀**
