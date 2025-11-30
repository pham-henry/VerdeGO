# Authorization Test Guide

This document describes the authorization test suite for VerdeGO's JWT-based authentication system.

## Running the Authorization Tests

```bash
cd /home/henry/CS160/VerdeGO
./test-authorization.sh
```

## What the Tests Cover

The authorization test suite includes the following test cases:

### 1. User Registration
- ✓ Register a new user (HTTP 201)
- ✓ Attempt to register duplicate email (HTTP 409 Conflict)

### 2. User Login
- ✓ Login with correct credentials (HTTP 200, receives tokens)
- ✓ Login with wrong password (HTTP 401 Unauthorized)
- ✓ Login with non-existent email (HTTP 401 Unauthorized)

### 3. Protected Endpoint Access
- ✓ Access `/api/me` without token (HTTP 401 Unauthorized)
- ✓ Access `/api/me` with invalid token (HTTP 401 Unauthorized)
- ✓ Access `/api/me` with malformed authorization header (HTTP 401)
- ✓ Access `/api/me` with valid access token (HTTP 200, returns user data)

### 4. Token Refresh
- ✓ Refresh access token with valid refresh token (HTTP 200)
- ✓ Access protected endpoint with refreshed token (HTTP 200)
- ✓ Refresh with invalid refresh token (HTTP 401 Unauthorized)

### 5. Token Validation
- ✓ Protected endpoint returns correct user email

## Test Output

The test script provides:
- Color-coded output (green for pass, red for fail, yellow for warnings)
- HTTP status codes for each test
- Response body snippets for debugging
- Final summary with pass/fail counts

## Expected Results

When all tests pass, you'll see:
```
Total Tests: 13
Passed: 13
Failed: 0

✓ All authorization tests passed!
```

## Authorization Flow

1. **Registration**: `POST /api/auth/register`
   - Creates a new user
   - Returns access token and refresh token

2. **Login**: `POST /api/auth/login`
   - Validates credentials
   - Returns access token and refresh token

3. **Access Protected Endpoints**: `GET /api/me`
   - Requires `Authorization: Bearer <access_token>` header
   - Returns user information

4. **Refresh Tokens**: `POST /api/auth/refresh`
   - Takes a refresh token
   - Returns new access token and refresh token

## Security Features Tested

- ✓ Password hashing (passwords are never returned in responses)
- ✓ JWT token validation
- ✓ Protected route middleware
- ✓ Token expiration handling
- ✓ Invalid token rejection
- ✓ Duplicate user prevention

## Integration with Other Tests

Run alongside the integration test:
```bash
./test-integration.sh      # Tests API functionality
./test-authorization.sh    # Tests authentication/authorization
```

## Troubleshooting

**If tests fail:**
1. Ensure backend is running: `docker-compose ps`
2. Check backend logs: `docker-compose logs backend`
3. Verify database is accessible: `docker-compose ps postgres`
4. Check that migrations have been run

**Common Issues:**
- **401 errors**: Token might be expired, regenerate by logging in again
- **409 errors on duplicate registration**: This is expected behavior
- **Connection refused**: Backend container might not be running

## Test Email Format

The test script automatically generates unique test emails:
```
auth-test-<timestamp>@example.com
```

This ensures tests don't interfere with each other if run multiple times.

