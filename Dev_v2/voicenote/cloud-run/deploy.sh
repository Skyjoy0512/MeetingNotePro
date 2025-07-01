#!/bin/bash

# VoiceNote Cloud Run デプロイスクリプト
# 使用方法: ./deploy.sh [environment]
# environment: dev, staging, prod (デフォルト: dev)

set -e

# 設定
ENVIRONMENT=${1:-dev}
PROJECT_ID="voicenote-${ENVIRONMENT}"
SERVICE_NAME="voicenote-audio-processor"
REGION="asia-northeast1"

echo "🚀 VoiceNote Audio Processor をデプロイします"
echo "Environment: ${ENVIRONMENT}"
echo "Project ID: ${PROJECT_ID}"
echo "Service: ${SERVICE_NAME}"
echo "Region: ${REGION}"
echo ""

# Google Cloud プロジェクト設定
echo "📋 Google Cloud プロジェクトを設定中..."
gcloud config set project ${PROJECT_ID}

# API有効化（初回のみ必要）
echo "🔧 必要なAPIを有効化中..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable storage-component.googleapis.com

# Docker イメージビルド
echo "🏗️  Docker イメージをビルド中..."
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
COMMIT_SHA=$(git rev-parse --short HEAD)
IMAGE_TAG="${IMAGE_NAME}:${COMMIT_SHA}"
IMAGE_LATEST="${IMAGE_NAME}:latest"

docker build -t ${IMAGE_TAG} -t ${IMAGE_LATEST} .

# Container Registry にプッシュ
echo "📤 Container Registry にプッシュ中..."
docker push ${IMAGE_TAG}
docker push ${IMAGE_LATEST}

# 環境毎の設定
case ${ENVIRONMENT} in
  "dev")
    MEMORY="4Gi"
    CPU="2"
    MAX_INSTANCES="3"
    MIN_INSTANCES="0"
    ;;
  "staging")
    MEMORY="6Gi"
    CPU="3"
    MAX_INSTANCES="5"
    MIN_INSTANCES="0"
    ;;
  "prod")
    MEMORY="8Gi"
    CPU="4"
    MAX_INSTANCES="10"
    MIN_INSTANCES="1"
    ;;
  *)
    echo "❌ 無効な環境: ${ENVIRONMENT}"
    echo "有効な環境: dev, staging, prod"
    exit 1
    ;;
esac

# Cloud Run にデプロイ
echo "🚀 Cloud Run にデプロイ中..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_TAG} \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --memory ${MEMORY} \
  --cpu ${CPU} \
  --timeout 3600 \
  --max-instances ${MAX_INSTANCES} \
  --min-instances ${MIN_INSTANCES} \
  --port 8080 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT_ID},ENVIRONMENT=${ENVIRONMENT}" \
  --execution-environment gen2

# デプロイ結果取得
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format='value(status.url)')

echo ""
echo "✅ デプロイが完了しました！"
echo "Service URL: ${SERVICE_URL}"
echo "Health Check: ${SERVICE_URL}/health"
echo ""

# ヘルスチェック
echo "🔍 ヘルスチェックを実行中..."
sleep 10
curl -s "${SERVICE_URL}/health" | python -m json.tool || echo "ヘルスチェックに失敗しました"

echo ""
echo "🎉 デプロイが正常に完了しました！"