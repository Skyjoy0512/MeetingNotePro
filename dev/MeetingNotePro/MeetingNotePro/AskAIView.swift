import SwiftUI

struct AskAIView: View {
    @State private var messages: [ChatMessage] = []
    @State private var inputText = ""
    @State private var isLoading = false
    
    var body: some View {
        VStack {
            // チャット履歴
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 12) {
                    if messages.isEmpty {
                        VStack(spacing: 20) {
                            Image(systemName: "bubble.left.and.bubble.right")
                                .font(.system(size: 60))
                                .foregroundColor(.orange)
                            
                            Text("AskAI チャット")
                                .font(.title2)
                                .fontWeight(.medium)
                            
                            Text("会議内容について何でも質問してください")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                            
                            // 提案質問
                            VStack(alignment: .leading, spacing: 8) {
                                Text("💡 提案質問")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                
                                ForEach(suggestedQuestions, id: \.self) { question in
                                    Button(action: {
                                        inputText = question
                                    }) {
                                        Text(question)
                                            .font(.subheadline)
                                            .foregroundColor(.blue)
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 8)
                                            .background(Color.blue.opacity(0.1))
                                            .cornerRadius(8)
                                    }
                                }
                            }
                            .padding()
                        }
                        .padding()
                    } else {
                        ForEach(messages) { message in
                            ChatBubble(message: message)
                        }
                    }
                }
                .padding()
            }
            
            // 入力エリア
            VStack {
                if isLoading {
                    HStack {
                        ProgressView()
                            .scaleEffect(0.8)
                        Text("AIが回答を生成中...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                    .padding(.horizontal)
                }
                
                HStack {
                    TextField("質問を入力してください...", text: $inputText, axis: .vertical)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .lineLimit(3)
                    
                    Button(action: sendMessage) {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.title2)
                            .foregroundColor(inputText.isEmpty ? .gray : .blue)
                    }
                    .disabled(inputText.isEmpty || isLoading)
                }
                .padding()
            }
            
            // 注意事項
            VStack(alignment: .leading, spacing: 8) {
                Text("📝 注意事項")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Text("• この画面はデモ版です")
                Text("• 実際のAI機能は未実装")
                Text("• サンプル回答を表示します")
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
            .padding(.horizontal)
        }
        .navigationTitle("AskAI")
        .navigationBarTitleDisplayMode(.large)
    }
    
    private let suggestedQuestions = [
        "会議の主なポイントは何ですか？",
        "決定事項をまとめてください",
        "次回までのアクションアイテムは？",
        "課題として挙がった点は？"
    ]
    
    private func sendMessage() {
        guard !inputText.isEmpty else { return }
        
        // ユーザーメッセージを追加
        let userMessage = ChatMessage(id: UUID(), text: inputText, isUser: true, timestamp: Date())
        messages.append(userMessage)
        
        let question = inputText
        inputText = ""
        isLoading = true
        
        // AIの回答をシミュレート
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            let aiResponse = generateAIResponse(for: question)
            let aiMessage = ChatMessage(id: UUID(), text: aiResponse, isUser: false, timestamp: Date())
            messages.append(aiMessage)
            isLoading = false
        }
    }
    
    private func generateAIResponse(for question: String) -> String {
        let responses = [
            "会議の主なポイント": """
            今回の会議の主なポイントは以下の通りです：
            
            1. 月次売上が前月比15%増加
            2. 新プロジェクトの提案と検討
            3. 来月のスケジュール調整
            4. リソース配分の見直し
            
            特に売上増加は目標を上回る結果となりました。
            """,
            "決定事項": """
            会議で決定された事項：
            
            ✅ 新プロジェクトの検討継続
            ✅ 開発リソースの一部割り当て
            ✅ 週次進捗会議の実施
            ✅ 開発ツール購入の承認
            
            これらの決定事項は来週から実行開始予定です。
            """,
            "アクションアイテム": """
            次回までのアクションアイテム：
            
            【田中さん】
            • 売上詳細レポート作成（期限：来週金曜）
            • 顧客フィードバック整理
            
            【佐藤さん】
            • 技術仕様書作成
            • 工数見積もり
            
            【全員】
            • 次回会議日程調整
            """,
            "課題": """
            会議で挙がった課題：
            
            🔍 技術面の課題
            • 既存システムとの連携方法
            • パフォーマンス最適化
            
            🔍 リソース面の課題
            • メンバーのスケジュール調整
            • 外部ベンダーとの連携
            
            🔍 スケジュール面の課題
            • リリース時期の前倒し要求
            • テスト期間の確保
            
            これらの課題は次回会議で詳細を検討します。
            """
        ]
        
        // 質問に応じた回答を選択
        for (key, response) in responses {
            if question.contains(key) {
                return response
            }
        }
        
        // デフォルト回答
        return """
        ご質問ありがとうございます。
        
        現在はデモ版のため、限定的な回答しか提供できません。実際のAskAI機能では、会議の文字起こしや要約内容に基づいて、より詳細で正確な回答を提供します。
        
        他にご質問がございましたら、お気軽にお聞かせください。
        """
    }
}

struct ChatMessage: Identifiable {
    let id: UUID
    let text: String
    let isUser: Bool
    let timestamp: Date
}

struct ChatBubble: View {
    let message: ChatMessage
    
    var body: some View {
        HStack {
            if message.isUser {
                Spacer()
                VStack(alignment: .trailing) {
                    Text(message.text)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    
                    Text(DateFormatter.time.string(from: message.timestamp))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            } else {
                VStack(alignment: .leading) {
                    Text(message.text)
                        .padding()
                        .background(Color(.systemGray5))
                        .cornerRadius(12)
                    
                    Text(DateFormatter.time.string(from: message.timestamp))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                Spacer()
            }
        }
    }
}

extension DateFormatter {
    static let time: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .none
        formatter.timeStyle = .short
        return formatter
    }()
}

struct AskAIView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            AskAIView()
        }
    }
}