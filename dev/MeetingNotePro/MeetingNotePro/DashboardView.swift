import SwiftUI

// シンプルなダッシュボード画面（ビルドエラー回避版）
struct DashboardView: View {
    // 認証情報は一時的に仮の実装を使用
    @State private var currentUser: (displayName: String?, photoURL: String?)? = ("テストユーザー", nil)
    
    // ローディング状態管理
    @State private var isLoadingData = false
    @State private var dataLoadError: Error?
    
    // ナビゲーション状態管理
    @State private var showingRecordingView = false
    @State private var showingAISummaryView = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // ウェルカムセクション
                    welcomeSection
                    
                    // クイックアクション
                    quickActionsSection
                    
                    // 統計情報
                    statisticsSection
                    
                    // 最近の録音
                    recentRecordingsSection
                    
                    Spacer(minLength: 100)
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
            }
            .navigationTitle("ホーム")
            .navigationBarTitleDisplayMode(.large)
            .onAppear {
                loadDashboardData()
            }
            .sheet(isPresented: $showingRecordingView) {
                VStack {
                    Text("録音画面（開発中）")
                        .font(.title2)
                        .padding()
                    
                    Button("閉じる") {
                        showingRecordingView = false
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding()
            }
            .sheet(isPresented: $showingAISummaryView) {
                VStack {
                    Text("AI要約画面（開発中）")
                        .font(.title2)
                        .padding()
                    
                    Button("閉じる") {
                        showingAISummaryView = false
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding()
            }
        }
    }
    
    // MARK: - ウェルカムセクション
    
    private var welcomeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("おかえりなさい")
                        .font(.title2)
                        .foregroundColor(.secondary)
                    
                    if let user = currentUser {
                        Text(user.displayName ?? "ユーザー")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.primary)
                    }
                    
                    Text(getTodayGreeting())
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Circle()
                    .fill(Color.blue.opacity(0.2))
                    .frame(width: 60, height: 60)
                    .overlay(
                        Image(systemName: "person.fill")
                            .font(.title2)
                            .foregroundColor(.blue)
                    )
            }
        }
    }
    
    // MARK: - クイックアクション
    
    private var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("クイックアクション")
                .font(.headline)
                .foregroundColor(.primary)
            
            HStack(spacing: 12) {
                // 録音開始ボタン
                SimpleActionButton(
                    title: "録音開始",
                    icon: "mic.circle.fill",
                    color: .red,
                    action: {
                        showingRecordingView = true
                    }
                )
                
                // 最新録音確認
                SimpleActionButton(
                    title: "最新録音",
                    icon: "clock.fill",
                    color: .blue,
                    action: {
                        print("最新録音ボタンがタップされました")
                    }
                )
                
                // AI要約実行
                SimpleActionButton(
                    title: "AI要約",
                    icon: "brain.head.profile",
                    color: .purple,
                    action: {
                        showingAISummaryView = true
                    }
                )
            }
        }
    }
    
    // MARK: - 統計情報
    
    private var statisticsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("統計情報")
                .font(.headline)
                .foregroundColor(.primary)
            
            if isLoadingData {
                VStack {
                    ProgressView()
                        .scaleEffect(1.2)
                    Text("データを読み込み中...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.top, 8)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.gray.opacity(0.1))
                .cornerRadius(12)
            } else {
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 12) {
                    SimpleStatCard(
                        title: "総録音時間",
                        value: "1時間45分",
                        icon: "clock",
                        color: .blue
                    )
                    
                    SimpleStatCard(
                        title: "録音数",
                        value: "12件",
                        icon: "mic",
                        color: .green
                    )
                    
                    SimpleStatCard(
                        title: "使用容量",
                        value: "234 MB",
                        icon: "internaldrive",
                        color: .orange
                    )
                    
                    SimpleStatCard(
                        title: "今月の使用量",
                        value: "8/50回",
                        icon: "chart.bar",
                        color: .purple
                    )
                }
            }
        }
    }
    
    // MARK: - 最近の録音
    
    private var recentRecordingsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("最近の録音")
                    .font(.headline)
                    .foregroundColor(.primary)
                
                Spacer()
                
                Button("すべて表示") {
                    print("すべて表示がタップされました")
                }
                .font(.caption)
                .foregroundColor(.blue)
            }
            
            if isLoadingData {
                VStack {
                    ProgressView()
                        .scaleEffect(1.2)
                    Text("録音リストを読み込み中...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.top, 8)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.gray.opacity(0.1))
                .cornerRadius(12)
            } else {
                let recentRecordings = getSampleRecordings()
                
                if recentRecordings.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "mic.slash")
                            .font(.system(size: 48))
                            .foregroundColor(.gray)
                        
                        Text("録音がありません")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        Text("最初の録音を開始しましょう")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(12)
                } else {
                    LazyVStack(spacing: 8) {
                        ForEach(0..<min(3, recentRecordings.count), id: \.self) { index in
                            let recording = recentRecordings[index]
                            SimpleRecordingRow(
                                title: recording.title,
                                date: recording.date,
                                duration: recording.duration
                            )
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Data Loading Methods
    
    private func loadDashboardData() {
        guard !isLoadingData else { return }
        
        isLoadingData = true
        dataLoadError = nil
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            isLoadingData = false
        }
    }
    
    // MARK: - Helper Methods
    
    private func getTodayGreeting() -> String {
        let hour = Calendar.current.component(.hour, from: Date())
        
        switch hour {
        case 5..<12:
            return "今日も効率的な会議を！"
        case 12..<17:
            return "午後の会議もお疲れ様です"
        case 17..<21:
            return "今日の会議の振り返りはいかがですか？"
        default:
            return "お疲れ様でした"
        }
    }
    
    private func getSampleRecordings() -> [(title: String, date: String, duration: String)] {
        return [
            (title: "チーム会議 - プロジェクト進捗", date: "昨日", duration: "15:30"),
            (title: "顧客ミーティング - 要件確認", date: "2日前", duration: "32:45"),
            (title: "定期レビュー会議", date: "3日前", duration: "8:22")
        ]
    }
}

// MARK: - シンプルなコンポーネント

struct SimpleActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                
                Text(title)
                    .font(.caption)
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(color.opacity(0.1))
            .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct SimpleStatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(color)
                
                Spacer()
            }
            
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.primary)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
}

struct SimpleRecordingRow: View {
    let title: String
    let date: String
    let duration: String
    
    var body: some View {
        HStack(spacing: 12) {
            // 録音アイコン
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.blue.opacity(0.2))
                .frame(width: 48, height: 48)
                .overlay(
                    Image(systemName: "mic.circle.fill")
                        .font(.title2)
                        .foregroundColor(.blue)
                )
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .foregroundColor(.primary)
                    .lineLimit(1)
                
                HStack {
                    Text(date)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Spacer()
                    
                    Text(duration)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
}

#Preview {
    DashboardView()
}