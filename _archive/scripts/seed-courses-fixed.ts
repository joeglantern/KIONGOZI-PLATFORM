import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const mockCourses = [
  {
    title: "Introduction to Web Development",
    description: "Learn the fundamentals of web development including HTML, CSS, and JavaScript. Build real-world projects and gain hands-on experience.",
    category: "Web Development",
    difficulty: "beginner",
    estimated_hours: 40,
    modules: [
      {
        title: "HTML Fundamentals",
        description: "Master the building blocks of the web",
        content: `# HTML Fundamentals

Welcome to the first module! In this lesson, you'll learn the foundation of all web pages: HTML.

## What is HTML?

HTML (HyperText Markup Language) is the standard markup language for creating web pages.

## Basic Structure

\`\`\`html
<!DOCTYPE html>
<html>
  <head>
    <title>My First Page</title>
  </head>
  <body>
    <h1>Hello World!</h1>
  </body>
</html>
\`\`\`

## Practice Exercise

Create a simple HTML page with a heading, paragraph, list, and image.`
      },
      {
        title: "CSS Styling Basics",
        description: "Style your web pages with CSS",
        content: `# CSS Styling Basics

Make your pages beautiful with CSS!

## What is CSS?

CSS controls colors, fonts, spacing, and positioning.

## Selectors

\`\`\`css
p {
  color: blue;
}

.highlight {
  background-color: yellow;
}
\`\`\``
      }
    ]
  },
  {
    title: "Full Stack JavaScript",
    description: "Master both frontend and backend development with JavaScript. Learn Node.js, Express, React, and MongoDB.",
    category: "Web Development",
    difficulty: "intermediate",
    estimated_hours: 80,
    modules: [
      {
        title: "Node.js Fundamentals",
        description: "Learn server-side JavaScript",
        content: `# Node.js Fundamentals

Backend development with Node.js!

## Your First Server

\`\`\`javascript
const http = require('http');
const server = http.createServer((req, res) => {
  res.end('Hello from Node.js!');
});
server.listen(3000);
\`\`\``
      }
    ]
  },
  {
    title: "Python for Beginners",
    description: "Start your programming journey with Python. Learn syntax, data structures, and problem-solving.",
    category: "Programming",
    difficulty: "beginner",
    estimated_hours: 35,
    modules: [
      {
        title: "Python Basics",
        description: "Variables, data types, and operators",
        content: `# Python Basics

Welcome to Python!

\`\`\`python
print("Hello, World!")
name = "Alice"
age = 25
\`\`\``
      }
    ]
  },
  {
    title: "Data Structures and Algorithms",
    description: "Master essential data structures and algorithms for technical interviews.",
    category: "Programming",
    difficulty: "intermediate",
    estimated_hours: 60,
    modules: [
      {
        title: "Arrays and Linked Lists",
        description: "Fundamental linear data structures",
        content: `# Arrays and Linked Lists

Understanding the foundation!

## Arrays

Arrays store elements in contiguous memory.

## Linked Lists

Nodes with pointers.`
      }
    ]
  },
  {
    title: "React - The Complete Guide",
    description: "Master React from basics to advanced topics including hooks, context, and performance optimization.",
    category: "Web Development",
    difficulty: "intermediate",
    estimated_hours: 70,
    modules: [
      {
        title: "React Fundamentals",
        description: "Components, props, and JSX",
        content: `# React Fundamentals

Build modern UIs!

\`\`\`jsx
function Welcome({ name }) {
  return <h1>Hello, {name}!</h1>;
}
\`\`\``
      }
    ]
  },
  {
    title: "SQL Database Mastery",
    description: "Learn SQL from basics to advanced queries, database design, and optimization.",
    category: "Database",
    difficulty: "beginner",
    estimated_hours: 45,
    modules: [
      {
        title: "SQL Basics",
        description: "SELECT, INSERT, UPDATE, DELETE",
        content: `# SQL Basics

Master databases!

\`\`\`sql
SELECT * FROM users;
INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
\`\`\``
      }
    ]
  },
  {
    title: "Machine Learning Foundations",
    description: "Introduction to machine learning concepts, algorithms, and practical applications using Python.",
    category: "Data Science",
    difficulty: "intermediate",
    estimated_hours: 90,
    modules: [
      {
        title: "Introduction to Machine Learning",
        description: "Core concepts and terminology",
        content: `# Introduction to Machine Learning

Welcome to ML!

## Types

- Supervised Learning
- Unsupervised Learning
- Reinforcement Learning`
      }
    ]
  },
  {
    title: "iOS App Development with Swift",
    description: "Build beautiful iOS apps with SwiftUI and Swift programming language.",
    category: "Mobile Development",
    difficulty: "beginner",
    estimated_hours: 55,
    modules: [
      {
        title: "Swift Programming Basics",
        description: "Learn Swift syntax and fundamentals",
        content: `# Swift Basics

iOS development!

\`\`\`swift
var name = "Alice"
let pi = 3.14159
\`\`\``
      }
    ]
  },
  {
    title: "DevOps and CI/CD",
    description: "Learn modern DevOps practices, Docker, Kubernetes, and continuous integration/deployment.",
    category: "DevOps",
    difficulty: "advanced",
    estimated_hours: 75,
    modules: [
      {
        title: "Docker Fundamentals",
        description: "Containerization with Docker",
        content: `# Docker Fundamentals

Master containers!

\`\`\`dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
\`\`\``
      }
    ]
  },
  {
    title: "Cybersecurity Essentials",
    description: "Learn fundamental cybersecurity concepts, threats, and defensive strategies.",
    category: "Security",
    difficulty: "beginner",
    estimated_hours: 50,
    modules: [
      {
        title: "Security Fundamentals",
        description: "Core security concepts and principles",
        content: `# Security Fundamentals

Understand cybersecurity!

## CIA Triad

- Confidentiality
- Integrity
- Availability`
      }
    ]
  }
];

async function seedCourses() {
  console.log('🌱 Starting course seeding...');

  try {
    // Get admin user
    const { data: adminUser } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    if (!adminUser) {
      console.error('❌ No user found! Please create a user first.');
      return;
    }

    console.log(`✅ Using user ID: ${adminUser.id}`);

    // Create categories
    const categories = [...new Set(mockCourses.map(c => c.category))];
    console.log(`\n📚 Creating ${categories.length} categories...`);

    for (const categoryName of categories) {
      const { error } = await supabase
        .from('module_categories')
        .upsert({
          name: categoryName,
          description: `Courses related to ${categoryName}`,
          color: '#10B981',
          icon: '📚'
        }, {
          onConflict: 'name'
        });

      if (error && error.code !== '23505') { // Ignore duplicate errors
        console.error(`Error creating category ${categoryName}:`, error);
      } else {
        console.log(`✅ Category: ${categoryName}`);
      }
    }

    // Create courses
    console.log(`\n📖 Creating ${mockCourses.length} courses...\n`);

    for (const courseData of mockCourses) {
      // Get category
      const { data: category } = await supabase
        .from('module_categories')
        .select('id')
        .eq('name', courseData.category)
        .single();

      if (!category) {
        console.error(`❌ Category not found: ${courseData.category}`);
        continue;
      }

      // Check if course exists
      const { data: existingCourse } = await supabase
        .from('courses')
        .select('id')
        .eq('title', courseData.title)
        .single();

      let course;
      if (existingCourse) {
        course = existingCourse;
        console.log(`⏭️  Course exists: ${courseData.title}`);
      } else {
        const { data: newCourse, error: courseError } = await supabase
          .from('courses')
          .insert({
            title: courseData.title,
            description: courseData.description,
            category_id: category.id,
            difficulty_level: courseData.difficulty,
            estimated_duration_hours: courseData.estimated_hours,
            author_id: adminUser.id,
            status: 'published',
            published_at: new Date().toISOString()
          })
          .select()
          .single();

        if (courseError) {
          console.error(`❌ Error creating course ${courseData.title}:`, courseError.message);
          continue;
        }
        course = newCourse;
        console.log(`✅ Created: ${courseData.title}`);
      }

      // Create modules
      for (let i = 0; i < courseData.modules.length; i++) {
        const moduleData = courseData.modules[i];

        // Check if module exists
        const { data: existingModule } = await supabase
          .from('learning_modules')
          .select('id')
          .eq('title', moduleData.title)
          .single();

        let learningModule;
        if (existingModule) {
          learningModule = existingModule;
        } else {
          const { data: newModule, error: moduleError } = await supabase
            .from('learning_modules')
            .insert({
              title: moduleData.title,
              description: moduleData.description,
              content: moduleData.content,
              category_id: category.id,
              difficulty_level: courseData.difficulty,
              estimated_duration_minutes: 60,
              author_id: adminUser.id,
              status: 'published',
              published_at: new Date().toISOString()
            })
            .select()
            .single();

          if (moduleError) {
            console.error(`  ❌ Error creating module ${moduleData.title}:`, moduleError.message);
            continue;
          }
          learningModule = newModule;
        }

        // Link module to course
        const { error: linkError } = await supabase
          .from('course_modules')
          .upsert({
            course_id: course.id,
            module_id: learningModule.id,
            order_index: i,
            is_required: true
          }, {
            onConflict: 'course_id,module_id'
          });

        if (linkError && linkError.code !== '23505') {
          console.error(`  ❌ Error linking module:`, linkError.message);
        } else {
          console.log(`  ✓ Module: ${moduleData.title}`);
        }
      }
    }

    console.log('\n🎉 Seeding completed successfully!');
  } catch (error: any) {
    console.error('❌ Seeding failed:', error.message);
  }
}

seedCourses();
