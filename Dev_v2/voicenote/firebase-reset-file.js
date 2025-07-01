const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./voicenote-dev-firebase-adminsdk-y2yxf-17e2b36ad7.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'voicenote-dev.firebasestorage.app'
});

const db = admin.firestore();

async function resetFileStatus() {
  console.log('🔧 Resetting file status for testing ReadableStream fix');
  
  const userId = "GKRsua4TbbbzRJvJgCKRHl1waq52";
  const audioId = "FQBRLxmb0QnuGugYkhX4";
  
  try {
    console.log(`📝 Resetting file ${audioId} for user ${userId}`);
    
    await db.collection('audios')
            .doc(userId)
            .collection('files')
            .doc(audioId)
            .update({
              status: 'uploaded',
              processingProgress: 0,
              transcription: admin.firestore.FieldValue.delete(),
              summary: admin.firestore.FieldValue.delete(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
    
    console.log('✅ File status reset successfully');
    console.log('🚀 Ready for testing ReadableStream multipart fix');
    
    // Get file info
    const doc = await db.collection('audios')
                       .doc(userId)
                       .collection('files')
                       .doc(audioId)
                       .get();
    
    if (doc.exists) {
      const data = doc.data();
      console.log(`📋 File info: ${data.fileName}, status: ${data.status}`);
    }
    
  } catch (error) {
    console.error('❌ Reset failed:', error.message);
  }
  
  process.exit(0);
}

resetFileStatus();