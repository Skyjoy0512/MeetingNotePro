import SwiftUI
import AVFoundation

// 録音画面（実際のAVFoundation統合版）
struct EnhancedRecordingView: View {
    @StateObject private var audioService = AudioRecordingService()
    @StateObject private var transcriptionService = SpeechTranscriptionService()
    @StateObject private var llmService = MultiLLMAPIService()
    
    @State private var recordingTitle = ""
    @State private var showingModelSelector = false
    @State private var selectedLLMModel = LLMModel.availableModels.first(where: { $0.provider == .gemini })!
    @State private var showingSaveDialog = false
    @State private var showingTranscriptionView = false
    
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                
                // 録音状態表示
                recordingStatusView
                
                // 録音レベルビジュアライザー
                recordingLevelView
                
                // 録音時間表示
                recordingTimeView
                
                // 録音コントロール
                recordingControlsView
                
                // 録音タイトル入力
                recordingTitleView
                
                // リアルタイム文字起こし結果
                if transcriptionService.transcriptionState == .processing ||
                   transcriptionService.currentResult != nil {
                    realtimeTranscriptionView
                }
                
                Spacer()
            }
            .padding()
            .navigationTitle("録音")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("キャンセル") {
                        stopRecordingAndDismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    if audioService.recordingState == .completed {
                        Button("保存") {
                            showingSaveDialog = true
                        }
                    }
                }
            }
        }
        .sheet(isPresented: $showingSaveDialog) {
            SaveRecordingView(
                audioService: audioService,
                transcriptionService: transcriptionService,
                llmService: llmService,
                selectedModel: selectedLLMModel,
                recordingTitle: recordingTitle
            )
        }
        .sheet(isPresented: $showingModelSelector) {
            LLMModelSelectorView(selectedModel: $selectedLLMModel)
        }
        .alert("エラー", isPresented: .constant(audioService.errorMessage != nil || transcriptionService.errorMessage != nil)) {
            Button("OK") {
                audioService.errorMessage = nil
                transcriptionService.errorMessage = nil
            }
        } message: {
            Text(audioService.errorMessage ?? transcriptionService.errorMessage ?? "")
        }
    }
    
    // MARK: - View Components
    
    private var recordingStatusView: some View {
        VStack(spacing: 8) {
            Image(systemName: recordingStatusIcon)
                .font(.system(size: 80))
                .foregroundColor(recordingStatusColor)
            
            Text(recordingStatusText)
                .font(.title2)
                .fontWeight(.medium)
                .foregroundColor(recordingStatusColor)
        }
    }
    
    private var recordingLevelView: some View {
        VStack(spacing: 8) {
            Text("音量レベル")
                .font(.caption)
                .foregroundColor(.secondary)
            
            HStack(spacing: 2) {
                ForEach(0..<20, id: \.self) { index in
                    Rectangle()
                        .fill(audioService.recordingLevel > Float(index) / 20.0 ? .green : .gray.opacity(0.3))
                        .frame(width: 8, height: 20)
                        .animation(.easeInOut(duration: 0.1), value: audioService.recordingLevel)
                }
            }
        }
    }
    
    private var recordingTimeView: some View {
        VStack(spacing: 4) {
            Text("録音時間")
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text(audioService.currentRecordingDuration.formattedDuration)
                .font(.title)
                .fontWeight(.bold)
                .foregroundColor(.primary)
        }
    }
    
    private var recordingControlsView: some View {
        HStack(spacing: 40) {
            // 録音開始/停止ボタン
            Button(action: recordingButtonAction) {
                Image(systemName: recordingButtonIcon)
                    .font(.system(size: 40))
                    .foregroundColor(.white)
                    .frame(width: 80, height: 80)
                    .background(recordingButtonColor)
                    .clipShape(Circle())
            }
            .disabled(audioService.recordingState == .completed)
            
            // 一時停止/再開ボタン
            if audioService.recordingState == .recording || audioService.recordingState == .paused {
                Button(action: pauseResumeAction) {
                    Image(systemName: audioService.recordingState == .recording ? "pause.fill" : "play.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.white)
                        .frame(width: 50, height: 50)
                        .background(.blue)
                        .clipShape(Circle())
                }
            }
        }
    }
    
    private var recordingTitleView: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("録音タイトル")
                .font(.headline)
            
            TextField("会議名を入力", text: $recordingTitle)
                .textFieldStyle(RoundedBorderTextFieldStyle())
        }
    }
    
    private var realtimeTranscriptionView: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("リアルタイム文字起こし")
                    .font(.headline)
                
                Spacer()
                
                Button("モデル選択") {
                    showingModelSelector = true
                }
                .font(.caption)
            }
            
            ScrollView {
                Text(transcriptionService.currentResult?.fullText ?? "文字起こし処理中...")
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(8)
            }
            .frame(maxHeight: 150)
        }
    }
    
    // MARK: - Computed Properties
    
    private var recordingStatusIcon: String {
        switch audioService.recordingState {
        case .idle: return "mic.circle"
        case .recording: return "mic.circle.fill"
        case .paused: return "pause.circle.fill"
        case .completed: return "checkmark.circle.fill"
        }
    }
    
    private var recordingStatusColor: Color {
        switch audioService.recordingState {
        case .idle: return .gray
        case .recording: return .red
        case .paused: return .orange
        case .completed: return .green
        }
    }
    
    private var recordingStatusText: String {
        switch audioService.recordingState {
        case .idle: return "録音準備完了"
        case .recording: return "録音中"
        case .paused: return "一時停止中"
        case .completed: return "録音完了"
        }
    }
    
    private var recordingButtonIcon: String {
        switch audioService.recordingState {
        case .idle: return "record.circle"
        case .recording: return "stop.circle"
        case .paused: return "stop.circle"
        case .completed: return "checkmark.circle"
        }
    }
    
    private var recordingButtonColor: Color {
        switch audioService.recordingState {
        case .idle: return .red
        case .recording: return .red
        case .paused: return .red
        case .completed: return .green
        }
    }
    
    // MARK: - Actions
    
    private func recordingButtonAction() {
        switch audioService.recordingState {
        case .idle:
            startRecording()
        case .recording, .paused:
            stopRecording()
        case .completed:
            break
        }
    }
    
    private func pauseResumeAction() {
        switch audioService.recordingState {
        case .recording:
            audioService.pauseRecording()
        case .paused:
            audioService.resumeRecording()
        default:
            break
        }
    }
    
    private func startRecording() {
        Task {
            await audioService.startRecording()
            
            // リアルタイム文字起こし開始
            if audioService.recordingState == .recording {
                await transcriptionService.startRealtimeTranscription()
            }
        }
        
        // デフォルトタイトル設定
        if recordingTitle.isEmpty {
            let formatter = DateFormatter()
            formatter.dateFormat = "MM月dd日 HH時mm分の会議"
            recordingTitle = formatter.string(from: Date())
        }
    }
    
    private func stopRecording() {
        audioService.stopRecording()
        transcriptionService.stopRealtimeTranscription()
    }
    
    private func stopRecordingAndDismiss() {
        if audioService.recordingState == .recording || audioService.recordingState == .paused {
            stopRecording()
        }
        dismiss()
    }
}

// 録音保存画面
struct SaveRecordingView: View {
    let audioService: AudioRecordingService
    let transcriptionService: SpeechTranscriptionService
    let llmService: MultiLLMAPIService
    let selectedModel: LLMModel
    
    @State var recordingTitle: String
    @State private var isProcessing = false
    @State private var processingStage = ""
    @State private var selectedTemplate = SummaryTemplate.meeting
    
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                if isProcessing {
                    processingView
                } else {
                    saveOptionsView
                }
                
                Spacer()
            }
            .padding()
            .navigationTitle("録音を保存")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("キャンセル") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    if !isProcessing {
                        Button("保存") {
                            saveRecording()
                        }
                        .disabled(recordingTitle.isEmpty)
                    }
                }
            }
        }
    }
    
    private var saveOptionsView: some View {
        VStack(alignment: .leading, spacing: 16) {
            // タイトル入力
            VStack(alignment: .leading) {
                Text("録音タイトル")
                    .font(.headline)
                
                TextField("会議名を入力", text: $recordingTitle)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
            }
            
            // 選択したLLMモデル表示
            VStack(alignment: .leading) {
                Text("AI処理モデル")
                    .font(.headline)
                
                HStack {
                    Image(systemName: "brain.head.profile")
                        .foregroundColor(.blue)
                    
                    VStack(alignment: .leading) {
                        Text(selectedModel.name)
                            .font(.subheadline)
                            .fontWeight(.medium)
                        
                        Text(selectedModel.description)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                }
                .padding()
                .background(Color.gray.opacity(0.1))
                .cornerRadius(8)
            }
            
            // 要約テンプレート選択
            VStack(alignment: .leading) {
                Text("要約テンプレート")
                    .font(.headline)
                
                Picker("要約テンプレート", selection: $selectedTemplate) {
                    ForEach(SummaryTemplate.allCases) { template in
                        Text(template.displayName).tag(template)
                    }
                }
                .pickerStyle(SegmentedPickerStyle())
            }
        }
    }
    
    private var processingView: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)
            
            Text(processingStage)
                .font(.headline)
                .multilineTextAlignment(.center)
            
            Text("録音データを処理しています。しばらくお待ちください。")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
    }
    
    private func saveRecording() {
        isProcessing = true
        processingStage = "録音ファイルを保存中..."
        
        Task {
            // 1. 録音ファイル保存
            guard let audioURL = audioService.saveRecording(title: recordingTitle) else {
                await MainActor.run {
                    isProcessing = false
                    // エラーハンドリング
                }
                return
            }
            
            await MainActor.run {
                processingStage = "文字起こし処理中..."
            }
            
            // 2. 文字起こし実行
            do {
                await transcriptionService.transcribeAudioFile(url: audioURL)
                
                guard let transcriptResult = transcriptionService.currentResult else {
                    throw TranscriptionError.processingError
                }
                
                await MainActor.run {
                    processingStage = "AI要約生成中..."
                }
                
                // 3. AI要約生成
                let summaryResponse = try await llmService.generateSummary(
                    transcript: transcriptResult.fullText,
                    model: selectedModel,
                    template: selectedTemplate.template
                )
                
                await MainActor.run {
                    processingStage = "保存完了"
                    isProcessing = false
                }
                
                // 4. データベース保存（実装予定）
                // saveToCoreData(audioURL, transcriptResult, summaryResponse)
                
                // 5. 画面を閉じる
                await MainActor.run {
                    dismiss()
                }
                
            } catch {
                await MainActor.run {
                    isProcessing = false
                    processingStage = "エラー: \(error.localizedDescription)"
                }
            }
        }
    }
}

// 要約テンプレート
enum SummaryTemplate: String, CaseIterable, Identifiable {
    case meeting = "meeting"
    case interview = "interview"
    case lecture = "lecture"
    case brainstorm = "brainstorm"
    case custom = "custom"
    
    var id: String { self.rawValue }
    
    var displayName: String {
        switch self {
        case .meeting: return "会議"
        case .interview: return "面接"
        case .lecture: return "講義"
        case .brainstorm: return "ブレスト"
        case .custom: return "カスタム"
        }
    }
    
    var template: String {
        switch self {
        case .meeting:
            return """
            以下の形式で会議の要約を作成してください：
            
            ## 会議概要
            - 日時：
            - 参加者：
            - 議題：
            
            ## 主要な決定事項
            
            ## アクションアイテム
            
            ## 次回までの課題
            """
            
        case .interview:
            return """
            以下の形式で面接の要約を作成してください：
            
            ## 候補者情報
            
            ## 質問と回答のサマリー
            
            ## 評価ポイント
            
            ## 次のステップ
            """
            
        case .lecture:
            return """
            以下の形式で講義の要約を作成してください：
            
            ## 講義概要
            
            ## 主要なポイント
            
            ## 重要な概念・用語
            
            ## 質疑応答
            """
            
        case .brainstorm:
            return """
            以下の形式でブレインストーミングの要約を作成してください：
            
            ## セッション概要
            
            ## 出されたアイデア
            
            ## 有望なアイデア
            
            ## 次のアクション
            """
            
        case .custom:
            return "自由形式で内容を要約してください。"
        }
    }
}

// LLMモデル選択画面
struct LLMModelSelectorView: View {
    @Binding var selectedModel: LLMModel
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            List {
                ForEach(LLMProvider.allCases) { provider in
                    Section(provider.displayName) {
                        ForEach(LLMModel.availableModels.filter { $0.provider == provider }) { model in
                            ModelRowView(model: model, isSelected: model.id == selectedModel.id) {
                                selectedModel = model
                                dismiss()
                            }
                        }
                    }
                }
            }
            .navigationTitle("AIモデル選択")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完了") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct ModelRowView: View {
    let model: LLMModel
    let isSelected: Bool
    let onSelect: () -> Void
    
    var body: some View {
        Button(action: onSelect) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(model.name)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text(model.description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    HStack {
                        Text("¥\(model.costPer1kTokens, specifier: "%.3f")/1Kトークン")
                            .font(.caption2)
                            .foregroundColor(.orange)
                        
                        Spacer()
                        
                        Text("\(model.contextLength/1000)K context")
                            .font(.caption2)
                            .foregroundColor(.blue)
                    }
                }
                
                Spacer()
                
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.blue)
                }
            }
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#if DEBUG
struct EnhancedRecordingView_Previews: PreviewProvider {
    static var previews: some View {
        EnhancedRecordingView()
    }
}
#endif