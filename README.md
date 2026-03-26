# HRMS Authentication System

Complete authentication module for HRMS using:

- Frontend: React (Vite), Axios, React Router, Tailwind
- Backend: Node.js, Express, Supabase PostgreSQL, Drizzle ORM
- Auth: JWT + protected routes

## Folder Structure

```text
hrms auth/
  backend/
    src/
      controllers/
      db/
      middleware/
      routes/
      validators/
      index.js
    drizzle.config.js
    .env.example
  frontend/
    src/
      api/
      components/
      context/
      pages/
      App.jsx
      main.jsx
      index.css
    .env.example
```

## Backend Setup

1. Go to backend:

```bash
cd backend
```

2. Create env file:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Update `.env` values:

- `DATABASE_URL` (Supabase PostgreSQL connection string)
- `DATABASE_SSL=true`
- `JWT_SECRET` (strong random secret)
- `CLIENT_URL` (frontend URL)

Example Supabase connection format:

```env
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[DB-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
DATABASE_SSL=true
```

How to get this:

- Open Supabase project
- Go to `Project Settings` -> `Database`
- Copy `Connection string` (URI format, Transaction pooler)
- Paste in `.env` as `DATABASE_URL`

4. Create/update DB schema in Supabase:

```bash
npm run db:push
```

5. Run backend:

```bash
npm run dev
```

Backend runs on `http://localhost:5000`.

## Frontend Setup

1. Go to frontend:

```bash
cd frontend
```

2. Create env file:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Start frontend:

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`.

## API Endpoints

- `POST /api/auth/signup`
  - Body: `name`, `email`, `password`, `organization_name`, `mobile_number`
- `POST /api/auth/login`
  - Body: `email`, `password`
  - Response: JWT token + user
- `GET /api/auth/profile` (Protected)
  - Header: `Authorization: Bearer <token>`

## Implemented Features

- Admin signup with required field validation
- Email format validation and unique email check
- Mobile number validation (numeric + exactly 10 digits)
- Password hashing with bcrypt
- JWT-based login authentication
- Protected profile API with middleware
- Clean frontend pages:
  - Signup
  - Login
  - Dashboard
- Error messages shown in UI
- Redirect to dashboard after successful login
- Logout functionality (clears token + user session)

## Notes

- `users` table fields:
  - `id` (PK)
  - `name`
  - `email` (unique)
  - `password`
  - `organization_name`
  - `mobile_number`
  - `role` (default: `admin`)
  - `created_at`

- You can extend this foundation with refresh tokens, password reset, and role-based access control.
