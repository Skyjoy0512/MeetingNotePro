import SwiftUI

// メインのタブビュー
struct ContentView: View {
    @State private var selectedTab = 0
    @State private var showingAddOptions = false
    @State private var showingEnhancedRecording = false
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // ホーム画面（録音データ一覧）
            HomeView()
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("ホーム")
                }
                .tag(0)
            
            // プラス（録音・インポート）
            Color.clear
                .tabItem {
                    Image(systemName: "plus.circle.fill")
                    Text("追加")
                }
                .tag(1)
                .onAppear {
                    if selectedTab == 1 {
                        showingAddOptions = true
                        selectedTab = 0 // ホームに戻す
                    }
                }
            
            // マイページ
            MyPageView()
                .tabItem {
                    Image(systemName: "person.circle.fill")
                    Text("マイページ")
                }
                .tag(2)
        }
        .sheet(isPresented: $showingAddOptions) {
            AddOptionsView(showingEnhancedRecording: $showingEnhancedRecording)
        }
        .fullScreenCover(isPresented: $showingEnhancedRecording) {
            EnhancedRecordingView()
        }
    }
}

// 簡易版AddOptionsView（新しい録音画面への橋渡し）
struct AddOptionsView: View {
    @Binding var showingEnhancedRecording: Bool
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                Text("録音オプション")
                    .font(.title)
                    .fontWeight(.bold)
                
                VStack(spacing: 20) {
                    // 新しい録音機能
                    Button(action: {
                        dismiss()
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                            showingEnhancedRecording = true
                        }
                    }) {
                        HStack {
                            Image(systemName: "mic.circle.fill")
                                .font(.title2)
                                .foregroundColor(.red)
                            
                            VStack(alignment: .leading) {
                                Text("新しい録音")
                                    .font(.headline)
                                Text("AVFoundation + リアルタイム文字起こし")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                            
                            Image(systemName: "chevron.right")
                                .foregroundColor(.secondary)
                        }
                        .padding()
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(10)
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    // 音声インポート
                    Button(action: {
                        // 音声インポート機能（今後実装）
                    }) {
                        HStack {
                            Image(systemName: "square.and.arrow.down.fill")
                                .font(.title2)
                                .foregroundColor(.blue)
                            
                            VStack(alignment: .leading) {
                                Text("音声ファイルをインポート")
                                    .font(.headline)
                                Text("既存の音声ファイルから文字起こし")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                            
                            Image(systemName: "chevron.right")
                                .foregroundColor(.secondary)
                        }
                        .padding()
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(10)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                
                Spacer()
            }
            .padding()
            .navigationTitle("追加")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("閉じる") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// 既存のビューをそのまま残す...
