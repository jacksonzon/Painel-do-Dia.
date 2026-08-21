// services/sync-service.js
import { supabase } from './supabase.js';

export class SyncService {
  constructor(db) {
    this.db = db;
    this.isSyncing = false;
    this.deviceId = this.getOrCreateDeviceId();
  }

  getOrCreateDeviceId() {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = 'dev_' + crypto.randomUUID();
      localStorage.setItem('device_id', id);
    }
    return id;
  }

  async processQueue() {
    if (this.isSyncing || !navigator.onLine) return;
    this.isSyncing = true;
    this.updateStatus('🟡 Sincronizando...');

    try {
      const pendingItems = await this.db.getAll('pending_sync');
      for (const item of pendingItems) {
        const { action, data } = item;
        data.device_id = this.deviceId;
        data.updated_at = new Date().toISOString();

        let error = null;
        if (action === 'UPSERT') {
          const { error: err } = await supabase.from('tasks').upsert(data);
          error = err;
        } else if (action === 'DELETE') {
          const { error: err } = await supabase.from('tasks').delete().eq('id', data.id);
          error = err;
        }

        if (!error) {
          await this.db.delete('pending_sync', item.id);
        }
      }
      this.updateStatus('🟢 Sincronizado');
    } catch (err) {
      console.error('Erro no sync:', err);
      this.updateStatus('⚠️ Erro ao sincronizar');
    } finally {
      this.isSyncing = false;
    }
  }

  updateStatus(text) {
    const el = document.getElementById('sync-status-indicator');
    if (el) el.innerText = text;
  }
}