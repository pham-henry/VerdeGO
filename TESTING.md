# Testing Frontend-Backend Integration

This guide helps you test that your frontend and backend are working together on your virtual machine.

## Quick Start

### Option 1: Using Docker Compose (Recommended)

1. **Start all services:**
   ```bash
   cd /home/henry/CS160/VerdeGO
   docker-compose up -d
   ```

2. **Wait for services to be ready:**
   ```bash
   # Check service status
   docker-compose ps
   
   # Check backend logs
   docker-compose logs backend
   
   # Check frontend logs
   docker-compose logs frontend
   ```

3. **Run the automated test script:**
   ```bash
   ./test-integration.sh
   ```

4. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8080

### Option 2: Local Development

1. **Start PostgreSQL with Docker:**
   ```bash
   docker-compose up -d postgres
   ```

2. **Start Backend (in one terminal):**
   ```bash
   cd backend-express
   npm install
   cp .env.example .env  # if needed
   npm run migrate
   npm run dev
   ```

3. **Start Frontend (in another terminal):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Run the test script:**
   ```bash
   ./test-integration.sh
   ```

## Manual Testing Steps

### 1. Verify Services Are Running

**Check Backend:**
```bash
curl http://localhost:8080/api/commutes
```
You should get a response (even if it's an error, it means the backend is running).

**Check Frontend:**
```bash
curl http://localhost:5173
```
You should get HTML content.

### 2. Test Backend API Directly

**Create a commute:**
```bash
curl -X POST http://localhost:8080/api/commutes \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "test@example.com",
    "date": "2024-01-15",
    "mode": "bike",
    "distance_km": 5.5,
    "duration_min": 20,
    "notes": "Test commute"
  }'
```

**List commutes:**
```bash
curl "http://localhost:8080/api/commutes?user_email=test@example.com&from=2024-01-01&to=2024-12-31"
```

**Get emission summary:**
```bash
curl "http://localhost:8080/api/emissions/summary?user_email=test@example.com&groupBy=mode&from=2024-01-01&to=2024-12-31"
```

### 3. Test Frontend-Backend Connection

1. **Open the frontend in a browser:**
   - Navigate to http://localhost:5173
   - Open Developer Tools (F12)
   - Go to the "Network" tab

2. **Perform an action in the UI:**
   - Try creating a commute
   - View emissions charts
   - Navigate between pages

3. **Check the Network tab:**
   - Look for requests to `/api/*` endpoints
   - Verify they return successful responses (200 status)
   - Check for CORS errors (these would appear in the Console tab)

### 4. Common Issues and Solutions

**Backend not responding:**
- Check if the backend container is running: `docker-compose ps`
- Check backend logs: `docker-compose logs backend`
- Verify the port 8080 is not in use: `lsof -i :8080` or `netstat -tulpn | grep 8080`

**Frontend not connecting to backend:**
- Verify `VITE_API_URL` is set correctly in frontend
- Check CORS settings in backend (should allow `http://localhost:5173`)
- In browser console, check for CORS errors

**Database connection errors:**
- Verify PostgreSQL is running: `docker-compose ps postgres`
- Check database connection string in backend `.env`
- Run migrations: `cd backend-express && npm run migrate`

**Frontend shows blank page:**
- Check browser console for JavaScript errors
- Verify frontend build completed successfully
- Check frontend logs: `docker-compose logs frontend`

## Using the Test Script

The `test-integration.sh` script automates most of these checks:

```bash
# Make sure it's executable
chmod +x test-integration.sh

# Run it
./test-integration.sh
```

The script will:
- ✓ Check if backend and frontend are accessible
- ✓ Test all main API endpoints
- ✓ Verify CORS configuration
- ✓ Provide a summary of what's working

## Browser Testing

After verifying services are running:

1. **Open the application:**
   ```bash
   # If you have a GUI browser
   firefox http://localhost:5173
   
   # Or note the URL to access from host machine
   echo "Access at: http://localhost:5173"
   ```

2. **Test key features:**
   - Create a new commute entry
   - View the dashboard with stats
   - Check emission charts
   - Test route recommendations (if Google Maps API is configured)

3. **Monitor in Developer Tools:**
   - Console tab: Check for JavaScript errors
   - Network tab: Verify API calls are successful
   - Application tab: Check if any data is stored in localStorage

## Troubleshooting Commands

**View all running containers:**
```bash
docker-compose ps
```

**View logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

**Restart services:**
```bash
docker-compose restart backend
docker-compose restart frontend
```

**Stop everything:**
```bash
docker-compose down
```

**Stop and remove all data (fresh start):**
```bash
docker-compose down -v
docker-compose up -d
```

## Expected Results

When everything is working correctly:

✅ Backend responds to API requests on port 8080  
✅ Frontend loads on port 5173  
✅ API calls from frontend succeed  
✅ Data is persisted in the database  
✅ CORS allows frontend to communicate with backend  
✅ No errors in browser console or server logs

