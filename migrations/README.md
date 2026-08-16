# Database Migrations Service

This directory contains the dedicated Railway service for running Alembic database migrations.

## How It Works

1. **Runs once per deployment** — The service executes `alembic upgrade head` and exits
2. **Railway restart policy**: `NEVER` — Prevents the service from restarting after completion
3. **Dependencies**: Copies backend code from `../backend/` (migrations need access to SQLAlchemy models)

## Railway Configuration

This service is configured via `railway.toml`:

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "migrations/Dockerfile"

[deploy]
restartPolicyType = "NEVER"
numReplicas = 1
```

**Important:** The build context is the project root (not `migrations/`), so the Dockerfile references `backend/` directory.

## Setup in Railway Dashboard

1. **Create New Service**: Railway Dashboard → + New → Empty Service
2. **Name**: `backend-migrations`
3. **Connect Repo**: Settings → Source → Connect GitHub repo
4. **Root Directory**: Leave empty or set to `.` (project root)
5. **Environment Variables**: Add `DATABASE_URL` (reference from Postgres service)

Railway will automatically detect and use the `migrations/railway.toml` configuration.

## Manual Deployment

To run migrations manually:

```bash
railway link
railway up --service backend-migrations
railway logs --service backend-migrations
```

## Deployment Order

**First deployment:**
1. Deploy `backend-migrations` service → creates tables
2. Deploy `backend` service → connects to existing tables
3. Deploy `frontend` service → calls backend API

**Schema changes:**
1. Add new migration file to `backend/alembic/versions/`
2. Push to GitHub
3. Manually trigger `backend-migrations` service in Railway dashboard
4. Backend auto-deploys and uses new schema

## Troubleshooting

**Service keeps restarting:**
- Check `restartPolicyType` is set to `NEVER` in railway.toml

**Migration fails with connection error:**
- Verify `DATABASE_URL` environment variable is set
- Check it references the Postgres service

**Tables not created:**
- Check logs: Railway Dashboard → backend-migrations → Deployments → View Logs
- Verify all migration files are in `backend/alembic/versions/`
