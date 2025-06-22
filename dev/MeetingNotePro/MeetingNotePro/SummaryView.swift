import SwiftUI

struct SummaryView: View {
    @State private var isGenerating = false
    @State private var summaryText = ""
    @State private var selectedTemplate = "会議要約"
    
    let templates = ["会議要約", "アクションアイテム", "決定事項", "課題整理"]
    
    var body: some View {
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
            VStack(spacing: 15) {
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
                
                if !summaryText.isEmpty {
                    HStack(spacing: 15) {
                        Button(action: shareSummary) {
                            HStack {
                                Image(systemName: "square.and.arrow.up")
                                Text("共有")
                            }
                            .font(.title3)
                            .foregroundColor(.blue)
                        }
                        
                        Button(action: clearSummary) {
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
            
            // 注意事項
            VStack(alignment: .leading, spacing: 8) {
                Text("📝 注意事項")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Text("• この画面はデモ版です")
                Text("• 実際のAI要約機能は未実装")
                Text("• サンプル要約を表示します")
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
        .padding()
        .navigationTitle("AI要約")
        .navigationBarTitleDisplayMode(.large)
    }
    
    private func generateSummary() {
        isGenerating = true
        summaryText = ""
        
        // 2秒後に要約を生成（デモ）
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
                
                【次回までの課題】
                • 詳細な工数見積もりの作成
                • スケジュール調整
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
                
                【チーム全体】
                • 来月のリソース計画見直し
                • 次回会議日程の調整
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
                
                【予算承認】
                • 開発ツールの追加購入（10万円）
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
                
                【スケジュール課題】
                • リリース時期の前倒し要求
                • テスト期間の確保
                """
            }
        }
    }
    
    private func shareSummary() {
        let activityVC = UIActivityViewController(activityItems: [summaryText], applicationActivities: nil)
        
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
            window.rootViewController?.present(activityVC, animated: true)
        }
    }
    
    private func clearSummary() {
        summaryText = ""
    }
}

struct SummaryView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            SummaryView()
        }
    }
}