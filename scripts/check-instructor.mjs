import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', 'ledeve5997@fermiro.com')
  .maybeSingle();

console.log('Profile lookup for ledeve5997@fermiro.com:');
console.log(profile || 'NOT FOUND');

// Also list role distribution
const { data: roles } = await supabase.from('profiles').select('role');
const counts = {};
for (const r of roles) counts[r.role || 'null'] = (counts[r.role || 'null'] || 0) + 1;
console.log('\nRole distribution:', counts);

// Sample instructor profiles if any
const { data: instructors } = await supabase
  .from('profiles')
  .select('id, email, full_name, role')
  .in('role', ['instructor', 'admin', 'educator'])
  .limit(10);
console.log('\nExisting instructors/admins:', instructors);
