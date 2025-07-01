#!/bin/bash
# VoiceNote Firebase Hosting デプロイスクリプト

echo "🚀 VoiceNote Firebase Hosting デプロイ開始"

# プロジェクト設定確認
echo "📋 Firebase プロジェクト設定確認..."
firebase use voicenote-dev

# プロジェクト一覧表示
echo "📱 利用可能なプロジェクト:"
firebase projects:list

# ビルド実行
echo "🔨 アプリケーションビルド中..."
npm run build

# デプロイ実行
echo "🚀 Firebase Hosting へデプロイ中..."
firebase deploy --only hosting

echo "✅ デプロイ完了！"
echo "🌐 アプリURL: https://voicenote-dev.web.app"
echo "🌐 カスタムURL: https://voicenote-dev.firebaseapp.com"