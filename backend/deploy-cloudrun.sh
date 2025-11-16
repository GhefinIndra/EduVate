#!/bin/bash

# Cloud Run Deployment Script for AskEd Backend

# Configuration
PROJECT_ID="your-gcp-project-id"  # GANTI INI dengan GCP Project ID kamu
SERVICE_NAME="eduvate-backend"
REGION="asia-southeast2"  # Jakarta region (paling dekat Indonesia)

echo "Deploying Eduvate Backend to Cloud Run..."

# Build and deploy
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars "DB_HOST=YOUR_MYSQL_HOST,DB_PORT=3306,DB_USER=YOUR_DB_USER,DB_PASSWORD=YOUR_DB_PASSWORD,DB_NAME=asked,JWT_SECRET_KEY=YOUR_SECRET_KEY,GEMINI_API_KEY=YOUR_GEMINI_KEY" \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 0 \
  --port 8080

echo "Deployment complete!"
echo "Your backend URL will be shown above"
