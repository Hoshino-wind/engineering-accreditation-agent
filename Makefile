.PHONY: bootstrap dev api worker generate-contracts lint test typecheck build compose-config

bootstrap:
	pnpm install
	uv sync --project apps/api --extra dev
	uv sync --project apps/worker --extra dev

dev:
	pnpm dev

api:
	uv run --project apps/api uvicorn app.main:app --reload --port 8000

worker:
	uv run --project apps/worker celery --app=worker_app.celery_app:celery_app worker --loglevel=INFO

generate-contracts:
	uv run --project apps/api python -m app.export_openapi --output openapi/openapi.json
	pnpm generate:client

lint:
	uv run --project apps/api ruff check --config apps/api/pyproject.toml apps/api
	uv run --project apps/worker ruff check --config apps/worker/pyproject.toml apps/worker
	pnpm lint

test:
	uv run --project apps/api pytest -c apps/api/pyproject.toml apps/api/tests
	uv run --project apps/worker pytest -c apps/worker/pyproject.toml apps/worker/tests
	pnpm test

typecheck:
	uv run --project apps/api mypy --config-file apps/api/pyproject.toml apps/api/app
	uv run --project apps/worker mypy --config-file apps/worker/pyproject.toml apps/worker/worker_app
	pnpm typecheck

build:
	pnpm build

compose-config:
	docker compose -f infra/compose/compose.yaml config --quiet
