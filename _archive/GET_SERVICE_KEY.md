# Get Your Supabase Service Role Key

To upload the mock courses, you need your Supabase service role key.

## Steps:

1. Go to: https://supabase.com/dashboard/project/jdncfyagppohtksogzkx/settings/api

2. Scroll down to "Project API keys"

3. Copy the **`service_role`** key (NOT the anon key!)
   - It should start with `eyJhbGci...`
   - This key bypasses Row Level Security (needed for seeding)

4. Open `.env.local` file in this project

5. Replace `your_service_role_key_here` with your actual service role key:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (your actual key)
   ```

6. Run the seeding script:
   ```bash
   npm run seed
   ```

⚠️ **IMPORTANT**: Keep this key secret! Never commit it to git or expose it to the client.
