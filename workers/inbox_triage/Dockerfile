FROM python:3.11-slim

WORKDIR /app
COPY pyproject.toml .
COPY shared/ shared/
COPY workers/inbox_triage/ workers/inbox_triage/
COPY workers/__init__.py workers/__init__.py

RUN pip install --no-cache-dir .

CMD ["python", "-m", "workers.inbox_triage.main"]
