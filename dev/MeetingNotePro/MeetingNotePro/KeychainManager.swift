import Foundation
import Security

// キーチェーン管理クラス（APIキー等の機密情報を安全に保存）
class KeychainManager {
    
    static let shared = KeychainManager()
    private init() {}
    
    private let service = "com.meetingnotepro.app"
    
    // MARK: - Public Methods
    
    /// キーチェーンに値を保存
    func set(key: String, value: String) {
        let data = value.data(using: .utf8)!
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        
        // 既存のアイテムを削除
        SecItemDelete(query as CFDictionary)
        
        // 新しいアイテムを追加
        let status = SecItemAdd(query as CFDictionary, nil)
        
        if status != errSecSuccess {
            print("キーチェーン保存エラー: \(status)")
        }
    }
    
    /// キーチェーンから値を取得
    func get(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        if status == errSecSuccess,
           let data = result as? Data,
           let value = String(data: data, encoding: .utf8) {
            return value
        }
        
        return nil
    }
    
    /// キーチェーンから値を削除
    func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        
        SecItemDelete(query as CFDictionary)
    }
    
    /// 全てのキーチェーンアイテムを削除
    func deleteAll() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service
        ]
        
        SecItemDelete(query as CFDictionary)
    }
    
    /// キーが存在するかチェック
    func exists(key: String) -> Bool {
        return get(key: key) != nil
    }
}

// MARK: - 使用例とヘルパー

extension KeychainManager {
    
    /// 全APIキーの存在状況確認
    func getAPIKeyStatus() -> [LLMProvider: Bool] {
        var status: [LLMProvider: Bool] = [:]
        
        for provider in LLMProvider.allCases {
            status[provider] = exists(key: "api_key_\(provider.rawValue)")
        }
        
        return status
    }
    
    /// APIキー設定状況の文字列表現
    func getAPIKeyStatusDescription() -> String {
        let status = getAPIKeyStatus()
        var descriptions: [String] = []
        
        for (provider, isSet) in status {
            let emoji = isSet ? "✅" : "❌"
            descriptions.append("\(emoji) \(provider.displayName)")
        }
        
        return descriptions.joined(separator: "\n")
    }
}

#if DEBUG
// デバッグ用ヘルパー
extension KeychainManager {
    
    /// テスト用のサンプルAPIキー設定
    func setTestAPIKeys() {
        setAPIKey("test_gemini_key_12345", for: .gemini)
        setAPIKey("test_openai_key_67890", for: .openai)
        setAPIKey("test_claude_key_abcde", for: .claude)
    }
    
    /// 全てのAPIキーをログ出力（デバッグ用のみ）
    func debugPrintAllKeys() {
        print("=== キーチェーン内容（デバッグ用） ===")
        for provider in LLMProvider.allCases {
            let key = getAPIKey(for: provider)
            let maskedKey = key?.prefix(8).appending("***") ?? "未設定"
            print("\(provider.displayName): \(maskedKey)")
        }
        print("===============================")
    }
}
#endif