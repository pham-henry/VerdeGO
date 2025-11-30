# VerdeGO - Carbon Footprint Tracker

A full-stack application for tracking daily commutes and carbon footprint, built with React + Vite frontend and Express.js + PostgreSQL backend.

## Features

- **Daily Commute Logger**: Log your daily commutes with mode, distance, duration, and notes
- **Carbon Footprint Tracker**: Visualize your emissions with charts (pie, line, bar) grouped by day, week, or mode
- **Weekly Goals**: Set and track weekly goals for zero-emission distance, emission caps, and commute counts
- **Transit Recommender**: Get route recommendations with eco-friendly, speed, and cost rankings
- **Home Dashboard**: View weekly stats and positive impact affirmations

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- React Router
- Recharts for data visualization

### Backend
- Express.js + TypeScript
- PostgreSQL 16
- Prisma ORM
- Docker & Docker Compose

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)

### Using Docker Compose (Recommended)

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8080
   - pgAdmin (optional): http://localhost:5050 (use `--profile dev`)

3. **Stop services:**
   ```bash
   docker-compose down
   ```

### Local Development

#### Backend Setup

1. **Navigate to backend:**
   ```bash
   cd backend-express
   ```

2. **Start PostgreSQL with Docker:**
   ```bash
   docker-compose up -d postgres
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

5. **Run migrations:**
   ```bash
   npm run migrate
   ```

6. **Start development server:**
   ```bash
   npm run dev
   ```

#### Frontend Setup

1. **Navigate to frontend:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

## Environment Variables

### Backend (.env)
```env
PORT=8080
NODE_ENV=development
DATABASE_URL=postgresql://verdego:verdego@localhost:5432/verdego?schema=public
JWT_SECRET=change-me-dev-secret-at-least-256-bits
JWT_ACCESS_EXP_MIN=30
JWT_REFRESH_EXP_DAYS=7
CORS_ORIGIN=http://localhost:5173
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8080
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

## API Endpoints

### Commutes
- `POST /api/commutes` - Create a commute
- `GET /api/commutes?user_email=...&from=...&to=...` - List commutes
- `DELETE /api/commutes/:id?user_email=...` - Delete a commute

### Emissions
- `GET /api/emissions/summary?user_email=...&groupBy=day|week|mode&from=...&to=...` - Get emission summary

### Recommender
- `POST /api/recommend` - Get route recommendations

### Auth (existing)
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token

## Project Structure

```
VerdeGO/
├── backend-express/     # Express.js backend
│   ├── src/
│   │   ├── routes/     # API routes
│   │   ├── services/   # Business logic
│   │   ├── middleware/ # Express middleware
│   │   └── server.ts   # Entry point
│   ├── prisma/         # Database schema & migrations
│   └── Dockerfile
├── frontend/           # React + Vite frontend
│   ├── src/
│   │   ├── pages/      # Page components
│   │   ├── lib/        # API client
│   │   └── main.tsx    # Entry point
│   └── Dockerfile
└── docker-compose.yml  # Docker orchestration
```

## Database Migrations

Run migrations:
```bash
cd backend-express
npm run migrate
```

## Development Tips

1. **Hot Reload**: Both frontend and backend support hot reload in development mode
2. **Database Reset**: To reset the database, stop containers and remove volumes:
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```
3. **View Database**: Use Prisma Studio:
   ```bash
   cd backend-express
   npm run studio
   ```

## License

MIT (student project)

