# Admin Panel Deployment

## Quick Deploy to Netlify

1. **Connect Repository**: Link this admin folder to Netlify
2. **Set Environment Variables** (copy from `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `API_BASE_URL` (your deployed API server URL)

3. **Build Settings**: 
   - Build command: `npm run build`
   - Publish directory: `.next`

4. **Deploy**: Push to your connected repository

## Environment Variables Checklist
- [ ] Supabase URL and keys configured
- [ ] API_BASE_URL points to your deployed API server
- [ ] API server allows requests from admin domain (CORS)
- [ ] Admin user exists in database with 'admin' role

The current configuration works locally and will work in production with proper environment variables.