import { serviceClient as supabase } from './_supabase.mjs';

async function main() {
    const { data: cols } = await supabase
        .from("information_schema.key_column_usage")
        .select('*')
        .eq('table_schema', 'public')
        .eq('table_name', 'user_progress')
        .eq('column_name', 'course_id');

    console.log("Cols:", cols);
}

main().catch(console.error);
