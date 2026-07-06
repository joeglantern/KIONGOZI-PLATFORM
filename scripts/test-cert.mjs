import { serviceClient as supabase } from './_supabase.mjs';

async function main() {
    const { data: cert } = await supabase
        .from("user_certificates")
        .select('*')
        .limit(1);

    if (cert && cert.length > 0) {
        Object.keys(cert[0]).forEach(k => console.log('COL: ' + k));
    }
}

main().catch(console.error);
