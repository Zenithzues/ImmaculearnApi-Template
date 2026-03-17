import { getLeveldbPersistence, cleanupLeveldbPersistence } from './src/utils/LeveldbPersistence.js';

async function testLeveldbPersistence() {
  try {
    console.log('🧪 Testing LeveldbPersistence...');
    
    // Test getting persistence instance
    const persistence = getLeveldbPersistence();
    console.log('✅ Successfully got LeveldbPersistence instance');
    
    // Test getting a document
    const doc = await persistence.getYDoc('test-room');
    console.log('✅ Successfully got/created Y.Doc');
    
    // Test storing update
    const update = new Uint8Array([1, 2, 3, 4]);
    await persistence.storeUpdate('test-room', update);
    console.log('✅ Successfully stored update');
    
    // Cleanup
    await cleanupLeveldbPersistence();
    console.log('✅ Successfully cleaned up persistence');
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testLeveldbPersistence();
