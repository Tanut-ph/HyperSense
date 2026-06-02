FROM python:3.12-slim

WORKDIR /app

# Install system deps ที่ XGBoost/numba ต้องการ
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY *.py ./

# Copy trained models (ถ้ามี) — ถ้ายังไม่มีจะ train ตอน start
COPY models/ ./models/ 2>/dev/null || true

EXPOSE 8000

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
