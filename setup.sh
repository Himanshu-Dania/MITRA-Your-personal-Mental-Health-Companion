#!/bin/bash

# ANSI color codes for formatting output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${GREEN}  MITRA: Setup and Services Launch Script${NC}"
echo -e "${BLUE}==================================================${NC}"

# Function to check if a process is running on a specific port
check_port() {
  port=$1
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
    return 0
  else
    return 1
  fi
}

# Kill any process listening on a given port (graceful then force)
kill_on_port() {
  port=$1
  # If nothing is listening, nothing to do
  if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
    return 0
  fi

  pids=$(lsof -ti :$port || true)
  if [ -z "$pids" ]; then
    return 0
  fi

  echo -e "${YELLOW}Port $port is in use. Attempting to stop processes: $pids${NC}"

  # Try graceful termination
  for pid in $pids; do
    echo "Stopping PID $pid..."
    kill -TERM "$pid" 2>/dev/null || true
  done

  # Give them a moment to shutdown
  sleep 2

  # Force kill any remaining
  remaining=$(lsof -ti :$port || true)
  if [ -n "$remaining" ]; then
    echo -e "${YELLOW}Forcing kill on: $remaining${NC}"
    for pid in $remaining; do
      kill -KILL "$pid" 2>/dev/null || true
    done
  fi

  # Wait for the port to be released (timeout)
  timeout=10
  count=0
  while lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; do
    sleep 1
    count=$((count + 1))
    if [ $count -ge $timeout ]; then
      echo -e "${RED}✗ Could not free port $port after ${timeout}s${NC}"
      exit 1
    fi
  done
  echo -e "${GREEN}✓ Port $port is now free${NC}"
}

# Function to start MongoDB
start_mongodb() {
  echo -e "\n${YELLOW}[1/4] Starting MongoDB...${NC}"
  
  # Check if MongoDB is already running
  if systemctl is-active --quiet mongodb; then
    echo -e "${GREEN}✓ MongoDB is already running${NC}"
  else
    echo "Attempting to start MongoDB service..."
    
    # Try systemctl (for most Linux systems)
    if command -v systemctl > /dev/null; then
      sudo systemctl start mongodb || sudo systemctl start mongod
      if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ MongoDB started successfully${NC}"
      else
        echo -e "${RED}✗ Failed to start MongoDB with systemctl${NC}"
        echo "Trying alternate methods..."
        
        # Try brew service (for macOS)
        if command -v brew > /dev/null; then
          brew services start mongodb-community
          if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ MongoDB started successfully with Homebrew${NC}"
          else
            echo -e "${RED}✗ Failed to start MongoDB with Homebrew${NC}"
            echo -e "${RED}! Please start MongoDB manually and then run this script again${NC}"
            exit 1
          fi
        else
          echo -e "${RED}✗ Could not start MongoDB${NC}"
          echo -e "${RED}! Please start MongoDB manually and then run this script again${NC}"
          exit 1
        fi
      fi
    else
      echo -e "${RED}✗ systemctl not found${NC}"
      echo -e "${RED}! Please start MongoDB manually and then run this script again${NC}"
      exit 1
    fi
  fi
}

# Function to start Backend
start_backend() {
  echo -e "\n${YELLOW}[2/4] Starting Backend server...${NC}"
  
  # Check if something is already running on backend port
  if check_port 3000; then
    echo -e "${YELLOW}Port 3000 is in use. Stopping existing process(es) before starting backend...${NC}"
    kill_on_port 3000
  fi
  
  # Navigate to backend directory
  cd Backend
  
  # Check if node_modules exists, if not run npm install
  if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
  fi
  
  # Start the backend server in the background
  echo "Starting backend server on port 3000..."
  npm run dev &
  BACKEND_PID=$!
  
  # Wait for backend to start
  echo "Waiting for backend to initialize..."
  sleep 5
  
  # Check if backend started successfully
  if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Backend server started successfully (PID: $BACKEND_PID)${NC}"
  else
    echo -e "${RED}✗ Failed to start backend server${NC}"
    exit 1
  fi
  
  # Return to root directory
  cd ..
}

# Function to start ML API
start_ml_api() {
  echo -e "\n${YELLOW}[3/4] Starting ML API server...${NC}"

  # Check if something is already running on ML API port
  if check_port 5000; then
    echo -e "${YELLOW}Port 5000 is in use. Stopping existing process(es) before starting ML API...${NC}"
    kill_on_port 5000
  fi

  # Navigate to ML_Backend/TherapyBot directory
  cd ML_Backend/TherapyBot

  # Ensure the start script exists
  if [ ! -f "start_api.sh" ] && [ ! -f "app.py" ]; then
    echo -e "${RED}✗ start_api.sh or app.py not found in ML_Backend/TherapyBot${NC}"
    cd ../..
    exit 1
  fi

  # Look for virtualenv in common locations
  VENV_PATH=""
  if [ -d "venv" ]; then
    VENV_PATH="$(pwd)/venv"
  elif [ -d "../venv" ]; then
    VENV_PATH="$(pwd)/../venv"
  elif [ -d "../../venv" ]; then
    VENV_PATH="$(pwd)/../../venv"
  fi

  if [ -n "$VENV_PATH" ]; then
    echo "Activating virtual environment at $VENV_PATH"
    # shellcheck disable=SC1090
    source "$VENV_PATH/bin/activate"
    PY_CMD="$VENV_PATH/bin/python"
  else
    # Fallback to system python3 or python
    if command -v python >/dev/null 2>&1; then
      PY_CMD=python
    elif command -v python3 >/dev/null 2>&1; then
      PY_CMD=python3
    else
      echo -e "${RED}✗ No Python interpreter found. Create/activate a virtualenv.${NC}"
      cd ../..
      exit 1
    fi
  fi

  # Load .env if present (start_api.sh would do this)
  if [ -f "../.env" ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
  fi

  # Start the ML API in the background. Prefer start_api.sh when venv is active for its logging.
  echo "Starting ML API on port 5000..."
  if [ -n "$VENV_PATH" ] && [ -f "start_api.sh" ]; then
    chmod +x start_api.sh
    ./start_api.sh &
    ML_API_PID=$!
  else
    # Run the app directly with the chosen python interpreter
    $PY_CMD app.py &
    ML_API_PID=$!
  fi

  # Wait for ML API to start
  echo "Waiting for ML API to initialize..."
  sleep 5

  # Check if ML API started successfully
  if ps -p $ML_API_PID > /dev/null; then
    echo -e "${GREEN}✓ ML API started successfully (PID: $ML_API_PID)${NC}"
  else
    echo -e "${RED}✗ Failed to start ML API${NC}"
    exit 1
  fi

  # Return to root directory
  cd ../..
}

# Function to start Frontend
start_frontend() {
  echo -e "\n${YELLOW}[4/4] Starting Frontend development server...${NC}"
  
  # Check if something is already running on frontend port
  if check_port 4000; then
    echo -e "${YELLOW}Port 4000 is in use. Stopping existing process(es) before starting frontend...${NC}"
    kill_on_port 4000
  fi
  
  # Navigate to frontend directory
  cd frontend
  
  # Check if node_modules exists, if not run npm install
  if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
  fi
  
  # Start the frontend development server in the background
  echo "Starting frontend server on port 4000..."
  npm start &
  FRONTEND_PID=$!
  
  # Wait for frontend to start
  echo "Waiting for frontend to initialize..."
  sleep 8
  
  # Check if frontend started successfully
  if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Frontend development server started successfully (PID: $FRONTEND_PID)${NC}"
  else
    echo -e "${RED}✗ Failed to start frontend development server${NC}"
    exit 1
  fi
  
  # Return to root directory
  cd ..
}

# Main execution
start_mongodb
start_backend
start_ml_api
start_frontend

echo -e "\n${BLUE}==================================================${NC}"
echo -e "${GREEN}  MITRA Services are now running:${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "  ${YELLOW}* MongoDB:${NC} Running on default port 27017"
echo -e "  ${YELLOW}* Backend:${NC} Running on http://localhost:3000"
echo -e "  ${YELLOW}* ML API:${NC} Running on http://localhost:5000"
echo -e "  ${YELLOW}* Frontend:${NC} Running on http://localhost:4000"
echo -e "\n${GREEN}Application is ready! Open http://localhost:4000 in your browser${NC}"
echo -e "${RED}To stop all services, press Ctrl+C or run: kill $BACKEND_PID $ML_API_PID $FRONTEND_PID${NC}\n"

# Keep the script running to maintain the processes
wait