FROM ghcr.io/astral-sh/uv:0.11.21 AS uv

FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

COPY --from=uv /uv /uvx /bin/
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY worker_app ./worker_app

CMD ["celery", "--app=worker_app.celery_app:celery_app", "worker", "--loglevel=INFO"]
