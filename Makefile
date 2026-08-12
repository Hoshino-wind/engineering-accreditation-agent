.PHONY: bootstrap dev api worker generate-contracts lint test typecheck build compose-config \
	verify-golden test-golden convert-scores

bootstrap:
	pnpm install
	uv sync --project apps/api --extra dev
	uv sync --project apps/worker --extra dev
	uv sync --project golden-sample/verifier --extra dev

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
	uv run --project golden-sample/verifier ruff check --config golden-sample/verifier/pyproject.toml golden-sample/verifier
	pnpm lint

test:
	uv run --project apps/api pytest -c apps/api/pyproject.toml apps/api/tests
	uv run --project apps/worker pytest -c apps/worker/pyproject.toml apps/worker/tests
	$(MAKE) test-golden
	pnpm test

typecheck:
	uv run --project apps/api mypy --config-file apps/api/pyproject.toml apps/api/app
	uv run --project apps/worker mypy --config-file apps/worker/pyproject.toml apps/worker/worker_app
	uv run --project golden-sample/verifier mypy --config-file golden-sample/verifier/pyproject.toml golden-sample/verifier/golden_sample
	pnpm typecheck

# 校验金标准样例；DIR 留空时校验仓库内合成样例。
# 真实样例：make verify-golden DIR=.local-data/golden-sample/<课程代号>
verify-golden:
	uv run --project golden-sample/verifier python -m golden_sample $(DIR)

test-golden:
	uv run --project golden-sample/verifier pytest -c golden-sample/verifier/pyproject.toml golden-sample/verifier/tests

# 把教师填写的宽表成绩记录转成 scores.csv，默认脱敏学号。
# make convert-scores SRC=<宽表.csv> OUT=<样例目录>/scores.csv
convert-scores:
	uv run --project golden-sample/verifier python -m golden_sample.convert_cli $(SRC) $(OUT)

build:
	pnpm build

compose-config:
	docker compose -f infra/compose/compose.yaml config --quiet
