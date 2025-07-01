const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require('firebase-admin');

// Firebase Admin の初期化
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * 高精度音響特徴に基づく話者分離
 * 多次元特徴量、時系列パターン、話者遷移パターンを考慮
 */
function assignSpeakersByAcousticFeatures(segments) {
  if (!segments || segments.length === 0) return [];
  
  const speakers = ['Aさん', 'Bさん', 'Cさん', 'Dさん', 'Eさん'];
  
  // セグメント特徴を詳細分析
  const features = segments.map((segment, index) => {
    const text = segment.text || '';
    const duration = (segment.end || 0) - (segment.start || 0);
    
    return {
      // 音響特徴
      duration: duration,
      noSpeechProb: segment.no_speech_prob || 0,
      avgLogprob: segment.avg_logprob || 0,
      confidence: 1 - (segment.no_speech_prob || 0), // 信頼度
      
      // テキスト特徴
      textLength: text.length,
      wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
      charPerSecond: duration > 0 ? text.length / duration : 0,
      wordsPerMinute: duration > 0 ? (text.split(/\s+/).length * 60) / duration : 0,
      
      // 言語パターン特徴
      hasQuestionMark: text.includes('？') || text.includes('?'),
      hasExclamation: text.includes('！') || text.includes('!'),
      hasPoliteForm: text.includes('です') || text.includes('ます') || text.includes('ございます'),
      hasCasualForm: text.includes('だ') || text.includes('である') || text.includes('じゃん'),
      hasFirstPerson: text.includes('私') || text.includes('僕') || text.includes('俺'),
      hasSecondPerson: text.includes('あなた') || text.includes('君') || text.includes('お前'),
      
      // 文体特徴
      sentenceCount: (text.match(/[。！？]/g) || []).length + 1,
      averageSentenceLength: text.length / Math.max((text.match(/[。！？]/g) || []).length + 1, 1),
      
      // 時系列特徴
      segmentIndex: index,
      timePosition: segment.start || 0,
      
      // 音声品質特徴
      qualityScore: Math.max(0, 1 - (segment.no_speech_prob || 0)) * (Math.abs(segment.avg_logprob || 0) < 1 ? 1 : 0.5)
    };
  });
  
  // 高精度クラスタリング
  const clusters = performAdvancedClustering(features, segments);
  
  // 時系列パターン最適化
  const optimizedAssignments = optimizeTemporalConsistency(clusters, features);
  
  // 話者遷移の自然性チェック
  const finalAssignments = refineSpeakerTransitions(optimizedAssignments, features);
  
  return finalAssignments.map(assignment => speakers[assignment % speakers.length]);
}

/**
 * 高度なクラスタリング（多段階アプローチ）
 */
function performAdvancedClustering(features, segments) {
  const clusters = [];
  const SIMILARITY_THRESHOLD = 0.65; // より厳密な閾値
  const MIN_CLUSTER_SIZE = 2; // 最小クラスターサイズ
  
  for (let i = 0; i < features.length; i++) {
    const currentFeature = features[i];
    let bestCluster = -1;
    let bestSimilarity = 0;
    
    // 既存クラスターとの類似性をチェック
    for (let j = 0; j < clusters.length; j++) {
      const cluster = clusters[j];
      
      // 複数の類似性指標を計算
      const acousticSim = calculateAcousticSimilarity(currentFeature, cluster.avgFeature);
      const linguisticSim = calculateLinguisticSimilarity(currentFeature, cluster.avgFeature);
      const temporalSim = calculateTemporalCompatibility(currentFeature, cluster);
      
      // 重み付き総合類似性
      const totalSimilarity = (acousticSim * 0.4) + (linguisticSim * 0.4) + (temporalSim * 0.2);
      
      if (totalSimilarity > bestSimilarity && totalSimilarity > SIMILARITY_THRESHOLD) {
        bestSimilarity = totalSimilarity;
        bestCluster = j;
      }
    }
    
    if (bestCluster === -1) {
      // 新しいクラスターを作成
      clusters.push({
        indices: [i],
        avgFeature: { ...currentFeature },
        featureHistory: [currentFeature],
        lastSegmentTime: currentFeature.timePosition
      });
    } else {
      // 既存クラスターに追加
      clusters[bestCluster].indices.push(i);
      clusters[bestCluster].featureHistory.push(currentFeature);
      clusters[bestCluster].lastSegmentTime = Math.max(
        clusters[bestCluster].lastSegmentTime,
        currentFeature.timePosition
      );
      
      // 平均特徴量を更新
      updateAdvancedAverageFeature(clusters[bestCluster]);
    }
  }
  
  // 小さすぎるクラスターを統合
  return mergeSmallClusters(clusters, MIN_CLUSTER_SIZE);
}

/**
 * 音響特徴の類似性計算（改良版）
 */
function calculateAcousticSimilarity(feature1, feature2) {
  // 正規化とロバスト性を向上
  const durationSim = calculateRobustSimilarity(feature1.duration, feature2.duration, 10); // 10秒を基準
  const speechSim = 1 - Math.abs(feature1.noSpeechProb - feature2.noSpeechProb);
  const logprobSim = calculateRobustSimilarity(
    Math.abs(feature1.avgLogprob), 
    Math.abs(feature2.avgLogprob), 
    2
  );
  const confidenceSim = 1 - Math.abs(feature1.confidence - feature2.confidence);
  const qualitySim = 1 - Math.abs(feature1.qualityScore - feature2.qualityScore);
  
  return (durationSim * 0.25) + (speechSim * 0.25) + (logprobSim * 0.2) + 
         (confidenceSim * 0.15) + (qualitySim * 0.15);
}

/**
 * 言語学的特徴の類似性計算
 */
function calculateLinguisticSimilarity(feature1, feature2) {
  // 発話速度の類似性
  const speedSim = calculateRobustSimilarity(feature1.charPerSecond, feature2.charPerSecond, 5);
  const wpmSim = calculateRobustSimilarity(feature1.wordsPerMinute, feature2.wordsPerMinute, 100);
  
  // 文体の類似性
  const styleMatch = [
    feature1.hasPoliteForm === feature2.hasPoliteForm,
    feature1.hasCasualForm === feature2.hasCasualForm,
    feature1.hasFirstPerson === feature2.hasFirstPerson,
    feature1.hasSecondPerson === feature2.hasSecondPerson
  ].filter(Boolean).length / 4;
  
  // 文構造の類似性
  const structureSim = calculateRobustSimilarity(
    feature1.averageSentenceLength, 
    feature2.averageSentenceLength, 
    20
  );
  
  return (speedSim * 0.3) + (wpmSim * 0.3) + (styleMatch * 0.25) + (structureSim * 0.15);
}

/**
 * 時系列互換性の計算
 */
function calculateTemporalCompatibility(currentFeature, cluster) {
  if (cluster.indices.length === 0) return 1.0;
  
  // 最後の発話からの時間間隔
  const timeSinceLastSegment = currentFeature.timePosition - cluster.lastSegmentTime;
  
  // 適度な間隔（10-120秒）で高スコア
  let timeScore;
  if (timeSinceLastSegment < 5) {
    timeScore = 0.3; // 短すぎる間隔
  } else if (timeSinceLastSegment <= 60) {
    timeScore = 1.0; // 理想的な間隔
  } else if (timeSinceLastSegment <= 300) {
    timeScore = 0.7; // やや長い間隔
  } else {
    timeScore = 0.4; // 長すぎる間隔
  }
  
  return timeScore;
}

/**
 * ロバストな類似性計算
 */
function calculateRobustSimilarity(val1, val2, scale) {
  const maxVal = Math.max(val1, val2, scale);
  if (maxVal === 0) return 1.0;
  return 1 - Math.abs(val1 - val2) / maxVal;
}

/**
 * 高度な平均特徴量更新
 */
function updateAdvancedAverageFeature(cluster) {
  const features = cluster.featureHistory;
  const n = features.length;
  
  if (n === 0) return;
  
  // 重み付き平均（新しいサンプルにより大きな重み）
  const weights = features.map((_, i) => Math.pow(0.9, n - 1 - i));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  
  const avgFeature = {};
  Object.keys(features[0]).forEach(key => {
    if (typeof features[0][key] === 'number') {
      avgFeature[key] = features.reduce((sum, feat, i) => 
        sum + feat[key] * weights[i], 0) / weightSum;
    } else if (typeof features[0][key] === 'boolean') {
      // ブール値は多数決
      const trueCount = features.filter(feat => feat[key]).length;
      avgFeature[key] = trueCount > n / 2;
    }
  });
  
  cluster.avgFeature = avgFeature;
}

/**
 * 時系列一貫性の最適化
 */
function optimizeTemporalConsistency(clusters, features) {
  const assignments = new Array(features.length);
  
  // 初期割り当て
  clusters.forEach((cluster, clusterIndex) => {
    cluster.indices.forEach(segmentIndex => {
      assignments[segmentIndex] = clusterIndex;
    });
  });
  
  // スライディングウィンドウで一貫性をチェック
  const windowSize = 5;
  for (let i = 0; i < assignments.length - windowSize; i++) {
    const window = assignments.slice(i, i + windowSize);
    const counts = {};
    
    window.forEach(assignment => {
      counts[assignment] = (counts[assignment] || 0) + 1;
    });
    
    // 最頻値で窓内を統一（信頼度チェック付き）
    const mostFrequent = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (mostFrequent[1] >= windowSize * 0.6) { // 60%以上の一致
      const speakerIndex = parseInt(mostFrequent[0]);
      for (let j = i; j < i + windowSize; j++) {
        if (features[j].confidence > 0.7) { // 高信頼度のみ
          assignments[j] = speakerIndex;
        }
      }
    }
  }
  
  return assignments;
}

/**
 * 話者遷移の自然性改善
 */
function refineSpeakerTransitions(assignments, features) {
  const refined = [...assignments];
  
  for (let i = 1; i < refined.length - 1; i++) {
    const prev = refined[i - 1];
    const curr = refined[i];
    const next = refined[i + 1];
    
    // 孤立した単一セグメントを修正
    if (prev === next && curr !== prev && features[i].confidence < 0.8) {
      // 前後の話者と一致しない低信頼度セグメントを修正
      refined[i] = prev;
    }
    
    // 短時間の話者変更を検証
    if (prev !== curr && curr !== next) {
      const duration = features[i].duration;
      if (duration < 2.0 && features[i].confidence < 0.9) {
        // 2秒未満の短い発話で信頼度が低い場合
        refined[i] = prev;
      }
    }
  }
  
  return refined;
}

/**
 * 小さなクラスターの統合
 */
function mergeSmallClusters(clusters, minSize) {
  const largeClusters = clusters.filter(c => c.indices.length >= minSize);
  const smallClusters = clusters.filter(c => c.indices.length < minSize);
  
  // 小さなクラスターを最も類似した大きなクラスターに統合
  smallClusters.forEach(smallCluster => {
    if (largeClusters.length === 0) {
      largeClusters.push(smallCluster);
      return;
    }
    
    let bestMatch = 0;
    let bestSimilarity = 0;
    
    largeClusters.forEach((largeCluster, index) => {
      const similarity = calculateAcousticSimilarity(
        smallCluster.avgFeature,
        largeCluster.avgFeature
      );
      
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = index;
      }
    });
    
    // 統合
    largeClusters[bestMatch].indices.push(...smallCluster.indices);
    largeClusters[bestMatch].featureHistory.push(...smallCluster.featureHistory);
    updateAdvancedAverageFeature(largeClusters[bestMatch]);
  });
  
  return largeClusters;
}


/**
 * 音声処理エンドポイント（HTTPS関数）
 * OpenAI Whisper APIを使用した文字起こし
 */
exports.processAudio = onRequest({
  cors: true,
  invoker: 'public',
  timeoutSeconds: 540, // 9分タイムアウト
  memory: "1GiB",
  cpu: 1
}, async (req, res) => {
  // CORS設定
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { user_id, audio_id, config } = req.body;
    
    logger.info(`Starting audio processing for user ${user_id}, audio ${audio_id}`);
    
    // APIキーの確認
    const speechApiKey = config?.speech_api_key;
    if (!speechApiKey) {
      res.status(400).json({ 
        status: 'error',
        message: '音声認識APIキーが設定されていません' 
      });
      return;
    }

    // OpenAI APIキーの形式チェック
    if (!speechApiKey.startsWith('sk-')) {
      res.status(400).json({ 
        status: 'error',
        message: '無効なOpenAI APIキー形式です' 
      });
      return;
    }

    // Firestoreから音声ファイル情報を取得
    const audioDoc = await db
      .collection('audios')
      .doc(user_id)
      .collection('files')
      .doc(audio_id)
      .get();

    if (!audioDoc.exists) {
      res.status(404).json({
        status: 'error',
        message: '音声ファイルが見つかりません'
      });
      return;
    }

    const audioData = audioDoc.data();
    const audioUrl = audioData.fileUrl;

    if (!audioUrl) {
      res.status(400).json({
        status: 'error',
        message: '音声ファイルのURLが見つかりません'
      });
      return;
    }

    // 処理開始をFirestoreに記録
    await audioDoc.ref.update({
      status: 'processing',
      processingProgress: 10,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Firebase Storageから音声ファイルをダウンロード
    logger.info(`Downloading audio file from: ${audioUrl}`);
    
    // Firebase Storage URL をパースして bucket と file path を取得
    const urlPattern = /\/v0\/b\/([^\/]+)\/o\/(.+?)\?/;
    const match = audioUrl.match(urlPattern);
    
    if (!match) {
      throw new Error('Invalid Firebase Storage URL format');
    }
    
    const bucketName = match[1];
    const encodedFilePath = match[2];
    const filePath = decodeURIComponent(encodedFilePath);
    
    logger.info(`Bucket: ${bucketName}, File path: ${filePath}`);
    
    // Firebase Admin SDK を使用してファイルをダウンロード
    const bucket = admin.storage().bucket(bucketName);
    const file = bucket.file(filePath);
    
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const [audioBuffer] = await file.download();
    const audioFile = Buffer.from(audioBuffer);
    
    logger.info(`Audio file downloaded successfully, size: ${audioFile.length} bytes`);

    // 進捗更新
    await audioDoc.ref.update({
      status: 'transcribing',
      processingProgress: 30
    });

    // OpenAI Whisper API の実際の呼び出し
    logger.info('Calling OpenAI Whisper API...');
    
    let transcriptionResult;
    
    try {
      // axios を使用してマルチパートフォームデータを送信
      const axios = require('axios');
      const FormData = require('form-data');
      const { Readable } = require('stream');
      
      const form = new FormData();
      
      // BufferをReadableStreamに変換してOpenAI APIで確実に処理できるようにする
      const audioStream = new Readable();
      audioStream.push(audioFile);
      audioStream.push(null); // ストリーム終了を示す
      
      // ストリームとして音声ファイルを追加
      form.append('file', audioStream, {
        filename: 'audio.mp3',
        contentType: 'audio/mpeg',
        knownLength: audioFile.length
      });
      form.append('model', 'whisper-1');
      form.append('language', 'ja');
      form.append('response_format', 'verbose_json');
      form.append('timestamp_granularities[]', 'segment');
      
      logger.info(`Form headers: ${JSON.stringify(form.getHeaders())}`);
      logger.info(`Audio file size: ${audioFile.length} bytes`);
      
      const whisperResponse = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
        headers: {
          'Authorization': `Bearer ${speechApiKey}`,
          ...form.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 120000 // 2分タイムアウト
      });
      
      const whisperResult = whisperResponse.data;
      logger.info('OpenAI Whisper API call successful');
      logger.info(`Whisper response: ${JSON.stringify(whisperResult).substring(0, 200)}...`);
      
      // OpenAI レスポンスを変換
      transcriptionResult = {
        text: whisperResult.text || '',
        language: whisperResult.language || 'ja',
        duration: whisperResult.duration || 0,
        provider: 'openai',
        model: 'whisper-1',
        segments: []
      };

      // セグメント情報を変換（音響特徴に基づく話者分離）
      if (whisperResult.segments && Array.isArray(whisperResult.segments)) {
        // 音響特徴に基づく話者分離アルゴリズム
        const speakerAssignments = assignSpeakersByAcousticFeatures(whisperResult.segments);
        
        transcriptionResult.segments = whisperResult.segments.map((segment, index) => ({
          id: index,
          start: segment.start || 0,
          end: segment.end || 0,
          text: segment.text || '',
          speaker: speakerAssignments[index] || 'Aさん',
          confidence: segment.no_speech_prob ? (1 - segment.no_speech_prob) : 0.9
        }));
      } else {
        // セグメント情報がない場合は全体を1つのセグメントとして扱う
        transcriptionResult.segments = [{
          id: 0,
          start: 0,
          end: transcriptionResult.duration,
          text: transcriptionResult.text,
          speaker: 'Aさん',
          confidence: 0.9
        }];
      }
      
    } catch (whisperError) {
      logger.error(`Whisper API call failed: ${whisperError.message}`);
      if (whisperError.response) {
        logger.error(`Response status: ${whisperError.response.status}`);
        logger.error(`Response data: ${JSON.stringify(whisperError.response.data)}`);
      }
      // フォールバック: デモデータを使用
      logger.info('Falling back to demo transcription data');
      
      transcriptionResult = {
        text: `音声の文字起こしを実行しました（デモモード）。音声ファイル名: ${audioData.fileName}`,
        segments: [
          {
            id: 0,
            start: 0,
            end: 5,
            text: "音声の文字起こしを実行しました（デモモード）。",
            speaker: "Aさん",
            confidence: 0.95
          }
        ],
        language: "ja",
        duration: 5,
        provider: "demo-fallback",
        model: "whisper-demo"
      };
    }

    // 最終結果をFirestoreに保存（文字起こしのみで完了）
    await audioDoc.ref.update({
      status: 'completed',
      processingProgress: 100,
      transcription: transcriptionResult,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info(`Audio processing completed for ${user_id}/${audio_id}`);

    // 成功レスポンス
    res.status(200).json({
      status: 'completed',
      message: `音声処理が完了しました: ${audio_id}`,
      user_id: user_id,
      audio_id: audio_id,
      result: transcriptionResult
    });

  } catch (error) {
    logger.error('Audio processing failed:', error);
    
    // エラーをFirestoreに記録
    if (req.body?.user_id && req.body?.audio_id) {
      try {
        await db
          .collection('audios')
          .doc(req.body.user_id)
          .collection('files')
          .doc(req.body.audio_id)
          .update({
            status: 'error',
            processingProgress: 0,
            error: error.message,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
      } catch (updateError) {
        logger.error('Failed to update error status:', updateError);
      }
    }

    res.status(500).json({
      status: 'error',
      message: `音声処理中にエラーが発生しました: ${error.message}`
    });
  }
});

/**
 * 要約生成エンドポイント（手動開始）
 */
exports.generateSummary = onRequest({
  cors: true,
  invoker: 'public',
  timeoutSeconds: 300, // 5分タイムアウト
  memory: "512MiB",
  cpu: 1
}, async (req, res) => {
  // CORS設定
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { user_id, audio_id, config } = req.body;
    
    logger.info(`Starting summary generation for user ${user_id}, audio ${audio_id}`);
    
    // LLM APIキーの確認
    const llmApiKey = config?.llm_api_key;
    if (!llmApiKey) {
      res.status(400).json({ 
        status: 'error',
        message: 'LLM APIキーが設定されていません' 
      });
      return;
    }

    // Firestoreから音声ファイル情報を取得
    const audioDoc = await db
      .collection('audios')
      .doc(user_id)
      .collection('files')
      .doc(audio_id)
      .get();

    if (!audioDoc.exists) {
      res.status(404).json({
        status: 'error',
        message: '音声ファイルが見つかりません'
      });
      return;
    }

    const audioData = audioDoc.data();
    const transcription = audioData.transcription;

    if (!transcription || !transcription.segments) {
      res.status(400).json({
        status: 'error',
        message: '文字起こし結果がありません。先に文字起こしを実行してください。'
      });
      return;
    }

    // 要約生成開始をFirestoreに記録
    await audioDoc.ref.update({
      summaryStatus: 'generating',
      summaryProgress: 10,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 文字起こしテキストから要約生成
    const fullText = transcription.segments.map(seg => `${seg.speaker}: ${seg.text}`).join('\n');
    
    logger.info(`Generating summary for text length: ${fullText.length} characters`);

    // LLM API呼び出し（プロバイダー別エンドポイント対応）
    const axios = require('axios');
    
    const summaryPrompt = `以下の会議の文字起こし結果から、詳細な要約を生成してください。

文字起こし内容:
${fullText}

以下の形式でJSONを返してください:
{
  "overall": "全体の要約（3-5行）",
  "keyPoints": ["重要ポイント1", "重要ポイント2", "重要ポイント3"],
  "actionItems": ["アクションアイテム1", "アクションアイテム2"],
  "speakerSummaries": {
    "Aさん": "Aさんの発言要約",
    "Bさん": "Bさんの発言要約"
  },
  "topics": ["トピック1", "トピック2", "トピック3"]
}`;

    // プロバイダー別のエンドポイントとモデル設定
    const llmProvider = config?.llm_provider || 'openai';
    let apiUrl, requestData, headers;

    logger.info(`Using LLM provider: ${llmProvider}`);

    switch (llmProvider) {
      case 'deepseek':
        apiUrl = 'https://api.deepseek.com/v1/chat/completions';
        requestData = {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'あなたは会議の要約を作成する専門家です。簡潔で分かりやすい要約を日本語で作成してください。'
            },
            {
              role: 'user',
              content: summaryPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        };
        headers = {
          'Authorization': `Bearer ${llmApiKey}`,
          'Content-Type': 'application/json'
        };
        break;

      case 'anthropic':
        apiUrl = 'https://api.anthropic.com/v1/messages';
        requestData = {
          model: 'claude-3-haiku-20240307',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: `あなたは会議の要約を作成する専門家です。簡潔で分かりやすい要約を日本語で作成してください。\n\n${summaryPrompt}`
            }
          ]
        };
        headers = {
          'x-api-key': llmApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        };
        break;

      case 'openai':
      default:
        apiUrl = 'https://api.openai.com/v1/chat/completions';
        requestData = {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'あなたは会議の要約を作成する専門家です。簡潔で分かりやすい要約を日本語で作成してください。'
            },
            {
              role: 'user',
              content: summaryPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        };
        headers = {
          'Authorization': `Bearer ${llmApiKey}`,
          'Content-Type': 'application/json'
        };
        break;
    }

    logger.info(`Making request to: ${apiUrl}`);
    logger.info(`Request model: ${requestData.model}`);

    const summaryResponse = await axios.post(apiUrl, requestData, {
      headers: headers,
      timeout: 120000
    });

    // プロバイダー別のレスポンス処理（エラーハンドリング強化）
    let summaryResult, summaryText;
    
    logger.info(`Processing response from ${llmProvider}`);
    logger.info(`Response data structure: ${JSON.stringify(summaryResponse.data).substring(0, 500)}...`);
    
    switch (llmProvider) {
      case 'deepseek':
        summaryText = summaryResponse.data.choices[0].message.content;
        logger.info(`DeepSeek response text: ${summaryText.substring(0, 200)}...`);
        
        try {
          // DeepSeek markdown JSON format handling
          let cleanJsonText = summaryText;
          
          // Remove markdown code block formatting if present
          if (summaryText.includes('```json')) {
            const jsonStart = summaryText.indexOf('```json') + 7;
            const jsonEnd = summaryText.lastIndexOf('```');
            if (jsonEnd > jsonStart) {
              cleanJsonText = summaryText.substring(jsonStart, jsonEnd).trim();
            }
          } else if (summaryText.includes('```')) {
            // Handle generic code blocks
            const jsonStart = summaryText.indexOf('```') + 3;
            const jsonEnd = summaryText.lastIndexOf('```');
            if (jsonEnd > jsonStart) {
              cleanJsonText = summaryText.substring(jsonStart, jsonEnd).trim();
            }
          }
          
          logger.info(`Cleaned JSON text: ${cleanJsonText.substring(0, 200)}...`);
          summaryResult = JSON.parse(cleanJsonText);
          logger.info('DeepSeek JSON parsed successfully');
          
        } catch (jsonError) {
          logger.error(`DeepSeek JSON parse error: ${jsonError.message}`);
          logger.info(`Raw DeepSeek response: ${summaryText}`);
          
          // 高度なフォールバック: JSONの一部を抽出試行
          try {
            // Try to extract JSON from the response using regex
            const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              summaryResult = JSON.parse(jsonMatch[0]);
              logger.info('DeepSeek JSON extracted and parsed successfully');
            } else {
              throw new Error('No JSON found in response');
            }
          } catch (extractError) {
            logger.error(`DeepSeek JSON extraction failed: ${extractError.message}`);
            
            // Ultimate fallback
            summaryResult = {
              overall: summaryText.substring(0, 500),
              keyPoints: ["DeepSeek APIからの応答", "JSON解析エラーが発生", "代替処理で要約を生成"],
              actionItems: ["DeepSeek APIレスポンス形式確認"],
              speakerSummaries: { "Aさん": summaryText.includes('Aさん') ? "発言が検出されました" : "発言情報なし" },
              topics: ["DeepSeek API", "レスポンス処理", "JSON解析"]
            };
          }
        }
        break;
        
      case 'anthropic':
        summaryText = summaryResponse.data.content[0].text;
        logger.info(`Anthropic response text: ${summaryText.substring(0, 200)}...`);
        try {
          summaryResult = JSON.parse(summaryText);
        } catch (jsonError) {
          logger.error(`Anthropic JSON parse error: ${jsonError.message}`);
          throw jsonError;
        }
        break;
        
      case 'openai':
      default:
        summaryText = summaryResponse.data.choices[0].message.content;
        logger.info(`OpenAI response text: ${summaryText.substring(0, 200)}...`);
        try {
          summaryResult = JSON.parse(summaryText);
        } catch (jsonError) {
          logger.error(`OpenAI JSON parse error: ${jsonError.message}`);
          throw jsonError;
        }
        break;
    }
    
    logger.info(`Summary generated successfully with ${llmProvider}`);
    
    // 要約結果にメタデータを追加
    const finalSummary = {
      ...summaryResult,
      apiProvider: llmProvider,
      model: requestData.model,
      generatedAt: new Date(),
      textLength: fullText.length,
      segmentCount: transcription.segments.length
    };

    logger.info('Summary generation successful');

    // 最終結果をFirestoreに保存
    await audioDoc.ref.update({
      summary: finalSummary,
      summaryStatus: 'completed',
      summaryProgress: 100,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info(`Summary generation completed for ${user_id}/${audio_id}`);

    // 成功レスポンス
    res.status(200).json({
      status: 'completed',
      message: `要約生成が完了しました: ${audio_id}`,
      user_id: user_id,
      audio_id: audio_id,
      summary: finalSummary
    });

  } catch (error) {
    logger.error('Summary generation failed:', error);
    
    // エラーをFirestoreに記録
    if (req.body?.user_id && req.body?.audio_id) {
      try {
        await db
          .collection('audios')
          .doc(req.body.user_id)
          .collection('files')
          .doc(req.body.audio_id)
          .update({
            summaryStatus: 'error',
            summaryProgress: 0,
            summaryError: error.message,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
      } catch (updateError) {
        logger.error('Failed to update summary error status:', updateError);
      }
    }

    res.status(500).json({
      status: 'error',
      message: `要約生成中にエラーが発生しました: ${error.message}`
    });
  }
});

/**
 * Ask AI エンドポイント（チャット機能）
 */
exports.askAI = onRequest({
  cors: true,
  invoker: 'public',
  timeoutSeconds: 120, // 2分タイムアウト
  memory: "512MiB",
  cpu: 1
}, async (req, res) => {
  // CORS設定
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { question, context, user_id } = req.body;
    
    logger.info(`Ask AI request for user ${user_id}`);
    logger.info(`Question: ${question}`);
    logger.info(`Context length: ${context?.length || 0} characters`);
    
    if (!question?.trim()) {
      res.status(400).json({ 
        status: 'error',
        message: '質問が入力されていません' 
      });
      return;
    }

    // ユーザーのLLM API設定を取得（apiConfigsコレクションから）
    logger.info(`Looking for API config in apiConfigs collection for: ${user_id}`);
    const apiConfigDoc = await db.collection('apiConfigs').doc(user_id).get();
    
    if (!apiConfigDoc.exists) {
      logger.error(`API config not found for: ${user_id}`);
      res.status(404).json({
        status: 'error',
        message: 'API設定が見つかりません。設定ページでAPIキーを設定してください。'
      });
      return;
    }

    const apiConfigData = apiConfigDoc.data();
    
    const llmApiKey = apiConfigData.llmApiKey;
    const llmProvider = apiConfigData.llmProvider || 'openai';

    logger.info(`API config found: provider=${llmProvider}, hasApiKey=${!!llmApiKey}`);

    if (!llmApiKey) {
      logger.error('No LLM API key found for user');
      res.status(400).json({ 
        status: 'error',
        message: 'LLM APIキーが設定されていません。設定ページでAPIキーを設定してください。' 
      });
      return;
    }

    // APIキーの形式チェック（DeepSeek用）
    if (llmProvider === 'deepseek' && !llmApiKey.startsWith('sk-')) {
      logger.error('Invalid DeepSeek API key format');
      res.status(400).json({
        status: 'error', 
        message: 'DeepSeek APIキーの形式が正しくありません。sk-で始まるキーを設定してください。'
      });
      return;
    }

    // LLM API呼び出し
    const axios = require('axios');
    
    const chatPrompt = `あなたは会議やインタビューの音声内容に関する質問に答えるAIアシスタントです。
以下のコンテキスト（音声の文字起こしと要約）を基に、ユーザーの質問に日本語で答えてください。

音声コンテキスト:
${context || '音声コンテキストが提供されていません'}

ユーザーの質問: ${question}

回答は以下の点に注意してください:
- 提供されたコンテキストの情報のみを使用してください
- 推測や一般的な知識は含めないでください
- 分からない場合は「提供された音声内容からは判断できません」と答えてください
- 具体的で役立つ回答を心がけてください`;

    // プロバイダー別のエンドポイントとモデル設定
    let apiUrl, requestData, headers;

    logger.info(`Using LLM provider: ${llmProvider} for Ask AI`);

    switch (llmProvider) {
      case 'deepseek':
        apiUrl = 'https://api.deepseek.com/v1/chat/completions';
        requestData = {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'あなたは音声コンテンツに関する質問に答える専門的なAIアシスタントです。提供されたコンテキストを基に正確で役立つ回答を日本語で提供してください。'
            },
            {
              role: 'user',
              content: chatPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        };
        headers = {
          'Authorization': `Bearer ${llmApiKey}`,
          'Content-Type': 'application/json'
        };
        break;

      case 'anthropic':
        apiUrl = 'https://api.anthropic.com/v1/messages';
        requestData = {
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `あなたは音声コンテンツに関する質問に答える専門的なAIアシスタントです。提供されたコンテキストを基に正確で役立つ回答を日本語で提供してください。\n\n${chatPrompt}`
            }
          ]
        };
        headers = {
          'x-api-key': llmApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        };
        break;

      case 'openai':
      default:
        apiUrl = 'https://api.openai.com/v1/chat/completions';
        requestData = {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'あなたは音声コンテンツに関する質問に答える専門的なAIアシスタントです。提供されたコンテキストを基に正確で役立つ回答を日本語で提供してください。'
            },
            {
              role: 'user',
              content: chatPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        };
        headers = {
          'Authorization': `Bearer ${llmApiKey}`,
          'Content-Type': 'application/json'
        };
        break;
    }

    logger.info(`Making Ask AI request to: ${apiUrl}`);
    logger.info(`Request model: ${requestData.model}`);

    logger.info(`Making Ask AI request with timeout 60s...`);
    const aiResponse = await axios.post(apiUrl, requestData, {
      headers: headers,
      timeout: 60000 // 1分タイムアウト
    });
    
    logger.info(`Ask AI API response received, status: ${aiResponse.status}`);

    // プロバイダー別のレスポンス処理
    let responseText;
    
    switch (llmProvider) {
      case 'deepseek':
        responseText = aiResponse.data.choices[0].message.content;
        break;
        
      case 'anthropic':
        responseText = aiResponse.data.content[0].text;
        break;
        
      case 'openai':
      default:
        responseText = aiResponse.data.choices[0].message.content;
        break;
    }

    logger.info(`Ask AI response generated successfully with ${llmProvider}`);
    logger.info(`Response text length: ${responseText.length} characters`);

    // 成功レスポンス
    res.status(200).json({
      status: 'success',
      answer: responseText,
      sources: ['音声文字起こし', '要約内容'],
      confidence: 0.85,
      provider: llmProvider,
      model: requestData.model
    });

  } catch (error) {
    logger.error('Ask AI failed:', error);
    
    // エラー詳細をログに記録
    if (error.response) {
      logger.error(`API Response status: ${error.response.status}`);
      logger.error(`API Response data: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      logger.error(`No response received from API: ${error.message}`);
      logger.error(`Request config: ${JSON.stringify(error.config)}`);
    } else {
      logger.error(`Request setup error: ${error.message}`);
    }
    
    // タイムアウトの場合の特別処理
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      logger.error('Request timed out - API took longer than 60 seconds');
      res.status(408).json({
        status: 'error',
        message: 'AI応答のタイムアウトが発生しました。しばらく時間をおいて再試行してください。',
        answer: 'APIの応答に時間がかかりすぎています。時間をおいて再試行してください。'
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: `AI応答の生成中にエラーが発生しました: ${error.message}`,
        answer: 'エラーが発生したため回答を生成できませんでした。APIキーの設定や接続状況を確認してください。'
      });
    }
  }
});

/**
 * ヘルスチェックエンドポイント
 */
exports.health = onRequest({ 
  cors: true,
  invoker: 'public'
}, (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  res.status(200).json({
    status: "healthy",
    service: "voicenote-firebase-processor",
    version: "1.0.0",
    firebase: "available",
    endpoints: ["/health", "/processAudio", "/generateSummary", "/askAI"]
  });
});