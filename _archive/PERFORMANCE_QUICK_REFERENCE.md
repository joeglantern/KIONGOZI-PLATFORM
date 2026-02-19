# ⚡ Performance Quick Reference Card

Quick guide for maintaining optimal performance in Kiongozi LMS.

---

## 🎯 Core Principles

1. **Cache Everything** (but with expiration)
2. **Debounce User Input** (search, filters)
3. **Prefetch Critical Routes** (course pages)
4. **Show Loading States** (skeletons > spinners)
5. **Lazy Load Below Fold** (images, heavy components)

---

## 📦 New Utilities

### 1. Debounce Hook
```tsx
import { useDebounce } from '@/app/hooks/useDebounce';

const [input, setInput] = useState('');
const debouncedInput = useDebounce(input, 300); // 300ms delay
```

### 2. Cache Invalidation
```tsx
import { invalidateCache } from '@/app/utils/courseClient';

// After mutations
await enrollInCourse(courseId, userId);
invalidateCache('enrollments'); // Clear related caches
```

### 3. Loading Skeletons
```tsx
import { CourseCardSkeleton } from '@/app/components/LoadingSkeleton';

{loading ? <CourseCardSkeleton /> : <CourseCard data={course} />}
```

### 4. Error Boundary
```tsx
import ErrorBoundary from '@/app/components/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

---

## 🚫 Anti-Patterns to Avoid

### ❌ DON'T: Fetch on every render
```tsx
// BAD
useEffect(() => {
  fetchData(); // Runs constantly
});
```

### ✅ DO: Add dependencies
```tsx
// GOOD
useEffect(() => {
  fetchData();
}, [userId, courseId]); // Only when these change
```

---

### ❌ DON'T: Uncontrolled search
```tsx
// BAD - filters on every keystroke
onChange={(e) => setFilteredData(data.filter(...))}
```

### ✅ DO: Debounce + Memo
```tsx
// GOOD
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);
const filtered = useMemo(() =>
  data.filter(item => item.name.includes(debouncedSearch))
, [data, debouncedSearch]);
```

---

### ❌ DON'T: Forget prefetch
```tsx
// BAD
<Link href="/course/123">View Course</Link>
```

### ✅ DO: Enable prefetch
```tsx
// GOOD
<Link href="/course/123" prefetch={true}>View Course</Link>
```

---

### ❌ DON'T: Show blank screen while loading
```tsx
// BAD
{loading ? null : <Content />}
```

### ✅ DO: Show skeleton
```tsx
// GOOD
{loading ? <ContentSkeleton /> : <Content />}
```

---

### ❌ DON'T: Cache forever
```tsx
// BAD
localStorage.setItem('data', JSON.stringify(data));
```

### ✅ DO: Add timestamp
```tsx
// GOOD
localStorage.setItem('data', JSON.stringify({
  data,
  timestamp: Date.now()
}));
```

---

## 🎨 Animation Best Practices

### Use CSS, not JS
```css
/* GOOD - Hardware accelerated */
.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

```tsx
// BAD - JavaScript animation loop
useEffect(() => {
  const interval = setInterval(() => {
    setOpacity(o => o + 0.01);
  }, 16);
});
```

### Optimize IntersectionObserver
```tsx
// GOOD - Unobserve after animation
useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate');
        observer.unobserve(entry.target); // Stop tracking
      }
    });
  }, { rootMargin: '50px' }); // Preload slightly early

  elements.forEach(el => observer.observe(el));
  return () => observer.disconnect();
}, []);
```

---

## 📊 Performance Checklist

Before committing code, check:

- [ ] Search/filter inputs use `useDebounce`
- [ ] Links to critical pages have `prefetch={true}`
- [ ] Loading states show skeletons (not blank/spinner)
- [ ] Mutations invalidate related caches
- [ ] Heavy lists use `useMemo` for filtering
- [ ] IntersectionObserver unobserves after trigger
- [ ] No `console.log` in production code
- [ ] Images have proper `alt` text
- [ ] Forms have proper `aria-label`

---

## 🔧 Quick Debugging

### Check cache expiration
```tsx
// In browser console
const cache = localStorage.getItem('user_cache');
const { data, timestamp } = JSON.parse(cache);
console.log('Age:', Date.now() - timestamp, 'ms');
console.log('Expires in:', 300000 - (Date.now() - timestamp), 'ms');
```

### Check pending requests
```tsx
// In courseClient.ts, add:
console.log('Pending:', Object.keys(_pendingRequests));
```

### Monitor Web Vitals
```tsx
// Already configured in app/utils/performance.ts
// Check console for metrics in dev mode
```

---

## 🚀 Production Checklist

Before deploying:

- [ ] Run `npm run build` successfully
- [ ] Test in production mode (`npm run start`)
- [ ] Check Lighthouse score (target: >90)
- [ ] Verify cookie consent appears
- [ ] Test error boundary (throw test error)
- [ ] Check bundle size (`du -sh .next/static`)
- [ ] Verify no console errors/warnings
- [ ] Test on slow 3G (Chrome DevTools)
- [ ] Verify images load with lazy loading
- [ ] Test offline behavior (if PWA)

---

## 📞 Need Help?

- **Performance issues?** Check `OPTIMIZATION_SUMMARY.md`
- **New utilities?** See `app/utils/performance.ts`
- **Skeleton components?** See `app/components/LoadingSkeleton.tsx`
- **Error handling?** See `app/components/ErrorBoundary.tsx`

---

**Last Updated:** February 16, 2026
**Maintained by:** Development Team
