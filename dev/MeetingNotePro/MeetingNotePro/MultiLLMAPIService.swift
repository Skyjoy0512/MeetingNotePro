import Foundation

// サポートするLLMプロバイダー
enum LLMProvider: String, CaseIterable, Identifiable {
    case gemini = "gemini"
    case openai = "openai"
    case claude = "claude"
    case openrouter = "openrouter"
    case local = "local"
    
    var id: String { self.rawValue }
    
    var displayName: String {
        switch self {
        case .gemini: return "Google Gemini"
        case .openai: return "OpenAI GPT"
        case .claude: return "Anthropic Claude"
        case .openrouter: return "OpenRouter"
        case .local: return "ローカルLLM"
        }
    }
}

// 利用可能なモデル
struct LLMModel: Identifiable, Hashable {
    let id: String
    let name: String
    let provider: LLMProvider
    let contextLength: Int
    let costPer1kTokens: Double
    let description: String
    
    static let availableModels: [LLMModel] = [
        // Gemini Models
        LLMModel(id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: .gemini, contextLength: 1000000, costPer1kTokens: 0.075, description: "高速・低コスト、長文対応"),
        LLMModel(id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: .gemini, contextLength: 2000000, costPer1kTokens: 3.5, description: "最高品質、超長文対応"),
        LLMModel(id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash (実験版)", provider: .gemini, contextLength: 1000000, costPer1kTokens: 0.075, description: "最新実験モデル"),
        
        // OpenAI Models
        LLMModel(id: "gpt-4o", name: "GPT-4o", provider: .openai, contextLength: 128000, costPer1kTokens: 2.5, description: "最新GPT-4、マルチモーダル対応"),
        LLMModel(id: "gpt-4o-mini", name: "GPT-4o Mini", provider: .openai, contextLength: 128000, costPer1kTokens: 0.15, description: "軽量版GPT-4o、コスト効率重視"),
        LLMModel(id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: .openai, contextLength: 128000, costPer1kTokens: 10.0, description: "高性能GPT-4"),
        
        // Claude Models
        LLMModel(id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: .claude, contextLength: 200000, costPer1kTokens: 3.0, description: "最新Claude、コード・推論特化"),
        LLMModel(id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", provider: .claude, contextLength: 200000, costPer1kTokens: 0.25, description: "高速・低コストClaude"),
        
        // OpenRouter (様々なモデルのプロキシ)
        LLMModel(id: "deepseek/deepseek-r1", name: "DeepSeek R1", provider: .openrouter, contextLength: 65536, costPer1kTokens: 0.55, description: "DeepSeek最新推論モデル"),
        LLMModel(id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B", provider: .openrouter, contextLength: 32768, costPer1kTokens: 0.88, description: "Alibaba高性能モデル"),
    ]
}

// APIレスポンス統一構造
struct LLMResponse {
    let content: String
    let model: String
    let provider: LLMProvider
    let tokenUsage: TokenUsage
    let finishReason: String
}

struct TokenUsage {
    let promptTokens: Int
    let completionTokens: Int
    let totalTokens: Int
    let estimatedCost: Double
}

// APIエラー
enum LLMAPIError: Error, LocalizedError {
    case invalidAPIKey
    case modelNotAvailable
    case rateLimitExceeded
    case quotaExceeded
    case networkError
    case invalidRequest
    case serverError
    case contentFiltered
    
    var errorDescription: String? {
        switch self {
        case .invalidAPIKey: return "APIキーが無効です"
        case .modelNotAvailable: return "選択したモデルが利用できません"
        case .rateLimitExceeded: return "レート制限に達しました"
        case .quotaExceeded: return "使用量制限に達しました"
        case .networkError: return "ネットワークエラーが発生しました"
        case .invalidRequest: return "リクエストが無効です"
        case .serverError: return "サーバーエラーが発生しました"
        case .contentFiltered: return "コンテンツがフィルタリングされました"
        }
    }
}

// マルチLLM APIサービス
class MultiLLMAPIService: ObservableObject {
    
    // MARK: - Published Properties
    @Published var isProcessing = false
    @Published var lastResponse: LLMResponse?
    @Published var errorMessage: String?
    
    // MARK: - Private Properties
    private let session = URLSession.shared
    private let keychain = KeychainManager.shared
    
    // MARK: - API Endpoints
    private let endpoints: [LLMProvider: String] = [
        .gemini: "https://generativelanguage.googleapis.com/v1beta/models",
        .openai: "https://api.openai.com/v1/chat/completions",
        .claude: "https://api.anthropic.com/v1/messages",
        .openrouter: "https://openrouter.ai/api/v1/chat/completions"
    ]
    
    // MARK: - Public Methods
    
    /// AI要約生成
    func generateSummary(transcript: String, model: LLMModel, template: String) async throws -> LLMResponse {
        let prompt = buildSummaryPrompt(transcript: transcript, template: template)
        return try await sendRequest(prompt: prompt, model: model, maxTokens: 2000)
    }
    
    /// AskAI質問応答
    func askQuestion(question: String, context: String, model: LLMModel, conversationHistory: [ChatMessage] = []) async throws -> LLMResponse {
        let prompt = buildQuestionPrompt(question: question, context: context, history: conversationHistory)
        return try await sendRequest(prompt: prompt, model: model, maxTokens: 1500)
    }
    
    /// 話者識別（高度なLLMのみ）
    func identifySpeakers(transcript: String, model: LLMModel) async throws -> LLMResponse {
        let prompt = buildSpeakerIdentificationPrompt(transcript: transcript)
        return try await sendRequest(prompt: prompt, model: model, maxTokens: 3000)
    }
    
    /// モデル利用可能性確認
    func validateModelAccess(model: LLMModel) async -> Bool {
        do {
            let testPrompt = "テスト"
            _ = try await sendRequest(prompt: testPrompt, model: model, maxTokens: 10)
            return true
        } catch {
            return false
        }
    }
    
    // MARK: - Private Methods
    
    /// 統一API リクエスト送信
    private func sendRequest(prompt: String, model: LLMModel, maxTokens: Int) async throws -> LLMResponse {
        await MainActor.run {
            self.isProcessing = true
            self.errorMessage = nil
        }
        
        defer {
            Task { @MainActor in
                self.isProcessing = false
            }
        }
        
        switch model.provider {
        case .gemini:
            return try await sendGeminiRequest(prompt: prompt, model: model, maxTokens: maxTokens)
        case .openai:
            return try await sendOpenAIRequest(prompt: prompt, model: model, maxTokens: maxTokens)
        case .claude:
            return try await sendClaudeRequest(prompt: prompt, model: model, maxTokens: maxTokens)
        case .openrouter:
            return try await sendOpenRouterRequest(prompt: prompt, model: model, maxTokens: maxTokens)
        case .local:
            return try await sendLocalRequest(prompt: prompt, model: model, maxTokens: maxTokens)
        }
    }
    
    /// Gemini API リクエスト
    private func sendGeminiRequest(prompt: String, model: LLMModel, maxTokens: Int) async throws -> LLMResponse {
        guard let apiKey = keychain.getAPIKey(for: .gemini) else {
            throw LLMAPIError.invalidAPIKey
        }
        
        let url = URL(string: "\(endpoints[.gemini]!)/\(model.id):generateContent?key=\(apiKey)")!
        
        let requestBody: [String: Any] = [
            "contents": [
                [
                    "parts": [
                        ["text": prompt]
                    ]
                ]
            ],
            "generationConfig": [
                "maxOutputTokens": maxTokens,
                "temperature": 0.7
            ]
        ]
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw LLMAPIError.networkError
        }
        
        try validateHTTPResponse(httpResponse)
        
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        
        guard let candidates = json["candidates"] as? [[String: Any]],
              let firstCandidate = candidates.first,
              let content = firstCandidate["content"] as? [String: Any],
              let parts = content["parts"] as? [[String: Any]],
              let text = parts.first?["text"] as? String else {
            throw LLMAPIError.serverError
        }
        
        let usage = extractGeminiUsage(from: json)
        
        return LLMResponse(
            content: text,
            model: model.id,
            provider: .gemini,
            tokenUsage: usage,
            finishReason: "stop"
        )
    }
    
    /// OpenAI API リクエスト
    private func sendOpenAIRequest(prompt: String, model: LLMModel, maxTokens: Int) async throws -> LLMResponse {
        guard let apiKey = keychain.getAPIKey(for: .openai) else {
            throw LLMAPIError.invalidAPIKey
        }
        
        let url = URL(string: endpoints[.openai]!)!
        
        let requestBody: [String: Any] = [
            "model": model.id,
            "messages": [
                ["role": "user", "content": prompt]
            ],
            "max_tokens": maxTokens,
            "temperature": 0.7
        ]
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw LLMAPIError.networkError
        }
        
        try validateHTTPResponse(httpResponse)
        
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        
        guard let choices = json["choices"] as? [[String: Any]],
              let firstChoice = choices.first,
              let message = firstChoice["message"] as? [String: Any],
              let content = message["content"] as? String else {
            throw LLMAPIError.serverError
        }
        
        let usage = extractOpenAIUsage(from: json, model: model)
        let finishReason = firstChoice["finish_reason"] as? String ?? "stop"
        
        return LLMResponse(
            content: content,
            model: model.id,
            provider: .openai,
            tokenUsage: usage,
            finishReason: finishReason
        )
    }
    
    /// Claude API リクエスト
    private func sendClaudeRequest(prompt: String, model: LLMModel, maxTokens: Int) async throws -> LLMResponse {
        guard let apiKey = keychain.getAPIKey(for: .claude) else {
            throw LLMAPIError.invalidAPIKey
        }
        
        let url = URL(string: endpoints[.claude]!)!
        
        let requestBody: [String: Any] = [
            "model": model.id,
            "max_tokens": maxTokens,
            "messages": [
                ["role": "user", "content": prompt]
            ]
        ]
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw LLMAPIError.networkError
        }
        
        try validateHTTPResponse(httpResponse)
        
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        
        guard let content = json["content"] as? [[String: Any]],
              let text = content.first?["text"] as? String else {
            throw LLMAPIError.serverError
        }
        
        let usage = extractClaudeUsage(from: json, model: model)
        let stopReason = json["stop_reason"] as? String ?? "end_turn"
        
        return LLMResponse(
            content: text,
            model: model.id,
            provider: .claude,
            tokenUsage: usage,
            finishReason: stopReason
        )
    }
    
    /// OpenRouter API リクエスト
    private func sendOpenRouterRequest(prompt: String, model: LLMModel, maxTokens: Int) async throws -> LLMResponse {
        guard let apiKey = keychain.getAPIKey(for: .openrouter) else {
            throw LLMAPIError.invalidAPIKey
        }
        
        let url = URL(string: endpoints[.openrouter]!)!
        
        let requestBody: [String: Any] = [
            "model": model.id,
            "messages": [
                ["role": "user", "content": prompt]
            ],
            "max_tokens": maxTokens,
            "temperature": 0.7
        ]
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("MeetingNotePro/1.0", forHTTPHeaderField: "HTTP-Referer")
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw LLMAPIError.networkError
        }
        
        try validateHTTPResponse(httpResponse)
        
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        
        // OpenRouterはOpenAI形式のレスポンス
        guard let choices = json["choices"] as? [[String: Any]],
              let firstChoice = choices.first,
              let message = firstChoice["message"] as? [String: Any],
              let content = message["content"] as? String else {
            throw LLMAPIError.serverError
        }
        
        let usage = extractOpenAIUsage(from: json, model: model)
        let finishReason = firstChoice["finish_reason"] as? String ?? "stop"
        
        return LLMResponse(
            content: content,
            model: model.id,
            provider: .openrouter,
            tokenUsage: usage,
            finishReason: finishReason
        )
    }
    
    /// ローカルLLM リクエスト（Ollama等）
    private func sendLocalRequest(prompt: String, model: LLMModel, maxTokens: Int) async throws -> LLMResponse {
        // ローカルLLMのエンドポイント（設定可能）
        let localEndpoint = UserDefaults.standard.string(forKey: "localLLMEndpoint") ?? "http://localhost:11434/api/generate"
        
        guard let url = URL(string: localEndpoint) else {
            throw LLMAPIError.invalidRequest
        }
        
        let requestBody: [String: Any] = [
            "model": model.id,
            "prompt": prompt,
            "stream": false,
            "options": [
                "num_predict": maxTokens,
                "temperature": 0.7
            ]
        ]
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw LLMAPIError.networkError
        }
        
        try validateHTTPResponse(httpResponse)
        
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        
        guard let content = json["response"] as? String else {
            throw LLMAPIError.serverError
        }
        
        return LLMResponse(
            content: content,
            model: model.id,
            provider: .local,
            tokenUsage: TokenUsage(promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0),
            finishReason: "stop"
        )
    }
    
    // MARK: - プロンプト構築
    
    private func buildSummaryPrompt(transcript: String, template: String) -> String {
        return """
        以下の議事録文字起こしを、指定されたテンプレートに従って要約してください。

        テンプレート:
        \(template)

        文字起こし内容:
        \(transcript)

        要約を作成してください。
        """
    }
    
    private func buildQuestionPrompt(question: String, context: String, history: [ChatMessage]) -> String {
        var prompt = """
        以下の会議の文字起こし内容について質問に答えてください。

        会議内容:
        \(context)

        """
        
        if !history.isEmpty {
            prompt += "\n過去の会話履歴:\n"
            for message in history.suffix(5) { // 最新5件のみ
                prompt += "\(message.role): \(message.content)\n"
            }
        }
        
        prompt += "\n質問: \(question)\n\n回答してください。"
        
        return prompt
    }
    
    private func buildSpeakerIdentificationPrompt(transcript: String) -> String {
        return """
        以下の会議の文字起こしテキストから、発言者を識別し、発言を話者別に整理してください。
        話者は「話者A」「話者B」などと識別し、可能であれば話者の特徴も記述してください。

        文字起こし内容:
        \(transcript)

        話者別に整理された結果を返してください。
        """
    }
    
    // MARK: - ユーティリティ
    
    private func validateHTTPResponse(_ response: HTTPURLResponse) throws {
        switch response.statusCode {
        case 200...299:
            return
        case 401:
            throw LLMAPIError.invalidAPIKey
        case 429:
            throw LLMAPIError.rateLimitExceeded
        case 402, 403:
            throw LLMAPIError.quotaExceeded
        case 400:
            throw LLMAPIError.invalidRequest
        case 500...599:
            throw LLMAPIError.serverError
        default:
            throw LLMAPIError.networkError
        }
    }
    
    private func extractGeminiUsage(from json: [String: Any]) -> TokenUsage {
        // Geminiの使用量情報抽出（実際のAPIレスポンスに応じて調整）
        let promptTokens = json["promptTokenCount"] as? Int ?? 0
        let completionTokens = json["candidatesTokenCount"] as? Int ?? 0
        let totalTokens = promptTokens + completionTokens
        let estimatedCost = Double(totalTokens) * 0.075 / 1000 // Gemini Flash推定コスト
        
        return TokenUsage(promptTokens: promptTokens, completionTokens: completionTokens, totalTokens: totalTokens, estimatedCost: estimatedCost)
    }
    
    private func extractOpenAIUsage(from json: [String: Any], model: LLMModel) -> TokenUsage {
        guard let usage = json["usage"] as? [String: Any] else {
            return TokenUsage(promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0)
        }
        
        let promptTokens = usage["prompt_tokens"] as? Int ?? 0
        let completionTokens = usage["completion_tokens"] as? Int ?? 0
        let totalTokens = usage["total_tokens"] as? Int ?? (promptTokens + completionTokens)
        let estimatedCost = Double(totalTokens) * model.costPer1kTokens / 1000
        
        return TokenUsage(promptTokens: promptTokens, completionTokens: completionTokens, totalTokens: totalTokens, estimatedCost: estimatedCost)
    }
    
    private func extractClaudeUsage(from json: [String: Any], model: LLMModel) -> TokenUsage {
        guard let usage = json["usage"] as? [String: Any] else {
            return TokenUsage(promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0)
        }
        
        let inputTokens = usage["input_tokens"] as? Int ?? 0
        let outputTokens = usage["output_tokens"] as? Int ?? 0
        let totalTokens = inputTokens + outputTokens
        let estimatedCost = Double(totalTokens) * model.costPer1kTokens / 1000
        
        return TokenUsage(promptTokens: inputTokens, completionTokens: outputTokens, totalTokens: totalTokens, estimatedCost: estimatedCost)
    }
}

// チャットメッセージ構造
struct ChatMessage: Identifiable {
    let id = UUID()
    let role: String
    let content: String
    let timestamp: Date
}

// キーチェーン管理（APIキー安全保存）
extension KeychainManager {
    func getAPIKey(for provider: LLMProvider) -> String? {
        return get(key: "api_key_\(provider.rawValue)")
    }
    
    func setAPIKey(_ key: String, for provider: LLMProvider) {
        set(key: "api_key_\(provider.rawValue)", value: key)
    }
    
    func removeAPIKey(for provider: LLMProvider) {
        delete(key: "api_key_\(provider.rawValue)")
    }
}

// プレビュー用のサンプルデータ
#if DEBUG
extension MultiLLMAPIService {
    static let preview: MultiLLMAPIService = {
        let service = MultiLLMAPIService()
        service.lastResponse = LLMResponse(
            content: "会議の要約: 今月の売上目標達成のため、マーケティング戦略の見直しと新商品の開発スケジュール調整が決定されました。",
            model: "gemini-1.5-flash",
            provider: .gemini,
            tokenUsage: TokenUsage(promptTokens: 150, completionTokens: 75, totalTokens: 225, estimatedCost: 0.017),
            finishReason: "stop"
        )
        return service
    }()
}
#endif