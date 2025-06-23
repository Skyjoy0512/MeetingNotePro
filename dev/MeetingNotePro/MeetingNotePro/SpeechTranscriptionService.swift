import Foundation
import Speech
import AVFoundation

// 文字起こし状態
enum TranscriptionState {
    case idle           // 待機中
    case processing     // 処理中
    case completed      // 完了
    case error          // エラー
}

// 文字起こしエラー
enum TranscriptionError: Error, LocalizedError {
    case speechRecognitionNotAvailable
    case permissionDenied
    case audioFileNotFound
    case processingError
    
    var errorDescription: String? {
        switch self {
        case .speechRecognitionNotAvailable:
            return "音声認識機能が利用できません"
        case .permissionDenied:
            return "音声認識の許可が必要です"
        case .audioFileNotFound:
            return "音声ファイルが見つかりません"
        case .processingError:
            return "文字起こし処理中にエラーが発生しました"
        }
    }
}

// 文字起こし結果
struct TranscriptionSegment {
    let id = UUID()
    let text: String
    let confidence: Float
    let timestamp: TimeInterval
    let duration: TimeInterval
    let speakerID: String?
}

struct TranscriptionResult {
    let fullText: String
    let segments: [TranscriptionSegment]
    let duration: TimeInterval
    let confidence: Float
    let language: String
}

// Speech Framework 文字起こしサービス
class SpeechTranscriptionService: ObservableObject {
    
    // MARK: - Published Properties
    @Published var transcriptionState: TranscriptionState = .idle
    @Published var progress: Double = 0.0
    @Published var currentResult: TranscriptionResult?
    @Published var errorMessage: String?
    
    // MARK: - Private Properties
    private let speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    
    init() {
        // 日本語音声認識を優先、利用できない場合はデフォルト
        self.speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "ja-JP")) ?? 
                               SFSpeechRecognizer()
    }
    
    // MARK: - Public Methods
    
    /// 音声ファイルから文字起こし実行
    func transcribeAudioFile(url: URL) async {
        await MainActor.run {
            self.transcriptionState = .processing
            self.progress = 0.0
            self.errorMessage = nil
        }
        
        do {
            // 権限確認
            let permissionGranted = await requestSpeechPermission()
            guard permissionGranted else {
                await handleError(TranscriptionError.permissionDenied)
                return
            }
            
            // 音声認識可能確認
            guard let recognizer = speechRecognizer, recognizer.isAvailable else {
                await handleError(TranscriptionError.speechRecognitionNotAvailable)
                return
            }
            
            // ファイル存在確認
            guard FileManager.default.fileExists(atPath: url.path) else {
                await handleError(TranscriptionError.audioFileNotFound)
                return
            }
            
            // 文字起こし実行
            let result = try await performTranscription(audioURL: url)
            
            await MainActor.run {
                self.currentResult = result
                self.transcriptionState = .completed
                self.progress = 1.0
            }
            
        } catch {
            await handleError(error)
        }
    }
    
    /// リアルタイム文字起こし開始（録音中）
    func startRealtimeTranscription() async {
        await MainActor.run {
            self.transcriptionState = .processing
            self.progress = 0.0
            self.errorMessage = nil
        }
        
        do {
            let permissionGranted = await requestSpeechPermission()
            guard permissionGranted else {
                await handleError(TranscriptionError.permissionDenied)
                return
            }
            
            guard let recognizer = speechRecognizer, recognizer.isAvailable else {
                await handleError(TranscriptionError.speechRecognitionNotAvailable)
                return
            }
            
            try await setupRealtimeRecognition()
            
        } catch {
            await handleError(error)
        }
    }
    
    /// リアルタイム文字起こし停止
    func stopRealtimeTranscription() {
        recognitionTask?.cancel()
        recognitionRequest?.endAudio()
        recognitionTask = nil
        recognitionRequest = nil
        
        DispatchQueue.main.async {
            if self.transcriptionState == .processing {
                self.transcriptionState = .completed
            }
        }
    }
    
    /// 文字起こし結果をテキストファイルとして保存
    func saveTranscriptionAsText(title: String) -> URL? {
        guard let result = currentResult else { return nil }
        
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let textURL = documentsPath.appendingPathComponent("\(title)_transcript.txt")
        
        var textContent = "=== 文字起こし結果 ===\n"
        textContent += "タイトル: \(title)\n"
        textContent += "時間: \(result.duration.formattedDuration)\n"
        textContent += "信頼度: \(Int(result.confidence * 100))%\n"
        textContent += "言語: \(result.language)\n"
        textContent += "\n=== テキスト ===\n"
        textContent += result.fullText
        
        if !result.segments.isEmpty {
            textContent += "\n\n=== 詳細セグメント ===\n"
            for segment in result.segments {
                textContent += "[\(segment.timestamp.formattedDuration)] \(segment.text)\n"
            }
        }
        
        do {
            try textContent.write(to: textURL, atomically: true, encoding: .utf8)
            return textURL
        } catch {
            print("文字起こしファイル保存エラー: \(error)")
            return nil
        }
    }
    
    // MARK: - Private Methods
    
    /// 音声認識許可要求
    private func requestSpeechPermission() async -> Bool {
        return await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status == .authorized)
            }
        }
    }
    
    /// ファイル文字起こし実行
    private func performTranscription(audioURL: URL) async throws -> TranscriptionResult {
        return try await withCheckedThrowingContinuation { continuation in
            guard let recognizer = speechRecognizer else {
                continuation.resume(throwing: TranscriptionError.speechRecognitionNotAvailable)
                return
            }
            
            let request = SFSpeechURLRecognitionRequest(url: audioURL)
            request.shouldReportPartialResults = true
            request.taskHint = .dictation
            
            // iOS 16以降の高度な設定
            if #available(iOS 16.0, *) {
                request.addsPunctuation = true
                request.requiresOnDeviceRecognition = false // オンライン認識を優先
            }
            
            var segments: [TranscriptionSegment] = []
            var lastProgress: Double = 0
            
            recognitionTask = recognizer.recognitionTask(with: request) { result, error in
                if let result = result {
                    let transcribedText = result.bestTranscription.formattedString
                    let confidence = result.bestTranscription.averageConfidence
                    
                    // セグメント情報を構築
                    segments = result.bestTranscription.segments.map { segment in
                        TranscriptionSegment(
                            text: segment.substring,
                            confidence: segment.confidence,
                            timestamp: segment.timestamp,
                            duration: segment.duration,
                            speakerID: nil // Speech Frameworkでは話者識別は基本的に不可
                        )
                    }
                    
                    // 進捗更新
                    let currentProgress = min(0.9, Double(segments.count) / 100.0)
                    if currentProgress > lastProgress {
                        lastProgress = currentProgress
                        DispatchQueue.main.async {
                            self.progress = currentProgress
                        }
                    }
                    
                    if result.isFinal {
                        let transcriptionResult = TranscriptionResult(
                            fullText: transcribedText,
                            segments: segments,
                            duration: self.getAudioDuration(url: audioURL),
                            confidence: confidence,
                            language: recognizer.locale?.identifier ?? "ja-JP"
                        )
                        continuation.resume(returning: transcriptionResult)
                    }
                }
                
                if let error = error {
                    continuation.resume(throwing: error)
                }
            }
        }
    }
    
    /// リアルタイム認識設定
    private func setupRealtimeRecognition() async throws {
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else {
            throw TranscriptionError.processingError
        }
        
        recognitionRequest.shouldReportPartialResults = true
        
        if #available(iOS 16.0, *) {
            recognitionRequest.addsPunctuation = true
            recognitionRequest.requiresOnDeviceRecognition = false
        }
        
        // リアルタイム認識タスク開始
        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { result, error in
            if let result = result {
                let transcribedText = result.bestTranscription.formattedString
                
                // リアルタイム結果更新
                DispatchQueue.main.async {
                    // 暫定的な結果として更新
                    let segments = result.bestTranscription.segments.map { segment in
                        TranscriptionSegment(
                            text: segment.substring,
                            confidence: segment.confidence,
                            timestamp: segment.timestamp,
                            duration: segment.duration,
                            speakerID: nil
                        )
                    }
                    
                    let liveResult = TranscriptionResult(
                        fullText: transcribedText,
                        segments: segments,
                        duration: 0, // リアルタイムでは総時間不明
                        confidence: result.bestTranscription.averageConfidence,
                        language: self.speechRecognizer?.locale?.identifier ?? "ja-JP"
                    )
                    
                    self.currentResult = liveResult
                }
            }
            
            if let error = error {
                Task {
                    await self.handleError(error)
                }
            }
        }
    }
    
    /// 音声ファイルの長さを取得
    private func getAudioDuration(url: URL) -> TimeInterval {
        do {
            let audioAsset = AVURLAsset(url: url)
            let duration = audioAsset.duration
            return CMTimeGetSeconds(duration)
        } catch {
            return 0
        }
    }
    
    /// エラーハンドリング
    private func handleError(_ error: Error) async {
        await MainActor.run {
            self.transcriptionState = .error
            self.errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Helper Extensions

extension SFTranscriptionSegment {
    var averageConfidence: Float {
        return confidence
    }
}

extension SFTranscription {
    var averageConfidence: Float {
        let totalConfidence = segments.reduce(0) { $0 + $1.confidence }
        return segments.isEmpty ? 0 : totalConfidence / Float(segments.count)
    }
}

// プレビュー用のサンプルデータ
#if DEBUG
extension SpeechTranscriptionService {
    static let preview: SpeechTranscriptionService = {
        let service = SpeechTranscriptionService()
        service.transcriptionState = .completed
        service.progress = 1.0
        service.currentResult = TranscriptionResult(
            fullText: "こんにちは、今日の会議を始めさせていただきます。まず、先月の売上について報告いたします。",
            segments: [
                TranscriptionSegment(text: "こんにちは、今日の会議を始めさせていただきます。", confidence: 0.95, timestamp: 0.0, duration: 3.2, speakerID: nil),
                TranscriptionSegment(text: "まず、先月の売上について報告いたします。", confidence: 0.92, timestamp: 3.5, duration: 2.8, speakerID: nil)
            ],
            duration: 125.5,
            confidence: 0.94,
            language: "ja-JP"
        )
        return service
    }()
}
#endif