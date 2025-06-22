import SwiftUI

// メイン画面
struct AllInOneContentView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // ホーム画面
            HomeView(selectedTab: $selectedTab)
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("ホーム")
                }
                .tag(0)
            
            // 録音画面
            RecordingTabView()
                .tabItem {
                    Image(systemName: "mic.fill")
                    Text("録音")
                }
                .tag(1)
            
            // 文字起こし画面
            TranscriptTabView()
                .tabItem {
                    Image(systemName: "doc.text.fill")
                    Text("文字起こし")
                }
                .tag(2)
            
            // AI要約画面
            SummaryTabView()
                .tabItem {
                    Image(systemName: "brain.head.profile")
                    Text("AI要約")
                }
                .tag(3)
            
            // AskAI画面
            AskAITabView()
                .tabItem {
                    Image(systemName: "bubble.left.and.bubble.right.fill")
                    Text("AskAI")
                }
                .tag(4)
        }
    }
}

// ホーム画面
struct HomeView: View {
    @Binding var selectedTab: Int
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                // アプリアイコン
                Image(systemName: "mic.circle.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.blue)
                
                // アプリタイトル
                VStack(spacing: 8) {
                    Text("MeetingNotePro")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("会議録音・文字起こし・AI要約アプリ")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                
                // 機能ボタン
                VStack(spacing: 12) {
                    Button(action: { selectedTab = 1 }) {
                        featureButtonView(
                            title: "🎤 録音機能",
                            description: "高品質な会議録音",
                            color: .red
                        )
                    }
                    
                    Button(action: { selectedTab = 2 }) {
                        featureButtonView(
                            title: "📝 文字起こし",
                            description: "AI による自動文字起こし",
                            color: .green
                        )
                    }
                    
                    Button(action: { selectedTab = 3 }) {
                        featureButtonView(
                            title: "🤖 AI要約",
                            description: "会議内容の自動要約",
                            color: .purple
                        )
                    }
                    
                    Button(action: { selectedTab = 4 }) {
                        featureButtonView(
                            title: "💬 AskAI",
                            description: "会議内容への質問・回答",
                            color: .orange
                        )
                    }
                }
                
                Spacer()
            }
            .padding()
            .navigationTitle("MeetingNotePro")
            .navigationBarTitleDisplayMode(.large)
        }
    }
    
    private func featureButtonView(title: String, description: String, color: Color) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 5) {
                Text(title)
                    .font(.headline)
                    .foregroundColor(.primary)
                
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .foregroundColor(.secondary)
        }
        .padding()
        .background(color.opacity(0.1))
        .cornerRadius(12)
    }
}

// 録音画面
struct RecordingTabView: View {
    @State private var isRecording = false
    @State private var recordingTime: TimeInterval = 0
    @State private var timer: Timer?
    
    var body: some View {
        NavigationView {
            VStack(spacing: 40) {
                // 録音状態表示
                VStack(spacing: 20) {
                    Circle()
                        .fill(isRecording ? Color.red : Color.gray)
                        .frame(width: 120, height: 120)
                        .overlay(
                            Image(systemName: "mic.fill")
                                .font(.system(size: 50))
                                .foregroundColor(.white)
                        )
                        .scaleEffect(isRecording ? 1.1 : 1.0)
                        .animation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true), value: isRecording)
                    
                    Text(isRecording ? "録音中..." : "録音待機")
                        .font(.title2)
                        .fontWeight(.medium)
                    
                    Text(timeString(from: recordingTime))
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(isRecording ? .red : .primary)
                }
                
                // 録音コントロール
                VStack(spacing: 20) {
                    Button(action: toggleRecording) {
                        HStack {
                            Image(systemName: isRecording ? "stop.fill" : "record.circle")
                            Text(isRecording ? "録音停止" : "録音開始")
                        }
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(isRecording ? Color.red : Color.blue)
                        .cornerRadius(12)
                    }
                    
                    if !isRecording && recordingTime > 0 {
                        Button(action: resetRecording) {
                            HStack {
                                Image(systemName: "trash")
                                Text("リセット")
                            }
                            .font(.title3)
                            .foregroundColor(.red)
                        }
                    }
                }
                
                Spacer()
                
                // 注意事項
                VStack(alignment: .leading, spacing: 8) {
                    Text("📝 注意事項")
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    Text("• この画面はデモ版です")
                    Text("• 実際の録音機能は未実装")
                    Text("• タイマーのみ動作します")
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
            .padding()
            .navigationTitle("録音")
            .navigationBarTitleDisplayMode(.large)
        }
    }
    
    private func toggleRecording() {
        isRecording.toggle()
        
        if isRecording {
            startTimer()
        } else {
            stopTimer()
        }
    }
    
    private func resetRecording() {
        recordingTime = 0
        stopTimer()
    }
    
    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            recordingTime += 1
        }
    }
    
    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }
    
    private func timeString(from interval: TimeInterval) -> String {
        let minutes = Int(interval) / 60
        let seconds = Int(interval) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

// 文字起こし画面
struct TranscriptTabView: View {
    @State private var isTranscribing = false
    @State private var transcriptText = ""
    @State private var progress: Double = 0.0
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // 文字起こし状態
                VStack(spacing: 15) {
                    Image(systemName: "doc.text")
                        .font(.system(size: 60))
                        .foregroundColor(.green)
                    
                    Text(isTranscribing ? "文字起こし中..." : "文字起こし")
                        .font(.title2)
                        .fontWeight(.medium)
                    
                    if isTranscribing {
                        ProgressView(value: progress)
                            .progressViewStyle(LinearProgressViewStyle())
                            .scaleEffect(x: 1, y: 2)
                        
                        Text("\(Int(progress * 100))%")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
                
                // 文字起こし結果
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("文字起こし結果")
                            .font(.headline)
                            .fontWeight(.semibold)
                        
                        if transcriptText.isEmpty {
                            Text("まだ文字起こしが行われていません。\n下のボタンを押して開始してください。")
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                                .padding()
                        } else {
                            Text(transcriptText)
                                .font(.body)
                                .padding()
                                .background(Color(.systemGray6))
                                .cornerRadius(8)
                        }
                    }
                }
                
                Spacer()
                
                // コントロールボタン
                VStack(spacing: 15) {
                    Button(action: startTranscription) {
                        HStack {
                            Image(systemName: "mic.badge.plus")
                            Text("文字起こし開始")
                        }
                        .font(.title3)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .cornerRadius(12)
                    }
                    .disabled(isTranscribing)
                    
                    if !transcriptText.isEmpty {
                        Button(action: clearTranscript) {
                            HStack {
                                Image(systemName: "trash")
                                Text("クリア")
                            }
                            .font(.title3)
                            .foregroundColor(.red)
                        }
                    }
                }
            }
            .padding()
            .navigationTitle("文字起こし")
            .navigationBarTitleDisplayMode(.large)
        }
    }
    
    private func startTranscription() {
        isTranscribing = true
        progress = 0.0
        transcriptText = ""
        
        Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { timer in
            progress += 0.02
            
            if progress >= 1.0 {
                timer.invalidate()
                isTranscribing = false
                transcriptText = """
                こんにちは、今日の会議を始めさせていただきます。
                
                まず、今月の売上について報告いたします。前月比で15%の増加となりました。
                
                次に、新しいプロジェクトについて議論したいと思います。開発チームからの提案を聞かせてください。
                
                最後に、来月のスケジュールについて確認いたします。
                
                ※ これはデモ用のサンプルテキストです。実際の文字起こし機能は今後実装予定です。
                """
            }
        }
    }
    
    private func clearTranscript() {
        transcriptText = ""
        progress = 0.0
    }
}

// AI要約画面
struct SummaryTabView: View {
    @State private var isGenerating = false
    @State private var summaryText = ""
    @State private var selectedTemplate = "会議要約"
    
    let templates = ["会議要約", "アクションアイテム", "決定事項", "課題整理"]
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // AI要約状態
                VStack(spacing: 15) {
                    Image(systemName: "brain.head.profile")
                        .font(.system(size: 60))
                        .foregroundColor(.purple)
                    
                    Text(isGenerating ? "AI要約生成中..." : "AI要約")
                        .font(.title2)
                        .fontWeight(.medium)
                    
                    if isGenerating {
                        ProgressView()
                            .scaleEffect(1.5)
                            .padding()
                    }
                }
                .padding()
                
                // テンプレート選択
                VStack(alignment: .leading, spacing: 10) {
                    Text("要約テンプレート")
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    Picker("テンプレート", selection: $selectedTemplate) {
                        ForEach(templates, id: \.self) { template in
                            Text(template).tag(template)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                }
                
                // 要約結果
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("要約結果")
                            .font(.headline)
                            .fontWeight(.semibold)
                        
                        if summaryText.isEmpty {
                            Text("まだ要約が生成されていません。\n下のボタンを押して生成してください。")
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                                .padding()
                        } else {
                            Text(summaryText)
                                .font(.body)
                                .padding()
                                .background(Color(.systemGray6))
                                .cornerRadius(8)
                        }
                    }
                }
                
                Spacer()
                
                // コントロールボタン
                Button(action: generateSummary) {
                    HStack {
                        Image(systemName: "brain")
                        Text("AI要約生成")
                    }
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.purple)
                    .cornerRadius(12)
                }
                .disabled(isGenerating)
            }
            .padding()
            .navigationTitle("AI要約")
            .navigationBarTitleDisplayMode(.large)
        }
    }
    
    private func generateSummary() {
        isGenerating = true
        summaryText = ""
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            isGenerating = false
            
            switch selectedTemplate {
            case "会議要約":
                summaryText = """
                📅 会議要約
                
                【議題】
                • 月次売上報告（前月比15%増）
                • 新プロジェクト提案の検討
                • 来月スケジュール確認
                
                【主な内容】
                • 売上好調により目標達成見込み
                • 開発チームから新機能提案あり
                • リソース配分の再検討が必要
                """
            case "アクションアイテム":
                summaryText = """
                ✅ アクションアイテム
                
                【田中さん】
                • 売上詳細レポート作成（期限：来週金曜）
                • 顧客フィードバックの整理
                
                【佐藤さん】
                • 新機能の技術仕様書作成
                • 開発工数の見積もり
                """
            case "決定事項":
                summaryText = """
                📋 決定事項
                
                【承認事項】
                • 月次売上目標の達成を確認
                • 新プロジェクトの検討継続を決定
                
                【方針決定】
                • 開発リソースの一部を新機能に割り当て
                • 週次進捗確認ミーティングの実施
                """
            default:
                summaryText = """
                🔍 課題整理
                
                【技術課題】
                • 既存システムとの連携方法
                • パフォーマンス最適化の必要性
                
                【リソース課題】
                • 開発メンバーのスケジュール調整
                • 外部ベンダーとの連携
                """
            }
        }
    }
}

// AskAI画面
struct AskAITabView: View {
    @State private var messages: [SimpleChatMessage] = []
    @State private var inputText = ""
    @State private var isLoading = false
    
    var body: some View {
        NavigationView {
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
                                SimpleChatBubble(message: message)
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
            }
            .navigationTitle("AskAI")
            .navigationBarTitleDisplayMode(.large)
        }
    }
    
    private let suggestedQuestions = [
        "会議の主なポイントは何ですか？",
        "決定事項をまとめてください",
        "次回までのアクションアイテムは？",
        "課題として挙がった点は？"
    ]
    
    private func sendMessage() {
        guard !inputText.isEmpty else { return }
        
        let userMessage = SimpleChatMessage(id: UUID(), text: inputText, isUser: true)
        messages.append(userMessage)
        
        let question = inputText
        inputText = ""
        isLoading = true
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            let aiResponse = generateAIResponse(for: question)
            let aiMessage = SimpleChatMessage(id: UUID(), text: aiResponse, isUser: false)
            messages.append(aiMessage)
            isLoading = false
        }
    }
    
    private func generateAIResponse(for question: String) -> String {
        if question.contains("会議の主なポイント") || question.contains("ポイント") {
            return """
            今回の会議の主なポイントは以下の通りです：
            
            1. 月次売上が前月比15%増加
            2. 新プロジェクトの提案と検討
            3. 来月のスケジュール調整
            4. リソース配分の見直し
            
            特に売上増加は目標を上回る結果となりました。
            """
        }
        
        return """
        ご質問ありがとうございます。
        
        現在はデモ版のため、限定的な回答しか提供できません。実際のAskAI機能では、会議の文字起こしや要約内容に基づいて、より詳細で正確な回答を提供します。
        """
    }
}

struct SimpleChatMessage: Identifiable {
    let id: UUID
    let text: String
    let isUser: Bool
}

struct SimpleChatBubble: View {
    let message: SimpleChatMessage
    
    var body: some View {
        HStack {
            if message.isUser {
                Spacer()
                Text(message.text)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
            } else {
                Text(message.text)
                    .padding()
                    .background(Color(.systemGray5))
                    .cornerRadius(12)
                Spacer()
            }
        }
    }
}

struct AllInOneContentView_Previews: PreviewProvider {
    static var previews: some View {
        AllInOneContentView()
    }
}