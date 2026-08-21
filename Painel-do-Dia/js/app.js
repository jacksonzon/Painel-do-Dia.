// js/app.js
import { LocalStorageDB } from './storage.js';
import { SyncService } from '../services/sync-service.js';

document.addEventListener('DOMContentLoaded', async () => {
  const localDb = new LocalStorageDB();
  await localDb.init();

  const syncService = new SyncService(localDb);

  // Monitorar estado da rede
  window.addEventListener('online', () => syncService.processQueue());
  window.addEventListener('offline', () => syncService.updateStatus('🔴 Offline'));

  if (navigator.onLine) {
    syncService.processQueue();
  } else {
    syncService.updateStatus('🔴 Offline');
  }
});