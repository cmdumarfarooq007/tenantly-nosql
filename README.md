# ⚡ Tenantly NoSQL | Multi-Tenant SaaS Platform with Polyglot Persistence

> **An enterprise B2B SaaS project management and governance platform demonstrating modern NoSQL Polyglot Persistence across MongoDB, Redis In-Memory Cache, and AWS DynamoDB Cloud.**

---

## 🏗️ Polyglot Persistence Architecture Overview

Tenantly NoSQL separates operational workloads, high-speed read acceleration, and append-only event sourcing across three specialized NoSQL database engines:

```
                                  ┌──────────────────────────────────────────┐
                                  │          React 18 Frontend SPA           │
                                  │   Real-time Cache HIT / MISS Telemetry   │
                                  │   Live AWS DynamoDB Tenant Activity Feed │
                                  └────────────────────┬─────────────────────┘
                                                       │ HTTP REST API (JWT)
                                                       ▼
                                  ┌──────────────────────────────────────────┐
                                  │           Express.js Backend             │
                                  │   Multi-Tenant Subdomain Resolver        │
                                  │   Decoupled Node.js AppEventBus          │
                                  └───────┬────────────┬─────────────┬───────┘
                                          │            │             │
                    ┌─────────────────────┘            │             └─────────────────────┐
                    ▼ (Cache-Aside Reads)              ▼ (Direct CRUD)                     ▼ (Async Event Sourcing)
      ┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────────────┐
      │     Redis In-Memory Cache    │  │       MongoDB Database       │  │      AWS Cloud DynamoDB      │
      │         (Port 6379)          │  │         (Port 27017)         │  │     Region: ap-south-1       │
      ├──────────────────────────────┤  ├──────────────────────────────┤  ├──────────────────────────────┤
      │ • Role: Sub-millisecond read │  │ • Role: Primary operational  │  │ • Role: Immutable append-    │
      │   acceleration (1-3ms)       │  │   source of truth            │  │   only audit & event trail   │
      │ • Cache-Aside Pattern        │  │ • Database: tenantly-nosql   │  │ • Table: TenantActivity      │
      │ • Dynamic TTL (10s - 300s)   │  │ • Collections: tenants,      │  │ • PK: TENANT#<tenant_id>     │
      │ • Auto-eviction on mutations │  │   users, projects, tasks,    │  │ • SK: TIMESTAMP#<iso>#<uuid> │
      │ • Dashboard bypass policy    │  │   clients, meetings          │  │ • Auto-Expiry: 2-Hour TTL    │
      │   (zero cache pollution)     │  │ • Scoped by tenant_id index  │  │   (`tenantly-dynamo-ttl`)    │
      └──────────────────────────────┘  └──────────────────────────────┘  └──────────────────────────────┘
```

---

## 🗄️ Database Tier Responsibilities

| Database | Technology | Role | Data Stored | Lifecycle & Retention |
| :--- | :--- | :--- | :--- | :--- |
| **MongoDB** | Document Store (Mongoose) | **Primary Operational Store** | Tenants, Users, Projects, Tasks, Clients, Meetings | Persistent source of truth. Scoped strictly by `tenant_id`. |
| **Redis** | In-Memory Key-Value (`ioredis`) | **Read Acceleration Layer** | Project listings, Task boards, Client profiles, Meeting agendas | Dynamic TTL (10s - 300s, selectable live in UI dock). Auto-invalidated upon mutations (`POST`, `PUT`, `DELETE`). |
| **AWS DynamoDB** | Cloud NoSQL Table (`@aws-sdk/lib-dynamodb`) | **Event Sourcing & Audit Stream** | `LOGIN`, `TASK_CREATED`, `TASK_UPDATED`, `TASK_DELETED`, `PROJECT_CREATED`, `CLIENT_CREATED`, `MEETING_SCHEDULED` | Append-only. Automatically pruned by AWS DynamoDB background engine after **2 Hours** (`tenantly-dynamo-ttl`). |

---

## 🎓 Technology Stack

- **Frontend:** React 18, React Router v6, Bootstrap 5, Lucide Icons, Axios with Interceptors, Custom CSS Design System (`:root` variables).
- **Backend:** Node.js (ES6+), Express.js, JWT (`jsonwebtoken`), Password Hashing (`bcryptjs`), Security Headers (`helmet`, `cors`, `morgan`).
- **Operational Database:** MongoDB Community Server / Atlas with Mongoose 8.
- **In-Memory Cache:** Redis Server (`ioredis`) with custom pattern invalidation.
- **Cloud Database:** AWS DynamoDB (`@aws-sdk/client-dynamodb` & `@aws-sdk/lib-dynamodb`) in AWS region `ap-south-1`.
- **Event Bus:** Node.js `EventEmitter` (`AppEventBus`) for decoupled asynchronous audit streaming.

---

## 🌟 Key Application Features

### 1. 🛡️ Multi-Tenant Logical Isolation
- Logical data segregation enforced across all MongoDB queries using compound indexing on `tenant_id`.
- Tenant workspace resolution via custom subdomain headers (`demo.app` or `X-Tenant-Subdomain`) and authenticated JWT payloads.

### 2. ⚡ Real-Time NoSQL Cache Telemetry & Invalidation
- **Top Telemetry Indicator Banner:** Real-time visibility into whether the current screen data was served from **`Redis (CACHE HIT ~ 1-3ms)`** or **`MongoDB (CACHE MISS ~ 25-45ms)`**.
- **Floating Demo Dock:** Allows live adjustment of Redis TTL (5s, 10s, 30s, 60s) and manual cache flushing without server restarts.
- **Cache Invalidation:** Mutations (`createTask`, `updateProject`, `deleteClient`) automatically purge matching Redis namespaces (`projects:<tenantId>:*`, `tasks:project:<tenantId>:*`) ensuring zero stale reads.
- **Dashboard Isolation:** Requests to `/dashboard` bypass the Redis cache (`skipCache=true`) to guarantee fresh real-time aggregations without polluting entity cache keys.

### 3. ☁️ AWS DynamoDB Event Sourcing & 2-Hour TTL
- Every domain mutation triggers an asynchronous event (`clientCreated`, `taskCreated`, `projectCreated`, `login`) via `AppEventBus`.
- Events are formatted with a multi-tenant Single-Table Key Pattern (`PK = TENANT#<id>`, `SK = TIMESTAMP#<iso>#<uuid>`) and sent to AWS DynamoDB in Mumbai (`ap-south-1`).
- Stamped with `tenantly-dynamo-ttl` and `expiresAt` for automatic cloud deletion 2 hours after creation.
- Displayed live in the **Tenant Activity & Audit Trail** section on the main Dashboard.

### 4. 📋 Project & Kanban Task Management
- Project tracking (Active, In Progress, Completed, Archived) with budget and progress tracking.
- Kanban task board (`todo` → `in_progress` → `completed`) with priority tags (`low`, `medium`, `high`) and member assignments.

### 5. 👥 Client CRM & Meeting Scheduling
- Full client accounts module with allotted budgets, assigned account managers, and nested client contacts.
- Meeting scheduler linked to clients and project milestones with direct meeting links.

---

## 📂 Project Architecture & Directory Structure

```
tenantly-nosql/
├── docs/
│   ├── architecture.md           # Full system architecture specification & Mermaid diagrams
│   └── API.md                    # REST API endpoints specification
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js             # MongoDB connection (tenantly-nosql)
│   │   │   ├── redis.js          # Redis client, dynamic TTL & pattern eviction
│   │   │   └── dynamodb.js       # AWS DynamoDB client, 2-Hour TTL & event helpers
│   │   ├── controllers/
│   │   │   ├── authController.js     # Auth, RBAC & DynamoDB LOGIN event
│   │   │   ├── projectController.js  # Project CRUD + Redis Cache + EventBus
│   │   │   ├── taskController.js     # Task Kanban + Redis Cache + EventBus
│   │   │   ├── clientController.js   # Client CRM + Redis Cache + EventBus
│   │   │   ├── meetingController.js  # Meetings + Redis Cache + EventBus
│   │   │   ├── tenantController.js   # Multi-tenant workspace management
│   │   │   └── activityController.js # DynamoDB Activity Stream endpoint (/api/activities)
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js     # JWT verification & role authorization guards
│   │   │   └── errorMiddleware.js    # Global error handler
│   │   ├── models/                   # Mongoose Schemas (Tenant, User, Project, Task, Client, Meeting)
│   │   ├── routes/                   # Express REST route definitions
│   │   ├── utils/
│   │   │   └── eventBus.js           # Decoupled Event Emitter logging to DynamoDB
│   │   ├── app.js                    # Express application entry & health checks
│   │   └── initDb.js                 # Database drop, creation & seed script
│   ├── .env                          # Backend environment variables
│   ├── .env.example                  # Environment configuration template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── NoSqlTopBanner.js     # Real-time Cache HIT/MISS Telemetry Banner
│   │   │   ├── NoSqlDemoDock.js      # Floating Redis TTL slider and Cache Inspector
│   │   │   ├── Sidebar.js            # Workspace navigation sidebar
│   │   │   ├── ProtectedRoute.js     # Client route security guard
│   │   │   └── modals/               # Modals for Projects, Tasks, Clients, Users
│   │   ├── context/
│   │   │   └── AuthContext.js        # Global authentication state
│   │   ├── pages/
│   │   │   ├── Dashboard.js          # Workspace stats + Live AWS DynamoDB Activity Feed
│   │   │   ├── Projects.js           # Projects grid with Redis caching
│   │   │   ├── AllTasks.js           # Workspace-wide Kanban board
│   │   │   ├── Clients.js            # Corporate client accounts
│   │   │   ├── Meetings.js           # Upcoming syncs & calendar
│   │   │   └── Users.js              # Team member management
│   │   └── utils/
│   │       └── api.js                # Axios client with JWT & cache headers
│   └── package.json
│
└── package.json                      # Root workspace scripts
```

---

## 🚀 Setup & Execution Guide

### 1. Prerequisites
- **Node.js** (v18+)
- **MongoDB** running locally on port `27017`
- **Redis Server** running on port `6379` (WSL / native service)
- **AWS DynamoDB Account** (Table: `TenantActivity` in `ap-south-1`)

### 2. Configure Backend Environment
Create or edit `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/tenantly-nosql
JWT_SECRET=supersecretkey_at_least_32_characters_long_for_security
FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# Redis Cache Configuration
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_TTL=30

# AWS DynamoDB Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
DYNAMODB_TABLE_NAME=TenantActivity
DYNAMODB_TTL_HOURS=2
```

### 3. Initialize & Seed MongoDB (`tenantly-nosql`)
```bash
cd backend
npm run init-db
```
*This drops any previous test database and provisions fresh demo tenants, users, projects, tasks, clients, and meetings.*

### 4. Start the Application
In separate terminal windows:

**Start Backend API:**
```bash
cd backend
npm run dev
```
*API runs at `http://localhost:5000` (Health check at `http://localhost:5000/api/health`)*

**Start Frontend Client:**
```bash
cd frontend
npm start
```
*Client runs at `http://localhost:3000`*

---

## 🔑 Evaluation Demo Credentials

| Portal | Subdomain | Email Address | Password | Role Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **System Portal** | *(None)* | `superadmin@system.com` | `Admin@123` | Platform oversight, provision new tenants |
| **Tenant Admin** | `demo` | `admin@demo.com` | `Admin@123` | Full workspace governance, project/client creation |
| **Standard User** | `demo` | `user1@demo.com` | `Admin@123` | Task execution, Kanban board progress updates |

---

## 🧪 Quick Demonstration Walkthrough for Evaluators

1. **MongoDB CRUD Verification**:
   - Open [`backend/src/controllers/taskController.js`](file:///backend/src/controllers/taskController.js) (Line 37 for `Task.create` and Line 107 for `Task.find`).
2. **Redis Cache-Aside Verification**:
   - Navigate to `/projects` in the browser: First load shows **`CACHE MISS (~25-45ms) • Source: MongoDB`**.
   - Refresh `/projects`: Second load shows **`CACHE HIT (~1-3ms) • Source: Redis`**.
   - Create a new project: Observe Redis keys automatically evict via `deleteCachePattern`.
3. **AWS DynamoDB Event Sourcing Verification**:
   - Log into the app or create a task.
   - Look at the bottom of the **Dashboard** under **Tenant Activity & Audit Trail**: The event appears live with its **2-Hour TTL badge**.
   - Open AWS DynamoDB Console (`ap-south-1` ➔ `TenantActivity` ➔ *Explore items*): Click **Run** to view the live cloud document.
