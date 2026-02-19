
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jdncfyagppohtksogzkx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTriggerAndFix() {
    console.log('🛠️ Checking Trigger and Fixing Missing Certificates...');

    // 1. Check for the trigger via a custom query (if we had exec_sql, but we don't)
    // Instead, let's assume it's missing or not working for existing records.

    // 2. Perform retroactive generation for 100% progress records
    const { data: completions, error: compError } = await supabase
        .from('course_enrollments')
        .select('user_id, course_id, completed_at, progress_percentage')
        .eq('progress_percentage', 100);

    if (compError) {
        console.error('Error fetching completions:', compError);
        return;
    }

    const { data: template } = await supabase
        .from('certificate_templates')
        .select('id')
        .eq('is_default', true)
        .single();

    if (!template) {
        console.error('No default template found. Cannot generate certificates.');
        return;
    }

    for (const comp of completions) {
        // Check if certificate exists
        const { data: existing } = await supabase
            .from('user_certificates')
            .select('id')
            .eq('user_id', comp.user_id)
            .eq('course_id', comp.course_id)
            .single();

        if (!existing) {
            console.log(`🔨 Generating retroactive certificate for User: ${comp.user_id}, Course: ${comp.course_id}`);

            const year = new Date().getFullYear();
            const random = Math.random().toString(36).substring(2, 8).toUpperCase();
            const certificateNumber = `KIONGOZI-${year}-${random}`;
            const verificationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

            const { data, error } = await supabase
                .from('user_certificates')
                .insert({
                    user_id: comp.user_id,
                    course_id: comp.course_id,
                    template_id: template.id,
                    certificate_number: certificateNumber,
                    verification_code: verificationCode,
                    issued_at: comp.completed_at || new Date().toISOString(),
                    metadata: {
                        auto_generated: true,
                        retroactive: true,
                        completion_percentage: 100
                    }
                });

            if (error) {
                console.error(`❌ Failed to generate: ${error.message}`);
            } else {
                console.log(`✅ Success!`);
            }
        }
    }
}

checkTriggerAndFix();
