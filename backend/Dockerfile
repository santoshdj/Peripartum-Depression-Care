FROM python:3.12-slim

# Install uv (from official image) and postgresql-client for advisory locks
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (cached layer — only invalidated when lock file changes)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

EXPOSE 8000

# Use PostgreSQL advisory lock to prevent race conditions when multiple containers start simultaneously
# Advisory lock ensures only one container runs migrations at a time
# Convert DATABASE_URL to psql-compatible format (postgres:// not postgresql://)
CMD ["sh", "-c", "\
    PSQL_URL=$(echo $DATABASE_URL | sed 's/^postgresql:/postgres:/') && \
    echo 'Acquiring migration lock...' && \
    psql \"$PSQL_URL\" -c 'SELECT pg_advisory_lock(123456789);' && \
    echo 'Running migrations...' && \
    uv run alembic upgrade head; \
    MIGRATION_EXIT=$?; \
    echo 'Releasing migration lock...' && \
    psql \"$PSQL_URL\" -c 'SELECT pg_advisory_unlock(123456789);'; \
    if [ $MIGRATION_EXIT -ne 0 ]; then \
        echo 'Migration failed, exiting...'; \
        exit $MIGRATION_EXIT; \
    fi && \
    echo 'Migrations successful, starting server...' && \
    uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

