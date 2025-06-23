#!/bin/bash

# Claude Code開発用通知スクリプト
# 使用方法: ./notify-claude.sh "メッセージ" [タイプ]
# タイプ: completed, question, error, info (デフォルト: info)

MESSAGE="$1"
TYPE="${2:-info}"

if [ -z "$MESSAGE" ]; then
    echo "使用方法: $0 \"メッセージ\" [タイプ]"
    echo "タイプ: completed, question, error, info"
    exit 1
fi

# タイプに応じてアイコンとサウンドを設定
case "$TYPE" in
    "completed")
        TITLE="✅ タスク完了"
        SOUND="Glass"
        ;;
    "question")
        TITLE="❓ 判断が必要"
        SOUND="Sosumi"
        ;;
    "error")
        TITLE="❌ エラー発生"
        SOUND="Basso"
        ;;
    *)
        TITLE="ℹ️ Claude Code"
        SOUND="default"
        ;;
esac

# macOS通知を送信
osascript -e "display notification \"$MESSAGE\" with title \"$TITLE\" sound name \"$SOUND\""

# ターミナルベルも鳴らす
echo -e "\a"

echo "通知を送信しました: $TITLE - $MESSAGE"