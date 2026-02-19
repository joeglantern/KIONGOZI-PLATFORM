const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const mockCourses = [
  {
    title: "Introduction to Green Energy",
    description: "Learn about renewable energy sources, sustainability practices, and how to contribute to a greener future.",
    category: "Green Skills",
    difficulty: "beginner",
    estimated_hours: 25,
  },
  {
    title: "Sustainable Agriculture Practices",
    description: "Master modern sustainable farming techniques, organic practices, and climate-smart agriculture.",
    category: "Green Skills",
    difficulty: "intermediate",
    estimated_hours: 40,
  },
  {
    title: "Digital Marketing Fundamentals",
    description: "Learn SEO, social media marketing, content creation, and digital advertising strategies.",
    category: "Digital Skills",
    difficulty: "beginner",
    estimated_hours: 30,
  },
  {
    title: "Web Development Bootcamp",
    description: "Build modern websites and web applications using HTML, CSS, JavaScript, and React.",
    category: "Digital Skills",
    difficulty: "intermediate",
    estimated_hours: 60,
  },
  {
    title: "Leadership and Team Management",
    description: "Develop essential leadership skills, learn team dynamics, and effective management strategies.",
    category: "Leadership",
    difficulty: "intermediate",
    estimated_hours: 35,
  },
  {
    title: "Entrepreneurship Essentials",
    description: "Learn how to start and grow a successful business, from ideation to execution.",
    category: "Business",
    difficulty: "beginner",
    estimated_hours: 45,
  },
  {
    title: "Climate Change and Environmental Policy",
    description: "Understand climate science, environmental policies, and strategies for climate action.",
    category: "Green Skills",
    difficulty: "advanced",
    estimated_hours: 50,
  },
  {
    title: "Data Analytics with Python",
    description: "Master data analysis, visualization, and statistical methods using Python and popular libraries.",
    category: "Digital Skills",
    difficulty: "intermediate",
    estimated_hours: 55,
  },
];

async function seedCourses() {
  console.log('🌱 Starting course seeding...\n');

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

    console.log(`✅ Using user ID: ${adminUser.id}\n`);

    // Create categories
    const categories = [...new Set(mockCourses.map(c => c.category))];
    console.log(`📚 Creating ${categories.length} categories...`);

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

      if (error && error.code !== '23505') {
        console.error(`Error creating category ${categoryName}:`, error.message);
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

      if (existingCourse) {
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
        } else {
          console.log(`✅ Created: ${courseData.title}`);
        }
      }
    }

    console.log('\n🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
  }
}

seedCourses();
