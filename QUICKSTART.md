# Quick Start Guide - Testing Frontend & Backend

## Fixed Issues ✅

- ✓ Prisma client generation
- ✓ JWT service TypeScript errors
- ✓ Backend build successful

## Option 1: Docker Compose (Easiest - Recommended)

This starts everything at once:

```bash
cd /home/henry/CS160/VerdeGO
docker-compose up -d
```

Wait a minute for services to start, then check status:
```bash
docker-compose ps
```

Access:
- Frontend: http://localhost:5173
- Backend: http://localhost:8080

Run the test script:
```bash
./test-integration.sh
```

## Option 2: Manual Setup (For Development)

### Step 1: Start Database

```bash
cd /home/henry/CS160/VerdeGO
docker-compose up -d postgres
```

Wait ~10 seconds for PostgreSQL to be ready.

### Step 2: Setup Backend

```bash
cd backend-express

# Generate Prisma client (if not done)
npm run generate

# Run database migrations
npm run migrate

# Start backend in development mode
npm run dev
```

Backend will start on http://localhost:8080

### Step 3: Start Frontend (in another terminal)

```bash
cd /home/henry/CS160/VerdeGO/frontend
npm install  # if needed
npm run dev
```

Frontend will start on http://localhost:5173

### Step 4: Run Tests

```bash
cd /home/henry/CS160/VerdeGO
./test-integration.sh
```

## Troubleshooting

**Backend won't start:**
```bash
# Check if database is running
docker-compose ps postgres

# Check backend logs
cd backend-express
npm run dev  # will show errors
```

**Database connection errors:**
```bash
# Make sure migrations are run
cd backend-express
npm run migrate
```

**Port already in use:**
```bash
# Check what's using port 8080
sudo lsof -i :8080

# Or check port 5173
sudo lsof -i :5173
```

## What the Test Script Does

The `test-integration.sh` script will:
1. Check if backend and frontend are accessible
2. Test creating a commute
3. Test listing commutes
4. Test emission summaries
5. Test route recommendations
6. Verify CORS configuration

## Next Steps After Testing

1. Open http://localhost:5173 in your browser
2. Try creating a commute in the UI
3. Check browser console (F12) for any errors
4. Verify data appears in the dashboard

## Additional Test Suites

### Authorization Tests
Test JWT authentication and authorization:
```bash
./test-authorization.sh
```

This tests:
- User registration and login
- Protected endpoint access
- Token validation and refresh
- Invalid credentials handling

See `AUTHORIZATION_TEST.md` for details.

