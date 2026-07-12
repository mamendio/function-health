# Task Manager

A small to-do task management application: a .NET Core Web API backend with a SQLite data
store, JWT login, and a React + TypeScript + MUI frontend.

# MVP Requirements
1) Single User
2) User Login
3) Creating Task(s)
    - Task Title
    - Task priority
    - Simple task detail
    - checkbox to add date/time
      - Complete by (date/time)
4) Updating Task
    - Title
    - Description
    - If toggled on
      - Complete by (date/time)
    - Status (Not done/Done)
5) Deleting Task
6) Task done? Remove from Task List
7) Sort by priority then by datetime
8) Error handling
    - Login
      - Wrong username/password => 401 error with a clear "Invalid username or password" message
      - Missing username/password => 400 error
      - The login form shows the message and keeps what the user typed
    - Creating / editing a task
      - Empty or whitespace-only title => 400 error; the form also shows a "Title is required" error before submitting
      - "Set a due date" checked but no valid date entered => validation error
      - Invalid due date => 400 error
      - Description longer than 1000 characters => 400 error
      - Any server error is shown in the dialog and the user's input is preserved
    - Loading / updating / deleting
      - Failed load of the task list => error message with a Retry button
      - Failed complete/toggle or delete => error banner
      - Updating or deleting a task that no longer exists => 404 error
    - Access / session
      - Any request to a task endpoint without a valid token => 401 error
      - If the token expires or is rejected mid-session => the app logs out and returns to the login screen
9) Test cases
    - Authentication
      - Request to a task endpoint without a token is rejected (401 error)
      - Login with a wrong password is rejected (401 error)
      - Login with a missing username/password is rejected (400 error)
      - Login with correct credentials returns a token that grants access
    - Creating tasks
      - A valid task is created (201): title is trimmed, priority defaults to Medium, and it appears in the list
      - An empty or whitespace-only title is rejected (400 error)
      - An invalid due date is rejected (400 error)
      - A missing due date is allowed (due date is optional)
    - Listing & sorting
      - Active tasks are ordered by priority (High to Low)
      - A completed task is hidden from the active list
    - Updating tasks
      - Edits are saved and persist (verified by re-fetching the task)
      - Updating a task that does not exist returns 404 error
    - Deleting tasks
      - Deleting a task removes it (204) and it disappears from the list
      - Deleting a task that does not exist returns 404 error

## Assumptions
- **Single user, single device.** The app is built for one person managing their own list. There is one login and no separation of data between users.
- **A basic daily to-do list.** The intended use is quick, common tasks a user marks done throughout the day — not a full planner. Complex weekly/recurring scheduling, calendar planning, and multi-user collaboration are intentionally out of scope (they live under Future Improvements).
- **Small data volume.** A personal daily list is tens, maybe low hundreds, of active tasks, so the list endpoint returns everything in a single sorted query with no pagination.
- **Low concurrency, local storage.** A file-based SQLite database is enough: there is effectively one writer (the single user) and no need for a networked database server.
- **Due dates are optional and stored in UTC**, with the browser rendering the user's local time.

## Authentication & ownership

The single login (JWT) gates **every** task endpoint — an unauthenticated request is rejected. Because the app is single-user, there is no second user and no per-user data to isolate, so the "User A cannot access User B's data" check does not apply here and I left that for a future improvement.

This is a deliberate, I made the login exists to gate access, and with one account there is no cross-user data that could leak. If this became multi-user, per-user ownership would be the first addition — a `UserId` on each task, read from the token's user claim and applied as a filter to every query (get/update/delete) would match on id and to that specific user.

## Ways to scale
1. **Swap SQLite for a Cloud based DB like PostgreSQL** SQLite is ideal for a single local user but not for many concurrent writers or multiple servers sharing one store. With EF Core this is mostly a provider + connection-string change and sticking to a relational database would work well given the scope
2. **Multiple users** Add a Users table with per-user ownership. And move the projects to be cloud based for scaling with requests. Azure Frontdoor for global access and load balancing and ddos protection. Then forward to Azure API Manager where we can perform additional auth checks if necessary and then lastly, Azure function apps which have scaled well being serverless functions (in some cases we may want the backend to keep a state so this could change)
3. **Add pagination**  so the list stays fast as tasks accumulate.

# Future Improvements
1) Multi-user
    - Create user with error handling (examples: username exist, password does not meet requirements, invalid inputs => should all provide explanation to user on why it errors)
    - Invite users to task board where multiple users can track and perform actions on similar tasks
        - Requires methods to ensure race cases are handled properly and updates are shown across users interfaces
    - Personal tasks (User A cannot see User B's tasks and vice versa)
    - Implementation: Add a `Users` table and never store the raw password — a "hash", via ASP.NET Core Identity or the BCrypt library. Give every task a `UserId` column, and on each request read the user's ID out of their login token and filter every database query by it. For shared boards, add `Board` and `BoardMembers` tables  and check that membership before allowing access.
        - Concurrent edits: if two people open the same task and both save, the second save can silently overwrite the first. To prevent this, add a version-stamp column that automatically changes on every save. When saving, compare the version the user started from against the current one; if they differ, someone else edited it first, so reject the save and ask them to reload.
        - Live updates across users: so everyone's screen updates without a manual refresh, use SignalR
2) Calendar view of tasks for the week
    - Implementation: Add `from`/`to` date query parameters to `GET /api/tasks` so the client can ask for just one week's tasks instead of all of them. Create a week calendar view on the frontend to list tasks by day.
3) View of completed tasks
    - Current caveots with out this feature. When a user completes a task and then tries to create another task with the same title/datetime, at first it failed stating that the task already exist (expected when this feature is active). For now, when a task is completed and the user tries to create a new one of the same information, it creates a new record in the database.
    - Implementation: Completed tasks are already saved in the database, so add a `status` (or `includeCompleted`) query parameter to `GET /api/tasks` that controls whether rows with `IsComplete = true` are included.
4) Daily or X minutes prior to task due time, send an alert/notification to the user
    - Implementation: Store when to remind the user - compute it as the due date minus a lead time. Add a `BackgroundService` that every minute looks for tasks whose reminder time has passed and that haven't been notified yet, sends an alert of some kind, and marks each as sent so it doesn't fire twice.
5) Complex task sorting and searching
    - Implementation: Add `search`, `sortBy`, `sortDir`, and filter parameters (priority, due-before/after) to `GET /api/tasks`. Add pagination (`page`/`pageSize`) so a long list loads in chunks instead of all at once. 
6) Task redundancy rejection
    - Reject a new task when an active task already has the same title and priority (and, if a due date is set, the same due date)
    - Deferred because "duplicate" is subjective for a to-do list (repeating chores, retries), so it needs clearer product rules before enforcing
    - Allow the user to configure what fields to be flagged for redundancy check
    - Implementation: Make the comparison configurable rather than hard-coded: store which fields count (title / priority / due date) in a small per-user settings record, show them as on/off toggles in the UI.
---

## Tech stack

Backend  - .NET 10 Web API (single project)
Auth     - JWT bearer, single seeded user
Database - EF Core + SQLite
Frontend - React 19 + TypeScript + MUI (Vite)
Tests    - xUnit

---

## Prerequisites

- [.NET SDK 10.0](https://dotnet.microsoft.com/en-us/download/dotnet/10.0)
- [Node.js 18+](https://nodejs.org/) and npm

## Running the app

The backend and frontend run as two processes. Start the backend first.

### 1. Backend (API)

```bash
cd backend/TaskManager.Api
dotnet run
```

- The API starts on **http://localhost:5080**.
- On first run it creates a SQLite database file (`tasks.db`)
- Swagger UI is available at **http://localhost:5080/swagger**.
- **Demo login:** `admin` / `password123`. These are configured under `Auth` in
  `appsettings.json` and are demo credentials, not production auth.

### 2. Frontend (web app)

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

- The app is served at **http://localhost:5173**.
- It talks to the API at the URL in `frontend/.env` (`VITE_API_URL=http://localhost:5080`).
  A `.env.example` is committed; copy it to `.env` if it isn't already present.
- Open http://localhost:5173 and log in with `admin` / `password123`.

## Running the tests

```bash
cd backend
dotnet test
```

## Inspecting the database (SQLite)

The data lives in `backend/TaskManager.Api/tasks.db`. 

### Handy queries

```sql
-- every task
SELECT * FROM Tasks;

-- active tasks, in the same order the app shows them
SELECT Id, Title, Priority, DueDate
FROM Tasks
WHERE IsComplete = 0
ORDER BY Priority DESC, (DueDate IS NULL), DueDate;

-- count tasks by status (0 = active, 1 = completed)
SELECT IsComplete, COUNT(*) AS Count
FROM Tasks
GROUP BY IsComplete;

```

### Creating the backend (Self notes)

```bash
# solution + API project
dotnet new sln -n TaskManager
dotnet new webapi --use-controllers -n TaskManager.Api -f net10.0
dotnet sln add TaskManager.Api/TaskManager.Api.csproj

# data + docs
dotnet add package Microsoft.EntityFrameworkCore.Sqlite
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Swashbuckle.AspNetCore

# auth
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package System.IdentityModel.Tokens.Jwt

# test project (xUnit)
dotnet new xunit -n TaskManager.Tests -f net10.0
dotnet sln add TaskManager.Tests/TaskManager.Tests.csproj
dotnet add TaskManager.Tests/TaskManager.Tests.csproj reference TaskManager.Api/TaskManager.Api.csproj
dotnet add TaskManager.Tests/TaskManager.Tests.csproj package Microsoft.AspNetCore.Mvc.Testing
```

### Creating the frontend (Self notes)

```bash
# React + TypeScript app
npm create vite@latest frontend 
- Select React and Typescript
cd frontend
npm install

# UI + data libraries
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material @mui/x-date-pickers dayjs axios
```
