import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { eetCourseData } from './eet_course_data.js';

// Load environment variables correctly
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase environment variables. Please ensure .env.local is correctly configured.');
    process.exit(1);
}

// We use the service role key to insert data bypassing RLS if possible, but anon key will work if policies allow it 
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

async function findOrCreateCategory(categoryName: string): Promise<string> {
    // First look for category
    const { data: categories, error } = await supabase
        .from('module_categories')
        .select('id')
        .ilike('name', `%${categoryName}%`)
        .limit(1);

    if (error) {
        throw new Error(`Error fetching category: ${error.message}`);
    }

    if (categories && categories.length > 0) {
        return categories[0].id;
    }

    // Create new category
    const { data: newCategory, error: insertError } = await supabase
        .from('module_categories')
        .insert([
            {
                name: categoryName,
                description: 'Category for Entrepreneurship and Business-related modules',
                color: '#f59e0b', // amber-500
                icon: '💼',
                display_order: 10,
            }
        ])
        .select('id')
        .single();

    if (insertError) {
        throw new Error(`Error inserting category: ${insertError.message}`);
    }

    return newCategory.id;
}

// Ensure you replace this with an actual valid author ID from your DB, or we can fetch the first admin user
async function getAuthorId(): Promise<string> {
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1);

    if (error || !profiles || profiles.length === 0) {
        // use anonymous context if no author found, though the RLS might require one
        throw new Error('Could not find an admin author to assign the course to.');
    }

    return profiles[0].id;
}

async function uploadCourse() {
    console.log(`Starting upload for course: ${eetCourseData.title}`);

    try {
        const categoryId = await findOrCreateCategory(eetCourseData.category_name);
        console.log(`Found/Created Category ID: ${categoryId}`);

        const authorId = await getAuthorId();
        console.log(`Assigning Course to Author ID: ${authorId}`);

        // Insert Course
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .insert([
                {
                    title: eetCourseData.title,
                    description: eetCourseData.description,
                    category_id: categoryId,
                    difficulty_level: eetCourseData.difficulty_level,
                    estimated_duration_hours: eetCourseData.estimated_duration_hours,
                    author_id: authorId,
                    status: 'published'
                }
            ])
            .select('id')
            .single();

        if (courseError) throw new Error(`Error inserting course: ${courseError.message}`);
        const courseId = course.id;
        console.log(`Inserted Course. ID: ${courseId}`);

        // Insert Modules sequentially
        let orderIndex = 0;
        for (const moduleData of eetCourseData.modules) {
            console.log(`Inserting Module: ${moduleData.title}...`);

            const { data: moduleRecord, error: moduleError } = await supabase
                .from('learning_modules')
                .insert([
                    {
                        title: moduleData.title,
                        description: moduleData.description,
                        content: moduleData.content,
                        category_id: categoryId,
                        difficulty_level: eetCourseData.difficulty_level,
                        estimated_duration_minutes: moduleData.estimated_duration_minutes,
                        author_id: authorId,
                        status: 'published'
                    }
                ])
                .select('id')
                .single();

            if (moduleError) throw new Error(`Error inserting learning_module: ${moduleError.message}`);
            const moduleId = moduleRecord.id;

            // Link Module to Course
            const { error: linkError } = await supabase
                .from('course_modules')
                .insert([
                    {
                        course_id: courseId,
                        module_id: moduleId,
                        order_index: orderIndex++,
                        is_required: true,
                    }
                ]);

            if (linkError) throw new Error(`Error linking module to course: ${linkError.message}`);
            console.log(`  -> Successfully linked module ${moduleId} to course ${courseId}`);

            // We are skipping quizzes for now as the prompt doc does not explicitly contain quiz QA pairs. 
            // If there were quizzes, we would insert them here similar to the flow above.
        }

        console.log('Course upload completed successfully!');
    } catch (error) {
        console.error('Failed to upload course:', error);
    }
}

uploadCourse();
