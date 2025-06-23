import Foundation
import Speech
import AVFoundation
import Combine

// SpeechRecognitionServiceの話者識別統合テスト
class TestSpeakerIntegration {
    
    func testSpeakerIdentificationConfiguration() {
        let speechService = SpeechRecognitionService.shared
        
        // 話者識別の設定テスト
        speechService.configureSpeakerIdentification(enabled: true, sensitivity: .high)
        print("話者識別設定完了: enabled=true, sensitivity=high")
        
        // 設定の確認
        print("話者識別対応: \(speechService.isSpeakerIdentificationSupported)")
        print("現在の状態: \(speechService.currentSpeakerIdentificationStatus)")
        
        // 感度レベルの変更テスト
        speechService.setSpeakerIdentificationSensitivity(.low)
        print("感度レベルを変更: low")
        
        // 話者識別の無効化テスト
        speechService.setSpeakerDetection(false)
        print("話者識別を無効化")
        print("無効化後の状態: \(speechService.currentSpeakerIdentificationStatus)")
    }
    
    func testSpeakerIdentificationFlow() async {
        let speechService = SpeechRecognitionService.shared
        
        // テスト用の音声URLを作成（実際のテストでは有効なURLを使用）
        guard let testAudioURL = Bundle.main.url(forResource: "test_audio", withExtension: "wav") else {
            print("テスト用音声ファイルが見つかりません")
            return
        }
        
        do {
            // 話者識別を有効にして文字起こしを実行
            speechService.configureSpeakerIdentification(enabled: true, sensitivity: .medium)
            
            let transcript = try await speechService.startTranscribing(from: testAudioURL)
            
            print("文字起こし完了")
            print("識別された話者数: \(speechService.identifiedSpeakers.count)")
            
            for speaker in speechService.identifiedSpeakers {
                print("話者: \(speaker.name), 信頼度: \(speaker.confidence)")
                print("発話時間: \(speaker.characteristics.totalSpeakingTime)秒")
                print("音声タイプ: \(speaker.characteristics.voiceType.displayName)")
            }
            
        } catch {
            print("エラー: \(error.localizedDescription)")
        }
    }
}

// テスト実行
let test = TestSpeakerIntegration()
test.testSpeakerIdentificationConfiguration()

// 非同期テストの実行（実際のテストでは適切な音声ファイルが必要）
Task {
    await test.testSpeakerIdentificationFlow()
}