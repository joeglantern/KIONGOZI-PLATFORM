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

async function addTranscripts() {
    console.log('Fetching all video modules...');
    const { data: modules, error } = await supabase
        .from('learning_modules')
        .select('id, title, media_type')
        .eq('media_type', 'video');

    if (error) {
        console.error('Error fetching modules:', error);
        return;
    }

    console.log(`Found ${modules.length} video modules. Generating placeholder transcripts...`);

    let updatedCount = 0;
    for (const module of modules) {
        // Generate a contextual dummy markdown transcript
        const script = `
**[00:00:00] Speaker 1:**  
Welcome to this lesson on **${module.title}**.

**[00:00:15] Speaker 1:**  
In this video, we're going to dive deep into the core concepts surrounding this topic. As you progress, be sure to take notes in the viewer below. 

**[00:00:45] Speaker 1:**  
The most fundamental principle we need to look at here is how this theory applies to actual, real-world scenarios. We've seen this play out time and time again in modern applications.

**[00:01:30] Speaker 1:**  
That wraps up our core discussion. Be sure to review the reading materials and proceed to the quiz when you're ready. Thank you for watching!
`.trim();

        const { error: updateError } = await supabase
            .from('learning_modules')
            .update({ transcription: script })
            .eq('id', module.id);

        if (updateError) {
            console.error(`Error updating module ${module.id}:`, updateError);
        } else {
            updatedCount++;
        }
    }

    console.log(`Successfully added transcripts to ${updatedCount} modules!`);
}

addTranscripts();
