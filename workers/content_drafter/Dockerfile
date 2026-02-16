FROM python:3.11-slim

WORKDIR /app
COPY pyproject.toml .
COPY shared/ shared/
COPY workers/content_drafter/ workers/content_drafter/
COPY workers/__init__.py workers/__init__.py

RUN pip install --no-cache-dir .

CMD ["python", "-m", "workers.content_drafter.main"]
