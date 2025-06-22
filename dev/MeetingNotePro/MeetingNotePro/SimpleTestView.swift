import SwiftUI

struct SimpleTestView: View {
    @State private var currentView = "home"
    
    var body: some View {
        VStack(spacing: 20) {
            // 現在の画面表示
            Text("現在の画面: \(currentView)")
                .font(.title)
                .padding()
            
            // 画面切り替えテスト
            if currentView == "home" {
                HomeTestView(currentView: $currentView)
            } else if currentView == "recording" {
                RecordingTestView(currentView: $currentView)
            } else if currentView == "transcript" {
                TranscriptTestView(currentView: $currentView)
            } else if currentView == "summary" {
                SummaryTestView(currentView: $currentView)
            } else if currentView == "askai" {
                AskAITestView(currentView: $currentView)
            }
        }
        .padding()
    }
}

struct HomeTestView: View {
    @Binding var currentView: String
    
    var body: some View {
        VStack(spacing: 20) {
            Text("🏠 ホーム画面")
                .font(.largeTitle)
            
            Button("🎤 録音機能へ") {
                print("録音ボタンタップ")
                currentView = "recording"
            }
            .font(.title2)
            .padding()
            .background(Color.red.opacity(0.2))
            .cornerRadius(10)
            
            Button("📝 文字起こしへ") {
                print("文字起こしボタンタップ")
                currentView = "transcript"
            }
            .font(.title2)
            .padding()
            .background(Color.green.opacity(0.2))
            .cornerRadius(10)
            
            Button("🤖 AI要約へ") {
                print("AI要約ボタンタップ")
                currentView = "summary"
            }
            .font(.title2)
            .padding()
            .background(Color.purple.opacity(0.2))
            .cornerRadius(10)
            
            Button("💬 AskAIへ") {
                print("AskAIボタンタップ")
                currentView = "askai"
            }
            .font(.title2)
            .padding()
            .background(Color.orange.opacity(0.2))
            .cornerRadius(10)
        }
    }
}

struct RecordingTestView: View {
    @Binding var currentView: String
    @State private var isRecording = false
    @State private var recordingTime = 0
    @State private var timer: Timer?
    
    var body: some View {
        VStack(spacing: 20) {
            Text("🎤 録音画面")
                .font(.largeTitle)
            
            Circle()
                .fill(isRecording ? Color.red : Color.gray)
                .frame(width: 100, height: 100)
                .overlay(
                    Image(systemName: "mic.fill")
                        .font(.system(size: 40))
                        .foregroundColor(.white)
                )
            
            Text("\(recordingTime)秒")
                .font(.title)
            
            Button(isRecording ? "⏹️ 停止" : "🔴 録音開始") {
                isRecording.toggle()
                if isRecording {
                    timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
                        recordingTime += 1
                    }
                } else {
                    timer?.invalidate()
                }
            }
            .font(.title2)
            .padding()
            .background(isRecording ? Color.red : Color.blue)
            .foregroundColor(.white)
            .cornerRadius(10)
            
            Button("🏠 ホームに戻る") {
                currentView = "home"
            }
            .padding()
        }
    }
}

struct TranscriptTestView: View {
    @Binding var currentView: String
    @State private var transcriptText = ""
    @State private var isTranscribing = false
    
    var body: some View {
        VStack(spacing: 20) {
            Text("📝 文字起こし画面")
                .font(.largeTitle)
            
            if isTranscribing {
                ProgressView("文字起こし中...")
                    .padding()
            }
            
            ScrollView {
                Text(transcriptText.isEmpty ? "文字起こし結果がここに表示されます" : transcriptText)
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(10)
            }
            .frame(height: 200)
            
            Button("📝 文字起こし開始") {
                isTranscribing = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                    isTranscribing = false
                    transcriptText = "こんにちは、今日は良い天気ですね。会議を始めましょう。"
                }
            }
            .font(.title2)
            .padding()
            .background(Color.green)
            .foregroundColor(.white)
            .cornerRadius(10)
            .disabled(isTranscribing)
            
            Button("🏠 ホームに戻る") {
                currentView = "home"
            }
            .padding()
        }
    }
}

struct SummaryTestView: View {
    @Binding var currentView: String
    @State private var summaryText = ""
    @State private var isGenerating = false
    
    var body: some View {
        VStack(spacing: 20) {
            Text("🤖 AI要約画面")
                .font(.largeTitle)
            
            if isGenerating {
                ProgressView("AI要約生成中...")
                    .padding()
            }
            
            ScrollView {
                Text(summaryText.isEmpty ? "AI要約がここに表示されます" : summaryText)
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(10)
            }
            .frame(height: 200)
            
            Button("🧠 要約生成") {
                isGenerating = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                    isGenerating = false
                    summaryText = """
                    📋 会議要約
                    
                    今日の会議では以下について話し合いました：
                    • プロジェクトの進捗確認
                    • 来月のスケジュール
                    • 課題の整理
                    
                    次回までに各自タスクを完了予定です。
                    """
                }
            }
            .font(.title2)
            .padding()
            .background(Color.purple)
            .foregroundColor(.white)
            .cornerRadius(10)
            .disabled(isGenerating)
            
            Button("🏠 ホームに戻る") {
                currentView = "home"
            }
            .padding()
        }
    }
}

struct AskAITestView: View {
    @Binding var currentView: String
    @State private var messages: [String] = []
    @State private var inputText = ""
    
    var body: some View {
        VStack(spacing: 20) {
            Text("💬 AskAI画面")
                .font(.largeTitle)
            
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(messages, id: \.self) { message in
                        Text(message)
                            .padding()
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(10)
                    }
                }
                .padding()
            }
            .frame(height: 200)
            
            HStack {
                TextField("質問を入力...", text: $inputText)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                
                Button("送信") {
                    if !inputText.isEmpty {
                        messages.append("Q: \(inputText)")
                        let question = inputText
                        inputText = ""
                        
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                            messages.append("A: \(question)についてお答えします。これはデモ回答です。")
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(Color.orange)
                .foregroundColor(.white)
                .cornerRadius(8)
            }
            
            Button("🏠 ホームに戻る") {
                currentView = "home"
            }
            .padding()
        }
    }
}

struct SimpleTestView_Previews: PreviewProvider {
    static var previews: some View {
        SimpleTestView()
    }
}