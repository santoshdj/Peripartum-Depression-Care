FROM python:3.12-slim

# Install uv (from official image)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

# Install dependencies (cached layer — only invalidated when lock file changes)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

EXPOSE 8000

# Start the FastAPI server (migrations handled by separate service)
# Railway assigns a PORT env var - use it or default to 8000 for local dev
CMD sh -c "uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"

