FROM python:3.11-slim

WORKDIR /app
COPY pyproject.toml .
COPY shared/ shared/
COPY services/control_plane/ services/control_plane/
COPY services/__init__.py services/__init__.py

RUN pip install --no-cache-dir .

EXPOSE 8080
CMD ["uvicorn", "services.control_plane.main:app", "--host", "0.0.0.0", "--port", "8080"]
