# Migration Service Setup for Railway

This guide explains how to run database migrations as a separate one-time job before the backend service starts.

## Architecture

**Old (single service):**
```
Backend Container
├─ Run migrations (alembic upgrade head)
└─ Start FastAPI server
```

**New (separate services):**
```
Migration Service (runs once) → Backend Service (starts after migrations complete)
```

## Setup Instructions

### 1. Create Migration Service in Railway

1. **Railway Dashboard** → Your Project → **+ New** → **Empty Service**
2. Name it: `backend-migrations`
3. **Settings** → **Source** → **Connect Repo** → Select your GitHub repo
4. **Settings** → **Root Directory**: `backend`
5. **Settings** → **Builder** → **Dockerfile Path**: `Dockerfile.migrate`

### 2. Configure Migration Service

**Settings → Deploy:**
- **Restart Policy**: `Never` (one-time job, doesn't restart)
- **Replicas**: `1` (migrations must run sequentially)

**Settings → Variables:**
- Add variable: `DATABASE_URL`
- Click **Add Reference** → Select **Postgres** → **DATABASE_URL**

### 3. Configure Backend Service Dependency

Railway doesn't have explicit dependency ordering, but you can control execution:

**Option A: Manual Trigger (Recommended)**
1. Deploy migrations first: Click **Deploy** on `backend-migrations` service
2. Wait for "Deployment Complete" (check logs show "Running upgrade... done")
3. Deploy backend: Click **Deploy** on `backend` service

**Option B: GitHub Actions Workflow (Automated)**

Create `.github/workflows/deploy-railway.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Railway CLI
        run: npm install -g @railway/cli
      
      - name: Run Migrations
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          railway link ${{ secrets.RAILWAY_PROJECT_ID }}
          railway up --service backend-migrations
          railway logs --service backend-migrations
      
  deploy:
    needs: migrate
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Backend Deploy
        run: echo "Railway auto-deploys backend from main branch"
```

**Setup:**
```bash
# Get your Railway token
railway login
railway whoami --token

# Add to GitHub Secrets:
# - RAILWAY_TOKEN (from above command)
# - RAILWAY_PROJECT_ID (from Railway dashboard URL)
```

### 4. Verify Migration Logs

**Migration Service Logs:**
```
Running upgrade 0003 -> 0004, Add forum tables for Mom Talk peer support
Running upgrade 0004 -> 0005, Add users table
Running upgrade 0005 -> 0006, Add diary sharing columns
Running upgrade 0006 -> 0007, Add provider to auth states
```

**Backend Service Logs:**
```
=== Database Configuration ===
DATABASE_URL (masked): postgresql+asyncpg://postgres:****@postgres.railway.internal:5432/railway
✓ AsyncEngine created successfully
INFO:     Started server process [1]
INFO:     Uvicorn running on http://0.0.0.0:8000
```

## Rollback Procedure

If a migration fails:

```bash
railway link
railway run --service backend-migrations "uv run alembic downgrade -1"
```

## Cost Impact

**Before:** 1 service running migrations + serving requests
**After:** 1 migration job (runs once) + 1 backend service

**Cost difference:** Negligible (~$0.01 per migration run)

## Benefits

✅ **No race conditions** — only one migration job runs at a time  
✅ **Faster backend startup** — no migration overhead  
✅ **Better observability** — separate logs for migrations vs runtime  
✅ **Easy rollback** — run migration service manually to downgrade  
✅ **Zero-downtime deploys** — migrations complete before new backend starts

## Troubleshooting

### Migration Service Keeps Restarting

**Cause:** Restart policy is set to "Always" or "On Failure"  
**Fix:** Settings → Deploy → Restart Policy → `Never`

### Backend Starts Before Migrations Complete

**Cause:** No dependency between services  
**Fix:** Use manual deploy order or GitHub Actions workflow

### Migration Service Fails with "Connection Refused"

**Cause:** `DATABASE_URL` not configured  
**Fix:** Settings → Variables → Add `DATABASE_URL` reference to Postgres service
