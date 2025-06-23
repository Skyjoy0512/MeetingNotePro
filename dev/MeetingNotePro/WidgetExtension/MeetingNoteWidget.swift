import WidgetKit
import SwiftUI
import Intents

// MeetingNotePro メインウィジェット
struct MeetingNoteWidget: Widget {
    let kind: String = "MeetingNoteWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            MeetingNoteWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("議事録Pro")
        .description("会議録音とダッシュボードへの素早いアクセス")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// ウィジェットプロバイダー
struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), recentRecordings: [], isRecording: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), recentRecordings: loadRecentRecordings(), isRecording: false)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [SimpleEntry] = []

        // 現在の時刻から始まる5つのエントリーを生成
        let currentDate = Date()
        for hourOffset in 0 ..< 5 {
            let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
            let entry = SimpleEntry(
                date: entryDate,
                recentRecordings: loadRecentRecordings(),
                isRecording: isCurrentlyRecording()
            )
            entries.append(entry)
        }

        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
    
    // 最近の録音データを読み込み
    private func loadRecentRecordings() -> [WidgetRecording] {
        // App Groupを使用してメインアプリとデータを共有
        guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.com.meetingnotepro.app") else {
            return []
        }
        
        let widgetDataURL = container.appendingPathComponent("widget_data.json")
        
        do {
            let data = try Data(contentsOf: widgetDataURL)
            let widgetData = try JSONDecoder().decode(WidgetData.self, from: data)
            return widgetData.recentRecordings
        } catch {
            Logger.error("ウィジェットデータ読み込みエラー: \(error)", category: Logger.widget)
            return []
        }
    }
    
    // 現在録音中かどうかをチェック
    private func isCurrentlyRecording() -> Bool {
        // UserDefaultsまたはApp Groupを使用して録音状態を確認
        let userDefaults = UserDefaults(suiteName: "group.com.meetingnotepro.app")
        return userDefaults?.bool(forKey: "isCurrentlyRecording") ?? false
    }
}

// ウィジェットエントリー
struct SimpleEntry: TimelineEntry {
    let date: Date
    let recentRecordings: [WidgetRecording]
    let isRecording: Bool
}

// ウィジェット表示ビュー
struct MeetingNoteWidgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        case .systemLarge:
            LargeWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

// 小サイズウィジェット
struct SmallWidgetView: View {
    let entry: SimpleEntry
    
    var body: some View {
        VStack(spacing: 8) {
            // アプリアイコンとタイトル
            HStack {
                Image(systemName: "mic.circle.fill")
                    .foregroundColor(.blue)
                    .font(.title3)
                Text("議事録Pro")
                    .font(.caption)
                    .fontWeight(.semibold)
                Spacer()
            }
            
            Spacer()
            
            // 録音ボタン
            Button(intent: StartRecordingIntent()) {
                VStack(spacing: 4) {
                    Image(systemName: entry.isRecording ? "stop.circle.fill" : "mic.circle.fill")
                        .font(.title)
                        .foregroundColor(entry.isRecording ? .red : .blue)
                    
                    Text(entry.isRecording ? "録音停止" : "録音開始")
                        .font(.caption2)
                        .fontWeight(.medium)
                }
            }
            .buttonStyle(PlainButtonStyle())
            
            Spacer()
            
            // 最新録音数
            Text("\(entry.recentRecordings.count)件の録音")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
    }
}

// 中サイズウィジェット
struct MediumWidgetView: View {
    let entry: SimpleEntry
    
    var body: some View {
        HStack(spacing: 16) {
            // 左側: 録音コントロール
            VStack(spacing: 8) {
                Image(systemName: "mic.circle.fill")
                    .font(.title)
                    .foregroundColor(.blue)
                
                Button(intent: StartRecordingIntent()) {
                    Text(entry.isRecording ? "録音停止" : "録音開始")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(entry.isRecording ? Color.red : Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }
                .buttonStyle(PlainButtonStyle())
                
                if entry.isRecording {
                    Text("録音中...")
                        .font(.caption2)
                        .foregroundColor(.red)
                        .fontWeight(.medium)
                }
            }
            
            Divider()
            
            // 右側: 最近の録音リスト
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("最近の録音")
                        .font(.caption)
                        .fontWeight(.semibold)
                    Spacer()
                    Link("すべて表示", destination: URL(string: "meetingnotepro://recordings")!)
                        .font(.caption2)
                        .foregroundColor(.blue)
                }
                
                if entry.recentRecordings.isEmpty {
                    Text("録音データがありません")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .italic()
                } else {
                    ForEach(entry.recentRecordings.prefix(3), id: \.id) { recording in
                        Link(destination: URL(string: "meetingnotepro://recording/\(recording.id)")!) {
                            RecordingRowWidget(recording: recording)
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
    }
}

// 大サイズウィジェット
struct LargeWidgetView: View {
    let entry: SimpleEntry
    
    var body: some View {
        VStack(spacing: 12) {
            // ヘッダー
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "mic.circle.fill")
                        .font(.title2)
                        .foregroundColor(.blue)
                    Text("議事録Pro")
                        .font(.headline)
                        .fontWeight(.semibold)
                }
                
                Spacer()
                
                Text(entry.date, style: .time)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // 録音コントロール
            HStack(spacing: 16) {
                Button(intent: StartRecordingIntent()) {
                    HStack(spacing: 8) {
                        Image(systemName: entry.isRecording ? "stop.circle.fill" : "mic.circle.fill")
                            .font(.title2)
                        Text(entry.isRecording ? "録音停止" : "録音開始")
                            .fontWeight(.semibold)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(entry.isRecording ? Color.red : Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                }
                .buttonStyle(PlainButtonStyle())
                
                Spacer()
                
                if entry.isRecording {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color.red)
                            .frame(width: 8, height: 8)
                        Text("録音中...")
                            .font(.caption)
                            .foregroundColor(.red)
                            .fontWeight(.medium)
                    }
                }
            }
            
            Divider()
            
            // 最近の録音一覧
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("最近の録音")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    
                    Spacer()
                    
                    Link("すべて表示", destination: URL(string: "meetingnotepro://recordings")!)
                        .font(.caption)
                        .foregroundColor(.blue)
                }
                
                if entry.recentRecordings.isEmpty {
                    VStack(spacing: 4) {
                        Image(systemName: "mic.slash")
                            .font(.title2)
                            .foregroundColor(.gray)
                        Text("録音データがありません")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                } else {
                    LazyVStack(spacing: 6) {
                        ForEach(entry.recentRecordings.prefix(4), id: \.id) { recording in
                            Link(destination: URL(string: "meetingnotepro://recording/\(recording.id)")!) {
                                RecordingRowWidget(recording: recording)
                            }
                        }
                    }
                }
            }
            
            Spacer()
        }
        .padding()
        .background(Color(.systemBackground))
    }
}

// ウィジェット用録音行ビュー
struct RecordingRowWidget: View {
    let recording: WidgetRecording
    
    var body: some View {
        HStack(spacing: 8) {
            // ステータスアイコン
            Image(systemName: statusIcon)
                .font(.caption)
                .foregroundColor(statusColor)
                .frame(width: 16)
            
            // タイトル
            Text(recording.title)
                .font(.caption)
                .lineLimit(1)
                .foregroundColor(.primary)
            
            Spacer()
            
            // 時間
            Text(recording.duration)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 2)
    }
    
    private var statusIcon: String {
        switch recording.status {
        case .completed:
            return "checkmark.circle.fill"
        case .processing:
            return "clock.circle.fill"
        case .error:
            return "exclamationmark.triangle.fill"
        }
    }
    
    private var statusColor: Color {
        switch recording.status {
        case .completed:
            return .green
        case .processing:
            return .orange
        case .error:
            return .red
        }
    }
}

// MARK: - データ構造

// ウィジェット用録音データ
struct WidgetRecording: Codable, Identifiable {
    let id: String
    let title: String
    let duration: String
    let date: Date
    let status: RecordingStatus
    
    enum RecordingStatus: String, Codable {
        case completed = "completed"
        case processing = "processing"
        case error = "error"
    }
}

// ウィジェット用データ構造
struct WidgetData: Codable {
    let recentRecordings: [WidgetRecording]
    let lastUpdated: Date
}

// MARK: - App Intents

// 録音開始/停止Intent
struct StartRecordingIntent: AppIntent {
    static var title: LocalizedStringResource = "録音開始/停止"
    static var description = IntentDescription("新しい録音を開始または現在の録音を停止します")
    
    func perform() async throws -> some IntentResult {
        // Deep Linkを使用してメインアプリを開く
        if let url = URL(string: "meetingnotepro://toggle-recording") {
            await UIApplication.shared.open(url)
        }
        return .result()
    }
}

// ウィジェットバンドル
@main
struct MeetingNoteWidgetBundle: WidgetBundle {
    var body: some Widget {
        MeetingNoteWidget()
        ControlCenterWidget()
    }
}

// Logger拡張（ウィジェット用）
extension Logger {
    static let widget = "Widget"
}