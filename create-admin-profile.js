const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminProfile() {
  const userId = '7f732087-672f-49f0-ac48-2214cd8b890b';
  const email = 'libanjoe7@gmail.com';
  
  console.log('🔍 Creating admin profile for user:', userId);
  
  // Check if profile already exists
  const { data: existingProfile, error: checkError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (existingProfile) {
    console.log('✅ Profile already exists:', existingProfile);
    
    // Update to admin if needed
    if (existingProfile.role !== 'admin') {
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', userId)
        .select()
        .single();
        
      if (updateError) {
        console.error('❌ Error updating profile role:', updateError);
      } else {
        console.log('✅ Profile updated to admin:', updatedProfile);
      }
    }
    return;
  }
  
  // Create new profile
  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email: email,
      role: 'admin',
      full_name: 'Admin User',
      first_name: 'Admin',
      last_name: 'User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
    
  if (insertError) {
    console.error('❌ Error creating profile:', insertError);
  } else {
    console.log('✅ Admin profile created successfully:', newProfile);
  }
}

createAdminProfile().catch(console.error);