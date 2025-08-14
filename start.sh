#!/bin/bash

echo "🚀 Starting NutriAI Oracle..."

# Kill any existing processes
echo "🔄 Stopping existing servers..."
pkill -f "node.*server" 2>/dev/null
pkill -f "react-scripts" 2>/dev/null
sleep 2

# Start backend server
echo "🔧 Starting backend server..."
npm run server &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend server
echo "🎨 Starting frontend server..."
cd client && npm start &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 10

echo "✅ NutriAI Oracle is running!"
echo "📊 Backend API: http://localhost:5000"
echo "🎨 Frontend App: http://localhost:3000"
echo "🔍 Health Check: http://localhost:5000/api/health"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
wait 