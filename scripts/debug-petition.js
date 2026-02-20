const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPetition() {
    const id = '6d56e962-0aff-49e4-89b2-8649b9f03ccb';
    console.log(`Checking petition with ID: ${id}`);

    const { data, error } = await supabase
        .from('social_petitions')
        .select('*')
        .eq('id', id);

    if (error) {
        console.error('Error fetching petition:', error);
    } else {
        console.log('Petition data:', data);
    }
}

checkPetition();
