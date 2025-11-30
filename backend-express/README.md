# VerdeGO Backend (Express.js)

Express.js backend API with basic JWT authentication. Simple and minimal authentication service.

## Prerequisites

- **Node.js 20+** (LTS recommended)
- **npm** or **yarn**
- **Docker & Docker Compose** (for containerized setup)
- **PostgreSQL 16** 

## Quick Start with Docker Compose (Recommended)

The easiest way to run the backend and database is using Docker Compose.

### 1. Start Services

```bash
cd backend-express
docker-compose up -d
```

This will start:
- PostgreSQL 16 database on port `5432`
- Express.js backend on port `8080`
- (Optional) pgAdmin on port `5050` (see below)

### 2. Check Service Status

```bash
docker-compose ps
```

### 3. View Logs

```bash
# View all logs
docker-compose logs -f

# View backend logs only
docker-compose logs -f verdego-backend-express

# View database logs only
docker-compose logs -f postgres
```

### 4. Stop Services

```bash
docker-compose down
```

To also remove volumes (database data):
```bash
docker-compose down -v
```

### 5. Rebuild Backend

If you make code changes, rebuild the backend:

```bash
docker-compose build verdego-backend-express
docker-compose up -d
```

### Optional: pgAdmin (Database Management UI)

To start pgAdmin for database management:

```bash
docker-compose --profile dev up -d
```

Access pgAdmin at: http://localhost:5050
- Email: `admin@verdego.local`
- Password: `admin`

**Connect to PostgreSQL in pgAdmin:**
- Host: `postgres` (container name)
- Port: `5432`
- Database: `verdego`
- Username: `verdego`
- Password: `verdego`

## Running Locally (Without Docker)

### 1. Start PostgreSQL Database

#### Using Docker (Database Only)

```bash
cd backend-express
docker-compose up -d postgres
```

### 2. Configure Application

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your database configuration:
- Database: `localhost:5432/verdego`
- Username: `verdego`
- Password: `verdego`

### 3. Install Dependencies

```bash
npm install
```

### 4. Set Up Database

```bash
# Generate Prisma client
npm run generate

# Run database migrations
npm run migrate
```

### 5. Build and Run

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

### 6. Run Tests

(Add tests when implemented)

```bash
npm test
```

## Accessing the API

### Base URL
- **Local**: http://localhost:8080

## API Endpoints

### Public Endpoints (No Authentication)

#### Register User
```bash
POST http://localhost:8080/api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Login
```bash
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "user@example.com"
}
```

#### Refresh Token
```bash
POST http://localhost:8080/api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Protected Endpoints (Require Authentication)

#### Get Current User
```bash
GET http://localhost:8080/api/me
Authorization: Bearer <accessToken>
```

## Testing with cURL

### 1. Register a User
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the `accessToken` from the response.

### 3. Get Current User
```bash
curl -X GET http://localhost:8080/api/me \
  -H "Authorization: Bearer <your-access-token>"
```

## Database Migrations

Prisma automatically manages database migrations. Migrations are created when you run:

```bash
npm run migrate
```

This will:
1. Create migration files in `prisma/migrations/`
2. Apply migrations to the database
3. Regenerate Prisma Client

To apply migrations in production:
```bash
npm run migrate:deploy
```

## Configuration

### Environment Variables

You can override configuration using environment variables:

```bash
PORT=8080
NODE_ENV=production
DATABASE_URL=postgresql://verdego:verdego@localhost:5432/verdego?schema=public
JWT_SECRET=change-me-dev-secret-at-least-256-bits
JWT_ACCESS_EXP_MIN=30
JWT_REFRESH_EXP_DAYS=7
CORS_ORIGIN=http://localhost:5173
```

### JWT Configuration

JWT settings are in `.env`:
```env
JWT_SECRET=change-me-dev-secret-at-least-256-bits
JWT_ACCESS_EXP_MIN=30
JWT_REFRESH_EXP_DAYS=7
```

**Important**: Change the JWT secret in production!

## Troubleshooting

### Port Already in Use

If port 8080 is already in use:
```bash
# Find process using port 8080
lsof -i :8080

# Kill the process (replace PID with actual process ID)
kill -9 <PID>
```

Or change the port in `.env`:
```env
PORT=8081
```

### Database Connection Issues

1. **Check if PostgreSQL is running:**
   ```bash
   docker-compose ps postgres
   ```

2. **Check database logs:**
   ```bash
   docker-compose logs postgres
   ```

3. **Verify connection settings** in `.env` match your database

### Migration Errors

If Prisma migrations fail:
1. Check database logs for errors
2. Verify migration files are in `prisma/migrations/`
3. Check that database user has proper permissions
4. Try resetting the database: `npx prisma migrate reset` (WARNING: deletes all data)

### Build Errors

If TypeScript build fails:
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

## Development Tips

1. **Hot Reload**: Use `npm run dev` for automatic restarts on code changes
2. **Database Reset**: To reset database, stop containers and remove volumes:
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```
3. **View Database**: Use Prisma Studio to view/edit database:
   ```bash
   npm run studio
   ```

## Project Structure

```
backend-express/
├── src/
│   ├── config/          # Configuration (CORS, JWT, database, logger, swagger)
│   ├── errors/          # Custom error classes
│   ├── middleware/      # Express middleware (auth, error handling, validation)
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   └── server.ts        # Application entry point
├── prisma/
│   ├── migrations/      # Database migrations
│   └── schema.prisma    # Database schema
├── docker-compose.yml
├── Dockerfile
├── package.json
└── tsconfig.json
```

## Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Security**: Helmet, CORS

## Next Steps

- Set up CI/CD pipeline
- Configure production environment variables
- Add more API endpoints
- Implement additional security features
- Add integration tests
- Set up monitoring and logging


