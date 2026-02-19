# Kiongozi LMS - Complete Database Schema

*Generated on 2/17/2026, 12:25:08 PM*

---

## Table of Contents

1. [Database Overview](#database-overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Tables](#tables)
4. [Inferred Relationships](#inferred-relationships)

---

## Database Overview

**Total Tables:** 22

**Total Rows:** 182

**Database URL:** https://jdncfyagppohtksogzkx.supabase.co

## Entity Relationship Diagram

```mermaid
erDiagram
    achievements {
    }
    badges {
        uuid id
        text name
        text description
        text icon
        text color
        text category
        text requirement_type
        integer requirement_value
        string "... 1 more"
    }
    certificates {
    }
    chat_messages {
        uuid id
        uuid room_id
        uuid sender_id
        text content
        boolean is_read
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }
    chat_participants {
        uuid room_id
        uuid user_id
        timestamp joined_at
        timestamp last_read_at
    }
    chat_rooms {
        uuid id
        timestamp created_at
        timestamp updated_at
        timestamp last_message_at
        text type
        unknown name
        jsonb metadata
        unknown course_id
    }
    course_enrollments {
        uuid id
        uuid user_id
        uuid course_id
        timestamp enrolled_at
        text status
        integer progress_percentage
        unknown completed_at
        boolean certificate_issued
        string "... 3 more"
    }
    course_modules {
        uuid id
        uuid course_id
        uuid module_id
        integer order_index
        boolean is_required
        timestamp created_at
    }
    courses {
        uuid id
        text title
        text description
        unknown overview
        uuid category_id
        text difficulty_level
        integer estimated_duration_hours
        unknown prerequisites
        string "... 10 more"
    }
    learning_modules {
        uuid id
        text title
        text description
        text content
        uuid category_id
        text difficulty_level
        integer estimated_duration_minutes
        unknown learning_objectives
        string "... 10 more"
    }
    module_categories {
        uuid id
        text name
        text description
        text color
        text icon
        integer display_order
        timestamp created_at
        timestamp updated_at
    }
    notifications {
    }
    profiles {
        uuid id
        text email
        text full_name
        text role
        timestamp created_at
        timestamp updated_at
        text first_name
        text last_name
        string "... 10 more"
    }
    quiz_answers {
    }
    quiz_attempts {
        uuid id
        uuid quiz_id
        uuid user_id
        integer score
        integer points_earned
        integer total_points
        integer time_spent_seconds
        text status
        string "... 4 more"
    }
    quiz_questions {
        uuid id
        uuid quiz_id
        text question_text
        text question_type
        integer points
        integer order_index
        text explanation
        timestamp created_at
        string "... 1 more"
    }
    quizzes {
        uuid id
        uuid module_id
        text title
        text description
        integer passing_score
        integer time_limit_minutes
        integer max_attempts
        boolean show_correct_answers
        string "... 4 more"
    }
    user_achievements {
    }
    user_badges {
        uuid id
        uuid user_id
        uuid badge_id
        timestamp earned_at
    }
    user_progress {
        uuid id
        uuid user_id
        uuid module_id
        text status
        integer progress_percentage
        integer time_spent_minutes
        unknown started_at
        timestamp completed_at
        string "... 6 more"
    }
    user_streaks {
    }
    xp_transactions {
    }
    chat_rooms }o--|| courses : "course_id"
    course_enrollments }o--|| courses : "course_id"
    course_modules }o--|| courses : "course_id"
    user_badges }o--|| badges : "badge_id"
    user_progress }o--|| courses : "course_id"
```

## Tables

### achievements

**Row Count:** 0

**Columns:** 0

### badges

**Row Count:** 15

**Columns:** 9

| Column | Inferred Type | Sample Value |
|--------|---------------|---------------|
| `id` | uuid | 516a86f7-7798-44e7-98ef-a0dc89bed151 |
| `name` | text | First Steps |
| `description` | text | Complete your first module |
| `icon` | text | 🎯 |
| `color` | text | #3b82f6 |
| `category` | text | completion |
| `requirement_type` | text | modules_completed |
| `requirement_value` | integer | 1 |
| `created_at` | timestamp | 2026-02-13T07:58:59.640953 |

### certificates

**Row Count:** 0

**Columns:** 0

### chat_messages

**Row Count:** 2

**Columns:** 8

| Column | Inferred Type | Sample Value |
|--------|---------------|---------------|
| `id` | uuid | 17f4d122-062c-48ca-9cd7-605649e19de8 |
| `room_id` | uuid | fd7f7597-8dd2-444d-9568-2378769b237f |
| `sender_id` | uuid | 08be0480-70a5-4e3d-9c22-e4f789a90d7b |
| `content` | text | hi |
| `is_read` | boolean | false |
| `metadata` | jsonb | {}... |
| `created_at` | timestamp | 2026-02-16T06:31:10.186883+00:00 |
| `updated_at` | timestamp | 2026-02-16T06:31:10.186883+00:00 |

**Sample Data:**

```json
[
  {
    "id": "17f4d122-062c-48ca-9cd7-605649e19de8",
    "room_id": "fd7f7597-8dd2-444d-9568-2378769b237f",
    "sender_id": "08be0480-70a5-4e3d-9c22-e4f789a90d7b",
    "content": "hi",
    "is_read": false,
    "metadata": {},
    "created_at": "2026-02-16T06:31:10.186883+00:00",
    "updated_at": "2026-02-16T06:31:10.186883+00:00"
  },
  {
    "id": "d12b5e35-c09b-45de-913f-427d4c9d045b",
    "room_id": "fd7f7597-8dd2-444d-9568-2378769b237f",
    "sender_id": "08be0480-70a5-4e3d-9c22-e4f789a90d7b",
    "content": "hiello tgere",
    "is_read": false,
    "metadata": {},
    "created_at": "2026-02-16T06:31:22.653288+00:00",
    "updated_at": "2026-02-16T06:31:22.653288+00:00"
  }
]
```

### chat_participants

**Row Count:** 1

**Columns:** 4

| Column | Inferred Type | Sample Value |
|--------|---------------|---------------|
| `room_id` | uuid | fd7f7597-8dd2-444d-9568-2378769b237f |
| `user_id` | uuid | 08be0480-70a5-4e3d-9c22-e4f789a90d7b |
| `joined_at` | timestamp | 2026-02-16T06:25:33.641463+00:00 |
| `last_read_at` | timestamp | 2026-02-16T06:25:33.641463+00:00 |

**Sample Data:**

```json
[
  {
    "room_id": "fd7f7597-8dd2-444d-9568-2378769b237f",
    "user_id": "08be0480-70a5-4e3d-9c22-e4f789a90d7b",
    "joined_at": "2026-02-16T06:25:33.641463+00:00",
    "last_read_at": "2026-02-16T06:25:33.641463+00:00"
  }
]
```

### chat_rooms

**Row Count:** 3

**Columns:** 8

| Column | Inferred Type | Sample Value |
|--------|---------------|---------------|
| `id` | uuid | e1cfbcff-05c0-44dd-96e0-6d77b1256c85 |
| `created_at` | timestamp | 2026-02-16T06:15:35.905692+00:00 |
| `updated_at` | timestamp | 2026-02-16T06:15:35.905692+00:00 |
| `last_message_at` | timestamp | 2026-02-16T06:15:35.905692+00:00 |
| `type` | text | private |
| `name` | unknown | null... |
| `metadata` | jsonb | {}... |
| `course_id` | unknown | null... |

**Sample Data:**

```json
[
  {
    "id": "e1cfbcff-05c0-44dd-96e0-6d77b1256c85",
    "created_at": "2026-02-16T06:15:35.905692+00:00",
    "updated_at": "2026-02-16T06:15:35.905692+00:00",
    "last_message_at": "2026-02-16T06:15:35.905692+00:00",
    "type": "private",
    "name": null,
    "metadata": {},
    "course_id": null
  },
  {
    "id": "b8c87284-64ad-46b1-b1c0-8fc8ad3447c7",
    "created_at": "2026-02-16T06:15:51.688936+00:00",
    "updated_at": "2026-02-16T06:15:51.688936+00:00",
    "last_message_at": "2026-02-16T06:15:51.688936+00:00",
    "type": "private",
    "name": null,
    "metadata": {},
    "course_id": null
  },
  {
    "id": "fd7f7597-8dd2-444d-9568-2378769b237f",
    "created_at": "2026-02-16T06:25:33.641463+00:00",
    "updated_at": "2026-02-16T06:25:33.641463+00:00",
    "last_message_at": "2026-02-16T06:25:33.641463+00:00",
    "type": "private",
    "name": null,
    "metadata": {},
    "course_id": "aaeab187-d0f6-4f59-a3e9-7da77f5fdcd5"
  }
]
```

### course_enrollments

**Row Count:** 13

**Columns:** 11

| Column | Inferred Type | Sample Value |
|--------|---------------|---------------|
| `id` | uuid | c9b000fd-4ec9-4281-ae0b-1171c6684559 |
| `user_id` | uuid | 3dfa9762-add8-4cfa-9967-fb95042ff503 |
| `course_id` | uuid | 40f2a65d-b865-42b6-8132-6c24563f8cec |
| `enrolled_at` | timestamp | 2025-10-06T04:49:32.920264+00:00 |
| `status` | text | active |
| `progress_percentage` | integer | 0 |
| `completed_at` | unknown | null... |
| `certificate_issued` | boolean | false |
| `last_accessed_at` | timestamp | 2025-10-06T04:49:32.920264+00:00 |
| `created_at` | timestamp | 2025-10-06T04:49:32.920264+00:00 |
| `updated_at` | timestamp | 2026-02-11T19:03:18.641978+00:00 |

### course_modules

**Row Count:** 30

**Columns:** 6

| Column | Inferred Type | Sample Value |
|--------|---------------|---------------|
| `id` | uuid | 0309d95d-267e-4d63-9fab-8968fa6a30d2 |
| `course_id` | uuid | 954c8f5d-181c-4728-9c29-5e5130a57e7d |
| `module_id` | uuid | 2fc5f6be-0603-449b-afc2-22c890e4d3b4 |
| `order_index` | integer | 0 |
| `is_required` | boolean | true |
| `created_at` | timestamp | 2025-10-06T04:28:59.675037+00:00 |

### courses

**Row Count:** 22

**Columns:** 18

| Column | Inferred Type | Sample Value |
|--------|---------------|---------------|
| `id` | uuid | 7efb30c9-d970-4dd0-9714-856f05e85140 |
| `title` | text | SQL Database Mastery |
| `description` | text | Learn SQL from basics to advanced queries, data... |
| `overview` | unknown | null... |
| `category_id` | uuid | 378424a5-16f7-427d-ae5b-c5c6acb630aa |
| `difficulty_level` | text | beginner |
| `estimated_duration_hours` | integer | 45 |
| `prerequisites` | unknown | null... |
| `learning_outcomes` | unknown | null... |
| `author_id` | uuid | 3dfa9762-add8-4cfa-9967-fb95042ff503 |
| `status` | text | published |
| `review_status` | text | draft |
| `published_at` | timestamp | 2025-10-06T04:29:08.401+00:00 |
| `featured` | boolean | false |
| `enrollment_count` | integer | 0 |
| `view_count` | integer | 0 |
| `created_at` | timestamp | 2025-10-06T04:29:08.618015+00:00 |
| `updated_at` | timestamp | 2025-10-06T04:29:08.618015+00:00 |

### learning_modules

**Row Count:** 32

**Columns:** 18

| Column | Inferred Type | Sample Value |
|--------|---------------|---------------|
| `id` | uuid | 2fc5f6be-0603-449b-afc2-22c890e4d3b4 |
| `title` | text | HTML Fundamentals |
| `description` | text | Master the building blocks of the web |
| `content` | text | # HTML Fundamentals

Welcome to the first modul... |
| `category_id` | uuid | 22ec7303-e83c-477d-921e-d2995f1553a9 |
| `difficulty_level` | text | beginner |
| `estimated_duration_minutes` | integer | 60 |
| `learning_objectives` | unknown | null... |
| `keywords` | unknown | null... |
| `author_id` | uuid | 3dfa9762-add8-4cfa-9967-fb95042ff503 |
| `status` | text | published |
| `published_at` | timestamp | 2025-10-06T04:28:59.1+00:00 |
| `featured` | boolean | false |
| `view_count` | integer | 0 |
| `created_at` | timestamp | 2025-10-06T04:28:59.314005+00:00 |
| `updated_at` | timestamp | 2025-10-06T04:28:59.314005+00:00 |
| `media_url` | unknown | null... |
| `media_type` | unknown | null... |

### module_categories

**Row Count:** 16

**Columns:** 8

| Column | Inferred Type | Sample Value |
|--------|---------------|---------------|
| `id` | uuid | 8d57a6a7-7c5a-47a8-80e7-cbdb1e0a2d7a |
| `name` | text | Green Economy Fundamentals |
| `description` | text | Core concepts of sustainable business and envir... |
| `color` | text | #10B981 |
| `icon` | text | 🌱 |
| `display_order` | integer | 1 |
| `created_at` | timestamp | 2025-09-25T10:57:21.985566+00:00 |
| `updated_at` | timestamp | 2025-09-25T10:57:21.985566+00:00 |

### notifications

**Row Count:** 0

**Columns:** 0

### profiles

**Row Count:** 20

**Columns:** 18

| Column | Inferred Type | Sample Value |
|--------|---------------|---------------|
| `id` | uuid | 3dfa9762-add8-4cfa-9967-fb95042ff503 |
| `email` | text | libanjoe7@gmail.com |
| `full_name` | text | Joe  Liban |
| `role` | text | admin |
| `created_at` | timestamp | 2025-09-05T00:15:53.837742+00:00 |
| `updated_at` | timestamp | 2025-09-05T00:17:20.866733+00:00 |
| `first_name` | text | Joe  |
| `last_name` | text | Liban |
| `status` | text | active |
| `last_login_at` | unknown | null... |
| `login_count` | integer | 0 |
| `banned_at` | unknown | null... |
| `banned_by` | unknown | null... |
| `ban_reason` | unknown | null... |
| `deactivated_at` | unknown | null... |
| `deactivated_by` | unknown | null... |
| `total_xp` | integer | 0 |
| `level` | integer | 1 |

### quiz_answers

**Row Count:** 0

**Columns:** 0

### quiz_attempts

**Row Count:** 1

**Columns:** 12

| Column | Inferred Type | Sample Value |
|--------|---------------|---------------|
| `id` | uuid | 88eb6ce3-35c6-4b79-8ead-6db74773baca |
| `quiz_id` | uuid | 68d9cc58-c40a-4370-9d0f-41fd8e2a5a39 |
| `user_id` | uuid | 08be0480-70a5-4e3d-9c22-e4f789a90d7b |
| `score` | integer | 0 |
| `points_earned` | integer | 0 |
| `total_points` | integer | 20 |
| `time_spent_seconds` | integer | 25 |
| `status` | text | completed |
| `passed` | boolean | false |
| `started_at` | timestamp | 2026-02-13T15:19:12.437+00:00 |
| `completed_at` | timestamp | 2026-02-13T15:19:37.903+00:00 |
| `created_at` | timestamp | 2026-02-13T15:19:13.799199+00:00 |

**Sample Data:**

```json
[
  {
    "id": "88eb6ce3-35c6-4b79-8ead-6db74773baca",
    "quiz_id": "68d9cc58-c40a-4370-9d0f-41fd8e2a5a39",
    "user_id": "08be0480-70a5-4e3d-9c22-e4f789a90d7b",
    "score": 0,
    "points_earned": 0,
    "total_points": 20,
    "time_spent_seconds": 25,
    "status": "completed",
    "passed": false,
    "started_at": "2026-02-13T15:19:12.437+00:00",
    "completed_at": "2026-02-13T15:19:37.903+00:00",
    "created_at": "2026-02-13T15:19:13.799199+00:00"
  }
]
```

### quiz_questions

**Row Count:** 6

**Columns:** 9

| Column | Inferred Type | Sample Value |
|--------|---------------|---------------|
| `id` | uuid | 733b38b1-bea3-49ed-aab7-7532bd8fa344 |
| `quiz_id` | uuid | 37957b8e-c33c-4b23-946a-aef5c8cbfba6 |
| `question_text` | text | What does HTML stand for? |
| `question_type` | text | multiple_choice |
| `points` | integer | 10 |
| `order_index` | integer | 1 |
| `explanation` | text | HTML stands for HyperText Markup Language. |
| `created_at` | timestamp | 2026-02-13T15:16:59.306707+00:00 |
| `updated_at` | timestamp | 2026-02-13T15:16:59.306707+00:00 |

### quizzes

**Row Count:** 3

**Columns:** 12

| Column | Inferred Type | Sample Value |
|--------|---------------|---------------|
| `id` | uuid | 37957b8e-c33c-4b23-946a-aef5c8cbfba6 |
| `module_id` | uuid | 2fc5f6be-0603-449b-afc2-22c890e4d3b4 |
| `title` | text | HTML Fundamentals Quiz |
| `description` | text | Test your HTML knowledge |
| `passing_score` | integer | 70 |
| `time_limit_minutes` | integer | 15 |
| `max_attempts` | integer | 3 |
| `show_correct_answers` | boolean | true |
| `randomize_questions` | boolean | false |
| `is_required` | boolean | true |
| `created_at` | timestamp | 2026-02-13T15:16:59.306707+00:00 |
| `updated_at` | timestamp | 2026-02-13T15:16:59.306707+00:00 |

**Sample Data:**

```json
[
  {
    "id": "37957b8e-c33c-4b23-946a-aef5c8cbfba6",
    "module_id": "2fc5f6be-0603-449b-afc2-22c890e4d3b4",
    "title": "HTML Fundamentals Quiz",
    "description": "Test your HTML knowledge",
    "passing_score": 70,
    "time_limit_minutes": 15,
    "max_attempts": 3,
    "show_correct_answers": true,
    "randomize_questions": false,
    "is_required": true,
    "created_at": "2026-02-13T15:16:59.306707+00:00",
    "updated_at": "2026-02-13T15:16:59.306707+00:00"
  },
  {
    "id": "9b4d603b-a80d-47cc-9a00-62f96cef3779",
    "module_id": "742d48c0-fbe6-4345-adfd-ee6ab899a01b",
    "title": "CSS Styling Quiz",
    "description": "Test your CSS knowledge",
    "passing_score": 70,
    "time_limit_minutes": 15,
    "max_attempts": 3,
    "show_correct_answers": true,
    "randomize_questions": false,
    "is_required": true,
    "created_at": "2026-02-13T15:16:59.306707+00:00",
    "updated_at": "2026-02-13T15:16:59.306707+00:00"
  },
  {
    "id": "68d9cc58-c40a-4370-9d0f-41fd8e2a5a39",
    "module_id": "301e2044-2cf5-47f1-a652-df524daa68e2",
    "title": "Docker Fundamentals Quiz",
    "description": "Test your Docker knowledge",
    "passing_score": 70,
    "time_limit_minutes": 15,
    "max_attempts": 3,
    "show_correct_answers": true,
    "randomize_questions": false,
    "is_required": true,
    "created_at": "2026-02-13T15:16:59.306707+00:00",
    "updated_at": "2026-02-13T15:16:59.306707+00:00"
  }
]
```

### user_achievements

**Row Count:** 0

**Columns:** 0

### user_badges

**Row Count:** 6

**Columns:** 4

| Column | Inferred Type | Sample Value |
|--------|---------------|---------------|
| `id` | uuid | d77cfa1b-0355-4ace-a353-9459c9af7585 |
| `user_id` | uuid | 08be0480-70a5-4e3d-9c22-e4f789a90d7b |
| `badge_id` | uuid | 516a86f7-7798-44e7-98ef-a0dc89bed151 |
| `earned_at` | timestamp | 2026-02-13T08:00:04.287003 |

### user_progress

**Row Count:** 12

**Columns:** 14

| Column | Inferred Type | Sample Value |
|--------|---------------|---------------|
| `id` | uuid | 9aa31060-09d4-4b9b-b6fb-078186d67edb |
| `user_id` | uuid | 3dfa9762-add8-4cfa-9967-fb95042ff503 |
| `module_id` | uuid | 5fb2cd5f-97ea-4fa9-930e-0b5fe7c8fec7 |
| `status` | text | completed |
| `progress_percentage` | integer | 100 |
| `time_spent_minutes` | integer | 0 |
| `started_at` | unknown | null... |
| `completed_at` | timestamp | 2026-02-11T19:02:43.689+00:00 |
| `last_accessed_at` | timestamp | 2026-02-11T19:02:44.465216+00:00 |
| `notes` | unknown | null... |
| `created_at` | timestamp | 2026-02-11T19:02:44.465216+00:00 |
| `updated_at` | timestamp | 2026-02-11T19:02:44.465216+00:00 |
| `course_id` | unknown | null... |
| `xp_earned` | integer | 0 |

### user_streaks

**Row Count:** 0

**Columns:** 0

### xp_transactions

**Row Count:** 0

**Columns:** 0

## Inferred Relationships

> **Note:** These relationships are inferred from column naming conventions. Actual foreign key constraints may differ.

| From Table | From Column | To Table | To Column |
|------------|-------------|----------|------------|
| chat_rooms | course_id | courses | id |
| course_enrollments | course_id | courses | id |
| course_modules | course_id | courses | id |
| user_badges | badge_id | badges | id |
| user_progress | course_id | courses | id |

## Additional Notes

### RLS Policies

Row Level Security (RLS) policies are enabled on this database. To view specific policies, please check the Supabase Dashboard under Authentication > Policies.

### Functions & Triggers

Custom PostgreSQL functions and triggers may be present. Check the Supabase Dashboard under Database > Functions for details.

