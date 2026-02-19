# Leaderboard Troubleshooting Guide

## Issue: "Unable to load leaderboard"

This error means the leaderboard database functions are missing or not accessible.

---

## Solution: Run the Complete Setup Script

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Run the Setup Script
1. Open the file: **`setup-leaderboard-complete.sql`**
2. Copy ALL the contents
3. Paste into the Supabase SQL editor
4. Click **"Run"** (or press Ctrl+Enter)

### Step 3: Verify Success
You should see a success message. The script will:
- ✅ Drop old functions (if they exist)
- ✅ Create 4 new functions:
  - `get_leaderboard_with_context` - Main leaderboard with user context
  - `get_top_learners` - Top 10 learners
  - `get_user_rank` - Individual user rank
  - `refresh_leaderboard` - Placeholder for future use
- ✅ Grant execute permissions
- ✅ Use correct level calculation (Level 3 for 792 XP)

### Step 4: Refresh Your Dashboard
1. Go back to your LMS dashboard: `http://localhost:3001/lms/my-learning`
2. Hard refresh: **Ctrl+Shift+R** (or Cmd+Shift+R on Mac)
3. The leaderboard should now load correctly!

---

## What These Functions Do

### 1. `get_leaderboard_with_context(user_id, top_count, context_count)`
Returns the top N users PLUS users around the current user.

**Example:**
- Top 10 users shown
- If you're rank #15, it also shows ranks #13-17 (context)
- Your rank is highlighted with "(You)"

### 2. `get_top_learners(limit_count)`
Simple top N leaderboard.

### 3. `get_user_rank(user_id)`
Get a specific user's rank and stats.

---

## Expected Result After Fix

Your leaderboard should show:

```
🥇 ledeve5997 (You)
   2                    ← Your rank
   3 modules            ← Modules completed
   792 XP               ← Total XP
   Lvl 3                ← Correct level! ✅
```

---

## Common Issues & Solutions

### Issue 1: "permission denied for function"
**Solution:** The script includes GRANT statements. Make sure you run the entire script as a superuser or database owner.

### Issue 2: Still shows "Lvl 2" after running script
**Solution:**
1. Clear your browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check if the functions were created:
   ```sql
   SELECT proname FROM pg_proc WHERE proname LIKE 'get_%learner%';
   ```
   You should see 3 functions listed.

### Issue 3: "function does not exist"
**Solution:** The functions weren't created. Check for errors in the SQL editor output and run the script again.

### Issue 4: Leaderboard is empty
**Solution:** Check if you have XP in your profile:
```sql
SELECT user_id, email, total_xp FROM profiles WHERE total_xp > 0;
```
If no results, you need to complete some modules first.

---

## Test Queries

### Check Your Level Calculation
```sql
SELECT
  email,
  total_xp,
  FLOOR(SQRT(GREATEST(total_xp, 0) / 50.0)) as calculated_level
FROM profiles
WHERE total_xp > 0
ORDER BY total_xp DESC;
```

### Test the Leaderboard Function
```sql
SELECT * FROM get_top_learners(10);
```

### Test Your Rank
Replace `'your-user-id'` with your actual user ID:
```sql
SELECT * FROM get_user_rank('your-user-id');
```

---

## Level Formula Explanation

The correct formula is:
```
Level = floor(√(total_xp / 50))
```

**Level Requirements:**
- Level 1: 0-199 XP
- Level 2: 200-449 XP
- Level 3: 450-799 XP ← **You are here (792 XP)**
- Level 4: 800-1249 XP
- Level 5: 1250-1799 XP

**Your Calculation:**
- XP: 792
- √(792 / 50) = √15.84 = 3.98
- floor(3.98) = **3** ✅

---

## Still Having Issues?

If the leaderboard still doesn't work after running the script:

1. **Check Supabase logs** for any RLS (Row Level Security) errors
2. **Verify profiles table** has the required columns:
   - `user_id`, `email`, `full_name`
   - `total_xp`, `courses_completed`, `modules_completed`
   - `max_streak`, `total_badges`
3. **Check RLS policies** on the profiles table - functions use `SECURITY DEFINER` to bypass RLS
4. **Contact support** with the error message from browser console

---

## Success Checklist

After running the setup script, verify:
- ✅ Leaderboard loads without errors
- ✅ Shows "Lvl 3" instead of "Lvl 2"
- ✅ Shows correct XP (792)
- ✅ Shows correct rank
- ✅ "(You)" indicator appears on your entry
- ✅ Other learners are visible (if any exist)

🎉 **All done!** Your leaderboard should now be working correctly.
