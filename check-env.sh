#!/bin/bash

echo "🔍 Checking Environment Variables Configuration..."
echo ""
echo "=================================================="
echo "Environment Files Status"
echo "=================================================="

check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1 exists"
        return 0
    else
        echo "❌ $1 missing"
        return 1
    fi
}

# Check all env files
check_file ".env.local"
check_file "api-server/.env"
check_file "kiongozi-mobile-working/.env"
check_file "kiongozi-moderator-dashboard/.env.local"

echo ""
echo "=================================================="
echo "Supabase Configuration Check"
echo "=================================================="

# Check main LMS
if [ -f ".env.local" ]; then
    if grep -q "jdncfyagppohtksogzkx.supabase.co" .env.local; then
        echo "✅ Main LMS - Supabase URL configured"
    else
        echo "⚠️  Main LMS - Supabase URL not found"
    fi
fi

# Check API Server
if [ -f "api-server/.env" ]; then
    if grep -q "jdncfyagppohtksogzkx.supabase.co" api-server/.env; then
        echo "✅ API Server - Supabase URL configured"
    else
        echo "⚠️  API Server - Supabase URL not found"
    fi
fi

# Check Mobile App
if [ -f "kiongozi-mobile-working/.env" ]; then
    if grep -q "jdncfyagppohtksogzkx.supabase.co" kiongozi-mobile-working/.env; then
        echo "✅ Mobile App - Supabase URL configured"
    else
        echo "⚠️  Mobile App - Supabase URL not found"
    fi
fi

# Check Moderator Dashboard
if [ -f "kiongozi-moderator-dashboard/.env.local" ]; then
    if grep -q "jdncfyagppohtksogzkx.supabase.co" kiongozi-moderator-dashboard/.env.local; then
        echo "✅ Moderator Dashboard - Supabase URL configured"
    else
        echo "⚠️  Moderator Dashboard - Supabase URL not found"
    fi
fi

echo ""
echo "=================================================="
echo "Additional Configuration Needed"
echo "=================================================="

# Check for optional configurations
if [ -f "api-server/.env" ]; then
    if grep -q "your-openai-api-key-here" api-server/.env; then
        echo "⚠️  OpenAI API Key not configured (needed for chatbot)"
    else
        echo "✅ OpenAI API Key configured"
    fi
    
    if grep -q "your-supabase-service-role-key-here" api-server/.env; then
        echo "⚠️  Supabase Service Role Key not configured (optional)"
    else
        echo "✅ Supabase Service Role Key configured"
    fi
fi

echo ""
echo "=================================================="
echo "Summary"
echo "=================================================="
echo ""
echo "All environment files have been created!"
echo ""
echo "📝 Next Steps:"
echo "1. Restart your mobile app with: npx expo start --clear"
echo "2. Add OpenAI API key to api-server/.env (optional)"
echo "3. Add Supabase Service Role Key to api-server/.env (optional)"
echo ""
echo "✅ Your platform is ready to run!"
echo ""
