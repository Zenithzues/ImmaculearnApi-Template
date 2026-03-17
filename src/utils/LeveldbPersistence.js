import { LeveldbPersistence } from "y-leveldb";
import path from "path";
import { fileURLToPath } from "url";

// Create a single shared LeveldbPersistence instance
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const levelDBPath = path.join(__dirname, "../../.yjs-leveldb");

let leveldbPersistence = null;

/**
 * Get or create the shared LeveldbPersistence instance
 * @returns {LeveldbPersistence}
 */
export function getLeveldbPersistence() {
  if (!leveldbPersistence) {
    try {
      leveldbPersistence = new LeveldbPersistence(levelDBPath);
      console.log(`🗄️ Shared LeveldbPersistence initialized at ${levelDBPath}`);
    } catch (error) {
      console.error("❌ Failed to initialize LeveldbPersistence:", error);
      throw error;
    }
  }
  return leveldbPersistence;
}

/**
 * Cleanup the shared LeveldbPersistence instance
 */
export async function cleanupLeveldbPersistence() {
  if (leveldbPersistence) {
    try {
      await leveldbPersistence.destroy();
      leveldbPersistence = null;
      console.log("✅ LeveldbPersistence cleaned up");
    } catch (error) {
      console.error("❌ Error cleaning up LeveldbPersistence:", error);
    }
  }
}
