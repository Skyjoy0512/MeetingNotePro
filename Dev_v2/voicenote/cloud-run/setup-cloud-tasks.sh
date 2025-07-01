#!/bin/bash

# Cloud Tasks キュー設定スクリプト
# VoiceNote音声処理用のタスクキューを作成

set -e

# 設定
PROJECT_ID=${1:-voicenote-dev}
LOCATION="asia-northeast1"

echo "🚀 Cloud Tasks キューを設定します"
echo "Project ID: ${PROJECT_ID}"
echo "Location: ${LOCATION}"
echo ""

# Google Cloud プロジェクト設定
echo "📋 Google Cloud プロジェクトを設定中..."
gcloud config set project ${PROJECT_ID}

# Cloud Tasks API有効化
echo "🔧 Cloud Tasks APIを有効化中..."
gcloud services enable cloudtasks.googleapis.com

# 既存のキューを確認
echo "🔍 既存のキューを確認中..."
gcloud tasks queues list --location=${LOCATION} || echo "キューが見つかりません"

# 音声処理キュー作成
echo "📝 音声処理キューを作成中..."
gcloud tasks queues create audio-processing \
  --location=${LOCATION} \
  --max-concurrent-dispatches=3 \
  --max-dispatches-per-second=5 \
  --max-retry-duration=86400s \
  --max-attempts=3 \
  --min-backoff=1s \
  --max-backoff=600s \
  --max-doublings=5 \
  || echo "audio-processing キューは既に存在します"

# チャンク処理キュー作成
echo "📝 チャンク処理キューを作成中..."
gcloud tasks queues create chunk-processing \
  --location=${LOCATION} \
  --max-concurrent-dispatches=5 \
  --max-dispatches-per-second=10 \
  --max-retry-duration=43200s \
  --max-attempts=5 \
  --min-backoff=2s \
  --max-backoff=300s \
  --max-doublings=4 \
  || echo "chunk-processing キューは既に存在します"

# 文字起こしタスクキュー作成
echo "📝 文字起こしタスクキューを作成中..."
gcloud tasks queues create transcription-tasks \
  --location=${LOCATION} \
  --max-concurrent-dispatches=10 \
  --max-dispatches-per-second=15 \
  --max-retry-duration=21600s \
  --max-attempts=3 \
  --min-backoff=1s \
  --max-backoff=120s \
  --max-doublings=3 \
  || echo "transcription-tasks キューは既に存在します"

echo ""
echo "✅ Cloud Tasks キュー設定が完了しました！"
echo ""

# 作成されたキューの確認
echo "📋 作成されたキューの一覧:"
gcloud tasks queues list --location=${LOCATION}

echo ""
echo "🎉 Cloud Tasks設定が正常に完了しました！"