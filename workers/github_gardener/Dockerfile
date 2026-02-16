FROM python:3.11-slim

WORKDIR /app
COPY pyproject.toml .
COPY shared/ shared/
COPY workers/github_gardener/ workers/github_gardener/
COPY workers/__init__.py workers/__init__.py

RUN pip install --no-cache-dir .

CMD ["python", "-m", "workers.github_gardener.main"]
