import Foundation
import AVFoundation
import SwiftUI

// 録音状態の管理
enum RecordingState {
    case idle          // 待機中
    case recording     // 録音中
    case paused        // 一時停止
    case completed     // 録音完了
}

// 録音エラー
enum RecordingError: Error, LocalizedError {
    case permissionDenied
    case audioSessionError
    case fileCreationError
    case recordingError
    
    var errorDescription: String? {
        switch self {
        case .permissionDenied:
            return "マイクへのアクセス許可が必要です"
        case .audioSessionError:
            return "オーディオセッションの設定に失敗しました"
        case .fileCreationError:
            return "録音ファイルの作成に失敗しました"
        case .recordingError:
            return "録音中にエラーが発生しました"
        }
    }
}

// AVFoundation録音サービス
class AudioRecordingService: NSObject, ObservableObject {
    
    // MARK: - Published Properties
    @Published var recordingState: RecordingState = .idle
    @Published var currentRecordingDuration: TimeInterval = 0
    @Published var recordingLevel: Float = 0.0
    @Published var errorMessage: String?
    
    // MARK: - Private Properties
    private var audioRecorder: AVAudioRecorder?
    private var audioSession: AVAudioSession = AVAudioSession.sharedInstance()
    private var recordingTimer: Timer?
    private var levelTimer: Timer?
    private var currentRecordingURL: URL?
    
    // 録音設定
    private let recordingSettings: [String: Any] = [
        AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
        AVSampleRateKey: 44100.0,
        AVNumberOfChannelsKey: 1,
        AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
    ]
    
    override init() {
        super.init()
        setupAudioSession()
    }
    
    // MARK: - Public Methods
    
    /// 録音開始
    func startRecording() async {
        await MainActor.run {
            self.errorMessage = nil
        }
        
        do {
            // マイク許可確認
            let permissionGranted = await requestMicrophonePermission()
            guard permissionGranted else {
                await MainActor.run {
                    self.errorMessage = RecordingError.permissionDenied.localizedDescription
                }
                return
            }
            
            // 録音ファイルURL作成
            let recordingURL = createRecordingURL()
            self.currentRecordingURL = recordingURL
            
            // 録音開始
            try await startAudioRecording(at: recordingURL)
            
            await MainActor.run {
                self.recordingState = .recording
                self.currentRecordingDuration = 0
                self.startTimers()
            }
            
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.recordingState = .idle
            }
        }
    }
    
    /// 録音停止
    func stopRecording() {
        stopTimers()
        audioRecorder?.stop()
        
        DispatchQueue.main.async {
            self.recordingState = .completed
        }
    }
    
    /// 録音一時停止
    func pauseRecording() {
        audioRecorder?.pause()
        stopTimers()
        
        DispatchQueue.main.async {
            self.recordingState = .paused
        }
    }
    
    /// 録音再開
    func resumeRecording() {
        audioRecorder?.record()
        startTimers()
        
        DispatchQueue.main.async {
            self.recordingState = .recording
        }
    }
    
    /// 現在の録音ファイルURL取得
    func getCurrentRecordingURL() -> URL? {
        return currentRecordingURL
    }
    
    /// 録音ファイル保存（完了時）
    func saveRecording(title: String) -> URL? {
        guard let currentURL = currentRecordingURL else { return nil }
        
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let savedURL = documentsPath.appendingPathComponent("\(title)_\(Date().timeIntervalSince1970).m4a")
        
        do {
            try FileManager.default.moveItem(at: currentURL, to: savedURL)
            return savedURL
        } catch {
            print("録音ファイル保存エラー: \(error)")
            return nil
        }
    }
    
    // MARK: - Private Methods
    
    /// オーディオセッション設定
    private func setupAudioSession() {
        do {
            try audioSession.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
            try audioSession.setActive(true)
        } catch {
            print("オーディオセッション設定エラー: \(error)")
        }
    }
    
    /// マイク許可要求
    private func requestMicrophonePermission() async -> Bool {
        switch audioSession.recordPermission {
        case .granted:
            return true
        case .denied:
            return false
        case .undetermined:
            return await withCheckedContinuation { continuation in
                audioSession.requestRecordPermission { granted in
                    continuation.resume(returning: granted)
                }
            }
        @unknown default:
            return false
        }
    }
    
    /// 録音ファイルURL作成
    private func createRecordingURL() -> URL {
        let tempDir = FileManager.default.temporaryDirectory
        let filename = "recording_\(Date().timeIntervalSince1970).m4a"
        return tempDir.appendingPathComponent(filename)
    }
    
    /// 録音開始処理
    private func startAudioRecording(at url: URL) async throws {
        return try await withCheckedThrowingContinuation { continuation in
            do {
                self.audioRecorder = try AVAudioRecorder(url: url, settings: self.recordingSettings)
                self.audioRecorder?.delegate = self
                self.audioRecorder?.isMeteringEnabled = true
                self.audioRecorder?.prepareToRecord()
                
                if self.audioRecorder?.record() == true {
                    continuation.resume()
                } else {
                    continuation.resume(throwing: RecordingError.recordingError)
                }
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    /// タイマー開始
    private func startTimers() {
        // 録音時間タイマー
        recordingTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            DispatchQueue.main.async {
                self.currentRecordingDuration = self.audioRecorder?.currentTime ?? 0
            }
        }
        
        // 音量レベルタイマー
        levelTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            self.audioRecorder?.updateMeters()
            let level = self.audioRecorder?.averagePower(forChannel: 0) ?? -160
            let normalizedLevel = max(0, (level + 160) / 160)
            
            DispatchQueue.main.async {
                self.recordingLevel = normalizedLevel
            }
        }
    }
    
    /// タイマー停止
    private func stopTimers() {
        recordingTimer?.invalidate()
        recordingTimer = nil
        levelTimer?.invalidate()
        levelTimer = nil
    }
}

// MARK: - AVAudioRecorderDelegate
extension AudioRecordingService: AVAudioRecorderDelegate {
    
    func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        DispatchQueue.main.async {
            if flag {
                self.recordingState = .completed
            } else {
                self.recordingState = .idle
                self.errorMessage = "録音が正常に完了しませんでした"
            }
        }
    }
    
    func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        DispatchQueue.main.async {
            self.recordingState = .idle
            self.errorMessage = error?.localizedDescription ?? "録音エラーが発生しました"
        }
    }
}

// MARK: - Helper Extensions

extension TimeInterval {
    /// 時間を「mm:ss」形式で表示
    var formattedDuration: String {
        let minutes = Int(self) / 60
        let seconds = Int(self) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

// プレビュー用のサンプルデータ
#if DEBUG
extension AudioRecordingService {
    static let preview: AudioRecordingService = {
        let service = AudioRecordingService()
        service.recordingState = .recording
        service.currentRecordingDuration = 125.5
        service.recordingLevel = 0.7
        return service
    }()
}
#endif