// Firebase Admin SDK を使わずに、Firebase CLI コマンドを使用
const { exec } = require('child_process');

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function createDemoUser() {
  try {
    console.log('🔧 Creating demo user with Firebase CLI...');
    
    // Firebase CLIでユーザーを作成
    const createUserCommand = `firebase auth:create-user admin@example.com --password admin --display-name "Admin Demo User" --project voicenote-dev`;
    
    try {
      const result = await runCommand(createUserCommand);
      console.log('✅ Demo user created successfully:');
      console.log(result.stdout);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Demo user already exists');
      } else {
        console.error('❌ Error creating user:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createDemoUser();