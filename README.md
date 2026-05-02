# Team Task Manager

A full-stack collaborative task management web application — a simplified Trello/Asana clone with role-based access control.

## Live Demo

- **Frontend:** `https://your-frontend.railway.app`
- **Backend API:** `https://your-backend.railway.app`

---

## Features

- **Authentication** — Signup/Login with JWT tokens (bcrypt password hashing), confirm password field, show/hide password toggle
- **Project Management** — Create projects, invite members by email
- **Role-Based Access** — Creator, Admin, Member with distinct permissions
- **Task Management** — Create tasks with title, description, due date, priority, assignee
- **Kanban Board** — Tasks grouped by status (To Do / In Progress / Done)
- **Dashboard** — Charts for tasks by status, priority, tasks per user, overdue count
- **Filters** — Filter tasks by status and priority


---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Query, Recharts |
| Backend | Node.js, Express.js |
| Database | MongoDB (via Mongoose ODM) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Deployment | Railway |

---

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── index.js              # Express app entry point
│   │   ├── lib/
│   │   │   └── db.js             # MongoDB connection
│   │   ├── models/
│   │   │   ├── User.js           # User schema
│   │   │   ├── Project.js        # Project + members + createdBy schema
│   │   │   └── Task.js           # Task schema
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT + role middleware
│   │   └── routes/
│   │       ├── auth.js           # Signup, Login, Me
│   │       ├── projects.js       # CRUD + member management
│   │       ├── tasks.js          # CRUD with RBAC
│   │       ├── dashboard.js      # Aggregated stats
│   │       └── users.js          # User search
│   ├── .env.example
│   ├── railway.toml
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Layout.jsx        # Sidebar + navigation
    │   │   └── Modal.jsx         # Reusable modal
    │   ├── context/
    │   │   └── AuthContext.jsx   # JWT auth state
    │   ├── lib/
    │   │   └── api.js            # Axios instance with auth headers
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── SignupPage.jsx
    │   │   ├── DashboardPage.jsx # Charts + stats
    │   │   ├── ProjectsPage.jsx  # Project list + create
    │   │   ├── ProjectDetailPage.jsx # Team management
    │   │   └── TasksPage.jsx     # Kanban board
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── .env.example
    ├── railway.toml
    └── package.json
```

---

## Database Design

### User
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | Auto-generated |
| `name` | String | Required |
| `email` | String | Required, unique |
| `password` | String | Bcrypt hashed (12 rounds) |
| `createdAt` | Date | Auto timestamp |
| `updatedAt` | Date | Auto timestamp |

### Project
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | Auto-generated |
| `name` | String | Required |
| `description` | String | Optional |
| `createdBy` | ObjectId | Ref → User (project creator, protected) |
| `members` | Array | Embedded: `{ user: ObjectId→User, role: ADMIN/MEMBER, joinedAt }` |
| `createdAt` | Date | Auto timestamp |
| `updatedAt` | Date | Auto timestamp |

### Task
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | Auto-generated |
| `title` | String | Required |
| `description` | String | Optional |
| `dueDate` | Date | Optional |
| `priority` | Enum | LOW / MEDIUM / HIGH (default: MEDIUM) |
| `status` | Enum | TODO / IN_PROGRESS / DONE (default: TODO) |
| `project` | ObjectId | Ref → Project (required) |
| `assignedTo` | ObjectId | Ref → User (nullable) |
| `createdBy` | ObjectId | Ref → User (required) |
| `createdAt` | Date | Auto timestamp |
| `updatedAt` | Date | Auto timestamp |

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free) — [mongodb.com/atlas](https://www.mongodb.com/atlas)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/team-task-manager.git
cd team-task-manager
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env` file:

```env
MONGODB_URI=mongodb+srv://your-user:your-password@cluster.mongodb.net/taskmanager?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Start the backend:

```bash
npm run dev
```

Backend runs on `http://localhost:5000`

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:
- **Local:** `http://localhost:5173`
- **Network (phone/tablet):** `http://<your-local-ip>:5173`

> No `.env` needed for local dev — Vite proxy forwards `/api` requests to `localhost:5000` automatically.
> Vite is configured with `host: true` so the app is accessible from any device on the same Wi-Fi.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/taskmanager` |
| `JWT_SECRET` | Secret key for JWT signing | `any-long-random-string` |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` or `production` |
| `FRONTEND_URL` | Allowed CORS origin | `https://your-frontend.railway.app` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL (production only) | `https://your-backend.railway.app/api` |

---

## Deployment on Railway

### Step 1 — Push code to GitHub

Make sure your code is pushed to a GitHub repository.

### Step 2 — Create a Railway project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project**

### Step 3 — Deploy the Backend

1. **New Service** → **GitHub Repo** → select your repo
2. Set **Root Directory** to `backend`
3. Add environment variables:
   - `MONGODB_URI` → your MongoDB Atlas URI
   - `JWT_SECRET` → any long random string
   - `FRONTEND_URL` → your frontend Railway URL (add after Step 4)
   - `NODE_ENV` → `production`
4. Railway uses `railway.toml` — start command is `node src/index.js`

### Step 4 — Deploy the Frontend

1. **New Service** → **GitHub Repo** → same repo
2. Set **Root Directory** to `frontend`
3. Add environment variable:
   - `VITE_API_URL` → `https://your-backend-service.railway.app/api`
4. Railway uses `railway.toml` — builds with Vite, serves with `npx serve dist`

### Step 5 — Update CORS

Go back to the backend service → Variables → update `FRONTEND_URL` to your frontend's Railway URL.

---

## API Endpoints

All protected routes require header: `Authorization: Bearer <token>`

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/signup` | Register new user | No |
| POST | `/api/auth/login` | Login, returns JWT | No |
| GET | `/api/auth/me` | Get current user | Yes |

### Projects
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/projects` | List user's projects | Any |
| POST | `/api/projects` | Create project (creator = Admin) | Any |
| GET | `/api/projects/:id` | Get project details | Member+ |
| PUT | `/api/projects/:id` | Update project name/description | Admin |
| DELETE | `/api/projects/:id` | Delete project + all tasks | Creator only |
| POST | `/api/projects/:id/members` | Add member by email | Admin |
| DELETE | `/api/projects/:id/members/:userId` | Remove member (not creator) | Admin |
| PUT | `/api/projects/:id/members/:userId/role` | Change member role | Admin |

### Tasks
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/tasks?projectId=` | List tasks (filter by status/priority) | Member+ |
| POST | `/api/tasks` | Create task | Admin |
| GET | `/api/tasks/:id` | Get single task | Member+ |
| PUT | `/api/tasks/:id` | Update task | Admin (all fields) / Member (status only) |
| DELETE | `/api/tasks/:id` | Delete task | Admin |

### Dashboard
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/dashboard` | Global stats across all user's projects | Yes |
| GET | `/api/dashboard/project/:id` | Stats for a specific project | Member+ |

### Users
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users/search?email=` | Search users by email | Yes |

---

## Role-Based Access Control

| Action | Creator | Admin | Member |
|--------|---------|-------|--------|
| Create tasks | ✅ | ✅ | ❌ |
| Edit all task fields | ✅ | ✅ | ❌ |
| Update task status (own tasks) | ✅ | ✅ | ✅ |
| Delete tasks | ✅ | ✅ | ❌ |
| Add members | ✅ | ✅ | ❌ |
| Remove members (non-creator) | ✅ | ✅ | ❌ |
| Change member roles | ✅ | ✅ | ❌ |
| Delete project | ✅ | ❌ | ❌ |
| Remove project creator | ❌ | ❌ | ❌ |
| View project & tasks | ✅ | ✅ | ✅ |

> RBAC is enforced on **both** the frontend (buttons hidden) and backend (403 returned if API called directly).
> Multiple admins are supported — all non-creator admins have identical permissions.
