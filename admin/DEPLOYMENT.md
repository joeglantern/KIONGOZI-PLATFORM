# Admin Panel Deployment Guide

## Netlify Deployment

### Prerequisites
1. Ensure your API server is deployed and accessible (e.g., on Heroku, Railway, or similar)
2. Have your Supabase project credentials ready
3. Git repository connected to Netlify

### Step 1: Environment Variables
Set these environment variables in Netlify dashboard:

**Required Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
API_BASE_URL=https://your-api-server.herokuapp.com
NEXT_PUBLIC_API_BASE=https://your-api-server.herokuapp.com/api/v1
NEXT_PUBLIC_API_SERVER_ENABLED=true
NODE_ENV=production
```

**Optional Variables:**
```
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_CHART_API_URL=https://your-chart-api.com
```

### Step 2: Build Settings
In Netlify dashboard, configure:
- **Build command:** `npm run build`
- **Publish directory:** `.next`
- **Node version:** `18` (set in netlify.toml)

### Step 3: Deploy
1. Push your code to the connected Git repository
2. Netlify will automatically deploy
3. Check the build logs for any issues

### Step 4: Custom Domain (Optional)
1. Add your custom domain in Netlify dashboard
2. Configure DNS records as instructed
3. Enable HTTPS (automatic with Netlify)

## Deployment Checklist

- [ ] API server is deployed and accessible
- [ ] All environment variables are set in Netlify
- [ ] Build completes successfully
- [ ] Admin login works
- [ ] API endpoints respond correctly
- [ ] All admin features functional

## Troubleshooting

### Build Issues
- Check environment variables are set correctly
- Verify API server is accessible
- Review build logs for specific errors

### Runtime Issues
- Ensure API_BASE_URL points to deployed API server
- Check browser network tab for failed API calls
- Verify Supabase credentials are correct

### CORS Issues
If you encounter CORS errors:
1. Update your API server's CORS configuration
2. Add your Netlify domain to allowed origins
3. Ensure API server accepts requests from admin domain

## Files Modified for Deployment
- `netlify.toml` - Netlify configuration
- `next.config.js` - Next.js production optimizations
- `.env.example` - Environment variable template
- `package.json` - Added deployment scripts

## Support
For deployment issues, check:
1. Netlify build logs
2. Browser console for runtime errors
3. API server logs for backend issues