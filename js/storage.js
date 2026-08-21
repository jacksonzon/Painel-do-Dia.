// js/storage.js
export class LocalStorageDB {
  constructor() {
    this.dbName = 'PainelDiaDB';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pending_sync')) {
          db.createObjectStore('pending_sync', { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this);
      };

      request.onerror = (e) => reject(e);
    });
  }

  async put(storeName, data) {
    const tx = this.db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(data);
    return tx.complete;
  }

  async getAll(storeName) {
    return new Promise((resolve) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
    });
  }

  async delete(storeName, id) {
    const tx = this.db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    return tx.complete;
  }
}