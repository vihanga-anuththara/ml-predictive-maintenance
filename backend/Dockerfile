# Python Slim image for space saving
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install system dependencies for ML packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Requirements copy, install
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend to server
COPY . /app/

# Run ML Data Generation & Model Training
RUN python generate_data.py
RUN python train_model.py

# Expose port
EXPOSE 8000

# Live/Host app
CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000"]