#!/bin/bash

# VerdeGO Frontend-Backend Integration Test Script
# This script tests that the frontend and backend are working together

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:8080"
FRONTEND_URL="http://localhost:5173"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="testpass123"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}VerdeGO Integration Test${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function to check if a service is running
check_service() {
    local url=$1
    local name=$2
    
    echo -e "${YELLOW}Checking $name at $url...${NC}"
    if curl -s -f -o /dev/null "$url"; then
        echo -e "${GREEN}✓ $name is accessible${NC}\n"
        return 0
    else
        echo -e "${RED}✗ $name is NOT accessible${NC}\n"
        return 1
    fi
}

# Function to test API endpoint
test_api_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "${YELLOW}Testing: $description${NC}"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BACKEND_URL$endpoint" \
            -H "Content-Type: application/json" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BACKEND_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ Success (HTTP $http_code)${NC}"
        if [ -n "$body" ]; then
            echo -e "  Response: ${body:0:200}${NC}"
        fi
        echo ""
        return 0
    elif [ "$http_code" -ge 400 ] && [ "$http_code" -lt 500 ]; then
        echo -e "${YELLOW}⚠ Client Error (HTTP $http_code)${NC}"
        if [ -n "$body" ]; then
            echo -e "  Response: $body${NC}"
        fi
        echo ""
        return 1
    else
        echo -e "${RED}✗ Failed (HTTP $http_code)${NC}"
        if [ -n "$body" ]; then
            echo -e "  Response: $body${NC}"
        fi
        echo ""
        return 1
    fi
}

# Step 1: Check if services are running
echo -e "${BLUE}Step 1: Checking Services${NC}"
echo -e "${BLUE}----------------------------------------${NC}\n"

backend_running=false
frontend_running=false

if check_service "$BACKEND_URL/api/commutes?user_email=test@example.com" "Backend API"; then
    backend_running=true
fi

if check_service "$FRONTEND_URL" "Frontend"; then
    frontend_running=true
fi

if [ "$backend_running" = false ]; then
    echo -e "${RED}Backend is not running. Please start it first:${NC}"
    echo -e "  ${YELLOW}Option 1 (Docker):${NC} docker-compose up -d"
    echo -e "  ${YELLOW}Option 2 (Local):${NC} cd backend-express && npm run dev"
    echo ""
    exit 1
fi

if [ "$frontend_running" = false ]; then
    echo -e "${YELLOW}Frontend is not running. Starting tests with backend only...${NC}\n"
fi

# Step 2: Test Backend API Endpoints
echo -e "${BLUE}Step 2: Testing Backend API Endpoints${NC}"
echo -e "${BLUE}----------------------------------------${NC}\n"

# Test 1: Create a commute
echo -e "${BLUE}Test 1: Create Commute${NC}"
commute_data=$(cat <<EOF
{
  "user_email": "$TEST_EMAIL",
  "date": "$(date +%Y-%m-%d)",
  "mode": "bike",
  "distance_km": 5.5,
  "duration_min": 20,
  "notes": "Integration test commute"
}
EOF
)
test_api_endpoint "POST" "/api/commutes" "$commute_data" "Create commute"

# Test 2: List commutes
echo -e "${BLUE}Test 2: List Commutes${NC}"
test_api_endpoint "GET" "/api/commutes?user_email=$TEST_EMAIL&from=$(date -d '60 days ago' +%Y-%m-%d)&to=$(date +%Y-%m-%d)" "" "List commutes"

# Test 3: Get emission summary by mode
echo -e "${BLUE}Test 3: Emission Summary by Mode${NC}"
test_api_endpoint "GET" "/api/emissions/summary?user_email=$TEST_EMAIL&groupBy=mode&from=$(date -d '60 days ago' +%Y-%m-%d)&to=$(date +%Y-%m-%d)" "" "Get emission summary by mode"

# Test 4: Get emission summary by day
echo -e "${BLUE}Test 4: Emission Summary by Day${NC}"
test_api_endpoint "GET" "/api/emissions/summary?user_email=$TEST_EMAIL&groupBy=day&from=$(date -d '7 days ago' +%Y-%m-%d)&to=$(date +%Y-%m-%d)" "" "Get emission summary by day"

# Test 5: Route recommendation
echo -e "${BLUE}Test 5: Route Recommendation${NC}"
recommend_data=$(cat <<EOF
{
  "origin": "San Francisco, CA",
  "destination": "Oakland, CA",
  "preferences": ["eco"]
}
EOF
)
test_api_endpoint "POST" "/api/recommend" "$recommend_data" "Get route recommendations"

# Step 3: Test Frontend-Backend Connection
if [ "$frontend_running" = true ]; then
    echo -e "${BLUE}Step 3: Testing Frontend-Backend Connection${NC}"
    echo -e "${BLUE}----------------------------------------${NC}\n"
    
    echo -e "${YELLOW}Testing if frontend can reach backend...${NC}"
    
    # Check if frontend is proxying API requests (in dev mode)
    if curl -s -f -o /dev/null "$FRONTEND_URL/api/commutes?user_email=$TEST_EMAIL" 2>/dev/null; then
        echo -e "${GREEN}✓ Frontend can proxy requests to backend${NC}\n"
    else
        echo -e "${YELLOW}⚠ Frontend proxy not available (may be running in production mode)${NC}"
        echo -e "  This is normal if frontend is served via Docker nginx\n"
    fi
    
    # Test CORS
    echo -e "${YELLOW}Testing CORS configuration...${NC}"
    cors_headers=$(curl -s -I -X OPTIONS "$BACKEND_URL/api/commutes" \
        -H "Origin: $FRONTEND_URL" \
        -H "Access-Control-Request-Method: GET" 2>&1 | grep -i "access-control")
    
    if echo "$cors_headers" | grep -qi "access-control-allow-origin"; then
        echo -e "${GREEN}✓ CORS headers are configured${NC}\n"
    else
        echo -e "${YELLOW}⚠ CORS headers not detected (may require actual browser request)${NC}\n"
    fi
fi

# Step 4: Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "Backend Status: $([ "$backend_running" = true ] && echo -e "${GREEN}✓ Running${NC}" || echo -e "${RED}✗ Not Running${NC}")"
echo -e "Frontend Status: $([ "$frontend_running" = true ] && echo -e "${GREEN}✓ Running${NC}" || echo -e "${YELLOW}⚠ Not Running${NC}")"

echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "1. Open ${YELLOW}$FRONTEND_URL${NC} in your browser"
echo -e "2. Try creating a commute through the UI"
echo -e "3. Check the browser console (F12) for any errors"
echo -e "4. Check the Network tab to verify API requests are working"

echo -e "\n${GREEN}Integration test complete!${NC}\n"

