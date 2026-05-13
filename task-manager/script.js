/* ───── State ───── */
let tasks = JSON.parse(localStorage.getItem('taskflow_tasks')) || [];
let currentFilter = 'all';
let searchQuery = '';
let editId = null;
let dragId = null;

/* ───── Persist ───── */
const save = () => localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));

/* ───── Toast ───── */
function showToast(message, emoji = '✅') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${emoji}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 2800);
}

/* ───── Stats & Progress ───── */
function updateStats() {
  const total     = tasks.length;
  const done      = tasks.filter(t => t.completed).length;
  const active    = total - done;
  const pct       = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById('statTotal').textContent   = total;
  document.getElementById('statActive').textContent  = active;
  document.getElementById('statDone').textContent    = done;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressPct').textContent  = pct + '%';

  document.getElementById('badgeAll').textContent      = total;
  document.getElementById('badgeActive').textContent   = active;
  document.getElementById('badgeDone').textContent     = done;

  const remaining = active;
  document.getElementById('footerCount').textContent =
    remaining === 0 ? 'All done! 🎉' : `${remaining} task${remaining !== 1 ? 's' : ''} remaining`;
}

/* ───── Due date display ───── */
function formatDue(dateStr) {
  if (!dateStr) return null;
  const due   = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff  = Math.round((due - today) / 86400000);

  if (diff < 0)  return { text: `Overdue by ${Math.abs(diff)}d`, overdue: true };
  if (diff === 0) return { text: 'Due today', overdue: false };
  if (diff === 1) return { text: 'Due tomorrow', overdue: false };
  return { text: `Due ${due.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`, overdue: false };
}

/* ───── Render ───── */
function render() {
  const taskList = document.getElementById('taskList');
  const emptyState = document.getElementById('emptyState');
  taskList.innerHTML = '';

  let list = [...tasks];

  if (currentFilter === 'active')    list = list.filter(t => !t.completed);
  if (currentFilter === 'completed') list = list.filter(t => t.completed);

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.desc && t.desc.toLowerCase().includes(q))
    );
  }

  if (list.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    list.forEach(task => taskList.appendChild(buildTaskEl(task)));
  }

  updateStats();
}

/* ───── Build Task Element ───── */
function buildTaskEl(task) {
  const div = document.createElement('div');
  div.className = `task priority-${task.priority} ${task.completed ? 'completed' : ''}`;
  div.dataset.id = task.id;
  div.draggable = true;

  const due = formatDue(task.due);
  const checkMark = task.completed ? '✓' : '';

  div.innerHTML = `
    <div class="task-header">
      <button class="task-checkbox" data-action="toggle" title="Toggle complete">${checkMark}</button>
      <div class="task-body">
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.desc ? `<div class="task-desc">${escapeHtml(task.desc)}</div>` : ''}
      </div>
    </div>
    <div class="task-meta">
      <span class="priority-badge ${task.priority}">${task.priority}</span>
      ${due ? `<span class="due-tag ${due.overdue ? 'overdue' : ''}">📅 ${due.text}</span>` : ''}
      <span class="created-tag">${task.createdAt}</span>
    </div>
    <div class="task-actions">
      <button data-action="toggle">${task.completed ? '↩ Undo' : '✓ Done'}</button>
      <button data-action="edit">✎ Edit</button>
      <button data-action="delete" class="del-btn">🗑 Delete</button>
    </div>
  `;

  /* Drag events */
  div.addEventListener('dragstart', () => {
    dragId = task.id;
    setTimeout(() => div.classList.add('dragging'), 0);
  });
  div.addEventListener('dragend', () => {
    div.classList.remove('dragging');
    document.querySelectorAll('.task').forEach(el => el.classList.remove('drag-over'));
  });
  div.addEventListener('dragover', e => {
    e.preventDefault();
    document.querySelectorAll('.task').forEach(el => el.classList.remove('drag-over'));
    if (task.id !== dragId) div.classList.add('drag-over');
  });
  div.addEventListener('drop', e => {
    e.preventDefault();
    div.classList.remove('drag-over');
    if (!dragId || dragId === task.id) return;
    const from = tasks.findIndex(t => t.id === dragId);
    const to   = tasks.findIndex(t => t.id === task.id);
    const [moved] = tasks.splice(from, 1);
    tasks.splice(to, 0, moved);
    save();
    render();
  });

  return div;
}

/* ───── Escape HTML ───── */
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ───── Add Task ───── */
document.getElementById('taskForm').addEventListener('submit', e => {
  e.preventDefault();
  const title = document.getElementById('title').value.trim();
  const desc  = document.getElementById('description').value.trim();
  const priority = document.getElementById('priority').value;
  const due   = document.getElementById('dueDate').value;
  if (!title) return;

  tasks.unshift({
    id: Date.now(),
    title,
    desc,
    priority,
    due,
    completed: false,
    createdAt: new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
  });

  save();
  render();
  e.target.reset();
  showToast('Task added!', '📝');
});

/* ───── Task Actions (delegated) ───── */
document.getElementById('taskList').addEventListener('click', e => {
  const taskEl = e.target.closest('.task');
  if (!taskEl) return;

  const id     = Number(taskEl.dataset.id);
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (!action) return;

  if (action === 'toggle') {
    const task = tasks.find(t => t.id === id);
    tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    save();
    render();
    showToast(task.completed ? 'Marked active' : 'Task completed! 🎉', task.completed ? '↩' : '✅');
    return;
  }

  if (action === 'delete') {
    const task = tasks.find(t => t.id === id);
    tasks = tasks.filter(t => t.id !== id);
    save();
    render();
    showToast(`"${task.title.slice(0, 28)}" deleted`, '🗑');
    return;
  }

  if (action === 'edit') {
    const task = tasks.find(t => t.id === id);
    editId = id;
    document.getElementById('editTitle').value    = task.title;
    document.getElementById('editDesc').value     = task.desc || '';
    document.getElementById('editPriority').value = task.priority;
    document.getElementById('editDue').value      = task.due || '';
    openModal();
    return;
  }
});

/* ───── Modal ───── */
function openModal() {
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('editTitle').focus();
}
function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  editId = null;
}

document.getElementById('saveEdit').onclick = () => {
  if (!editId) return;
  const title = document.getElementById('editTitle').value.trim();
  if (!title) return;

  tasks = tasks.map(t => t.id === editId ? {
    ...t,
    title,
    desc:     document.getElementById('editDesc').value.trim(),
    priority: document.getElementById('editPriority').value,
    due:      document.getElementById('editDue').value,
  } : t);

  save();
  render();
  closeModal();
  showToast('Task updated!', '✏️');
};

document.getElementById('closeModal').onclick     = closeModal;
document.getElementById('cancelEdit').onclick     = closeModal;
document.getElementById('modalBackdrop').onclick  = closeModal;

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

/* ───── Filters ───── */
document.querySelectorAll('.filters button').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.filters button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  };
});

/* ───── Search ───── */
document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value.trim();
  render();
});

/* ───── Clear Completed ───── */
document.getElementById('clearCompleted').onclick = () => {
  const count = tasks.filter(t => t.completed).length;
  if (count === 0) { showToast('No completed tasks to clear', 'ℹ️'); return; }
  tasks = tasks.filter(t => !t.completed);
  save();
  render();
  showToast(`${count} completed task${count !== 1 ? 's' : ''} cleared`, '🧹');
};

/* ───── Theme Toggle ───── */
const html = document.documentElement;
const savedTheme = localStorage.getItem('taskflow_theme') || 'dark';
html.setAttribute('data-theme', savedTheme);
document.getElementById('themeIcon').textContent = savedTheme === 'dark' ? '🌙' : '☀️';

document.getElementById('toggleTheme').onclick = () => {
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  document.getElementById('themeIcon').textContent = next === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('taskflow_theme', next);
};

/* ───── Init ───── */
render();
