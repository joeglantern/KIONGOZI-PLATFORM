# Deep Linking Setup Guide

This guide explains how to configure Supabase for deep linking with the Kiongozi mobile app.

## Overview

The authentication flow works as follows:
1. User clicks email verification link from Supabase
2. Link redirects to your web app at `/auth-callback`
3. Web app extracts tokens and redirects to mobile app via deep link: `kiongozi://auth-callback?access_token=...&refresh_token=...`
4. Mobile app receives deep link, sets session, and navigates to chat screen

## Supabase Configuration

### 1. Set Redirect URLs in Supabase Dashboard

1. Go to your Supabase project: https://app.supabase.com/project/jdncfyagppohtksogzkx
2. Navigate to **Authentication** → **URL Configuration**
3. Add the following **Redirect URLs**:

```
# Production Web App
https://yourdomain.com/auth-callback

# Local Development (if testing locally)
http://localhost:3000/auth-callback

# Mobile Deep Link
kiongozi://auth-callback
```

### 2. Configure Email Templates

1. In Supabase Dashboard, go to **Authentication** → **Email Templates**
2. For each template (Confirm signup, Magic Link, etc.), update the **Confirmation URL** to:

```
{{ .SiteURL }}/auth-callback
```

This ensures all email links redirect to your web app first, which then redirects to the mobile app.

### 3. Set Site URL 

In **Authentication** → **URL Configuration**, set:

**Site URL:** `https://yourdomain.com`

Replace `yourdomain.com` with your actual web app domain.

## Testing Deep Links

### iOS Simulator
```bash
xcrun simctl openurl booted "kiongozi://auth-callback?access_token=test&refresh_token=test"
```

### Android Emulator
```bash
adb shell am start -W -a android.intent.action.VIEW -d "kiongozi://auth-callback?access_token=test&refresh_token=test" com.kiongozi.mobile
```

### Real Device
Use a tool like [deeplink.me](https://deeplink.me/) or create a test HTML page:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Test Deep Link</title>
</head>
<body>
    <h1>Test Kiongozi Deep Link</h1>
    <a href="kiongozi://auth-callback?access_token=test&refresh_token=test">
        Open Kiongozi App
    </a>
</body>
</html>
```

## Implementation Details

### Files Created

1. **Web App:** `/app/auth-callback/page.tsx`
   - Extracts tokens from URL fragment (`#access_token=...`)
   - Redirects to mobile app via deep link

2. **Mobile Hook:** `/src/hooks/useSupabaseDeepLink.ts`
   - Listens for `kiongozi://auth-callback` deep links
   - Sets Supabase session with received tokens
   - Calls success callback to refresh user state

3. **App Integration:** `App.tsx`
   - Uses the hook to handle authentication deep links
   - Re-initializes auth store after successful authentication

### Deep Link URL Format

```
kiongozi://auth-callback?access_token=<token>&refresh_token=<token>
```

- **Scheme:** `kiongozi://` (defined in `app.json`)
- **Host:** `auth-callback` (route handled by the hook)
- **Query Params:** `access_token` and `refresh_token` from Supabase

## Troubleshooting

### Deep link not opening app

1. **Check scheme in app.json:** Ensure `"scheme": "kiongozi"` is present
2. **Rebuild app:** After changing scheme, rebuild with `eas build` or `npx expo run:android/ios`
3. **Check URL format:** Must be `kiongozi://` not `https://`

### Tokens not being set

1. **Check console logs:** Look for "Deep link received:" and "Setting Supabase session..."
2. **Verify token format:** Ensure tokens are valid JWT strings
3. **Check Supabase URL:** Verify `EXPO_PUBLIC_SUPABASE_URL` is correct in `.env`

### Web redirect not working

1. **Check Supabase redirect URLs:** Must include your web app domain
2. **Verify email template:** Should redirect to `/auth-callback`
3. **Check browser console:** Look for errors in web app

## Production Deployment

Before deploying to production:

1. ✅ Update Supabase redirect URLs with production domain
2. ✅ Update email templates to use production URL
3. ✅ Test email verification flow end-to-end
4. ✅ Test on both iOS and Android devices
5. ✅ Ensure deep links work when app is closed/background

## Security Notes

- Tokens are passed via URL query parameters (not fragments) for mobile deep links
- Tokens are only valid for a short time after being issued
- The web app immediately redirects without storing tokens
- Mobile app stores tokens securely using Expo SecureStore
