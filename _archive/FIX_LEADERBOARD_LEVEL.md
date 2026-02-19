# Fix Leaderboard Level Display

## Problem
The leaderboard is showing "Lvl 2" when you're actually Level 3 with 792 XP.

## Root Cause
The database RPC functions (`get_leaderboard_with_context`, `get_top_learners`, `get_user_rank`) are using an incorrect formula to calculate the level from XP.

## Level Formula
The correct formula is:
- **Level = floor(√(total_xp / 50))**

Level progression:
- Level 1: 0-199 XP (0 ≤ XP < 200)
- Level 2: 200-449 XP (200 ≤ XP < 450)
- Level 3: 450-799 XP (450 ≤ XP < 800) ← **You are here with 792 XP**
- Level 4: 800-1249 XP (800 ≤ XP < 1250)
- Level 5: 1250-1799 XP (1250 ≤ XP < 1800)

## Fix Steps

### 1. Open Supabase SQL Editor
Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

### 2. Run the Fix Script
Copy and paste the contents of [`fix-leaderboard-level.sql`](./fix-leaderboard-level.sql) into the SQL editor and click "Run".

This will update 3 database functions:
- ✅ `get_leaderboard_with_context` - Main leaderboard function
- ✅ `get_top_learners` - Top learners list
- ✅ `get_user_rank` - Individual user rank

### 3. Verify the Fix
After running the script, refresh your dashboard page. The leaderboard should now show:
- **Lvl 3** (correct) instead of "Lvl 2" (wrong)

### 4. Test Query (Optional)
Run this to verify your level calculation:
```sql
SELECT
  email,
  total_xp,
  FLOOR(SQRT(GREATEST(total_xp, 0) / 50.0)) as calculated_level
FROM profiles
WHERE user_id = 'your-user-id-here';
```

Expected result: `calculated_level = 3` for 792 XP

## What Was Fixed

The database functions were using a different calculation. The fix updates the SQL to use:
```sql
GREATEST(1, FLOOR(SQRT(GREATEST(total_xp, 0) / 50.0))::INTEGER) as level
```

This ensures:
- ✅ Level calculation matches the frontend formula
- ✅ Minimum level is 1 (never 0)
- ✅ Handles negative XP gracefully (shouldn't happen, but safe)
- ✅ Consistent across all leaderboard functions

## After Fix
Your leaderboard will correctly show:
```
🥇 ledeve5997 (You)
   2
   3 modules
   792 XP    ← Correct XP
   Lvl 3     ← Correct Level! ✅
```

---

**Note**: This fix only affects the leaderboard display. Your XP, progress, and stats are all correct - it was just the level calculation in the leaderboard that was wrong.
