import WidgetKit
import SwiftUI
import Intents

// コントロールセンター用ウィジェット
struct ControlCenterWidget: Widget {
    let kind: String = "ControlCenterWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ControlCenterProvider()) { entry in
            ControlCenterWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("録音コントロール")
        .description("コントロールセンターから録音を素早く開始/停止")
        .supportedFamilies([.systemSmall])
    }
}

// コントロールセンター用プロバイダー
struct ControlCenterProvider: TimelineProvider {
    func placeholder(in context: Context) -> ControlCenterEntry {
        ControlCenterEntry(date: Date(), isRecording: false, currentTitle: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (ControlCenterEntry) -> ()) {
        let entry = ControlCenterEntry(
            date: Date(),
            isRecording: isCurrentlyRecording(),
            currentTitle: getCurrentRecordingTitle()
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [ControlCenterEntry] = []

        // 30秒間隔で更新
        let currentDate = Date()
        for minuteOffset in 0 ..< 4 {
            let entryDate = Calendar.current.date(byAdding: .minute, value: minuteOffset * 30, to: currentDate)!
            let entry = ControlCenterEntry(
                date: entryDate,
                isRecording: isCurrentlyRecording(),
                currentTitle: getCurrentRecordingTitle()
            )
            entries.append(entry)
        }

        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
    
    private func isCurrentlyRecording() -> Bool {
        let userDefaults = UserDefaults(suiteName: "group.com.meetingnotepro.app")
        return userDefaults?.bool(forKey: "isCurrentlyRecording") ?? false
    }
    
    private func getCurrentRecordingTitle() -> String? {
        let userDefaults = UserDefaults(suiteName: "group.com.meetingnotepro.app")
        return userDefaults?.string(forKey: "currentRecordingTitle")
    }
}

// コントロールセンター用エントリー
struct ControlCenterEntry: TimelineEntry {
    let date: Date
    let isRecording: Bool
    let currentTitle: String?
}

// コントロールセンター用ビュー
struct ControlCenterWidgetEntryView: View {
    var entry: ControlCenterProvider.Entry
    
    var body: some View {
        VStack(spacing: 4) {
            // 録音状態アイコン
            Button(intent: StartRecordingIntent()) {
                VStack(spacing: 4) {
                    ZStack {
                        Circle()
                            .fill(entry.isRecording ? Color.red : Color.blue)
                            .frame(width: 44, height: 44)
                        
                        Image(systemName: entry.isRecording ? "stop.fill" : "mic.fill")
                            .font(.title2)
                            .foregroundColor(.white)
                        
                        // 録音中のパルスアニメーション
                        if entry.isRecording {
                            Circle()
                                .stroke(Color.red.opacity(0.3), lineWidth: 2)
                                .frame(width: 50, height: 50)
                                .scaleEffect(1.2)
                        }
                    }
                }
            }
            .buttonStyle(PlainButtonStyle())
            
            // 録音状態テキスト
            if entry.isRecording {
                VStack(spacing: 2) {
                    Text("録音中")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundColor(.red)
                    
                    if let title = entry.currentTitle {
                        Text(title)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                }
            } else {
                Text("録音開始")
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
            }
        }
        .padding(8)
        .background(Color(.systemBackground))
    }
}

// MARK: - 追加のコントロールセンター用Intent

// 最後の録音を開くIntent
struct OpenLastRecordingIntent: AppIntent {
    static var title: LocalizedStringResource = "最後の録音を開く"
    static var description = IntentDescription("最後に作成された録音を開きます")
    
    func perform() async throws -> some IntentResult {
        if let url = URL(string: "meetingnotepro://last-recording") {
            await UIApplication.shared.open(url)
        }
        return .result()
    }
}

// 録音リストを開くIntent
struct OpenRecordingListIntent: AppIntent {
    static var title: LocalizedStringResource = "録音リストを開く"
    static var description = IntentDescription("録音リスト画面を開きます")
    
    func perform() async throws -> some IntentResult {
        if let url = URL(string: "meetingnotepro://recordings") {
            await UIApplication.shared.open(url)
        }
        return .result()
    }
}