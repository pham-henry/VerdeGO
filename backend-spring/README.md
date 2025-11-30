# VerdeGO Backend

Spring Boot 3.3 backend API for VerdeGO application with PostgreSQL database.

## Prerequisites

- **Java 21** (JDK 21)
- **Maven 3.9+**
- **Docker & Docker Compose** (for containerized setup)
- **PostgreSQL 16** 

## Quick Start with Docker Compose (Recommended)

The easiest way to run the backend and database is using Docker Compose.

### 1. Start Services

```bash
cd backend
docker-compose up -d
```

This will start:
- PostgreSQL 16 database on port `5432`
- Spring Boot backend on port `8080`
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
docker-compose logs -f verdego-backend

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
docker-compose build verdego-backend
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
cd backend
docker-compose up -d postgres
```

### 2. Configure Application

The `application.yml` is already configured for local development:
- Database: `localhost:5432/verdego`
- Username: `verdego`
- Password: `verdego`

### 3. Build and Run

```bash
cd backend

# Build the project
mvn clean install

# Run the application
mvn spring-boot:run
```

Or run the JAR directly:

```bash
mvn clean package
java -jar target/api-0.0.1-SNAPSHOT.jar
```

### 4. Run Tests

```bash
mvn test
```

## Accessing the API

### Base URL
- **Local**: http://localhost:8080
- **API Documentation**: http://localhost:8080/swagger-ui

### Health Check
- **Actuator Health**: http://localhost:8080/actuator/health

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

## Testing with Swagger UI

1. Open http://localhost:8080/swagger-ui in your browser
2. Click **Authorize** button (lock icon)
3. Enter your JWT token: `Bearer <your-access-token>`
4. Click **Authorize** and **Close**
5. Test protected endpoints directly from Swagger UI

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

Flyway automatically runs database migrations on startup. Migrations are located in:
```
src/main/resources/db/migration/
```

Current migrations:
- `V1__init.sql` - Creates users table

## Configuration

### Environment Variables

You can override database configuration using environment variables:

```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/verdego
export SPRING_DATASOURCE_USERNAME=verdego
export SPRING_DATASOURCE_PASSWORD=verdego
```

### JWT Configuration

JWT settings are in `application.yml`:
```yaml
verdego:
  jwt:
    secret: change-me-dev-secret-at-least-256-bits
    access-exp-min: 30
    refresh-exp-days: 7
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

Or change the port in `application.yml`:
```yaml
server:
  port: 8081
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

3. **Verify connection settings** in `application.yml` match your database

### Migration Errors

If Flyway migrations fail:
1. Check database logs for errors
2. Verify migration files are in `src/main/resources/db/migration/`
3. Check that database user has proper permissions

### Build Errors

If Maven build fails:
```bash
# Clean and rebuild
mvn clean install -U

# Skip tests if needed
mvn clean install -DskipTests
```

## Development Tips

1. **Hot Reload**: Use Spring Boot DevTools (if added) for automatic restarts
2. **Database Reset**: To reset database, stop containers and remove volumes:
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```
3. **View SQL Queries**: Enable SQL logging in `application.yml`:
   ```yaml
   spring:
     jpa:
       show-sql: true
   ```

## Project Structure

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/verdego/api/
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── common/        # Common utilities & exceptions
│   │   │   ├── config/        # Configuration classes
│   │   │   ├── security/      # JWT & security
│   │   │   └── user/          # User entity & endpoints
│   │   └── resources/
│   │       ├── db/migration/  # Flyway migrations
│   │       └── application.yml
│   └── test/                  # Test files
├── docker-compose.yml
├── Dockerfile
└── pom.xml
```

## Next Steps

- Set up CI/CD pipeline
- Configure production environment variables
- Add more API endpoints
- Implement additional security features
- Add integration tests
