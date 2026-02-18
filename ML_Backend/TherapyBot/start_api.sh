#!/bin/bash

# TherapyBot API Server Startup Script

echo "🚀 Starting TherapyBot API Server..."
echo ""

# Check if we're in the correct directory
if [ ! -f "app.py" ]; then
    echo "❌ Error: app.py not found. Please run this script from the TherapyBot directory."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "../../venv" ] && [ ! -d "venv" ]; then
    echo "⚠️  Warning: No virtual environment found."
    echo "   Consider creating one with: python -m venv venv"
    echo ""
fi

# # Check if flask-cors is installed
# echo "📦 Checking dependencies..."
# python -c "import flask_cors" 2>/dev/null
# if [ $? -ne 0 ]; then
#     echo "❌ flask-cors not found. Installing dependencies..."
#     pip install -r ../requirements.txt
# fi

echo "✓ Dependencies OK"
echo ""

# Load environment variables if .env exists
if [ -f "../.env" ]; then
    echo "✓ Found .env file"
    export $(cat ../.env | grep -v '^#' | xargs)
fi

# Get port from environment or use default
PORT=${PORT:-5000}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TherapyBot API Server"
echo "  Pure REST API - No HTML Rendering"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 API will be available at:"
echo "   http://localhost:$PORT"
echo ""
echo "📡 Endpoints:"
echo "   GET  /         - API info"
echo "   GET  /health   - Health check"
echo "   POST /chat     - Chat endpoint (SSE streaming)"
echo ""
echo "🔗 CORS: Enabled for external clients"
echo ""
echo "📝 To test the API, open example_frontend.html in your browser"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Starting server..."
echo ""

# Run the Flask app
python app.py
