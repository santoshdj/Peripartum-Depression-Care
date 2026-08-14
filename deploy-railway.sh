#!/usr/bin/env bash
# deploy-railway.sh — Two-phase Railway deployment for MathruMaitri
#
# Usage:
#   Phase 1 (first deploy):
#     ./deploy-railway.sh
#
#   Phase 2 (link frontend → backend URL after both services are live):
#     ./deploy-railway.sh --phase2 --backend-url https://xxx.up.railway.app
#
# Prerequisites:
#   - railway CLI installed  (npm i -g @railway/cli)
#   - railway login          (run once before this script)
#   - backend/.env           (real secrets — never committed)
#   - GitHub repo pushed

set -euo pipefail

PROJECT_NAME="mathrumaitri"
PHASE2=false
BACKEND_URL=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --phase2)
      PHASE2=true
      shift
      ;;
    --backend-url)
      BACKEND_URL="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: $0 [--phase2 --backend-url https://xxx.up.railway.app]"
      exit 1
      ;;
  esac
done

# ── prerequisites ─────────────────────────────────────────────────────────────
check_prerequisites() {
  echo "⟳  Checking prerequisites …"

  # Tools that must exist and cannot be auto-installed
  local missing=()
  for tool in git; do
    if ! command -v "$tool" &>/dev/null; then
      missing+=("$tool")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "❌  Missing required tools: ${missing[*]}"
    echo "    Install them with your system package manager and re-run."
    exit 1
  fi

  # railway CLI — auto-install if missing
  if ! command -v railway &>/dev/null; then
    echo "  → railway CLI not found — installing …"
    if command -v npm &>/dev/null; then
      npm install -g @railway/cli
    elif command -v brew &>/dev/null; then
      brew install railway
    else
      echo "❌  Cannot auto-install railway CLI: npm and brew not found."
      echo "    Install Node.js (https://nodejs.org) then run: npm install -g @railway/cli"
      exit 1
    fi
    echo "  ✔  railway CLI installed."
  else
    echo "  ✔  railway CLI: $(railway --version 2>/dev/null || echo 'found')"
  fi

  # Verify railway session
  if ! railway whoami &>/dev/null 2>&1; then
    echo "  → Not logged in to Railway — launching browser login …"
    railway login
  fi
  echo "  ✔  Logged in as: $(railway whoami 2>/dev/null)"

  echo "✔  All prerequisites satisfied."
  echo ""
}

check_prerequisites

# ── link to / create Railway project ─────────────────────────────────────────
link_or_create_project() {
  echo "⟳  Linking to Railway project …"

  # Already linked — nothing to do
  if railway status &>/dev/null 2>&1; then
    local info
    info=$(railway status 2>/dev/null | grep -iE 'Project|Environment' || echo "  (project info unavailable)")
    echo "  ✔  Already linked."
    echo "$info"
    echo ""
    return 0
  fi

  echo "  → No project linked. Launching interactive project selector …"
  echo "      Tip: select '$PROJECT_NAME' from the list, or choose \"Create new project\"."
  echo ""

  # railway link opens an interactive TUI — user picks or creates a project
  if ! railway link; then
    echo "❌  railway link exited without selecting a project."
    echo "    Run \"railway link\" manually, then re-run this script."
    exit 1
  fi

  # Confirm the link succeeded
  if ! railway status &>/dev/null 2>&1; then
    echo "❌  Still not linked after railway link. Run it manually and re-run this script."
    exit 1
  fi

  echo "  ✔  Project linked successfully."
  echo ""
}

link_or_create_project

# ── helper: load .env file into associative array ─────────────────────────────
declare -A ENV_VARS

load_env_file() {
  local path="$1"
  while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$key" ]] && continue
    
    # Trim whitespace
    key="${key#"${key%%[![:space:]]*}"}"
    key="${key%"${key##*[![:space:]]}"}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    
    ENV_VARS["$key"]="$value"
  done < "$path"
}

# ── Phase 2 ────────────────────────────────────────────────────────────────────
if [[ "$PHASE2" == true ]]; then
  if [[ -z "$BACKEND_URL" ]]; then
    echo "❌  Provide --backend-url https://your-backend.up.railway.app"
    exit 1
  fi

  echo "⟳  Phase 2 — linking frontend → backend …"

  if railway variables set --service frontend "NEXT_PUBLIC_BACKEND_URL=$BACKEND_URL"; then
    echo "✔  NEXT_PUBLIC_BACKEND_URL=$BACKEND_URL set on frontend service."
    echo "✔  Railway will redeploy the frontend automatically."
  else
    echo "⚠  Could not set NEXT_PUBLIC_BACKEND_URL via CLI — set it manually in the Railway dashboard."
  fi

  echo ""
  echo "Next steps:"
  echo "  1. Wait for frontend redeploy to complete"
  echo "  2. Update REDIRECT_URI in backend/.env to point to your Railway backend URL"
  echo "  3. Register the Railway redirect URI with each EHR provider (Epic, Cerner, etc.)"
  echo "  4. Update PROVIDER_CONFIGS in backend/app/utils/config.py with production client IDs"
  exit 0
fi

# ── Phase 1 ────────────────────────────────────────────────────────────────────

if [[ ! -f "backend/.env" ]]; then
  echo "❌  backend/.env not found. Copy backend/.env.example and fill in real values."
  exit 1
fi

load_env_file "backend/.env"

echo "⟳  Phase 1 — configuring services …"

# 1. Add Postgres plugin
echo "  → Adding Postgres plugin …"
if railway add --plugin postgres 2>&1 | grep -qE 'added|already exists'; then
  echo "  ✔  Postgres plugin added (or already exists)."
else
  echo "  ⚠  Could not add Postgres plugin via CLI — add it manually in Railway dashboard."
fi

# 2. Create backend service
echo "  → Creating backend service …"
railway service create backend &>/dev/null || echo "  ⚠  Service may already exist."

# 3. Create frontend service
echo "  → Creating frontend service …"
railway service create frontend &>/dev/null || echo "  ⚠  Service may already exist."

# Show what Railway now sees
echo ""
echo "  → Services visible in this project:"
railway service list 2>&1 || railway status 2>&1
echo ""

# Set backend env vars
echo "  → Setting backend environment variables …"
if railway variables set --service backend \
  "ANTHROPIC_API_KEY=${ENV_VARS[ANTHROPIC_API_KEY]}" \
  "SESSION_SECRET_KEY=${ENV_VARS[SESSION_SECRET_KEY]}" \
  "REDIRECT_URI=${ENV_VARS[REDIRECT_URI]}" \
  "COOKIE_SECURE=true"; then
  echo "  ✔  Backend vars applied."
else
  echo "  ⚠  Could not set backend vars — set them manually in the Railway dashboard."
fi

# Set frontend env vars (initial placeholder)
echo "  → Setting frontend environment variables …"
if railway variables set --service frontend \
  "NEXT_PUBLIC_BACKEND_URL=http://localhost:8000"; then
  echo "  ✔  Frontend vars applied."
else
  echo "  ⚠  Could not set frontend vars — set them manually in the Railway dashboard."
fi

echo ""
echo "✅  Phase 1 complete."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Next steps:"
echo ""
echo "1. Connect GitHub repository in Railway dashboard:"
echo "   • Go to railway.app → Your Project → backend service → Settings"
echo "   • Connect your GitHub repo"
echo "   • Set root directory to 'backend'"
echo "   • Repeat for frontend service (root directory: 'frontend')"
echo ""
echo "2. Wait for both services to deploy"
echo ""
echo "3. Get the backend URL from Railway dashboard:"
echo "   • Copy the generated URL (e.g., https://xxx.up.railway.app)"
echo ""
echo "4. Run Phase 2 to link frontend → backend:"
echo "   ./deploy-railway.sh --phase2 --backend-url https://your-backend.up.railway.app"
echo ""
echo "5. Update EHR provider configurations:"
echo "   • Update backend/app/utils/config.py with production client IDs"
echo "   • Register Railway redirect URI with each provider"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
