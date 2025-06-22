import SwiftUI

struct TranscriptView: View {
    @State private var isTranscribing = false
    @State private var transcriptText = ""
    @State private var progress: Double = 0.0
    
    var body: some View {
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
            
            // 注意事項
            VStack(alignment: .leading, spacing: 8) {
                Text("📝 注意事項")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Text("• この画面はデモ版です")
                Text("• 実際の音声認識は未実装")
                Text("• サンプルテキストを表示します")
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
        .padding()
        .navigationTitle("文字起こし")
        .navigationBarTitleDisplayMode(.large)
    }
    
    private func startTranscription() {
        isTranscribing = true
        progress = 0.0
        transcriptText = ""
        
        // プログレスバーのアニメーション
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

struct TranscriptView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            TranscriptView()
        }
    }
}