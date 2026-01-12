import * as Y from 'yjs';
import { Level } from 'level';
import { encodeStateAsUpdate, applyUpdate } from 'yjs';

export class YdocPersistence {
  /**
   * @param {string} dirPath Path to store LevelDB data
   */
  constructor(dirPath) {
    this.db = new Level(dirPath, { valueEncoding: 'binary' });
    this.docs = new Map(); // docName -> Y.Doc
  }

  /**
   * Get or create a Y.Doc for the given name
   * @param {string} docName
   * @param {boolean} gc
   * @returns {Y.Doc}
   */
  async getYDoc(docName, gc = true) {
    if (this.docs.has(docName)) return this.docs.get(docName);

    const ydoc = new Y.Doc({ gc });

    try {
      // Load existing updates from LevelDB
      const updates = [];
      for await (const [key, value] of this.db.iterator({ gte: docName + '::', lte: docName + '::\xff' })) {
        updates.push(value);
      }

      // Apply updates to Y.Doc
      for (const update of updates) applyUpdate(ydoc, update);
    } catch (err) {
      // If no data, just start fresh
    }

    // Track this doc
    this.docs.set(docName, ydoc);

    // Auto-save future updates
    ydoc.on('update', async (update) => {
      const key = `${docName}::${Date.now()}::${Math.random()}`;
      await this.db.put(key, update);
    });

    return ydoc;
  }

  /**
   * Bind a doc state to persistence (optional, mostly for y-websocket setup)
   * @param {string} docName
   * @param {Y.Doc} ydoc
   */
  async bindState(docName, ydoc) {
    // Already auto-bound via on('update') above
    this.docs.set(docName, ydoc);
  }

  /**
   * Optionally write full Y.Doc state
   * @param {string} docName
   * @param {Y.Doc} ydoc
   */
  async writeState(docName, ydoc) {
    const update = encodeStateAsUpdate(ydoc);
    const key = `${docName}::full::${Date.now()}`;
    await this.db.put(key, update);
  }
}
