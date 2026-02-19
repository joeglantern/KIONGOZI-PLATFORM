
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jdncfyagppohtksogzkx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Must be provided in environment

if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is required');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugCertificates() {
    console.log('🔍 Debugging Certificate Generation...');

    // 1. Check if any certificates exist at all
    const { count: totalCerts, error: certError } = await supabase
        .from('user_certificates')
        .select('*', { count: 'exact', head: true });

    if (certError) {
        console.error('Error fetching certificates:', certError);
    } else {
        console.log(`Total certificates in DB: ${totalCerts}`);
    }

    // 2. Check for completed enrollments without certificates
    const { data: completions, error: compError } = await supabase
        .from('course_enrollments')
        .select('user_id, course_id, progress_percentage, completed_at')
        .eq('progress_percentage', 100);

    if (compError) {
        console.error('Error fetching completions:', compError);
    } else {
        console.log(`Found ${completions?.length || 0} enrollments at 100% progress.`);

        // For each completion, check if a certificate exists
        if (completions && completions.length > 0) {
            for (const comp of completions) {
                const { data: cert } = await supabase
                    .from('user_certificates')
                    .select('id')
                    .eq('user_id', comp.user_id)
                    .eq('course_id', comp.course_id)
                    .single();

                if (!cert) {
                    console.log(`⚠️ Missing certificate for User: ${comp.user_id}, Course: ${comp.course_id}`);
                } else {
                    console.log(`✅ Certificate exists for User: ${comp.user_id}, Course: ${comp.course_id}`);
                }
            }
        }
    }

    // 3. Check for default template
    const { data: template, error: tempError } = await supabase
        .from('certificate_templates')
        .select('id, name, is_default')
        .eq('is_default', true)
        .single();

    if (tempError) {
        console.error('Error fetching default template:', tempError.message);
    } else {
        console.log(`Default template found: ${template.name} (${template.id})`);
    }

    // 4. Check if trigger exists
    const { data: trigger, error: trigError } = await supabase
        .rpc('get_triggers'); // Custom RPC if it exists, otherwise we'll try a raw check if possible

    // If no RPC, we might not be able to easily check triggers via JS client without a custom SQL RPC.
    // But we can infer from the lack of records.
}

debugCertificates();
