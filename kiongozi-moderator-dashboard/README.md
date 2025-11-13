# Kiongozi Moderator Dashboard

A comprehensive moderator dashboard for the Kiongozi Learning Management System.

## Features

✅ **Authentication & Security**
- Secure login with role-based access control
- Moderator roles: `moderator`, `admin`, `org_admin`, `content_editor`
- Auto-redirect for non-moderators

✅ **Dashboard Overview**
- Real-time platform statistics
- Quick action buttons
- Course, module, and enrollment metrics

✅ **Course Management**
- Create, edit, and delete courses
- Add/remove modules from courses
- Reorder modules with up/down buttons
- Set module as required/optional
- Publish or save as draft

✅ **Module Management**
- Create and edit learning modules
- Markdown content editor
- Difficulty levels and duration settings
- Category assignment

✅ **User Management**
- View all users with search and filters
- User detail pages with enrollment history
- Change user roles
- Ban/activate users
- View user statistics and progress

✅ **Analytics Dashboard**
- Platform-wide metrics
- Top courses by enrollment
- Engagement statistics
- Completion rates

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS v4
- **UI Components**: Radix UI + shadcn/ui
- **Authentication**: Supabase Auth
- **API**: Kiongozi API Server (proxied)
- **Icons**: Lucide React

## Getting Started

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (already set in `.env`)

3. Run the development server:
```bash
npm run dev
```

4. Open http://localhost:3003 in your browser

### Building for Production

```bash
npm run build
npm start
```

## User Roles

- **user**: Regular learners (no dashboard access)
- **content_editor**: Can create/edit courses and modules
- **moderator**: Full content management, can view users
- **admin**: Full platform access including user management
- **org_admin**: Organization-level administration

## Design

Matches the Kiongozi LMS design:
- Dark header: `#1c1d1f`
- Copper accents: `#c9975b`
- Clean, modern interface
- Fully responsive
