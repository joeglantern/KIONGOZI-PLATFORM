# 🏆 Leaderboard System Setup Guide

## Overview

The leaderboard system ranks learners based on their total XP and provides competitive motivation through real-time rankings.

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

1. Open your **Supabase Dashboard** SQL Editor
2. Open the file: `database-leaderboard.sql`
3. Copy the entire content
4. Paste into Supabase SQL Editor
5. Click **Run** to execute

This will:
- Create materialized view `leaderboard`
- Create helper functions (`get_top_learners`, `get_user_rank`, `get_leaderboard_with_context`)
- Set up indexes for performance
- Create refresh function

### Step 2: Verify Setup

Run these queries in Supabase SQL Editor:

```sql
-- Check if leaderboard was created
SELECT COUNT(*) FROM leaderboard;

-- View top 10 learners
SELECT * FROM get_top_learners(10);

-- Test leaderboard view
SELECT * FROM leaderboard LIMIT 10;
```

### Step 3: Test the Leaderboard

1. **Navigate to:** http://localhost:3001/lms/my-learning
2. **Check the right sidebar** - you should see the Leaderboard card
3. **Complete a few modules** to earn XP and see yourself ranked

---

## 🎯 Features

### 1. Real-Time Rankings
- Shows top 10 learners
- Your current rank displayed prominently
- Context view (2 users above/below you)

### 2. Medal System
- 🥇 Gold for #1
- 🥈 Silver for #2
- 🥉 Bronze for #3
- Numbers for #4+

### 3. Rich User Info
- Total XP and Level
- Badges earned
- Modules completed
- Max streak

### 4. Current User Highlighting
- Orange background for your entry
- "(You)" label
- Always visible even if not in top 10

### 5. Performance Optimized
- Materialized view for fast queries
- Indexed by XP and level
- Efficient ranking algorithm

---

## 📊 How It Works

### Leaderboard Calculation

Users are ranked by:
1. **Total XP** (primary)
2. **Level** (tiebreaker)

### Data Shown

For each user:
- **Rank** - Position on leaderboard
- **Name** - Full name or email username
- **XP** - Total experience points
- **Level** - Current level
- **Badges** - Number of badges earned
- **Modules** - Completed modules count

### Context View

If you're not in the top 10:
- Shows top 10 users
- Shows separator (`•••`)
- Shows 2 users above you
- Shows YOU (highlighted)
- Shows 2 users below you

---

## 🎨 UI Design

### Leaderboard Card

**Top 3 (Medal) Entries:**
- Gold gradient background (yellow-orange)
- Medal emoji instead of rank number
- Enhanced visual prominence

**Your Entry:**
- Orange background (#FFF7ED)
- Orange border
- Orange text for XP
- "(You)" label

**Other Entries:**
- Gray background
- Hover effect
- Clean, minimal design

### Mobile Responsive

- **Phone:** Full-width card, smaller text, stacked layout
- **Tablet:** Optimized spacing
- **Desktop:** Right sidebar placement

---

## ⚡ Refreshing the Leaderboard

The leaderboard is a **materialized view** for performance. It needs to be refreshed when data changes.

### Option 1: Manual Refresh (Recommended Initially)

```sql
SELECT refresh_leaderboard();
```

Run this in Supabase SQL Editor after major changes.

### Option 2: Automatic Refresh (Uncomment in SQL file)

The SQL file includes a trigger (commented out) that auto-refreshes when XP updates:

```sql
-- In database-leaderboard.sql, uncomment lines 167-171:
DROP TRIGGER IF EXISTS profiles_xp_update_trigger ON profiles;
CREATE TRIGGER profiles_xp_update_trigger
  AFTER UPDATE OF total_xp ON profiles
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_leaderboard();
```

⚠️ **Warning:** This can be expensive on high traffic. Use with caution.

### Option 3: Scheduled Refresh (Best for Production)

Use Supabase's pg_cron extension:

```sql
-- Refresh every 5 minutes
SELECT cron.schedule(
  'refresh-leaderboard',
  '*/5 * * * *',
  $$SELECT refresh_leaderboard()$$
);
```

---

## 🔧 Customization

### Change Top Count

Edit in `app/lms/my-learning/page.tsx`:

```typescript
<Leaderboard userId={user.id} topCount={20} contextCount={3} />
```

- `topCount`: How many top users to show (default: 10)
- `contextCount`: How many users above/below you (default: 2)

### Change Ranking Criteria

Edit the materialized view in `database-leaderboard.sql`:

```sql
ORDER BY
  p.total_xp DESC,        -- Primary: Total XP
  p.level DESC,           -- Secondary: Level
  ce.courses_completed DESC  -- Tertiary: Courses (add this)
```

### Add More User Data

Edit the materialized view SELECT to include more fields:

```sql
CREATE MATERIALIZED VIEW leaderboard AS
SELECT
  p.id,
  p.email,
  p.full_name,
  p.avatar_url,  -- Already included
  p.bio,         -- Add custom field
  ...
```

---

## 📱 Where Leaderboard Appears

Currently shown on:
- ✅ My Learning page (right sidebar)

Can be added to:
- Browse page
- Progress page
- Dedicated Leaderboard page (`/lms/leaderboard`)

---

## 🐛 Troubleshooting

### Leaderboard Not Showing

1. **Check if users have XP:**
   ```sql
   SELECT COUNT(*) FROM profiles WHERE total_xp > 0;
   ```

2. **Check if leaderboard exists:**
   ```sql
   SELECT * FROM leaderboard LIMIT 1;
   ```

3. **Refresh materialized view:**
   ```sql
   SELECT refresh_leaderboard();
   ```

### User Not Appearing

1. **Verify user has XP:**
   ```sql
   SELECT total_xp, level FROM profiles WHERE id = 'user-id';
   ```

2. **Check leaderboard includes user:**
   ```sql
   SELECT * FROM leaderboard WHERE user_id = 'user-id';
   ```

3. **Refresh and check again:**
   ```sql
   SELECT refresh_leaderboard();
   SELECT * FROM leaderboard WHERE user_id = 'user-id';
   ```

### Slow Performance

1. **Check indexes exist:**
   ```sql
   SELECT indexname FROM pg_indexes
   WHERE tablename = 'profiles'
   AND indexname LIKE '%leaderboard%';
   ```

2. **Rebuild materialized view:**
   ```sql
   DROP MATERIALIZED VIEW leaderboard CASCADE;
   -- Then re-run the CREATE MATERIALIZED VIEW query
   ```

---

## 💡 Future Enhancements

### Weekly Leaderboard

Create a separate view for weekly rankings:

```sql
CREATE MATERIALIZED VIEW weekly_leaderboard AS
SELECT ... WHERE completed_at >= NOW() - INTERVAL '7 days';
```

### Category-Specific Leaderboards

Show top learners per category:

```sql
CREATE VIEW leaderboard_by_category AS
SELECT ... GROUP BY category_id;
```

### Friends Leaderboard

Filter by friends/connections:

```sql
WHERE user_id IN (SELECT friend_id FROM friendships WHERE user_id = ?)
```

---

## ✅ Verification Checklist

After setup:

- [ ] Database migration ran successfully
- [ ] Leaderboard view exists and populated
- [ ] Can query top learners
- [ ] Leaderboard card appears on My Learning
- [ ] Your rank shows correctly
- [ ] Medals appear for top 3
- [ ] Your entry is highlighted
- [ ] Mobile layout works correctly
- [ ] Performance is acceptable (< 500ms query time)

---

## 📚 Files Created/Modified

### New Files:
- `database-leaderboard.sql` - Database schema
- `app/utils/leaderboard.ts` - Leaderboard logic
- `app/components/Leaderboard.tsx` - Leaderboard UI
- `LEADERBOARD_SETUP.md` - This guide

### Modified Files:
- `app/lms/my-learning/page.tsx` - Added Leaderboard component

---

Enjoy the competitive learning experience! 🏆🚀
