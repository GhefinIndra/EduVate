#!/bin/bash

# Cloud Run Deployment Script for AskEd Backend

# Configuration
PROJECT_ID="cool-snowfall-478113-i5"
SERVICE_NAME="eduvate-backend"
REGION="asia-southeast2"  # Jakarta region (paling dekat Indonesia)

echo "Deploying Eduvate Backend to Cloud Run..."

# Build and deploy
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=postgresql://postgres.mnneneoazrajimgyexvf:eduvate123!@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres,GEMINI_API_KEY=AIzaSyCW6AFakY1ymowMqEytQFMtuL-8YwYOUm4,SECRET_KEY=asked-secret-key-2025-sevent-9-ai-learning-companion,ALGORITHM=HS256,ACCESS_TOKEN_EXPIRE_MINUTES=30,CHROMA_PATH=/tmp/chroma_db,UPLOAD_DIR=/tmp/uploads,MAX_FILE_SIZE_MB=20,GCS_BUCKET_NAME=eduvate-documents,UPSTASH_REDIS_REST_URL=https://hip-blowfish-39125.upstash.io,UPSTASH_REDIS_REST_TOKEN=AbxXAAIjcDEwNDE3ZmE3NDRlNGI0MzU3YWE1ZDE0Y2Y3ZjBlMWY0MXAxMA,CACHE_ENABLED=true" \
  --memory 2Gi \
  --cpu 2 \
  --timeout 1800 \
  --max-instances 10 \
  --min-instances 0 \
  --port 8080

echo "Deployment complete!"
echo "Your backend URL will be shown above"
