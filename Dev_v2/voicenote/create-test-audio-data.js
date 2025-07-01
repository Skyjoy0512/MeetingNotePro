// Firebase Admin SDK を使ってテスト用音声データを作成
const https = require('https');

const FIREBASE_API_KEY = 'AIzaSyBxOQjfgdQHY7ak06TGMNm8egw5Q2OrIqU';
const TEST_USER_UID = 'FN6nqfpPm1QypewehpoHOTsOiE62'; // 作成したテストユーザーのUID

// Firestore REST API で音声データを作成
function createTestAudioData() {
  const testAudioData = {
    fields: {
      fileName: { stringValue: 'テスト会議録音.mp3' },
      fileUrl: { stringValue: 'https://example.com/test-audio.mp3' },
      duration: { integerValue: '300' },
      status: { stringValue: 'completed' },
      createdAt: { timestampValue: new Date().toISOString() },
      updatedAt: { timestampValue: new Date().toISOString() },
      transcription: {
        mapValue: {
          fields: {
            speakers: {
              arrayValue: {
                values: [
                  { mapValue: { fields: { id: { stringValue: 'user' }, name: { stringValue: 'あなた' } } } },
                  { mapValue: { fields: { id: { stringValue: 'speaker1' }, name: { stringValue: 'Aさん' } } } }
                ]
              }
            },
            segments: {
              arrayValue: {
                values: [
                  {
                    mapValue: {
                      fields: {
                        speaker: { stringValue: 'あなた' },
                        start: { doubleValue: 0 },
                        end: { doubleValue: 10 },
                        text: { stringValue: 'こんにちは、今日の会議を始めます。' }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      summary: {
        mapValue: {
          fields: {
            overall: { stringValue: 'テスト会議の要約です。' },
            keyPoints: {
              arrayValue: {
                values: [
                  { stringValue: '会議開始の挨拶' }
                ]
              }
            },
            actionItems: {
              arrayValue: {
                values: [
                  { stringValue: 'テストアクション' }
                ]
              }
            }
          }
        }
      }
    }
  };

  const postData = JSON.stringify(testAudioData);

  const options = {
    hostname: 'firestore.googleapis.com',
    port: 443,
    path: `/v1/projects/voicenote-dev/databases/(default)/documents/audios/${TEST_USER_UID}/files?key=${FIREBASE_API_KEY}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('🔧 Creating test audio data via Firestore REST API...');

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        
        if (res.statusCode === 200) {
          console.log('✅ Test audio data created successfully!');
          console.log('📄 Document name:', response.name);
          console.log('📊 Created at:', response.createTime);
        } else {
          console.log('❌ Failed to create audio data:');
          console.log('Status:', res.statusCode);
          console.log('Response:', JSON.stringify(response, null, 2));
        }
      } catch (error) {
        console.log('❌ Failed to parse response:', error.message);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Request error:', e.message);
  });

  req.write(postData);
  req.end();
}

// 追加で、問題のあるデータ（speakers が undefined の状態）も作成
function createProblematicAudioData() {
  const problematicData = {
    fields: {
      fileName: { stringValue: 'エラーテスト音声.mp3' },
      fileUrl: { stringValue: 'https://example.com/error-test.mp3' },
      duration: { integerValue: '180' },
      status: { stringValue: 'completed' },
      createdAt: { timestampValue: new Date().toISOString() },
      updatedAt: { timestampValue: new Date().toISOString() },
      transcription: {
        mapValue: {
          fields: {
            // speakers を意図的に undefined にする
            segments: {
              arrayValue: {
                values: [
                  {
                    mapValue: {
                      fields: {
                        speaker: { stringValue: 'テストユーザー' },
                        start: { doubleValue: 0 },
                        end: { doubleValue: 5 },
                        text: { stringValue: 'これはエラーテスト用の音声です。' }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    }
  };

  const postData = JSON.stringify(problematicData);

  const options = {
    hostname: 'firestore.googleapis.com',
    port: 443,
    path: `/v1/projects/voicenote-dev/databases/(default)/documents/audios/${TEST_USER_UID}/files?key=${FIREBASE_API_KEY}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('🚨 Creating problematic audio data (for error testing)...');

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        
        if (res.statusCode === 200) {
          console.log('✅ Problematic audio data created for testing!');
          console.log('📄 Document name:', response.name);
        } else {
          console.log('❌ Failed to create problematic data:', response);
        }
      } catch (error) {
        console.log('❌ Failed to parse response:', error.message);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Request error:', e.message);
  });

  req.write(postData);
  req.end();
}

// 両方のデータを作成
createTestAudioData();

setTimeout(() => {
  createProblematicAudioData();
}, 2000);