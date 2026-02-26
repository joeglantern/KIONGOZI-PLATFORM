import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase environment variables. Please ensure .env.local is correctly configured.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

async function removeImages() {
    console.log('Fetching all learning modules...');
    const { data: modules, error } = await supabase
        .from('learning_modules')
        .select('id, content');

    if (error) {
        console.error('Error fetching modules:', error);
        return;
    }

    console.log(`Found ${modules.length} modules. Removing images from content...`);

    let updatedCount = 0;
    for (const module of modules) {
        if (module.content) {
            // Find markdown images: ![alt](url)
            // replace them with empty string
            const newContent = module.content.replace(/!\[.*?\]\(.*?\)\n*/g, '');
            if (newContent !== module.content) {
                const { error: updateError } = await supabase
                    .from('learning_modules')
                    .update({ content: newContent })
                    .eq('id', module.id);

                if (updateError) {
                    console.error(`Error updating module ${module.id}:`, updateError);
                } else {
                    updatedCount++;
                }
            }
        }
    }

    console.log(`Successfully removed images from ${updatedCount} modules.`);
}

removeImages();
