# API Server Deployment to Render

## 🚀 Quick Deploy Steps

### 1. Connect to Render
1. Go to [Render.com](https://render.com) and sign up/login
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Select the `api-server` folder as root directory

### 2. Configure Build Settings
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Node Version**: `18` (automatic detection)

### 3. Set Environment Variables
Copy from `.env.render` template and set in Render dashboard:

**Required Variables:**
- `NODE_ENV=production`
- `PORT=10000` (Render default)
- `SUPABASE_URL=your-supabase-url`
- `SUPABASE_ANON_KEY=your-anon-key`
- `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`
- `JWT_SECRET=your-secure-jwt-secret`
- `OPENAI_API_KEY=your-openai-key`

**Important:**
- `ALLOWED_ORIGINS=https://your-admin-panel.netlify.app,https://your-main-app.netlify.app`

### 4. Deploy
- Click "Create Web Service"
- Wait for build to complete
- Your API will be available at: `https://your-service-name.onrender.com`

### 5. Update Admin Panel
After deployment, update your admin panel's `API_BASE_URL` environment variable to point to your new Render URL.

## ✅ Deployment Checklist
- [ ] Repository connected to Render
- [ ] All environment variables set
- [ ] CORS origins include your admin panel domain
- [ ] Health check passes at `/api/v1/health`
- [ ] Admin panel updated with new API URL
- [ ] Test admin login and functionality

## 📝 Notes
- Health checks are configured at `/api/v1/health`
- Free tier may have cold starts (first request after inactivity takes longer)
- Your current local setup remains unchanged
- All existing functionality preserved

## 🔧 Troubleshooting
- Check Render logs for any startup errors
- Ensure all environment variables are set correctly
- Verify CORS origins include your admin domain
- Test health endpoint: `https://your-api.onrender.com/api/v1/health`