FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

# Install dependencies (cached layer)
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

# Copy application code (needed for models in migrations)
COPY backend/ .

# Debug: Show migration file contents after copy
RUN echo "=== Contents of 0004_add_forum_tables.py ===" && \
    cat alembic/versions/0004_add_forum_tables.py && \
    echo "=== End of file ==="

# Run migrations and exit
CMD ["uv", "run", "alembic", "upgrade", "head"]
