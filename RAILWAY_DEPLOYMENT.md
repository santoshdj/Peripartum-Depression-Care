# Railway Deployment Guide for MathruMaitri

This guide walks you through deploying MathruMaitri (Peripartum Depression Care Platform) to Railway using our automated deployment scripts.

## Prerequisites

Before you begin, make sure you have:

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway CLI**: Install via npm:
   ```bash
   npm install -g @railway/cli
   ```
   Or on macOS:
   ```bash
   brew install railway
   ```
3. **GitHub Repository**: Push your code to GitHub (Railway deploys from GitHub)
4. **Backend Environment Variables**: Copy `backend/.env.example` to `backend/.env` and fill in real values
5. **Anthropic API Key**: Get one from [console.anthropic.com](https://console.anthropic.com)

## Architecture

Railway deployment consists of three services:
- **Postgres**: Database (managed by Railway)
- **Backend**: FastAPI + Python 3.12 (Docker build from `backend/`)
- **Frontend**: Next.js 14 (Docker build from `frontend/`)

## Deployment Process

### Phase 1: Initial Setup

This phase creates the Railway project, adds Postgres, creates backend/frontend services, and sets initial environment variables.

#### Step 1: Prepare Backend Environment

```bash
# Copy example env file
cp backend/.env.example backend/.env

# Edit backend/.env with your values
# Required for Phase 1:
#  - ANTHROPIC_API_KEY (get from console.anthropic.com)
#  - SESSION_SECRET_KEY (generate with: python -c "import secrets; print(secrets.token_hex(32))")
#  - REDIRECT_URI (set to http://localhost:8000/auth/callback for now, will update in Phase 2)
```

**Important**: Never commit `backend/.env` to version control. It's in `.gitignore`.

#### Step 2: Login to Railway

```bash
railway login
# This opens your browser to authenticate with Railway
```

#### Step 3: Run Phase 1 Script

Choose your platform:

**Windows (PowerShell)**:
```powershell
.\deploy-railway.ps1
```

**Unix (macOS/Linux)**:
```bash
chmod +x deploy-railway.sh
./deploy-railway.sh
```

The script will:
- ✅ Check prerequisites (git, railway CLI)
- ✅ Create or link to a Railway project named "mathrumaitri"
- ✅ Add a Postgres plugin
- ✅ Create backend and frontend services
- ✅ Set backend environment variables from `backend/.env`
- ✅ Set frontend placeholder environment variable

#### Step 4: Connect GitHub Repository

After Phase 1 completes, go to the [Railway dashboard](https://railway.app/dashboard):

**For Backend Service:**
1. Click on the backend service
2. Go to **Settings** → **Service** → **Source**
3. Click **Connect Repo** → Select your GitHub repo
4. Set **Root Directory** to `backend`
5. Click **Deploy**

**For Frontend Service:**
1. Click on the frontend service
2. Go to **Settings** → **Service** → **Source**
3. Click **Connect Repo** → Select your GitHub repo
4. Set **Root Directory** to `frontend`
5. Click **Deploy**

#### Step 5: Wait for Initial Deployment

Railway will build and deploy both services. This takes 3-5 minutes.

**Check deployment status:**
- Backend: Look for "Deployment Live" badge
- Frontend: Look for "Deployment Live" badge

**Get the backend URL:**
- Click on backend service → **Settings** → **Networking** → **Public Networking**
- Copy the generated URL (e.g., `https://backend-production-abc123.up.railway.app`)

### Phase 2: Link Frontend to Backend

This phase updates the frontend environment variable to point to the live backend URL and redeploys the frontend.

#### Step 6: Run Phase 2 Script

**Windows (PowerShell)**:
```powershell
.\deploy-railway.ps1 -Phase2 -BackendUrl "https://your-backend.up.railway.app"
```

**Unix (macOS/Linux)**:
```bash
./deploy-railway.sh --phase2 --backend-url https://your-backend.up.railway.app
```

The script will:
- ✅ Set `NEXT_PUBLIC_BACKEND_URL` on the frontend service
- ✅ Trigger automatic frontend redeployment

#### Step 7: Update Backend Redirect URI

Now that you have the live backend URL, update the redirect URI:

1. In Railway dashboard → backend service → **Variables**
2. Edit `REDIRECT_URI` to: `https://your-backend.railway.app/auth/callback`
3. Click **Save** (this triggers a backend redeploy)

#### Step 8: Configure EHR Provider Credentials

For production deployment with real EHR providers:

1. **Register your app with each EHR provider** (see `docs/EHR_PROVIDER_SETUP.md`)
   - Use the Railway backend URL for redirect URI
   - Get production client IDs and secrets

2. **Update provider configs in code**:
   - Edit `backend/app/utils/config.py`
   - Update `PROVIDER_CONFIGS` dictionary with production credentials
   - Commit and push to trigger redeployment

Example:
```python
PROVIDER_CONFIGS = {
    "epic": ProviderConfig(
        client_id="YOUR_PRODUCTION_EPIC_CLIENT_ID",  # Update this
        client_secret=None,
        # ... rest unchanged
    ),
    # ... other providers
}
```

## Environment Variables Reference

### Backend Service

| Variable | Required | Description | Set By |
|----------|----------|-------------|--------|
| `DATABASE_URL` | Yes | Postgres connection string | Railway (auto-injected) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic AI API key | Phase 1 script |
| `SESSION_SECRET_KEY` | Yes | Session encryption key (generate with secrets.token_hex(32)) | Phase 1 script |
| `REDIRECT_URI` | Yes | OAuth callback URL (https://your-backend.railway.app/auth/callback) | Phase 1 script, update in Step 7 |
| `COOKIE_SECURE` | Yes | Set to `true` for HTTPS | Phase 1 script |
| `PORT` | No | Server port (Railway auto-injects) | Railway |

### Frontend Service

| Variable | Required | Description | Set By |
|----------|----------|-------------|--------|
| `NEXT_PUBLIC_BACKEND_URL` | Yes | Backend API URL | Phase 2 script |
| `PORT` | No | Server port (Railway auto-injects) | Railway |

## Monitoring and Debugging

### View Logs

In Railway dashboard:
- Click on a service → **Deployments** → Click on active deployment → **View Logs**

### Check Health Endpoints

- Backend: `https://your-backend.railway.app/health`
- Frontend: `https://your-frontend.railway.app/`

### Common Issues

#### Backend Not Starting

**Symptom**: Backend deployment fails or crashes on startup.

**Solutions**:
1. Check logs for database connection errors
2. Verify `DATABASE_URL` is set (should be auto-injected by Postgres plugin)
3. Ensure Alembic migrations ran successfully (check logs for "alembic upgrade head")

#### Frontend Can't Reach Backend

**Symptom**: Frontend shows connection errors or "Failed to fetch".

**Solutions**:
1. Verify `NEXT_PUBLIC_BACKEND_URL` points to the correct backend URL
2. Check that backend is deployed and healthy (`/health` endpoint)
3. Ensure backend allows CORS from frontend domain (already configured in code)

#### Database Migration Errors

**Symptom**: Backend logs show Alembic errors.

**Solutions**:
1. Check if Postgres service is running
2. Verify `DATABASE_URL` format is correct
3. If migrations are out of sync, connect to the database and reset:
   ```bash
   railway run --service backend alembic downgrade base
   railway run --service backend alembic upgrade head
   ```

#### Authentication Redirect Errors

**Symptom**: EHR authentication fails with redirect URI mismatch.

**Solutions**:
1. Verify `REDIRECT_URI` in backend exactly matches what's registered with EHR provider
2. Must use HTTPS in production (Railway provides this automatically)
3. Check that the EHR provider app registration includes the Railway callback URL

#### Docker Build Error: uv.lock Not Found

**Symptom**: Backend deployment fails with error: `"/uv.lock": not found`

**Solutions**:
1. Ensure `backend/uv.lock` is committed to the repository (not in .gitignore)
2. Lock files should be committed for reproducible production builds
3. If missing, generate locally: `cd backend && uv sync` then commit the file
4. Verify file exists in your GitHub repo under `backend/uv.lock`

#### ModuleNotFoundError: No module named 'psycopg2'

**Symptom**: Backend deployment fails during migrations with `ModuleNotFoundError: No module named 'psycopg2'`

**Solutions**:
1. Ensure `psycopg2-binary` is in `backend/pyproject.toml` dependencies
2. Both `asyncpg` (for async SQLAlchemy) and `psycopg2-binary` (for Alembic migrations) are required
3. After adding, run `cd backend && uv lock` to update lock file
4. Commit both `pyproject.toml` and `uv.lock`, then push to GitHub

#### InvalidRequestError: asyncio extension requires an async driver

**Symptom**: Backend fails with `The asyncio extension requires an async driver to be used. The loaded 'psycopg2' is not async.`

**Solutions**:
1. Railway injects `DATABASE_URL` as `postgresql://...` (no driver specified)
2. The app automatically converts this to `postgresql+asyncpg://...` via field validator
3. Ensure `backend/app/utils/config.py` has the `convert_postgres_url_to_asyncpg` validator
4. This conversion happens automatically — no manual configuration needed
5. Alembic uses a separate `database_url_sync` property with `psycopg2` driver

**Technical Details**:
- Async SQLAlchemy operations require `asyncpg` driver
- Alembic migrations require `psycopg2` (sync) driver
- The app handles both automatically via URL conversion

## Manual Railway Dashboard Configuration

If the automated scripts don't work, you can manually configure everything in the Railway dashboard:

### 1. Create Project
- Go to [railway.app/new](https://railway.app/new)
- Click "Empty Project"
- Name it "mathrumaitri"

### 2. Add Postgres
- Click "+ New"
- Select "Database" → "Add PostgreSQL"

### 3. Add Backend Service
- Click "+ New"
- Select "GitHub Repo"
- Choose your repository
- Set **Root Directory**: `backend`
- Set **Builder**: Dockerfile

### 4. Add Frontend Service
- Click "+ New"
- Select "GitHub Repo"
- Choose your repository
- Set **Root Directory**: `frontend`
- Set **Builder**: Dockerfile

### 5. Set Backend Variables
Go to backend service → **Variables** → **RAW Editor**:
```
ANTHROPIC_API_KEY=sk-ant-...
SESSION_SECRET_KEY=...
REDIRECT_URI=https://your-backend.railway.app/auth/callback
COOKIE_SECURE=true
```

### 6. Set Frontend Variables
Go to frontend service → **Variables** → **RAW Editor**:
```
NEXT_PUBLIC_BACKEND_URL=https://your-backend.railway.app
```

## Cost Estimates

Railway charges based on usage:

- **Starter Plan**: $5/month + usage
- **Postgres**: ~$5-10/month
- **Backend**: ~$5-15/month (depending on traffic)
- **Frontend**: ~$5-10/month (depending on traffic)

**Estimated total**: $15-40/month for light to moderate traffic.

## Next Steps

After successful deployment:

1. **Test Authentication Flow**: Visit your frontend URL and try signing in with each EHR provider
2. **Configure Production EHR Credentials**: Update `PROVIDER_CONFIGS` with real client IDs (see Step 8)
3. **Set Up Custom Domain** (optional): Railway supports custom domains in Settings
4. **Enable Metrics**: Railway provides built-in metrics for CPU, memory, and network usage
5. **Set Up Alerts**: Configure deployment notifications in Railway dashboard

## Rollback

If a deployment breaks production:

1. Go to Railway dashboard → Service → **Deployments**
2. Find the last working deployment
3. Click **"..."** → **Redeploy**

## Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **MathruMaitri Issues**: [GitHub Issues](https://github.com/your-repo/issues)

## Security Checklist

Before going to production:

- [ ] All secrets in Railway environment variables (never in code)
- [ ] `COOKIE_SECURE=true` in production
- [ ] HTTPS enabled (Railway does this automatically)
- [ ] Database backups configured (Railway Postgres includes automated backups)
- [ ] Rate limiting enabled (already in code: 100 requests/minute per IP)
- [ ] CORS configured to allow only your frontend domain
- [ ] EHR provider apps registered with production redirect URIs
- [ ] Session secrets rotated from defaults
- [ ] Anthropic API key usage monitored

---

**Deployment Scripts**:
- `deploy-railway.ps1` (Windows PowerShell)
- `deploy-railway.sh` (Unix/macOS/Linux)

**Last Updated**: 2025
