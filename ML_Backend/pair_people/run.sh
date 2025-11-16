#!/bin/bash

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
echo -e "${GREEN}==================================================${NC}"
echo -e "${YELLOW}  MITRA User Grouping Microservice - Development Mode${NC}"
echo -e "${GREEN}==================================================${NC}"

# Check for virtual environment
if [ -z "$VIRTUAL_ENV" ]; then
    echo -e "${YELLOW}No virtual environment detected. It's recommended to use a virtual environment.${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Exiting...${NC}"
        exit 1
    fi
fi

# Install dependencies if needed
if [ ! -f "requirements.txt" ]; then
    echo -e "${RED}Error: requirements.txt not found in current directory${NC}"
    exit 1
fi

echo -e "${YELLOW}Installing/updating dependencies...${NC}"
pip install -r requirements.txt

# Check if User_Embeddings directory exists
if [ ! -d "../../User_Embeddings" ]; then
    echo -e "${YELLOW}Warning: User_Embeddings directory not found. Creating it...${NC}"
    mkdir -p "../../User_Embeddings"
fi

# Run the API server
echo -e "${GREEN}Starting user grouping API server...${NC}"
echo -e "${YELLOW}API will be available at http://localhost:8001${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
cd ..
python -m RAG.user_groups_api

# This part will only execute if the server stops
echo -e "\n${GREEN}Server stopped.${NC}" 