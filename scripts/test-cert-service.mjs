import { serviceClient as supabase } from './_supabase.mjs';

async function main() {
    const code = '7udrau4vo7nggrv12si0j';
    const { data, error } = await supabase
        .from("user_certificates")
        .select(`*`)
        .eq("verification_code", code);

    console.log("Error selecting just cert:", error ? error.message : "None");

    if (!error) {
        const { error: error2 } = await supabase
            .from("user_certificates")
            .select(`
              *,
              profiles:user_id (full_name, avatar_url),
              courses:course_id (title, description, thumbnail_url)
            `)
            .eq("verification_code", code);
        console.log("Error with joins:", error2 ? error2.message : "None");
    }
}
main();
