// 全域變數
let currentTaskId = null;
let allTasks = [];
let sortables = [];
let currentFilter = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    loadTasks();
    initSortable();
});

// 獲取所有任務
async function loadTasks() {
    try {
        const response = await fetch('/api/tasks');
        allTasks = await response.json();
        
        updateDashboard(allTasks);
        renderBoard(allTasks);
        
        if (currentFilter) {
            applyFilter(currentFilter);
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// 更新儀表板
function updateDashboard(tasks) {
    const total = tasks.length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const done = tasks.filter(t => t.status === 'done').length;
    
    // 更新統計數字
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statTodo').textContent = todo;
    document.getElementById('statInProgress').textContent = inProgress;
    document.getElementById('statDone').textContent = done;
    
    // 更新百分比
    if (total > 0) {
        document.getElementById('statTodoPercent').textContent = Math.round((todo / total) * 100) + '%';
        document.getElementById('statInProgressPercent').textContent = Math.round((inProgress / total) * 100) + '%';
        document.getElementById('statDonePercent').textContent = Math.round((done / total) * 100) + '%';
    }
    
    // 高優先級任務
    const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'done').slice(0, 3);
    renderHighPriorityTasks(highPriorityTasks);
    
    // 即將到期任務
    const today = new Date();
    const upcomingTasks = tasks
        .filter(t => t.due_date && t.status !== 'done')
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 3);
    renderUpcomingTasks(upcomingTasks);
}

// 渲染高優先級任務
function renderHighPriorityTasks(tasks) {
    const container = document.getElementById('highPriorityTasks');
    if (tasks.length === 0) {
        container.innerHTML = '<p style="color: #999; padding: 20px;">暫無高優先級任務</p>';
        return;
    }
    
    container.innerHTML = tasks.map(task => createTaskCardHTML(task)).join('');
}

// 渲染即將到期任務
function renderUpcomingTasks(tasks) {
    const container = document.getElementById('upcomingTasks');
    if (tasks.length === 0) {
        container.innerHTML = '<p style="color: #999; padding: 20px;">暫無即將到期任務</p>';
        return;
    }
    
    container.innerHTML = tasks.map(task => createTaskCardHTML(task)).join('');
}

// 渲染看板
function renderBoard(tasks) {
    // 清空所有列表
    document.getElementById('todo-list').innerHTML = '';
    document.getElementById('in_progress-list').innerHTML = '';
    document.getElementById('done-list').innerHTML = '';
    
    // 按狀態分組
    const grouped = {
        todo: tasks.filter(t => t.status === 'todo'),
        in_progress: tasks.filter(t => t.status === 'in_progress'),
        done: tasks.filter(t => t.status === 'done')
    };
    
    // 渲染每個欄位
    Object.keys(grouped).forEach(status => {
        const list = document.getElementById(`${status}-list`);
        const count = document.getElementById(`count-${status}`);
        
        count.textContent = grouped[status].length;
        
        grouped[status].forEach(task => {
            list.appendChild(createTaskElement(task));
        });
    });
}

// 建立任務元素
function createTaskElement(task) {
    const div = document.createElement('div');
    div.className = 'task-card';
    div.dataset.taskId = task.id;
    div.innerHTML = createTaskCardHTML(task);
    
    // 點擊整張卡片開啟詳情
    div.addEventListener('click', function(e) {
        if (!e.target.closest('.task-actions')) {
            openDetailModal(task.id);
        }
    });
    
    return div;
}

// 建立任務卡片 HTML
function createTaskCardHTML(task) {
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
    
    const priorityClass = `priority-${task.priority}`;
    const priorityLabel = { high: '高', medium: '中', low: '低' }[task.priority];
    
    return `
        <div class="task-header">
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-actions">
                <button onclick="editTask(${task.id}, event)" title="編輯">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteTask(${task.id}, event)" title="刪除">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        
        ${task.description ? `<div class="task-description">${escapeHtml(task.description.substring(0, 60))}${task.description.length > 60 ? '...' : ''}</div>` : ''}
        
        <div class="task-footer">
            <div class="task-meta">
                <span class="priority-badge ${priorityClass}">${priorityLabel}</span>
                <div class="assignee-avatar ${task.assignee}" title="指派給: ${task.assignee === 'joe' ? 'Joe' : '用戶'}">${task.assignee === 'joe' ? 'J' : 'U'}</div>
            </div>
            
            ${task.due_date ? `
                <div class="due-date ${isOverdue ? 'overdue' : ''}">
                    <i class="far fa-calendar"></i>
                    ${formatDate(task.due_date)}
                </div>
            ` : ''}
        </div>
        
        ${task.tags && task.tags.length > 0 ? `
            <div class="task-tags">
                ${task.tags.slice(0, 2).map(tag => `<span class="task-tag">${escapeHtml(tag)}</span>`).join('')}
                ${task.tags.length > 2 ? `<span class="task-tag">+${task.tags.length - 2}</span>` : ''}
            </div>
        ` : ''}
    `;
}

// 初始化拖拽功能
function initSortable() {
    const columns = ['todo-list', 'in_progress-list', 'done-list'];
    
    columns.forEach(columnId => {
        const el = document.getElementById(columnId);
        new Sortable(el, {
            group: 'kanban',
            animation: 150,
            ghostClass: 'dragging',
            onEnd: function(evt) {
                const taskId = evt.item.dataset.taskId;
                const newStatus = evt.to.id.replace('-list', '');
                moveTask(taskId, newStatus);
            }
        });
    });
}

// 頁面切換
function showDashboard() {
    document.getElementById('dashboardPage').style.display = 'block';
    document.getElementById('boardPage').style.display = 'none';
    document.getElementById('pageTitle').textContent = '儀表板';
    document.getElementById('breadcrumbCurrent').textContent = '儀表板';
    
    // 更新導航狀態
    updateNavActive('dashboard');
}

function showBoard() {
    document.getElementById('dashboardPage').style.display = 'none';
    document.getElementById('boardPage').style.display = 'block';
    document.getElementById('pageTitle').textContent = '任務看板';
    document.getElementById('breadcrumbCurrent').textContent = '任務看板';
    
    updateNavActive('board');
}

function updateNavActive(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (page === 'dashboard') {
        document.querySelector('.nav-item[onclick="showDashboard()"]').classList.add('active');
    } else if (page === 'board') {
        document.querySelector('.nav-item[onclick="showBoard()"]').classList.add('active');
    }
}

// 篩選功能
function filterByAssignee(assignee) {
    currentFilter = { type: 'assignee', value: assignee };
    showBoard();
    
    const filtered = allTasks.filter(t => t.assignee === assignee);
    renderBoard(filtered);
}

function resetFilter() {
    currentFilter = null;
    renderBoard(allTasks);
}

function applyFilter(filter) {
    if (filter.type === 'assignee') {
        const filtered = allTasks.filter(t => t.assignee === filter.value);
        renderBoard(filtered);
    }
}

// Modal 控制
function openModal(task = null) {
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    const title = document.getElementById('modalTitle');
    
    if (task) {
        title.textContent = '編輯任務';
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskStatus').value = task.status;
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskAssignee').value = task.assignee;
        document.getElementById('taskDueDate').value = task.due_date || '';
        document.getElementById('taskTags').value = task.tags ? task.tags.join(', ') : '';
    } else {
        title.textContent = '新增任務';
        form.reset();
        document.getElementById('taskId').value = '';
    }
    
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('taskModal').classList.remove('active');
}

// 表單提交
async function handleSubmit(e) {
    e.preventDefault();
    
    const taskId = document.getElementById('taskId').value;
    const taskData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        status: document.getElementById('taskStatus').value,
        priority: document.getElementById('taskPriority').value,
        assignee: document.getElementById('taskAssignee').value,
        due_date: document.getElementById('taskDueDate').value,
        tags: document.getElementById('taskTags').value.split(',').map(t => t.trim()).filter(t => t)
    };
    
    try {
        const url = taskId ? `/api/tasks/${taskId}` : '/api/tasks';
        const method = taskId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        
        if (response.ok) {
            closeModal();
            loadTasks();
        } else {
            alert('儲存失敗');
        }
    } catch (error) {
        console.error('Error saving task:', error);
        alert('儲存失敗');
    }
}

// 編輯任務
async function editTask(taskId, event) {
    event.stopPropagation();
    const task = allTasks.find(t => t.id === taskId);
    if (task) {
        openModal(task);
    }
}

// 刪除任務
async function deleteTask(taskId, event) {
    event.stopPropagation();
    
    if (!confirm('確定要刪除這個任務嗎？')) return;
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadTasks();
        }
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

// 移動任務
async function moveTask(taskId, newStatus) {
    try {
        const response = await fetch(`/api/tasks/${taskId}/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            loadTasks();
        }
    } catch (error) {
        console.error('Error moving task:', error);
    }
}

// 詳情 Modal
async function openDetailModal(taskId) {
    currentTaskId = taskId;
    const task = allTasks.find(t => t.id === taskId);
    
    if (!task) return;
    
    document.getElementById('detailTitle').textContent = task.title;
    
    const priorityLabel = { high: '高', medium: '中', low: '低' }[task.priority];
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
    
    document.getElementById('detailContent').innerHTML = `
        <div style="margin-bottom: 24px;">
            <p style="color: #666; line-height: 1.6; margin-bottom: 16px;">
                ${task.description || '無描述'}
            </p>
            
            <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
                <span class="priority-badge priority-${task.priority}">${priorityLabel}優先級</span>
                <div class="assignee-avatar ${task.assignee}">${task.assignee === 'joe' ? 'J' : 'U'}</div>
                ${task.due_date ? `
                    <span class="due-date ${isOverdue ? 'overdue' : ''}">
                        <i class="far fa-calendar"></i> ${formatDate(task.due_date)}
                    </span>
                ` : ''}
            </div>
            
            ${task.tags && task.tags.length > 0 ? `
                <div class="task-tags">
                    ${task.tags.map(tag => `<span class="task-tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}
        </div>
        
        <div class="activity-list" id="activitiesList">
            <p style="color: #999;">載入中...</p>
        </div>
    `;
    
    document.getElementById('detailModal').classList.add('active');
    
    // 載入活動記錄
    loadActivities(taskId);
}

async function loadActivities(taskId) {
    try {
        const response = await fetch(`/api/activities/${taskId}`);
        const activities = await response.json();
        
        const container = document.getElementById('activitiesList');
        if (activities.length === 0) {
            container.innerHTML = '<p style="color: #999;">暫無活動記錄</p>';
        } else {
            container.innerHTML = activities.map(a => `
                <div class="activity-item">
                    <div class="activity-header">
                        <span class="activity-author">${a.author === 'joe' ? 'Joe' : '用戶'}</span>
                        <span class="activity-time">${formatDateTime(a.created_at)}</span>
                    </div>
                    <div class="activity-content">${escapeHtml(a.content)}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('active');
    currentTaskId = null;
}

// 新增評論
async function addActivity() {
    const content = document.getElementById('newActivity').value.trim();
    if (!content || !currentTaskId) return;
    
    try {
        const response = await fetch('/api/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task_id: currentTaskId,
                author: 'user',
                content: content
            })
        });
        
        if (response.ok) {
            document.getElementById('newActivity').value = '';
            loadActivities(currentTaskId);
        }
    } catch (error) {
        console.error('Error adding activity:', error);
    }
}

// 輔助函數
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 點擊 Modal 外部關閉
window.onclick = function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.classList.remove('active');
    }
}
