
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testConnection() {
  console.log('📡 Testing Supabase connection...');
  console.log(`URL: ${supabaseUrl}`);

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing credentials in .env.local');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🔄 Attempting to fetch profiles count...');
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Supabase error:', error.message);
      console.error('Details:', error);
    } else {
      console.log('✅ Connection successful!');
      console.log(`📊 Number of profiles found: ${count}`);
    }

    console.log('🔄 Attempting to fetch courses count...');
    const { count: courseCount, error: courseError } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true });

    if (courseError) {
      console.error('❌ Courses fetch failed:', courseError.message);
    } else {
      console.log(`✅ Courses found: ${courseCount}`);
    }

  } catch (err: any) {
    console.error('❌ Unexpected error:', err.message);
  }
}

testConnection();
