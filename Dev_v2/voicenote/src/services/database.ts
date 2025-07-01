import { 
  collection as firestoreCollection,
  doc as firestoreDoc,
  getDoc as firestoreGetDoc,
  getDocs as firestoreGetDocs,
  setDoc as firestoreSetDoc,
  updateDoc as firestoreUpdateDoc,
  deleteDoc as firestoreDeleteDoc,
  query as firestoreQuery,
  where as firestoreWhere,
  orderBy as firestoreOrderBy,
  limit as firestoreLimit,
  onSnapshot as firestoreOnSnapshot,
  Timestamp as firestoreTimestamp,
  writeBatch as firestoreWriteBatch
} from 'firebase/firestore';
import { db, isDemoMode } from '@/lib/firebase';

// デモモード用のモック関数
const createMockFirestoreFunction = (name: string) => {
  return (...args: any[]) => {
    console.log(`🎭 Mock ${name} called with:`, args);
    return {};
  };
};

const createMockPromiseFunction = (name: string, returnValue: any = {}) => {
  return (...args: any[]) => {
    console.log(`🎭 Mock ${name} called with:`, args);
    return Promise.resolve(returnValue);
  };
};

// Firebase関数のラッパー（デモモード対応）
const collection = isDemoMode ? createMockFirestoreFunction('collection') : firestoreCollection;
const doc = isDemoMode ? createMockFirestoreFunction('doc') : firestoreDoc;
const getDoc = isDemoMode ? createMockPromiseFunction('getDoc', { exists: () => false }) : firestoreGetDoc;
const getDocs = isDemoMode ? createMockPromiseFunction('getDocs', { docs: [], size: 0 }) : firestoreGetDocs;
const setDoc = isDemoMode ? createMockPromiseFunction('setDoc') : firestoreSetDoc;
const updateDoc = isDemoMode ? createMockPromiseFunction('updateDoc') : firestoreUpdateDoc;
const deleteDoc = isDemoMode ? createMockPromiseFunction('deleteDoc') : firestoreDeleteDoc;
const query = isDemoMode ? createMockFirestoreFunction('query') : firestoreQuery;
const where = isDemoMode ? createMockFirestoreFunction('where') : firestoreWhere;
const orderBy = isDemoMode ? createMockFirestoreFunction('orderBy') : firestoreOrderBy;
const limit = isDemoMode ? createMockFirestoreFunction('limit') : firestoreLimit;
const onSnapshot = isDemoMode ? createMockFirestoreFunction('onSnapshot') : firestoreOnSnapshot;
const Timestamp = isDemoMode ? { 
  now: () => new Date(), 
  fromDate: (date: Date) => date 
} : firestoreTimestamp;
const writeBatch = isDemoMode ? () => ({
  set: createMockFirestoreFunction('batch.set'),
  update: createMockFirestoreFunction('batch.update'),
  delete: createMockFirestoreFunction('batch.delete'),
  commit: createMockPromiseFunction('batch.commit')
}) : firestoreWriteBatch;
import { AudioFile, UserProfile, LearningAudio, UserEmbedding, ProcessingChunk, ApiSettings } from '@/types';

export class DatabaseService {
  private static instance: DatabaseService;

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // ユーザー関連
  async createUser(userId: string, userData: Partial<UserProfile>): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...userData,
      createdAt: Timestamp.now(),
      learningAudioCount: 0,
      embeddingLastUpdated: null,
      speechApiConfig: {
        provider: 'openai',
        model: 'whisper-1'
      },
      llmApiConfig: {
        provider: 'openai',
        model: 'gpt-4'
      },
      apiUsageStats: {
        speechApiCalls: 0,
        speechTokens: 0,
        speechCost: 0,
        llmApiCalls: 0,
        llmTokens: 0,
        llmCost: 0,
        lastReset: Timestamp.now()
      }
    });
  }

  async getUser(userId: string): Promise<UserProfile | null> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        uid: userId,
        ...data,
        createdAt: data.createdAt.toDate(),
        embeddingLastUpdated: data.embeddingLastUpdated?.toDate() || null,
        apiUsageStats: {
          ...data.apiUsageStats,
          lastReset: data.apiUsageStats.lastReset.toDate()
        }
      } as UserProfile;
    }
    
    return null;
  }

  async updateUser(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, updates);
  }

  // 音声ファイル関連
  async createAudioFile(userId: string, audioData: Omit<AudioFile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const audioRef = doc(collection(db, 'audios', userId, 'files'));
    const audioFile: AudioFile = {
      id: audioRef.id,
      userId,
      ...audioData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await setDoc(audioRef, {
      ...audioFile,
      createdAt: Timestamp.fromDate(audioFile.createdAt),
      updatedAt: Timestamp.fromDate(audioFile.updatedAt)
    });
    
    return audioRef.id;
  }

  async getAudioFiles(userId: string): Promise<AudioFile[]> {
    console.log('🗂️ getAudioFiles called for user:', userId);
    
    // デモモード用のモックデータ
    if (userId === 'demo-user-123') {
      console.log('🎭 Database: Demo getAudioFiles called');
      return [
        {
          id: 'demo-1',
          userId: 'demo-user-123',
          fileName: 'デモ会議録音_2024-07-01.mp3',
          fileUrl: '/demo/meeting1.mp3',
          duration: 1800,
          status: 'completed',
          createdAt: new Date('2024-07-01T10:00:00'),
          updatedAt: new Date('2024-07-01T10:30:00'),
          transcription: {
            text: 'これはデモ用の文字起こし結果です...',
            segments: [
              {
                start: 0,
                end: 5,
                text: 'こんにちは、今日はお忙しい中お時間をいただきありがとうございます。',
                speaker: 'あなた',
                confidence: 0.95
              },
              {
                start: 5,
                end: 12,
                text: 'こちらこそ、よろしくお願いします。早速ですが、今回のプロジェクトについて説明させていただきます。',
                speaker: 'Aさん',
                confidence: 0.92
              }
            ],
            speakers: ['あなた', 'Aさん', 'Bさん'],
            language: 'ja',
            confidence: 0.95,
            processingTime: 300,
            apiProvider: 'openai',
            model: 'whisper-1'
          },
          summary: {
            overall: 'デモ会議では新しいプロジェクトについて議論され、具体的な進行計画と担当者の役割分担が決定されました。',
            speakerSummaries: {
              'あなた': '会議の司会を務め、プロジェクトの概要説明を行った。',
              'Aさん': 'プロジェクトの詳細な技術仕様について説明した。',
              'Bさん': 'スケジュールと予算についての質問を行った。'
            },
            keyPoints: [
              'プロジェクト開始日は来月の第一週',
              '予算は前回提案から20%削減',
              '開発チームは5名体制で進行'
            ],
            actionItems: [
              '来週までに詳細な要件定義書を作成（Aさん担当）',
              '予算の最終承認を取得（あなた担当）',
              'チームメンバーのアサインを完了（Bさん担当）'
            ],
            topics: ['プロジェクト計画', '予算調整', 'チーム編成'],
            apiProvider: 'openai',
            model: 'gpt-4',
            generatedAt: new Date()
          },
          askAIChats: [
            {
              id: 'demo-chat-1',
              question: 'この会議の重要な決定事項は何ですか？',
              answer: '主な決定事項は以下の通りです：\n1. プロジェクト開始日を来月第一週に設定\n2. 予算を前回提案から20%削減\n3. 開発チーム5名体制で進行することを決定',
              timestamp: new Date('2024-07-01T11:00:00')
            }
          ]
        },
        {
          id: 'demo-2',
          userId: 'demo-user-123',
          fileName: 'デモインタビュー音声.wav',
          fileUrl: '/demo/interview.wav',
          duration: 3600,
          status: 'transcribing',
          createdAt: new Date('2024-07-01T09:00:00'),
          updatedAt: new Date('2024-07-01T11:30:00'),
          totalChunks: 4,
          processedChunks: 2,
          processingProgress: 50
        }
      ];
    }
    
    const audioQuery = query(
      collection(db, 'audios', userId, 'files'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const querySnapshot = await getDocs(audioQuery);
    console.log('🗂️ Query snapshot size:', querySnapshot.size);
    
    const files = querySnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('🗂️ Document:', {
        docId: doc.id,
        dataId: data.id,
        fileName: data.fileName,
        match: doc.id === data.id
      });
      
      const audioFile = {
        ...data,
        id: doc.id, // Document IDを確実に使用
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      };

      // データ構造の安全性チェック
      if (audioFile.transcription && audioFile.transcription.speakers && !Array.isArray(audioFile.transcription.speakers)) {
        console.warn('🚨 Invalid speakers data type:', typeof audioFile.transcription.speakers, audioFile.transcription.speakers);
        audioFile.transcription.speakers = [];
      }

      console.log('🗂️ Audio file data check:', {
        id: audioFile.id,
        hasTranscription: !!audioFile.transcription,
        hasSpeakers: !!audioFile.transcription?.speakers,
        speakersType: typeof audioFile.transcription?.speakers,
        speakersIsArray: Array.isArray(audioFile.transcription?.speakers),
        speakersLength: audioFile.transcription?.speakers?.length
      });

      return audioFile;
    }) as AudioFile[];
    
    console.log('🗂️ Processed files:', files.map(f => ({ id: f.id, fileName: f.fileName })));
    return files;
  }

  // 個別の音声ファイル取得
  async getAudioFile(userId: string, audioId: string): Promise<AudioFile | null> {
    console.log('🔍 DatabaseService.getAudioFile called with:', { userId, audioId });
    
    // デモモード用のモックデータ
    if (userId === 'demo-user-123') {
      console.log('🎭 Database: Demo getAudioFile called for:', audioId);
      
      if (audioId === 'demo-1') {
        return {
          id: 'demo-1',
          userId: 'demo-user-123',
          fileName: 'デモ会議録音_2024-07-01.mp3',
          fileUrl: '/demo/meeting1.mp3',
          duration: 1800,
          status: 'completed',
          createdAt: new Date('2024-07-01T10:00:00'),
          updatedAt: new Date('2024-07-01T10:30:00'),
          transcription: {
            text: 'これはデモ用の文字起こし結果です...',
            segments: [
              {
                start: 0,
                end: 5,
                text: 'こんにちは、今日はお忙しい中お時間をいただきありがとうございます。',
                speaker: 'あなた',
                confidence: 0.95
              },
              {
                start: 5,
                end: 12,
                text: 'こちらこそ、よろしくお願いします。早速ですが、今回のプロジェクトについて説明させていただきます。',
                speaker: 'Aさん',
                confidence: 0.92
              }
            ],
            speakers: ['あなた', 'Aさん', 'Bさん'],
            language: 'ja',
            confidence: 0.95,
            processingTime: 300,
            apiProvider: 'openai',
            model: 'whisper-1'
          },
          summary: {
            overall: 'デモ会議では新しいプロジェクトについて議論され、具体的な進行計画と担当者の役割分担が決定されました。',
            speakerSummaries: {
              'あなた': '会議の司会を務め、プロジェクトの概要説明を行った。',
              'Aさん': 'プロジェクトの詳細な技術仕様について説明した。',
              'Bさん': 'スケジュールと予算についての質問を行った。'
            },
            keyPoints: [
              'プロジェクト開始日は来月の第一週',
              '予算は前回提案から20%削減',
              '開発チームは5名体制で進行'
            ],
            actionItems: [
              '来週までに詳細な要件定義書を作成（Aさん担当）',
              '予算の最終承認を取得（あなた担当）',
              'チームメンバーのアサインを完了（Bさん担当）'
            ],
            topics: ['プロジェクト計画', '予算調整', 'チーム編成'],
            apiProvider: 'openai',
            model: 'gpt-4',
            generatedAt: new Date()
          },
          askAIChats: [
            {
              id: 'demo-chat-1',
              question: 'この会議の重要な決定事項は何ですか？',
              answer: '主な決定事項は以下の通りです：\n1. プロジェクト開始日を来月第一週に設定\n2. 予算を前回提案から20%削減\n3. 開発チーム5名体制で進行することを決定',
              timestamp: new Date('2024-07-01T11:00:00')
            }
          ]
        };
      } else if (audioId === 'demo-2') {
        return {
          id: 'demo-2',
          userId: 'demo-user-123',
          fileName: 'デモインタビュー音声.wav',
          fileUrl: '/demo/interview.wav',
          duration: 3600,
          status: 'transcribing',
          createdAt: new Date('2024-07-01T09:00:00'),
          updatedAt: new Date('2024-07-01T11:30:00'),
          totalChunks: 4,
          processedChunks: 2,
          processingProgress: 50
        };
      }
      
      return null;
    }
    
    console.log('🔍 Building document path:', `audios/${userId}/files/${audioId}`);
    
    const audioRef = doc(db, 'audios', userId, 'files', audioId);
    console.log('🔍 Document reference:', audioRef.path);
    
    try {
      const audioSnap = await getDoc(audioRef);
      console.log('🔍 Document exists:', audioSnap.exists());
      
      if (audioSnap.exists()) {
        const data = audioSnap.data();
        console.log('🔍 Document data:', data);
        
        const audioFile = {
          ...data,
          id: audioSnap.id, // Document IDを使用して確実に一致させる
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        } as AudioFile;
        
        console.log('🔍 Processed audio file:', audioFile);
        return audioFile;
      } else {
        console.log('🔍 Document does not exist, searching by fileName...');
        
        // Document IDで見つからない場合、ファイル名で検索を試行
        return await this.findAudioFileByName(userId, audioId);
      }
    } catch (error) {
      console.error('🔍 Error getting document:', error);
      throw error;
    }
  }

  // ファイル名または部分マッチでの検索（フォールバック機能）
  private async findAudioFileByName(userId: string, searchTerm: string): Promise<AudioFile | null> {
    console.log('🔍 Searching by filename:', searchTerm);
    
    try {
      const audioQuery = query(collection(db, 'audios', userId, 'files'));
      const querySnapshot = await getDocs(audioQuery);
      
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        console.log('🔍 Checking document:', { docId: docSnap.id, fileName: data.fileName });
        
        // Document IDまたはファイル名でマッチを試行
        if (docSnap.id === searchTerm || 
            data.fileName?.includes(searchTerm) ||
            data.id === searchTerm) {
          console.log('🔍 Found match:', docSnap.id);
          
          return {
            ...data,
            id: docSnap.id, // Document IDを使用
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate()
          } as AudioFile;
        }
      }
      
      console.log('🔍 No match found');
      return null;
    } catch (error) {
      console.error('🔍 Error in fallback search:', error);
      return null;
    }
  }

  async updateAudioFile(userId: string, audioId: string, updates: Partial<AudioFile>): Promise<void> {
    const audioRef = doc(db, 'audios', userId, 'files', audioId);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    };
    
    await updateDoc(audioRef, updateData);
  }

  async deleteAudioFile(userId: string, audioId: string): Promise<void> {
    const audioRef = doc(db, 'audios', userId, 'files', audioId);
    await deleteDoc(audioRef);
  }

  // リアルタイム監視
  subscribeToAudioFiles(userId: string, callback: (audioFiles: AudioFile[]) => void): () => void {
    const audioQuery = query(
      collection(db, 'audios', userId, 'files'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    return onSnapshot(audioQuery, (snapshot) => {
      const audioFiles = snapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as AudioFile[];
      
      callback(audioFiles);
    });
  }

  subscribeToAudioFile(userId: string, audioId: string, callback: (audioFile: AudioFile | null) => void): () => void {
    const audioRef = doc(db, 'audios', userId, 'files', audioId);
    
    return onSnapshot(audioRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const audioFile = {
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        } as AudioFile;
        callback(audioFile);
      } else {
        callback(null);
      }
    });
  }

  // 学習音声関連
  async createLearningAudio(userId: string, learningData: Omit<LearningAudio, 'id' | 'userId' | 'createdAt'>): Promise<string> {
    const learningRef = doc(collection(db, 'learningAudios', userId, 'audios'));
    const learningAudio: LearningAudio = {
      id: learningRef.id,
      userId,
      ...learningData,
      createdAt: new Date()
    };
    
    await setDoc(learningRef, {
      ...learningAudio,
      createdAt: Timestamp.fromDate(learningAudio.createdAt)
    });
    
    return learningRef.id;
  }

  async getLearningAudios(userId: string): Promise<LearningAudio[]> {
    const learningQuery = query(
      collection(db, 'learningAudios', userId, 'audios'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(learningQuery);
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    })) as LearningAudio[];
  }

  // ユーザーエンベディング関連
  async saveUserEmbedding(userId: string, embedding: UserEmbedding): Promise<void> {
    const embeddingRef = doc(db, 'userEmbeddings', userId);
    await setDoc(embeddingRef, {
      ...embedding,
      lastUpdated: Timestamp.fromDate(embedding.lastUpdated)
    });
  }

  async getUserEmbedding(userId: string): Promise<UserEmbedding | null> {
    const embeddingRef = doc(db, 'userEmbeddings', userId);
    const embeddingSnap = await getDoc(embeddingRef);
    
    if (embeddingSnap.exists()) {
      const data = embeddingSnap.data();
      return {
        ...data,
        lastUpdated: data.lastUpdated.toDate()
      } as UserEmbedding;
    }
    
    return null;
  }

  // 処理チャンク関連
  async saveProcessingChunks(audioId: string, chunks: ProcessingChunk[]): Promise<void> {
    const batch = writeBatch(db);
    
    chunks.forEach(chunk => {
      const chunkRef = doc(db, 'processingChunks', audioId, 'chunks', chunk.id);
      batch.set(chunkRef, chunk);
    });
    
    await batch.commit();
  }

  async getProcessingChunks(audioId: string): Promise<ProcessingChunk[]> {
    const chunksQuery = query(
      collection(db, 'processingChunks', audioId, 'chunks'),
      orderBy('chunkIndex', 'asc')
    );
    
    const querySnapshot = await getDocs(chunksQuery);
    return querySnapshot.docs.map(doc => doc.data()) as ProcessingChunk[];
  }

  // API使用量統計更新
  async updateApiUsage(userId: string, usageUpdate: {
    speechApiCalls?: number;
    speechTokens?: number;
    speechCost?: number;
    llmApiCalls?: number;
    llmTokens?: number;
    llmCost?: number;
  }): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const usageRef = doc(db, 'apiUsage', userId, 'daily', today);
    
    // 既存の使用量を取得
    const usageSnap = await getDoc(usageRef);
    const currentUsage = usageSnap.exists() ? usageSnap.data() : {
      speechApiCalls: 0,
      speechTokens: 0,
      speechCost: 0,
      llmApiCalls: 0,
      llmTokens: 0,
      llmCost: 0
    };
    
    // 使用量を加算
    const updatedUsage = {
      speechApiCalls: currentUsage.speechApiCalls + (usageUpdate.speechApiCalls || 0),
      speechTokens: currentUsage.speechTokens + (usageUpdate.speechTokens || 0),
      speechCost: currentUsage.speechCost + (usageUpdate.speechCost || 0),
      llmApiCalls: currentUsage.llmApiCalls + (usageUpdate.llmApiCalls || 0),
      llmTokens: currentUsage.llmTokens + (usageUpdate.llmTokens || 0),
      llmCost: currentUsage.llmCost + (usageUpdate.llmCost || 0),
      date: today,
      updatedAt: Timestamp.now()
    };
    
    await setDoc(usageRef, updatedUsage);
  }

  // API設定関連
  async getAPIConfig(userId: string): Promise<ApiSettings | null> {
    return await this.getApiSettings(userId);
  }

  async saveAPIConfig(userId: string, settings: ApiSettings): Promise<void> {
    return await this.saveApiSettings(userId, settings);
  }

  async saveApiSettings(userId: string, settings: ApiSettings): Promise<void> {
    console.log('💾 Database: Saving API settings for user:', userId);
    
    const settingsRef = doc(db, 'apiConfigs', userId);
    await setDoc(settingsRef, {
      ...settings,
      updatedAt: Timestamp.fromDate(settings.updatedAt || new Date())
    });
  }

  async getApiSettings(userId: string): Promise<ApiSettings | null> {
    console.log('🔍 Database: Getting API settings for user:', userId);
    
    const settingsRef = doc(db, 'apiConfigs', userId);
    const settingsSnap = await getDoc(settingsRef);
    
    if (settingsSnap.exists()) {
      const data = settingsSnap.data();
      console.log('✅ Database: API settings found');
      return {
        ...data,
        updatedAt: data.updatedAt.toDate()
      } as ApiSettings;
    }
    
    console.log('⚠️ Database: No API settings found');
    return null;
  }

  // 古いデータのクリーンアップ（30日経過）
  async cleanupOldData(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // 30日以上前の音声ファイルを削除（実装はバックエンドで行う）
    console.log('Cleanup scheduled for data older than:', thirtyDaysAgo);
  }
}

export const databaseService = DatabaseService.getInstance();

// 個別関数のexport（互換性のため）
export const saveApiSettings = (userId: string, settings: ApiSettings) =>
  databaseService.saveApiSettings(userId, settings);

export const getApiSettings = (userId: string) =>
  databaseService.getApiSettings(userId);