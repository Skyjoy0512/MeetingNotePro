import SwiftUI

// メインのタブビュー
struct ContentView: View {
    @State private var selectedTab = 0
    @State private var showingAddOptions = false
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // ホーム画面（録音データ一覧）
            HomeView()
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("ホーム")
                }
                .tag(0)
            
            // プラス（録音・インポート）
            Color.clear
                .tabItem {
                    Image(systemName: "plus.circle.fill")
                    Text("追加")
                }
                .tag(1)
                .onAppear {
                    if selectedTab == 1 {
                        showingAddOptions = true
                        selectedTab = 0 // ホームに戻す
                    }
                }
            
            // マイページ
            MyPageView()
                .tabItem {
                    Image(systemName: "person.circle.fill")
                    Text("マイページ")
                }
                .tag(2)
        }
        .sheet(isPresented: $showingAddOptions) {
            AddOptionsView()
        }
    }
}

// ホーム画面 - 録音データ一覧
struct HomeView: View {
    @State private var recordings: [RecordingData] = [
        RecordingData(id: 1, title: "2024年6月売上会議", date: "2024-06-22", duration: "45:32", hasTranscript: true, hasSummary: true),
        RecordingData(id: 2, title: "プロジェクト進捗ミーティング", date: "2024-06-21", duration: "32:15", hasTranscript: true, hasSummary: false),
        RecordingData(id: 3, title: "新機能開発レビュー", date: "2024-06-20", duration: "28:47", hasTranscript: false, hasSummary: false),
        RecordingData(id: 4, title: "チーム週次定例", date: "2024-06-19", duration: "22:33", hasTranscript: true, hasSummary: true),
        RecordingData(id: 5, title: "クライアント打ち合わせ", date: "2024-06-18", duration: "51:20", hasTranscript: false, hasSummary: false),
        RecordingData(id: 6, title: "四半期レビュー", date: "2024-06-17", duration: "67:45", hasTranscript: true, hasSummary: true)
    ]
    
    let columns = [
        GridItem(.flexible()),
        GridItem(.flexible())
    ]
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVGrid(columns: columns, spacing: 16) {
                    ForEach(recordings) { recording in
                        NavigationLink(destination: RecordingDetailView(recording: recording)) {
                            RecordingCardView(recording: recording)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding()
            }
            .navigationTitle("録音データ")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

// 録音データカード
struct RecordingCardView: View {
    let recording: RecordingData
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // ステータスインジケーター
            HStack {
                // 処理状況バッジ
                if recording.hasTranscript && recording.hasSummary {
                    Label("完了", systemImage: "checkmark.circle.fill")
                        .font(.caption)
                        .foregroundColor(.green)
                } else if recording.hasTranscript {
                    Label("文字起こし済", systemImage: "doc.text.fill")
                        .font(.caption)
                        .foregroundColor(.blue)
                } else {
                    Label("未処理", systemImage: "clock.fill")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
                Spacer()
                
                // 時間
                Text(recording.duration)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // タイトル
            Text(recording.title)
                .font(.headline)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
            
            // 日付
            Text(recording.date)
                .font(.caption)
                .foregroundColor(.secondary)
            
            // 操作ボタン
            HStack {
                Button(action: {}) {
                    Image(systemName: "play.circle.fill")
                        .font(.title2)
                        .foregroundColor(.blue)
                }
                
                if recording.hasTranscript && recording.hasSummary {
                    Button(action: {}) {
                        Image(systemName: "brain.head.profile")
                            .font(.title2)
                            .foregroundColor(.purple)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// 録音データ詳細画面
struct RecordingDetailView: View {
    let recording: RecordingData
    @State private var selectedSegment = 0
    @State private var isPlaying = false
    @State private var playbackTime: Double = 0
    @State private var showingAskAI = false
    
    var body: some View {
        VStack(spacing: 0) {
            // 音声プレイヤー
            VStack(spacing: 16) {
                // 再生コントロール
                HStack(spacing: 20) {
                    Button(action: { isPlaying.toggle() }) {
                        Image(systemName: isPlaying ? "pause.circle.fill" : "play.circle.fill")
                            .font(.system(size: 50))
                            .foregroundColor(.blue)
                    }
                    
                    VStack(alignment: .leading) {
                        Text(recording.title)
                            .font(.headline)
                        Text("\(formatTime(playbackTime)) / \(recording.duration)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                }
                
                // プログレスバー
                Slider(value: $playbackTime, in: 0...100)
                    .accentColor(.blue)
            }
            .padding()
            .background(Color(.systemGray6))
            
            // セグメント選択
            Picker("", selection: $selectedSegment) {
                Text("文字起こし").tag(0)
                Text("AI要約").tag(1)
            }
            .pickerStyle(SegmentedPickerStyle())
            .padding()
            
            // コンテンツ
            TabView(selection: $selectedSegment) {
                // 文字起こしタブ
                TranscriptContentView(recording: recording)
                    .tag(0)
                
                // AI要約タブ
                SummaryContentView(recording: recording, showingAskAI: $showingAskAI)
                    .tag(1)
            }
            .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingAskAI) {
            AskAIView(recording: recording)
        }
    }
    
    private func formatTime(_ time: Double) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

// 文字起こしコンテンツ
struct TranscriptContentView: View {
    let recording: RecordingData
    @State private var isProcessing = false
    @State private var transcriptText = ""
    
    var body: some View {
        VStack {
            if recording.hasTranscript {
                ScrollView {
                    Text(sampleTranscript)
                        .padding()
                }
            } else if isProcessing {
                VStack(spacing: 20) {
                    ProgressView("文字起こし処理中...")
                        .scaleEffect(1.2)
                    Text("音声を解析しています...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding()
            } else {
                VStack(spacing: 20) {
                    Image(systemName: "doc.text")
                        .font(.system(size: 60))
                        .foregroundColor(.gray)
                    
                    Text("文字起こしがまだ実行されていません")
                        .font(.headline)
                    
                    Button("文字起こしを開始") {
                        isProcessing = true
                        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                            isProcessing = false
                            transcriptText = sampleTranscript
                        }
                    }
                    .font(.title3)
                    .padding()
                    .background(Color.green)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                }
                .padding()
            }
        }
    }
    
    private let sampleTranscript = """
    会議開始時刻：2024年6月22日 14:00
    
    田中：皆さん、お疲れ様です。今日は6月の売上について話し合いましょう。
    
    佐藤：はい。今月の売上ですが、前月比で15%の増加となりました。特にモバイル向けサービスが好調でした。
    
    山田：素晴らしい結果ですね。具体的にはどのような要因が考えられますか？
    
    佐藤：新機能のリリースとマーケティングキャンペーンの効果が大きかったと思います。ユーザーからの反応も非常に良好です。
    
    田中：ありがとうございます。来月に向けてはどのような計画を立てていますか？
    
    山田：リソースの増強と新しいプロジェクトの立ち上げを検討しています。詳細は来週の会議で報告いたします。
    """
}

// AI要約コンテンツ
struct SummaryContentView: View {
    let recording: RecordingData
    @Binding var showingAskAI: Bool
    @State private var isGenerating = false
    @State private var summaryText = ""
    
    var body: some View {
        VStack {
            if recording.hasSummary {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        Text(sampleSummary)
                            .padding()
                        
                        // AskAIボタン
                        Button("💬 AskAIで質問する") {
                            showingAskAI = true
                        }
                        .font(.title3)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.orange)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                        .padding(.horizontal)
                    }
                }
            } else if isGenerating {
                VStack(spacing: 20) {
                    ProgressView("AI要約生成中...")
                        .scaleEffect(1.2)
                    Text("会議内容を分析しています...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding()
            } else {
                VStack(spacing: 20) {
                    Image(systemName: "brain.head.profile")
                        .font(.system(size: 60))
                        .foregroundColor(.gray)
                    
                    Text("AI要約がまだ生成されていません")
                        .font(.headline)
                    
                    if recording.hasTranscript {
                        Button("AI要約を生成") {
                            isGenerating = true
                            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                                isGenerating = false
                                summaryText = sampleSummary
                            }
                        }
                        .font(.title3)
                        .padding()
                        .background(Color.purple)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    } else {
                        Text("※ 文字起こしを先に実行してください")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
            }
        }
    }
    
    private let sampleSummary = """
    📋 会議要約
    
    【日時】2024年6月22日 14:00
    【参加者】田中、佐藤、山田
    
    【主な議題】
    • 6月の売上実績について
    • 来月の計画について
    
    【決定事項】
    ✅ 6月売上：前月比15%増（モバイル向けサービス好調）
    ✅ 新機能リリースとマーケティング効果を確認
    ✅ 来月の計画：リソース増強と新プロジェクト検討
    
    【アクションアイテム】
    📝 山田：来週の会議で詳細計画を報告
    📝 佐藤：ユーザー反応の詳細分析
    
    【次回会議】
    来週（詳細日程は後日調整）
    """
}

// AskAI画面
struct AskAIView: View {
    let recording: RecordingData
    @State private var messages: [ChatMessage] = []
    @State private var inputText = ""
    @State private var isLoading = false
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        NavigationView {
            VStack {
                // チャット履歴
                ScrollView {
                    LazyVStack(spacing: 12) {
                        if messages.isEmpty {
                            VStack(spacing: 16) {
                                Image(systemName: "brain.head.profile")
                                    .font(.system(size: 50))
                                    .foregroundColor(.orange)
                                
                                Text("この会議について何でも質問してください")
                                    .font(.headline)
                                    .multilineTextAlignment(.center)
                                
                                // 提案質問
                                VStack(spacing: 8) {
                                    ForEach(suggestedQuestions, id: \.self) { question in
                                        Button(question) {
                                            inputText = question
                                        }
                                        .font(.subheadline)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 8)
                                        .background(Color.orange.opacity(0.1))
                                        .foregroundColor(.orange)
                                        .cornerRadius(8)
                                    }
                                }
                            }
                            .padding()
                        } else {
                            ForEach(messages) { message in
                                ChatBubbleView(message: message)
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
                            Text("AI回答生成中...")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                        }
                        .padding(.horizontal)
                    }
                    
                    HStack {
                        TextField("質問を入力してください...", text: $inputText)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                        
                        Button("送信") {
                            sendMessage()
                        }
                        .disabled(inputText.isEmpty || isLoading)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(inputText.isEmpty ? Color.gray : Color.orange)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                    }
                    .padding()
                }
            }
            .navigationTitle("AskAI")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(trailing: Button("完了") {
                presentationMode.wrappedValue.dismiss()
            })
        }
    }
    
    private let suggestedQuestions = [
        "会議の主な決定事項は？",
        "売上が増加した理由は？",
        "次回までのアクションアイテムは？",
        "参加者の役割分担は？"
    ]
    
    private func sendMessage() {
        guard !inputText.isEmpty else { return }
        
        let userMessage = ChatMessage(id: UUID(), text: inputText, isUser: true, timestamp: Date())
        messages.append(userMessage)
        
        let question = inputText
        inputText = ""
        isLoading = true
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            let response = generateResponse(for: question)
            let aiMessage = ChatMessage(id: UUID(), text: response, isUser: false, timestamp: Date())
            messages.append(aiMessage)
            isLoading = false
        }
    }
    
    private func generateResponse(for question: String) -> String {
        if question.contains("決定事項") {
            return """
            会議の主な決定事項は以下の通りです：
            
            ✅ 6月の売上が前月比15%増加したことを確認
            ✅ モバイル向けサービスの成功を評価
            ✅ 新機能リリースの効果を確認
            ✅ 来月のリソース増強を決定
            ✅ 新プロジェクトの検討開始を承認
            """
        } else if question.contains("売上") && question.contains("理由") {
            return """
            売上増加の主な理由は：
            
            1. 📱 新機能のリリース効果
            2. 📢 マーケティングキャンペーンの成功
            3. 👥 ユーザーからの良好な反応
            4. 🎯 モバイル向けサービスの特に好調な成績
            
            佐藤さんが詳細な分析を担当されています。
            """
        } else if question.contains("アクションアイテム") {
            return """
            次回までのアクションアイテム：
            
            📝 山田さん：
            • 来週の会議で詳細計画を報告
            • リソース増強の具体案作成
            
            📝 佐藤さん：
            • ユーザー反応の詳細分析
            • モバイルサービス成功要因の整理
            
            期限：来週の会議まで
            """
        }
        
        return "ご質問ありがとうございます。会議の内容に基づいてお答えしますが、より具体的な質問をいただければ、詳細な情報を提供できます。"
    }
}

// 追加オプション画面
struct AddOptionsView: View {
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                Text("新しい録音データを追加")
                    .font(.title)
                    .fontWeight(.bold)
                    .padding(.top)
                
                VStack(spacing: 20) {
                    // 録音開始
                    Button(action: {
                        // 録音画面へ
                        presentationMode.wrappedValue.dismiss()
                    }) {
                        HStack {
                            Image(systemName: "mic.circle.fill")
                                .font(.title)
                                .foregroundColor(.red)
                            
                            VStack(alignment: .leading) {
                                Text("録音開始")
                                    .font(.headline)
                                Text("新しい会議を録音します")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                            
                            Image(systemName: "chevron.right")
                                .foregroundColor(.secondary)
                        }
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(12)
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    // 音声インポート
                    Button(action: {
                        // インポート処理
                        presentationMode.wrappedValue.dismiss()
                    }) {
                        HStack {
                            Image(systemName: "square.and.arrow.down.fill")
                                .font(.title)
                                .foregroundColor(.blue)
                            
                            VStack(alignment: .leading) {
                                Text("音声ファイルをインポート")
                                    .font(.headline)
                                Text("既存の音声ファイルを読み込みます")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                            
                            Image(systemName: "chevron.right")
                                .foregroundColor(.secondary)
                        }
                        .padding()
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(12)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                .padding(.horizontal)
                
                Spacer()
            }
            .navigationBarItems(trailing: Button("キャンセル") {
                presentationMode.wrappedValue.dismiss()
            })
        }
    }
}

// マイページ
struct MyPageView: View {
    var body: some View {
        NavigationView {
            List {
                // アカウント情報
                Section("アカウント情報") {
                    HStack {
                        Image(systemName: "person.circle.fill")
                            .font(.title)
                            .foregroundColor(.blue)
                        
                        VStack(alignment: .leading) {
                            Text("田中 太郎")
                                .font(.headline)
                            Text("tanaka@example.com")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                    }
                    .padding(.vertical, 4)
                }
                
                // 契約プラン
                Section("契約プラン") {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("現在のプラン")
                                .font(.subheadline)
                            Spacer()
                            Text("無料プラン")
                                .font(.subheadline)
                                .foregroundColor(.orange)
                        }
                        
                        Text("月10回まで文字起こし可能")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Button("プランをアップグレード") {
                            // アップグレード画面
                        }
                        .font(.subheadline)
                        .foregroundColor(.blue)
                    }
                    .padding(.vertical, 4)
                }
                
                // API設定
                Section("API設定") {
                    NavigationLink("Gemini API設定") {
                        APISettingsView()
                    }
                    NavigationLink("使用量確認") {
                        UsageView()
                    }
                }
                
                // その他
                Section("その他") {
                    NavigationLink("ヘルプ") { EmptyView() }
                    NavigationLink("プライバシーポリシー") { EmptyView() }
                    NavigationLink("利用規約") { EmptyView() }
                    
                    Button("ログアウト") {
                        // ログアウト処理
                    }
                    .foregroundColor(.red)
                }
            }
            .navigationTitle("マイページ")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

// API設定画面
struct APISettingsView: View {
    @State private var geminiAPIKey = ""
    @State private var showingSaveAlert = false
    
    var body: some View {
        List {
            Section(header: Text("Gemini API"), footer: Text("個人のAPIキーを設定することで、無制限に利用できます")) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("APIキー")
                        .font(.subheadline)
                    
                    SecureField("AIzaSy...", text: $geminiAPIKey)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    Button("保存") {
                        showingSaveAlert = true
                    }
                    .disabled(geminiAPIKey.isEmpty)
                }
                .padding(.vertical, 4)
            }
        }
        .navigationTitle("API設定")
        .navigationBarTitleDisplayMode(.inline)
        .alert("保存完了", isPresented: $showingSaveAlert) {
            Button("OK") { }
        } message: {
            Text("APIキーが正常に保存されました")
        }
    }
}

// 使用量画面
struct UsageView: View {
    var body: some View {
        List {
            Section("今月の使用量") {
                UsageRowView(title: "文字起こし", used: 7, limit: 10, color: .green)
                UsageRowView(title: "AI要約", used: 5, limit: 10, color: .purple)
                UsageRowView(title: "AskAI", used: 23, limit: 50, color: .orange)
            }
        }
        .navigationTitle("使用量")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct UsageRowView: View {
    let title: String
    let used: Int
    let limit: Int
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title)
                    .font(.subheadline)
                Spacer()
                Text("\(used)/\(limit)")
                    .font(.subheadline)
                    .foregroundColor(color)
            }
            
            ProgressView(value: Double(used), total: Double(limit))
                .progressViewStyle(LinearProgressViewStyle(tint: color))
        }
        .padding(.vertical, 4)
    }
}

// データモデル
struct RecordingData: Identifiable {
    let id: Int
    let title: String
    let date: String
    let duration: String
    let hasTranscript: Bool
    let hasSummary: Bool
}

struct ChatMessage: Identifiable {
    let id: UUID
    let text: String
    let isUser: Bool
    let timestamp: Date
}

struct ChatBubbleView: View {
    let message: ChatMessage
    
    var body: some View {
        HStack {
            if message.isUser {
                Spacer()
                Text(message.text)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                    .frame(maxWidth: .infinity * 0.8, alignment: .trailing)
            } else {
                Text(message.text)
                    .padding()
                    .background(Color(.systemGray5))
                    .cornerRadius(12)
                    .frame(maxWidth: .infinity * 0.8, alignment: .leading)
                Spacer()
            }
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}