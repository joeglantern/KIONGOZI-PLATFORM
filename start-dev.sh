#!/bin/bash

# Start both LMS and API server for development

echo "🚀 Starting LMS Development Environment..."

# Function to handle cleanup
cleanup() {
    echo "🛑 Shutting down services..."
    kill $MAIN_PID $API_PID 2>/dev/null
    exit 0
}

# Set up trap to handle Ctrl+C
trap cleanup INT

# Start API server in background
echo "📡 Starting API Server on port 3002..."
cd api-server && npm run dev &
API_PID=$!

# Wait for API server to start
sleep 3

# Start main app in background  
echo "🌐 Starting Main App on port 3000..."
cd .. && npm run dev &
MAIN_PID=$!

# Start admin panel
echo "⚙️  Starting Admin Panel on port 3001..."
cd admin && npm run dev &
ADMIN_PID=$!

echo "✅ All services started!"
echo "📱 Main App: http://localhost:3000"
echo "📡 API Server: http://localhost:3002"  
echo "⚙️  Admin Panel: http://localhost:3001"
echo "🔍 API Health: http://localhost:3002/api/v1/health"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for all background processes
wait $MAIN_PID $API_PID $ADMIN_PID