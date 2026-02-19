const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://jdncfyagppohtksogzkx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY4ODc3OCwiZXhwIjoyMDcwMjY0Nzc4fQ.phxQZrQylHDae8rBqDzcyrFda0BTtj6rI_KwKrejnpY';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runLeaderboardFix() {
  console.log('🚀 Running Ultimate Leaderboard Fix...\n');

  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync(
      path.join(__dirname, 'ULTIMATE-LEADERBOARD-FIX.sql'),
      'utf8'
    );

    // Split into individual statements (rough split, may need adjustment)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // Skip comments and empty statements
      if (!stmt || stmt.startsWith('--') || stmt.length < 5) {
        continue;
      }

      console.log(`⚡ Executing statement ${i + 1}...`);

      const { data, error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' });

      if (error) {
        // Try alternative approach - direct query
        const { data: data2, error: error2 } = await supabase
          .from('_sql')
          .select('*')
          .sql(stmt + ';');

        if (error2) {
          console.error(`❌ Error on statement ${i + 1}:`, error2.message);
          console.error('Statement:', stmt.substring(0, 200) + '...');
        } else {
          console.log(`✅ Success`);
          if (data2) console.log('Result:', data2);
        }
      } else {
        console.log(`✅ Success`);
        if (data) console.log('Result:', data);
      }
    }

    console.log('\n🎉 Script execution completed!');
    console.log('\nNow testing the functions...\n');

    // Test get_top_learners
    const { data: topLearners, error: topError } = await supabase
      .rpc('get_top_learners', { limit_count: 10 });

    if (topError) {
      console.error('❌ Error calling get_top_learners:', topError);
    } else {
      console.log('✅ Top Learners:');
      console.table(topLearners);
    }

  } catch (err) {
    console.error('❌ Fatal error:', err);
  }
}

runLeaderboardFix();
