// js/app.js
import { LocalStorageDB } from './storage.js';
import { SyncService } from '../services/sync-service.js';

document.addEventListener('DOMContentLoaded', async () => {
  const localDb = new LocalStorageDB();
  await localDb.init();

  const syncService = new SyncService(localDb);

  // Status da Rede
  window.addEventListener('online', () => syncService.processQueue());
  window.addEventListener('offline', () => syncService.updateStatus('🔴 Offline'));
  if (navigator.onLine) syncService.processQueue();

  // Elements DOM
  const taskForm = document.getElementById('create-task-form');
  const taskInput = document.getElementById('task-title-input');
  const tasksContainer = document.getElementById('tasks-container');
  const navItems = document.querySelectorAll('.nav-item');

  // --- 1. NAVEGAÇÃO LATERAL ---
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // --- 2. MÉTRICAS E RENDERIZAÇÃO ---
  async function renderTasks() {
    const tasks = (await localDb.getAll('tasks')) || [];
    
    // Atualizar Métricas
    const completed = tasks.filter(t => t.status === 'completed').length;
    const total = tasks.length;
    const metricElem = document.querySelector('.metric-value');
    if (metricElem) metricElem.textContent = `${completed}/${total}`;

    const scoreElem = document.querySelectorAll('.metric-value')[3];
    if (scoreElem) scoreElem.textContent = completed * 10;

    // Renderizar Lista
    if (tasks.length === 0) {
      tasksContainer.innerHTML = '<div style="color: #64748b; font-size: 0.9rem;">Nenhuma tarefa pendente por aqui.</div>';
      return;
    }

    tasksContainer.innerHTML = tasks.map(task => `
      <div class="task-card" style="display:flex; justify-between; align-items:center; padding:10px; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:8px; background:#fff;">
        <span style="text-decoration: ${task.status === 'completed' ? 'line-through' : 'none'}; cursor:pointer;" onclick="window.toggleTask('${task.id}', '${task.status}')">
          ${task.status === 'completed' ? '✅' : '⭕'} ${task.title}
        </span>
        <button onclick="window.deleteTask('${task.id}')" style="background:none; border:none; cursor:pointer; color:#ef4444;">🗑️</button>
      </div>
    `).join('');
  }

  // Action: Criar Tarefa
  if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = taskInput.value.trim();
      if (!title) return;

      const newTask = {
        id: crypto.randomUUID(),
        title,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      await localDb.put('tasks', newTask);
      await localDb.put('pending_sync', { action: 'UPSERT', data: newTask });
      taskInput.value = '';
      await renderTasks();
      syncService.processQueue();
    });
  }

  // Actions Globais: Concluir e Deletar
  window.toggleTask = async (id, currentStatus) => {
    const tasks = await localDb.getAll('tasks');
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.status = currentStatus === 'completed' ? 'pending' : 'completed';
      await localDb.put('tasks', task);
      await localDb.put('pending_sync', { action: 'UPSERT', data: task });
      await renderTasks();
      syncService.processQueue();
    }
  };

  window.deleteTask = async (id) => {
    await localDb.delete('tasks', id);
    await localDb.put('pending_sync', { action: 'DELETE', data: { id } });
    await renderTasks();
    syncService.processQueue();
  };

  // --- 3. MODO FOCO (POMODORO) ---
  let timerInterval = null;
  let timeLeft = 25 * 60;
  const timerDisplay = document.querySelector('.timer');
  const focusBox = document.querySelector('.focus-box');

  if (focusBox && timerDisplay) {
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'margin-top: 10px; display: flex; gap: 8px; justify-content: center;';
    btnContainer.innerHTML = `
      <button id="start-timer" class="btn-action btn-primary" style="padding: 4px 12px; font-size:0.8rem;">Iniciar</button>
      <button id="pause-timer" class="btn-action" style="padding: 4px 12px; font-size:0.8rem;">Pausar</button>
      <button id="reset-timer" class="btn-action" style="padding: 4px 12px; font-size:0.8rem;">Resetar</button>
    `;
    focusBox.appendChild(btnContainer);

    function updateTimerUI() {
      const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
      const seconds = String(timeLeft % 60).padStart(2, '0');
      timerDisplay.textContent = `${minutes}:${seconds}`;
    }

    document.getElementById('start-timer').addEventListener('click', () => {
      if (timerInterval) return;
      timerInterval = setInterval(() => {
        if (timeLeft > 0) {
          timeLeft--;
          updateTimerUI();
        } else {
          clearInterval(timerInterval);
          timerInterval = null;
          alert('Sessão de foco concluída!');
        }
      }, 1000);
    });

    document.getElementById('pause-timer').addEventListener('click', () => {
      clearInterval(timerInterval);
      timerInterval = null;
    });

    document.getElementById('reset-timer').addEventListener('click', () => {
      clearInterval(timerInterval);
      timerInterval = null;
      timeLeft = 25 * 60;
      updateTimerUI();
    });
  }

  // --- 4. IMPORTAR / EXPORTAR BACKUP ---
  const backupBtns = document.querySelectorAll('.btn-backup');
  if (backupBtns.length >= 2) {
    // Exportar
    backupBtns[0].addEventListener('click', async () => {
      const tasks = await localDb.getAll('tasks');
      const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-painel-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
    });

    // Importar
    backupBtns[1].addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async event => {
          try {
            const importedTasks = JSON.parse(event.target.result);
            for (const task of importedTasks) {
              await localDb.put('tasks', task);
            }
            await renderTasks();
            alert('Backup importado com sucesso!');
          } catch (err) {
            alert('Arquivo de backup inválido.');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  // Inicialização
  renderTasks();
});
