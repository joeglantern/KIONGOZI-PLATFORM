# 🛡️ Kiongozi LMS Admin Promotion Guide

A comprehensive guide for promoting users to admin roles and managing administrative privileges.

## 📋 Table of Contents
- [Admin Roles Overview](#admin-roles-overview)
- [Promoting Users to Admin](#promoting-users-to-admin)
- [SQL Commands Reference](#sql-commands-reference)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

## 🎭 Admin Roles Overview

### Available Admin Roles
- **`admin`** - Full system administrator with all privileges
- **`org_admin`** - Organization administrator with limited system access
- **`moderator`** - Chat and content moderation privileges
- **`content_editor`** - Content management privileges
- **`analyst`** - Analytics and reporting access
- **`researcher`** - Research and data analysis access

### Admin vs Regular User Privileges
```sql
-- Regular user roles
'user'           -- Standard platform user

-- Administrative roles (can access admin panel)
'admin'          -- Full system admin
'org_admin'      -- Organization admin
'moderator'      -- Content moderator
'content_editor' -- Content manager
'analyst'        -- Data analyst
'researcher'     -- Research access
```

## 🚀 Promoting Users to Admin

### Method 1: Direct Database Update (Recommended)

#### Step 1: Connect to your database
```bash
# Using Supabase CLI
npx supabase db shell

# Or connect via SQL client with your database credentials
psql "postgresql://[user]:[password]@[host]:[port]/[database]"
```

#### Step 2: Find the user you want to promote
```sql
-- Search by email
SELECT id, email, full_name, role, status, created_at 
FROM profiles 
WHERE email = 'user@example.com';

-- Search by name
SELECT id, email, full_name, role, status, created_at 
FROM profiles 
WHERE full_name ILIKE '%John Doe%';

-- List all non-admin users
SELECT id, email, full_name, role, status, created_at 
FROM profiles 
WHERE role = 'user' 
ORDER BY created_at DESC;
```

#### Step 3: Promote user to admin
```sql
-- Promote to full admin
UPDATE profiles 
SET 
    role = 'admin',
    updated_at = now()
WHERE email = 'newadmin@example.com';

-- Promote to organization admin
UPDATE profiles 
SET 
    role = 'org_admin',
    updated_at = now()
WHERE email = 'orgadmin@example.com';

-- Verify the update
SELECT id, email, full_name, role, status, updated_at 
FROM profiles 
WHERE email = 'newadmin@example.com';
```

### Method 2: Using Database Function (With Audit Logging)

```sql
-- Promote user with audit logging
SELECT change_user_role(
    'TARGET_USER_ID'::uuid,           -- User to promote
    'ADMIN_USER_ID'::uuid,            -- Current admin doing the promotion
    'admin'                           -- New role
);

-- Example with actual IDs
SELECT change_user_role(
    'a1b2c3d4-e5f6-7890-1234-567890abcdef'::uuid,
    'admin123-4567-8901-2345-678901234567'::uuid,
    'admin'
);
```

### Method 3: Bulk Admin Promotion

```sql
-- Promote multiple users at once
UPDATE profiles 
SET 
    role = 'admin',
    updated_at = now()
WHERE email IN (
    'admin1@example.com',
    'admin2@example.com',
    'admin3@example.com'
);

-- Verify bulk promotion
SELECT email, full_name, role, updated_at 
FROM profiles 
WHERE email IN (
    'admin1@example.com',
    'admin2@example.com',
    'admin3@example.com'
);
```

## 📚 SQL Commands Reference

### User Management Commands

#### Check Current Admins
```sql
-- List all admin users
SELECT 
    id,
    email, 
    full_name, 
    role, 
    status,
    last_login_at,
    created_at
FROM profiles 
WHERE role IN ('admin', 'org_admin', 'moderator', 'content_editor', 'analyst', 'researcher')
ORDER BY role, created_at DESC;
```

#### Create New Admin User
```sql
-- Note: This requires the auth.users table as well
-- First create the auth user, then the profile

-- 1. Insert into profiles (assuming auth user exists)
INSERT INTO profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    role,
    status
) VALUES (
    'NEW_USER_UUID',
    'newadmin@kiongozi.com',
    'New Admin',
    'New',
    'Admin',
    'admin',
    'active'
);
```

#### Demote Admin to Regular User
```sql
-- Remove admin privileges
UPDATE profiles 
SET 
    role = 'user',
    updated_at = now()
WHERE email = 'former-admin@example.com';
```

#### Deactivate Admin Account
```sql
-- Deactivate without deleting
UPDATE profiles 
SET 
    status = 'inactive',
    deactivated_at = now(),
    updated_at = now()
WHERE email = 'admin@example.com';
```

#### Reactivate Admin Account
```sql
-- Reactivate deactivated admin
UPDATE profiles 
SET 
    status = 'active',
    deactivated_at = NULL,
    updated_at = now()
WHERE email = 'admin@example.com';
```

### Audit Trail Commands

#### View Admin Actions Log
```sql
-- See all admin actions
SELECT 
    aa.created_at,
    aa.action_type,
    admin.full_name as admin_name,
    admin.email as admin_email,
    target.full_name as target_name,
    target.email as target_email,
    aa.action_details
FROM admin_actions aa
LEFT JOIN profiles admin ON aa.admin_id = admin.id
LEFT JOIN profiles target ON aa.target_user_id = target.id
ORDER BY aa.created_at DESC
LIMIT 100;
```

#### View Role Change History
```sql
-- See all role changes
SELECT 
    aa.created_at,
    admin.email as changed_by,
    target.email as target_user,
    aa.action_details->>'old_role' as old_role,
    aa.action_details->>'new_role' as new_role
FROM admin_actions aa
LEFT JOIN profiles admin ON aa.admin_id = admin.id  
LEFT JOIN profiles target ON aa.target_user_id = target.id
WHERE aa.action_type = 'role_changed'
ORDER BY aa.created_at DESC;
```

### Security Commands

#### Check for Suspicious Admin Activity
```sql
-- Recent admin promotions
SELECT 
    aa.created_at,
    admin.email as promoted_by,
    target.email as new_admin,
    aa.action_details
FROM admin_actions aa
JOIN profiles admin ON aa.admin_id = admin.id
JOIN profiles target ON aa.target_user_id = target.id
WHERE aa.action_type = 'role_changed' 
  AND aa.action_details->>'new_role' IN ('admin', 'org_admin')
  AND aa.created_at > now() - interval '30 days'
ORDER BY aa.created_at DESC;
```

#### Admin Login Activity
```sql
-- Recent admin logins
SELECT 
    ull.created_at as login_time,
    p.email,
    p.full_name,
    p.role,
    ull.ip_address,
    ull.login_success
FROM user_login_logs ull
JOIN profiles p ON ull.user_id = p.id
WHERE p.role IN ('admin', 'org_admin')
  AND ull.created_at > now() - interval '7 days'
ORDER BY ull.created_at DESC;
```

## 🔒 Security Best Practices

### 1. **Principle of Least Privilege**
- Only promote users who absolutely need admin access
- Use specific roles (org_admin, moderator) instead of full admin when possible
- Regularly audit admin user list

### 2. **Admin Account Security**
```sql
-- Enable additional security for admin accounts
UPDATE profiles 
SET 
    require_2fa = true,
    password_expires_at = now() + interval '90 days'
WHERE role IN ('admin', 'org_admin');
```

### 3. **Regular Admin Audits**
```sql
-- Monthly admin audit query
SELECT 
    'ADMIN_AUDIT_' || to_char(now(), 'YYYY_MM') as audit_name,
    count(*) as total_admins,
    count(CASE WHEN last_login_at > now() - interval '30 days' THEN 1 END) as active_admins,
    count(CASE WHEN last_login_at IS NULL OR last_login_at < now() - interval '90 days' THEN 1 END) as inactive_admins
FROM profiles 
WHERE role IN ('admin', 'org_admin');
```

### 4. **Emergency Admin Access**
```sql
-- Create emergency admin access (use with caution)
-- Replace with your actual admin email
UPDATE profiles 
SET role = 'admin', status = 'active' 
WHERE email = 'emergency@kiongozi.com';
```

## 🛠️ Troubleshooting

### Common Issues

#### Issue: User can't access admin panel after promotion
```sql
-- Check user role and status
SELECT id, email, role, status, last_login_at 
FROM profiles 
WHERE email = 'user@example.com';

-- Ensure user is active
UPDATE profiles 
SET status = 'active' 
WHERE email = 'user@example.com';
```

#### Issue: Admin lost access suddenly
```sql
-- Check if account was deactivated or demoted
SELECT 
    email, 
    role, 
    status, 
    banned_at, 
    deactivated_at,
    updated_at
FROM profiles 
WHERE email = 'admin@example.com';

-- Check recent admin actions on this user
SELECT 
    aa.created_at,
    aa.action_type,
    admin.email as action_by,
    aa.action_details
FROM admin_actions aa
JOIN profiles admin ON aa.admin_id = admin.id
WHERE aa.target_user_id = (
    SELECT id FROM profiles WHERE email = 'admin@example.com'
)
ORDER BY aa.created_at DESC
LIMIT 10;
```

#### Issue: Multiple admin accounts needed
```sql
-- Batch promote trusted users
UPDATE profiles 
SET 
    role = 'admin',
    updated_at = now()
WHERE email IN (
    SELECT email FROM (
        VALUES 
        ('admin1@company.com'),
        ('admin2@company.com'),
        ('admin3@company.com')
    ) AS trusted_emails(email)
)
AND status = 'active';
```

### Recovery Procedures

#### Super Admin Recovery
If all admin access is lost:

1. **Direct Database Access Required**
```sql
-- Find the first user (usually founder/owner)
SELECT * FROM profiles ORDER BY created_at LIMIT 1;

-- Promote first user to super admin
UPDATE profiles 
SET 
    role = 'admin',
    status = 'active',
    updated_at = now()
WHERE id = 'FIRST_USER_ID';
```

2. **Emergency Admin Creation**
```sql
-- Create new emergency admin profile
-- (Requires corresponding auth.users entry)
INSERT INTO profiles (
    id, email, full_name, role, status
) VALUES (
    gen_random_uuid(),
    'emergency-admin@kiongozi.com',
    'Emergency Administrator',
    'admin',
    'active'
);
```

## 📊 Monitoring and Maintenance

### Regular Maintenance Queries

#### Weekly Admin Review
```sql
-- Weekly admin status report
SELECT 
    'Week of ' || date_trunc('week', now())::date as report_period,
    count(*) filter (where role = 'admin') as full_admins,
    count(*) filter (where role = 'org_admin') as org_admins,
    count(*) filter (where role = 'moderator') as moderators,
    count(*) filter (where status = 'active') as active_admins,
    count(*) filter (where last_login_at > now() - interval '7 days') as recently_active
FROM profiles 
WHERE role IN ('admin', 'org_admin', 'moderator', 'content_editor', 'analyst', 'researcher');
```

#### Admin Activity Dashboard
```sql
-- Last 30 days admin activity summary
SELECT 
    p.email,
    p.role,
    p.last_login_at,
    count(aa.id) as actions_performed,
    max(aa.created_at) as last_action
FROM profiles p
LEFT JOIN admin_actions aa ON p.id = aa.admin_id
WHERE p.role IN ('admin', 'org_admin') 
  AND (aa.created_at > now() - interval '30 days' OR aa.created_at IS NULL)
GROUP BY p.id, p.email, p.role, p.last_login_at
ORDER BY p.role, p.last_login_at DESC NULLS LAST;
```

---

## 🎯 Quick Reference

### Promote User to Admin (One-liner)
```sql
UPDATE profiles SET role = 'admin', updated_at = now() WHERE email = 'user@example.com';
```

### Check Admin Status
```sql
SELECT email, role, status FROM profiles WHERE email = 'user@example.com';
```

### List All Admins
```sql
SELECT email, role, status, last_login_at FROM profiles WHERE role IN ('admin', 'org_admin') ORDER BY role;
```

### Remove Admin Access
```sql
UPDATE profiles SET role = 'user', updated_at = now() WHERE email = 'former-admin@example.com';
```

---

**⚠️ Important Security Notes:**
- Always verify user identity before granting admin access
- Keep admin accounts to a minimum
- Regularly audit admin activity
- Use organization admins instead of full admins when possible
- Log all admin privilege changes
- Have an emergency access plan

**📞 Support:**
For technical support with admin promotion issues, contact your system administrator or database administrator with this documentation.