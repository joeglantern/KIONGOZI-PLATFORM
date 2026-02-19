
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase configuration missing in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthFlow() {
    const testEmail = `test_${Math.floor(Math.random() * 100000)}@test.com`;
    const testPassword = 'Password123!';

    console.log(`🚀 Starting auth flow test for: ${testEmail}`);
    console.log(`🔗 Supabase URL: ${supabaseUrl}`);

    // 1. Test Signup
    console.log('📝 Testing Signup...');
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
            data: {
                full_name: 'Antigravity Test User',
            }
        }
    });

    if (signupError) {
        console.error('❌ Signup failed:', signupError.message);
        return;
    }
    console.log('✅ Signup successful! User ID:', signupData.user?.id);

    // 2. Test Login
    console.log('🔑 Testing Login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
    });

    if (loginError) {
        console.error('❌ Login failed:', loginError.message);
        return;
    }
    console.log('✅ Login successful! Session created.');

    // 3. Test Profile Creation (if applicable)
    console.log('👤 Checking if profile was created...');
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', loginData.user?.id)
        .single();

    if (profileError) {
        console.warn('⚠️ Profile fetch issue (may need RLS or trigger):', profileError.message);
    } else {
        console.log('✅ Profile found in database:', profileData.full_name);
    }

    // 4. Cleanup (Delete the test user using service role key if available, otherwise just log it)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
        console.log('🧹 Cleaning up test user...');
        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        const { error: deleteError } = await adminClient.auth.admin.deleteUser(signupData.user!.id);
        if (deleteError) {
            console.error('❌ Cleanup failed:', deleteError.message);
        } else {
            console.log('✅ Test user deleted successfully.');
        }
    } else {
        console.log('ℹ️ Service role key not found, skipping cleanup. User will remain in Supabase.');
    }

    console.log('🎉 Auth flow test completed successfully!');
}

testAuthFlow().catch(console.error);
