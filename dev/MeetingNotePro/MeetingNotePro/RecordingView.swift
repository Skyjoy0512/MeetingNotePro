import SwiftUI

struct RecordingView: View {
    @State private var isRecording = false
    @State private var recordingTime: TimeInterval = 0
    @State private var timer: Timer?
    
    var body: some View {
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

struct RecordingView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            RecordingView()
        }
    }
}