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

  // Elementos da DOM
  const taskForm = document.getElementById('create-task-form');
  const taskInput = document.getElementById('task-title-input');
  const tasksContainer = document.getElementById('tasks-container');

  // Função para renderizar tarefas na tela
  async function renderTasks() {
    const tasks = await localDb.getAll('tasks');
    if (!tasks || tasks.length === 0) {
      tasksContainer.innerHTML = '<div class="task-card"><span>Nenhuma tarefa cadastrada. Adicione uma acima!</span></div>';
      return;
    }

    tasksContainer.innerHTML = tasks.map(task => `
      <div class="task-card" id="task-${task.id}">
        <span>${task.title}</span>
        <button onclick="window.deleteTask('${task.id}')" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Excluir</button>
      </div>
    `).join('');
  }

  // Manipular criação de novas tarefas
  if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = taskInput.value.trim();
      if (!title) return;

      const newTask = {
        id: crypto.randomUUID(),
        title: title,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // Salva localmente e coloca na fila de sync
      await localDb.put('tasks', newTask);
      await localDb.put('pending_sync', { action: 'UPSERT', data: newTask });

      taskInput.value = '';
      await renderTasks();
      syncService.processQueue();
    });
  }

  // Exposição global para deletar tarefa
  window.deleteTask = async (id) => {
    await localDb.delete('tasks', id);
    await localDb.put('pending_sync', { action: 'DELETE', data: { id } });
    await renderTasks();
    syncService.processQueue();
  };

  // Carregamento inicial
  renderTasks();
});
