.PHONY: setup test lint format run-control-plane deploy

setup:
	python -m pip install -e ".[dev]"

test:
	python -m pytest tests/ -v

lint:
	python -m ruff check .

format:
	python -m ruff format .

run-control-plane:
	python -m uvicorn services.control_plane.main:app --reload --port 8080

deploy:
	bash infra/gcp/deploy.sh
