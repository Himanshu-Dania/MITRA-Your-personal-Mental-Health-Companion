FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY ML_Backend/RAG/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the necessary files
COPY ML_Backend/RAG/*.py /app/RAG/
COPY ML_Backend/__init__.py /app/ML_Backend/__init__.py

# Set up environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    EMBEDDING_DIR=/app/User_Embeddings \
    COLLECTION_NAME=interests \
    PORT=8000

# Create the required directories
RUN mkdir -p /app/User_Embeddings

# Set working directory to RAG
WORKDIR /app/RAG

# Make sure the script is executable
RUN chmod +x interest_sync.py

# Expose the API port
EXPOSE 8000

# Command to run the API
CMD ["uvicorn", "user_groups_api:app", "--host", "0.0.0.0", "--port", "8000"] 