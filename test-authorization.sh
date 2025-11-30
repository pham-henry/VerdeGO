#!/bin/bash

# VerdeGO Authorization Test Script
# This script tests JWT authentication and authorization

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:8080"
TEST_EMAIL="auth-test-$(date +%s)@example.com"
TEST_PASSWORD="testpass123"
WRONG_PASSWORD="wrongpass123"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}VerdeGO Authorization Test${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function to run a test
run_test() {
    local test_name="$1"
    local expected_status="$2"
    local method="$3"
    local endpoint="$4"
    local data="$5"
    local headers="$6"
    
    echo -e "${YELLOW}Testing: $test_name${NC}"
    
    # Build curl command
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method"
    
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$BACKEND_URL$endpoint'"
    
    # Execute and capture response
    local response=$(eval $curl_cmd 2>&1)
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    # Check result
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS (HTTP $http_code)${NC}"
        if [ -n "$body" ] && [ "$body" != "null" ]; then
            echo -e "  Response: ${body:0:150}${NC}"
        fi
        echo ""
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL - Expected HTTP $expected_status, got HTTP $http_code${NC}"
        if [ -n "$body" ]; then
            echo -e "  Response: $body${NC}"
        fi
        echo ""
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Check if backend is running
echo -e "${BLUE}Step 1: Checking Backend${NC}"
echo -e "${BLUE}----------------------------------------${NC}\n"

# Check backend with a simple GET request
if ! curl -s -f -o /dev/null "$BACKEND_URL/api/commutes?user_email=test@example.com" 2>/dev/null; then
    echo -e "${RED}✗ Backend is not accessible at $BACKEND_URL${NC}"
    echo -e "${YELLOW}Please start the backend first:${NC}"
    echo -e "  docker-compose up -d"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ Backend is accessible${NC}\n"

# Test 1: Register a new user
echo -e "${BLUE}Step 2: User Registration${NC}"
echo -e "${BLUE}----------------------------------------${NC}\n"

register_data="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
run_test "Register new user" "201" "POST" "/api/auth/register" "$register_data"

# Extract access token from response (we'll get it from login)
ACCESS_TOKEN=""
REFRESH_TOKEN=""

# Test 2: Try to register duplicate email (should fail)
echo -e "${BLUE}Step 3: Duplicate Registration${NC}"
echo -e "${BLUE}----------------------------------------${NC}\n"

run_test "Register duplicate email (should fail)" "409" "POST" "/api/auth/register" "$register_data"

# Test 3: Login with correct credentials
echo -e "${BLUE}Step 4: User Login${NC}"
echo -e "${BLUE}----------------------------------------${NC}\n"

login_data="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
login_response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "$login_data")

http_code=$(echo "$login_response" | tail -n1)
login_body=$(echo "$login_response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Login successful (HTTP 200)${NC}"
    if command -v jq &> /dev/null; then
        ACCESS_TOKEN=$(echo "$login_body" | jq -r '.accessToken // empty')
        REFRESH_TOKEN=$(echo "$login_body" | jq -r '.refreshToken // empty')
    else
        ACCESS_TOKEN=$(echo "$login_body" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
        REFRESH_TOKEN=$(echo "$login_body" | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)
    fi
    if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
        echo -e "  Got access token: ${ACCESS_TOKEN:0:50}...${NC}"
    fi
    if [ -n "$REFRESH_TOKEN" ] && [ "$REFRESH_TOKEN" != "null" ]; then
        echo -e "  Got refresh token: ${REFRESH_TOKEN:0:50}...${NC}"
    fi
    echo ""
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ Login failed (HTTP $http_code)${NC}"
    echo -e "  Response: $login_body${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo ""
fi

# Test 4: Login with wrong password
echo -e "${BLUE}Step 5: Invalid Credentials${NC}"
echo -e "${BLUE}----------------------------------------${NC}\n"

wrong_login_data="{\"email\":\"$TEST_EMAIL\",\"password\":\"$WRONG_PASSWORD\"}"
run_test "Login with wrong password (should fail)" "401" "POST" "/api/auth/login" "$wrong_login_data"

# Test 5: Login with non-existent email
non_existent_data="{\"email\":\"nonexistent-$(date +%s)@example.com\",\"password\":\"$TEST_PASSWORD\"}"
run_test "Login with non-existent email (should fail)" "401" "POST" "/api/auth/login" "$non_existent_data"

# Test 6: Access protected endpoint without token
echo -e "${BLUE}Step 6: Accessing Protected Endpoints${NC}"
echo -e "${BLUE}----------------------------------------${NC}\n"

run_test "Access /api/me without token (should fail)" "401" "GET" "/api/me" ""

# Test 7: Access protected endpoint with invalid token
run_test "Access /api/me with invalid token (should fail)" "401" "GET" "/api/me" "" "-H 'Authorization: Bearer invalid-token-12345'"

# Test 8: Access protected endpoint with malformed token (missing Bearer)
run_test "Access /api/me with malformed header (should fail)" "401" "GET" "/api/me" "" "-H 'Authorization: $ACCESS_TOKEN'"

# Test 9: Access protected endpoint with valid token
if [ -n "$ACCESS_TOKEN" ]; then
    protected_response=$(curl -s -w "\n%{http_code}" -X GET "$BACKEND_URL/api/me" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    protected_http_code=$(echo "$protected_response" | tail -n1)
    protected_body=$(echo "$protected_response" | sed '$d')
    
    if [ "$protected_http_code" = "200" ]; then
        echo -e "${GREEN}✓ Access /api/me with valid token (HTTP 200)${NC}"
        echo -e "  Response: ${protected_body:0:200}${NC}"
        echo ""
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ Access /api/me with valid token failed (HTTP $protected_http_code)${NC}"
        echo -e "  Response: $protected_body${NC}"
        echo ""
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    echo -e "${YELLOW}⚠ Skipping protected endpoint test (no access token)${NC}\n"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 10: Token refresh
echo -e "${BLUE}Step 7: Token Refresh${NC}"
echo -e "${BLUE}----------------------------------------${NC}\n"

if [ -n "$REFRESH_TOKEN" ]; then
    refresh_data="{\"refreshToken\":\"$REFRESH_TOKEN\"}"
    refresh_response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/auth/refresh" \
        -H "Content-Type: application/json" \
        -d "$refresh_data")
    
    refresh_http_code=$(echo "$refresh_response" | tail -n1)
    refresh_body=$(echo "$refresh_response" | sed '$d')
    
    if [ "$refresh_http_code" = "200" ]; then
        echo -e "${GREEN}✓ Token refresh successful (HTTP 200)${NC}"
        if command -v jq &> /dev/null; then
            NEW_ACCESS_TOKEN=$(echo "$refresh_body" | jq -r '.accessToken // empty')
            NEW_REFRESH_TOKEN=$(echo "$refresh_body" | jq -r '.refreshToken // empty')
        else
            NEW_ACCESS_TOKEN=$(echo "$refresh_body" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
            NEW_REFRESH_TOKEN=$(echo "$refresh_body" | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)
        fi
        if [ -n "$NEW_ACCESS_TOKEN" ] && [ "$NEW_ACCESS_TOKEN" != "null" ]; then
            echo -e "  Got new access token: ${NEW_ACCESS_TOKEN:0:50}...${NC}"
        fi
        echo ""
        TESTS_PASSED=$((TESTS_PASSED + 1))
        
        # Test 11: Access protected endpoint with refreshed token
        if [ -n "$NEW_ACCESS_TOKEN" ]; then
            new_protected_response=$(curl -s -w "\n%{http_code}" -X GET "$BACKEND_URL/api/me" \
                -H "Authorization: Bearer $NEW_ACCESS_TOKEN")
            
            new_protected_http_code=$(echo "$new_protected_response" | tail -n1)
            new_protected_body=$(echo "$new_protected_response" | sed '$d')
            
            if [ "$new_protected_http_code" = "200" ]; then
                echo -e "${GREEN}✓ Access /api/me with refreshed token (HTTP 200)${NC}"
                echo -e "  Response: ${new_protected_body:0:200}${NC}"
                echo ""
                TESTS_PASSED=$((TESTS_PASSED + 1))
            else
                echo -e "${RED}✗ Access /api/me with refreshed token failed (HTTP $new_protected_http_code)${NC}"
                echo -e "  Response: $new_protected_body${NC}"
                echo ""
                TESTS_FAILED=$((TESTS_FAILED + 1))
            fi
        fi
    else
        echo -e "${RED}✗ Token refresh failed (HTTP $refresh_http_code)${NC}"
        echo -e "  Response: $refresh_body${NC}"
        echo ""
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    echo -e "${YELLOW}⚠ Skipping token refresh test (no refresh token)${NC}\n"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 12: Refresh with invalid token
echo -e "${BLUE}Step 8: Invalid Refresh Token${NC}"
echo -e "${BLUE}----------------------------------------${NC}\n"

invalid_refresh_data="{\"refreshToken\":\"invalid-refresh-token\"}"
run_test "Refresh with invalid token (should fail)" "401" "POST" "/api/auth/refresh" "$invalid_refresh_data"

# Test 13: Access protected endpoint with refresh token (should fail if properly implemented)
if [ -n "$REFRESH_TOKEN" ]; then
    refresh_as_access_response=$(curl -s -w "\n%{http_code}" -X GET "$BACKEND_URL/api/me" \
        -H "Authorization: Bearer $REFRESH_TOKEN")
    
    refresh_as_access_http_code=$(echo "$refresh_as_access_response" | tail -n1)
    
    # This might succeed or fail depending on implementation
    # Typically, refresh tokens shouldn't work as access tokens
    if [ "$refresh_as_access_http_code" = "401" ]; then
        echo -e "${GREEN}✓ Using refresh token as access token correctly rejected (HTTP 401)${NC}"
        echo ""
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ Using refresh token as access token returned HTTP $refresh_as_access_http_code${NC}"
        echo -e "  (This may be acceptable depending on your implementation)${NC}"
        echo ""
    fi
fi

# Test 14: Validate email in protected endpoint response
if [ -n "$ACCESS_TOKEN" ]; then
    me_response=$(curl -s -X GET "$BACKEND_URL/api/me" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    if command -v jq &> /dev/null; then
        response_email=$(echo "$me_response" | jq -r '.email // empty')
    else
        response_email=$(echo "$me_response" | grep -o '"email":"[^"]*' | cut -d'"' -f4)
    fi
    
    if [ "$response_email" = "$TEST_EMAIL" ]; then
        echo -e "${GREEN}✓ Protected endpoint returns correct user email${NC}"
        echo ""
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ Email mismatch: expected $TEST_EMAIL, got $response_email${NC}"
        echo ""
    fi
fi

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}\n"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
else
    echo -e "${GREEN}Failed: $TESTS_FAILED${NC}"
fi

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All authorization tests passed!${NC}\n"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed${NC}\n"
    exit 1
fi

