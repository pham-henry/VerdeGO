## VerdeGO – Carbon Footprint Tracker

Full‑stack app for logging daily commutes, tracking carbon footprint, and setting weekly sustainability goals.  
Frontend: **React + Vite + TypeScript** · Backend: **Express + Prisma + PostgreSQL** · Deployed via **Docker Compose**.

### Core Features
- **Secure auth**: Email/password signup and login with JWT access/refresh tokens.
- **Protected app**: All API routes and pages (`/home`, `/logger`, `/tracker`, `/goals`, `/recommender`, `/account`) require login. Only `/auth`, `/login`, and `/register` are public.
- **Commute logger**: Track mode, distance, duration, and notes for each commute.
- **Emissions dashboard**: Visualize emissions over time and by mode on the home page.
- **Weekly goals**: Per‑user weekly goals (zero‑emission km, emission cap, commute count) stored in Postgres and surfaced on Home + Goals pages.
- **Route recommender**: Get eco‑friendly route suggestions (backend stubbed for CS160 demo).

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, React Router, Recharts.
- **Backend**: Node 20, Express + TypeScript, Prisma ORM, PostgreSQL 16, JWT.
- **Infra/Tooling**: Docker & Docker Compose, pgAdmin (optional, dev profile).

---

## Running the App with Docker (recommended)

From the project root (`VerdeGO/`):

1. **Start all services**
   ```bash
   docker-compose up -d
   ```

2. **URLs**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:8080`
   - Postgres: `localhost:5432`
   - pgAdmin (dev profile): `http://localhost:5050`

3. **Apply database migrations inside backend container (first run only)**
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   ```

4. **Rebuild images after code changes**
   - Backend:
     ```bash
     docker-compose build backend
     docker-compose up -d backend
     ```
   - Frontend:
     ```bash
     docker-compose build frontend
     docker-compose up -d frontend
     ```

5. **Stop everything**
   ```bash
   docker-compose down
   # or to also wipe DB data:
   docker-compose down -v
   ```

---

## Local Development (without full Docker stack)

### Backend (Express + Prisma)

```bash
cd backend-express

# 1. Start Postgres via Docker (DB only)
docker-compose up -d postgres

# 2. Install deps
npm install

# 3. Configure env
cp .env.example .env
# Edit .env as needed

# 4. Run migrations (dev)
npx prisma migrate dev

# 5. Start dev server
npm run dev
```

Backend runs on `http://localhost:8080` and exposes `/api/*` routes.

### Frontend (React + Vite)

```bash
cd frontend

# 1. Install deps
npm install

# 2. Configure env
cp .env.example .env  # if you add one
# Ensure VITE_API_URL matches backend, e.g.:
# VITE_API_URL=http://localhost:8080

# 3. Start dev server
npm run dev
```

Frontend runs on `http://localhost:5173`.

---

## Auth & Route Protection

- **Backend**
  - Public: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/health`.
  - Protected (JWT required via `Authorization: Bearer <accessToken>`):  
    `/api/users/*`, `/api/commutes/*`, `/api/emissions/*`, `/api/recommend`, `/api/goals/*`, `/api/test/*`.

- **Frontend**
  - Auth state is managed by `AuthContext` (`AuthProvider` + `useAuth()`).
  - Public pages: `Auth.tsx` (`/` and `/auth`), `Login.tsx` (`/login`), `Register.tsx` (`/register`).
  - Protected pages are wrapped in `RequireAuth` in `main.tsx`:
    - `/home`, `/logger`, `/tracker`, `/goals`, `/recommender`, `/account`.
  - On successful login/registration, the app stores tokens + user info in context and redirects to `/home`.

---

## Key API Endpoints (summary)

- **Auth**
  - `POST /api/auth/register` – create user, returns access + refresh tokens.
  - `POST /api/auth/login` – login, returns access + refresh tokens.
  - `POST /api/auth/refresh` – refresh access token.

- **User**
  - `GET /api/users/me` – get current user profile.
  - `PATCH /api/users/me` – update profile (name).
  - `POST /api/users/change-password` – change password.

- **Commutes & Emissions**
  - `POST /api/commutes`
  - `GET /api/commutes?user_email=...&from=...&to=...`
  - `DELETE /api/commutes/:id?user_email=...`
  - `GET /api/emissions/summary?user_email=...&groupBy=day|mode&from=...&to=...`

- **Weekly Goals**
  - `GET /api/goals?user_email=...`
  - `PUT /api/goals`
  - `POST /api/goals/reset`

- **Recommender**
  - `POST /api/recommend`

---

## Project Structure (high‑level)

```text
VerdeGO/
├── backend-express/
│   ├── src/
│   │   ├── routes/         # auth, users, commutes, emissions, recommender, goals
│   │   ├── services/       # domain logic (auth, user, commute, emissions, goals)
│   │   ├── middleware/     # auth, validation, error handler
│   │   └── server.ts       # Express app setup
│   ├── prisma/
│   │   ├── schema.prisma   # User, Commute, WeeklyGoal, etc.
│   │   └── migrations/
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/          # Auth, Login, Register, Home, Logger, Tracker, WeeklyGoals, etc.
│   │   ├── components/     # RequireAuth, layout pieces
│   │   ├── context/        # AuthContext
│   │   ├── lib/            # API client helpers
│   │   └── main.tsx        # Router + AuthProvider
│   └── Dockerfile
└── docker-compose.yml       # Orchestrates postgres, backend, frontend, pgAdmin
```

---

## Useful Dev Commands

- Prisma Studio (browse DB):
  ```bash
  cd backend-express
  npx prisma studio
  ```

- Regenerate Prisma client after schema changes:
  ```bash
  cd backend-express
  npx prisma generate
  ```

---

_Student project for CS160 – MIT‑style license._
