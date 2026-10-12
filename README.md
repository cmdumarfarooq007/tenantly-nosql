# ⚡ Tenantly Lite | Multi-Tenant SaaS Workspace & Governance System

> **A full-stack enterprise B2B SaaS platform showcasing core Full-Stack Web Development Course Outcomes using HTML5, CSS3, JavaScript (ES6+), React 18, Bootstrap 5, Node.js, Express.js, and MongoDB (Mongoose).**

---

## 🎓 Full-Stack Course Outcomes & Technologies Demonstrated

This repository implements all fundamental and advanced full-stack web development competencies:

| Technology / Domain | Course Outcomes & Implementation Highlights |
| :--- | :--- |
| **HTML5** | Semantic structure (`<aside>`, `<main>`, `<header>`, `<nav>`), form controls, input type validation (`email`, `password`, `date`), accessibility attributes. |
| **CSS3 & Styling** | Custom CSS variables (`:root` tokens), master design system, keyframe animations (`fadeInUp`, `slideInUp`), custom scrollbars, Bootstrap 5 integration, responsive media rules. |
| **JavaScript (ES6+)** | Promises, `async/await` handling, Array methods (`map`, `filter`, `reduce`), ES modules, object destructuring, dynamic object creation, JWT decoding. |
| **React 18** | Functional component architecture, React Hooks (`useState`, `useEffect`, `useContext`, `useParams`, `useNavigate`, `useLocation`), Context API state management (`AuthContext`), React Router v6 routing. |
| **Bootstrap 5** | Responsive 12-column grid system (`Container`, `Row`, `Col`), React-Bootstrap components (`Modal`, `Badge`, `Card`, `Form`, `Table`, `Alert`, `Button`). |
| **Node.js** | Asynchronous runtime, NPM module management, environment variables (`dotenv`), seed script execution. |
| **Express.js** | RESTful API design, controller-route separation, custom authentication middleware (`verifyToken`), role authorization guards (`authorize`), CORS & security headers (`helmet`, `morgan`). |
| **MongoDB & Mongoose** | NoSQL document database, Mongoose Schema definitions (`Tenant`, `User`, `Project`, `Task`, `AuditLog`), compound indexes, schema virtuals (`id`), document population (`populate()`), database seeding. |
| **Authentication & Security** | Password hashing (`bcryptjs`), stateless JSON Web Tokens (`jsonwebtoken`), strictly role-gated portal restrictions (`super_admin`, `tenant_admin`, `user`). |

---

## 🌟 Strategic Features

### 1. 🛡️ Multi-Tenant Data Isolation
- Logical data segregation using indexed `tenant_id` fields across all collections.
- Cross-tenant query protection enforced at both middleware and controller layers.

### 2. 🔐 Precision Role-Based Access Control (RBAC) & Portal Restrictions
- **Super Admin:** Platform-wide tenant management and audit logging.
- **Tenant Admin:** Organization management, user provisioning, project setup, and limit controls.
- **Employee (Standard User):** Project task execution, Kanban status updates, and deadline tracking.
- Strict portal role validation prevents unauthorized logins across portals.

### 3. 📊 Project & Kanban Task Management Engine
- Project lifecycle tracking (Active, Completed, Archived) with automatic progress completion percentage.
- Kanban task workflow (`todo` → `in_progress` → `completed`) with priority tags (`low`, `medium`, `high`) and assigned team members.
- Dynamic project name badges on the **All Tasks** view (`/tasks`), omitted on single project detail pages (`/projects/:id`) for optimal UX.

---

## 📂 Project Architecture

```
tenantly-lite/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # MongoDB connection using Mongoose
│   │   ├── controllers/
│   │   │   ├── authController.js     # Register, Login (with role checks), GetMe, Logout
│   │   │   ├── tenantController.js   # Tenant CRUD & statistics calculation
│   │   │   ├── userController.js     # User creation, team listing, updates, deletion
│   │   │   ├── projectController.js  # Project creation, listing, detail & status updates
│   │   │   └── taskController.js     # Task creation, list project tasks, list all workspace tasks
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js     # JWT verification & role authorization guards
│   │   │   └── errorMiddleware.js    # Express error handler
│   │   ├── models/
│   │   │   ├── Tenant.js             # Mongoose Tenant Schema
│   │   │   ├── User.js               # Mongoose User Schema
│   │   │   ├── Project.js            # Mongoose Project Schema
│   │   │   ├── Task.js               # Mongoose Task Schema
│   │   │   └── AuditLog.js           # Mongoose Audit Log Schema
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── tenantRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   ├── projectRoutes.js
│   │   │   └── taskRoutes.js
│   │   ├── app.js                    # Express app initialization
│   │   └── initDb.js                 # MongoDB database drop & seed runner
│   ├── .env                          # Backend environment variables
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.js            # Pixel-perfect navigation sidebar matching reference design
│   │   │   ├── ProtectedRoute.js     # Auth guard route wrapper
│   │   │   ├── ProjectModal.js       # React modal for Project create/edit with required field indicators
│   │   │   ├── TaskModal.js          # React modal for Task create/edit
│   │   │   └── UserModal.js          # React modal for Member create/edit
│   │   ├── context/
│   │   │   └── AuthContext.js        # React Context API for global authentication state
│   │   ├── pages/
│   │   │   ├── LandingPage.js        # Welcome hero page with 3 role portal selection cards
│   │   │   ├── Login.js              # Strict role-validated login form with red asterisk labels
│   │   │   ├── Register.js           # Organization registration form with client-side validation
│   │   │   ├── Dashboard.js          # Workspace statistics overview & recent project table
│   │   │   ├── Projects.js           # Projects grid with search, filter, and progress indicators
│   │   │   ├── ProjectDetails.js     # Single project Kanban board view
│   │   │   ├── AllTasks.js           # Workspace-wide Kanban board view displaying project tags
│   │   │   └── Users.js              # Team member management view
│   │   ├── utils/
│   │   │   └── api.js                # Axios HTTP client with JWT request interceptor
│   │   ├── index.css                 # Master UI Design System & CSS variables
│   │   ├── index.js                  # React DOM root entry
│   │   └── App.js                    # React Router v6 layout setup
│   └── package.json
│
├── package.json                      # Root npm scripts for local multi-service management
└── README.md
```

---

## 🚀 Local System Setup (Non-Docker)

### 1. Prerequisites
- **Node.js** (v18+)
- **MongoDB Community Server** running locally on `mongodb://127.0.0.1:27017`

### 2. Install All Dependencies
```bash
npm run install:all
```

### 3. Seed MongoDB Database (`tenantly-lite`)
```bash
npm run seed:backend
```

### 4. Start Backend Server
```bash
npm run dev:backend
```
*Backend API running at `http://localhost:5000`*

### 5. Start Frontend Client
```bash
npm run start:frontend
```
*Frontend running at `http://localhost:3000`*

---

## 🔑 Demo Evaluation Credentials

| Role Portal | Workspace Subdomain | Email Address | Password |
| :--- | :--- | :--- | :--- |
| **Super Admin** | *(None)* | `superadmin@system.com` | `Admin@123` |
| **Tenant Admin** | `demo` | `admin@demo.com` | `Admin@123` |
| **Employee** | `demo` | `user1@demo.com` | `User@123` |
