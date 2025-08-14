#!/bin/bash

echo "🔍 NutriAI Oracle Status Check"
echo "=============================="

# Check backend
echo -n "Backend (localhost:5000): "
if curl -s http://localhost:5000/api/health > /dev/null; then
    echo "✅ RUNNING"
else
    echo "❌ NOT RUNNING"
fi

# Check frontend
echo -n "Frontend (localhost:3000): "
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ RUNNING"
else
    echo "❌ NOT RUNNING"
fi

echo ""
echo "🌐 Access URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo "   Health Check: http://localhost:5000/api/health" 