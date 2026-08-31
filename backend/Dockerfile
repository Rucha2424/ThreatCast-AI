<<<<<<< HEAD
# Dockerfile for UniHack FastAPI Backend
=======
# Dockerfile for ThreatCast AI Backend
>>>>>>> 4c60841 (feat: complete ThreatCast AI predictive SOC platform (FastAPI backend + Vite React frontend + deployment config))
FROM python:3.11-slim

WORKDIR /app

<<<<<<< HEAD
# Install system dependencies for Playwright headless browser
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency specifications
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Install Playwright browser binaries
RUN python -m playwright install --with-deps chromium

# Copy codebase
COPY . /app/

# Environment configuration
=======
# Install build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend codebase
COPY backend/ /app/backend/

>>>>>>> 4c60841 (feat: complete ThreatCast AI predictive SOC platform (FastAPI backend + Vite React frontend + deployment config))
ENV PYTHONPATH=/app
ENV PORT=8000
ENV HOST=0.0.0.0

EXPOSE 8000

# Start FastAPI production server
<<<<<<< HEAD
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
=======
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
>>>>>>> 4c60841 (feat: complete ThreatCast AI predictive SOC platform (FastAPI backend + Vite React frontend + deployment config))
