// Tasks module

// Open task modal
function openTaskModal() {
    openModal('taskModal');
    
    // Set default due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('taskDueDate').value = tomorrow.toISOString().split('T')[0];
    
    // Load projects and users
    loadProjectsForTask();
    loadUsersForTask();
}

// Close task modal
function closeTaskModal() {
    closeModal('taskModal');
    document.getElementById('taskForm').reset();
    document.getElementById('checklistItems').innerHTML = '';
}

// Load projects for task selector
async function loadProjectsForTask() {
    try {
        const projects = await queryDocuments('projects', []);
        const select = document.getElementById('taskProject');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select Project</option>';
        
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

// Load users for task assignee
async function loadUsersForTask() {
    try {
        const users = await queryDocuments('users', []);
        const select = document.getElementById('taskAssignee');
        if (!select) return;
        
        select.innerHTML = '<option value="">Unassigned</option>';
        
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name || user.email;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Load task stages based on selected project
async function loadTaskStages() {
    const projectId = document.getElementById('taskProject').value;
    if (!projectId) return;
    
    try {
        const project = await getDocument('projects', projectId);
        if (project && project.phases) {
            // Custom stages based on project phase
            const stageSelect = document.getElementById('taskStage');
            stageSelect.innerHTML = '';
            
            const stages = ['todo', 'in-progress', 'review', 'done'];
            stages.forEach(stage => {
                const option = document.createElement('option');
                option.value = stage;
                option.textContent = stage.replace('-', ' ').toUpperCase();
                stageSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading task stages:', error);
    }
}

// Add checklist item to task
function addChecklistItem() {
    const checklistDiv = document.getElementById('checklistItems');
    const itemDiv = document.createElement('div');
    itemDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px;';
    
    itemDiv.innerHTML = `
        <input type="text" class="form-control checklist-text" placeholder="Item description" style="flex: 1;">
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">×</button>
    `;
    
    checklistDiv.appendChild(itemDiv);
}

// Create new task
async function createTask() {
    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDescription').value;
    const projectId = document.getElementById('taskProject').value;
    const stage = document.getElementById('taskStage').value;
    const priority = document.getElementById('taskPriority').value;
    const assignee = document.getElementById('taskAssignee').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const hours = document.getElementById('taskHours').value;
    const tags = document.getElementById('taskTags').value;

    if (!title || !projectId) {
        showError('Please fill in required fields');
        return;
    }

    // Get checklist items
    const checklistItems = document.querySelectorAll('.checklist-text');
    const checklist = [];
    checklistItems.forEach(item => {
        if (item.value) {
            checklist.push({
                text: item.value,
                completed: false
            });
        }
    });

    try {
        showLoading();

        // Get project name for reference
        const project = await getDocument('projects', projectId);
        const projectName = project?.name || 'Unknown';

        // Get assignee name
        let assigneeName = '';
        if (assignee) {
            const user = await getDocument('users', assignee);
            assigneeName = user?.name || user?.email;
        }

        const taskData = {
            title,
            description,
            projectId,
            projectName,
            status: stage,
            priority,
            assignee: assignee || null,
            assigneeName,
            dueDate,
            estimatedHours: parseFloat(hours) || 0,
            actualHours: 0,
            checklist,
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            createdBy: getCurrentUser()?.uid,
            createdAt: new Date(),
            comments: [],
            attachments: []
        };

        await createDocument('tasks', taskData);

        // Create activity log
        await db.collection('activities').add({
            type: 'task',
            action: `created task "${title}" in project "${projectName}"`,
            user: getCurrentUser()?.email,
            userName: getCurrentUser()?.displayName || getCurrentUser()?.email,
            userId: getCurrentUser()?.uid,
            company: getCurrentCompany(),
            timestamp: new Date()
        });

        await logAudit('task_create', `Task created: ${title}`);

        // Notify assignee
        if (assignee) {
            await createNotification(assignee, `New task assigned: ${title}`, 'Task Assignment');
        }

        hideLoading();
        closeTaskModal();
        showSuccess('Task created successfully!');
        
        // Refresh data
        loadMyTasks();
        if (typeof loadKanbanBoard === 'function') {
            loadKanbanBoard();
        }

    } catch (error) {
        hideLoading();
        showError('Error creating task: ' + error.message);
    }
}

// Load my tasks
async function loadMyTasks() {
    try {
        const filter = document.getElementById('taskFilter')?.value || 'all';
        
        let query = db.collection('tasks')
            .where('company', '==', getCurrentCompany())
            .where('assignee', '==', getCurrentUser()?.uid)
            .orderBy('createdAt', 'desc');
        
        if (filter !== 'all') {
            query = query.where('status', '==', filter);
        }

        const snapshot = await query.get();
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const list = document.getElementById('myTasksList');
        if (!list) return;

        list.innerHTML = '';

        if (tasks.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <h3>No tasks found</h3>
                    <p>Create a new task to get started</p>
                    <button class="btn btn-primary" onclick="openTaskModal()">Create Task</button>
                </div>
            `;
            return;
        }

        tasks.forEach(task => {
            const card = createTaskCard(task.id, task);
            list.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading tasks:', error);
        showError('Failed to load tasks');
    }
}

// Create task card element
function createTaskCard(taskId, task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.onclick = () => viewTask(taskId);
    
    const dueDateColor = task.dueDate ? getDueDateColor(task.dueDate) : 'var(--gray)';
    const priorityColor = PRIORITY_COLORS[task.priority] || '#6b7280';
    
    const completedChecklist = task.checklist?.filter(item => item.completed).length || 0;
    const totalChecklist = task.checklist?.length || 0;
    
    card.innerHTML = `
        <div class="task-header">
            <h4 class="task-title">${task.title}</h4>
            <span class="task-priority" style="background: ${priorityColor}20; color: ${priorityColor}">
                ${task.priority}
            </span>
        </div>
        
        <p class="task-description">${truncateText(task.description, 100)}</p>
        
        ${totalChecklist > 0 ? `
            <div class="task-checklist">
                <div class="checklist-header">
                    <span>Checklist</span>
                    <span>${completedChecklist}/${totalChecklist}</span>
                </div>
                <div class="checklist-progress">
                    <div class="checklist-progress-fill" style="width: ${(completedChecklist / totalChecklist) * 100}%"></div>
                </div>
            </div>
        ` : ''}
        
        <div class="task-meta">
            <span class="task-project">${task.projectName || 'No project'}</span>
            <span class="task-due-date" style="color: ${dueDateColor}">
                <i class="far fa-calendar"></i> ${task.dueDate ? formatDate(task.dueDate) : 'No date'}
            </span>
        </div>
        
        <div class="task-footer">
            <span class="task-hours">
                <i class="far fa-clock"></i> ${task.estimatedHours || 0}h
            </span>
            <div class="task-actions">
                <button class="btn-icon" onclick="event.stopPropagation(); updateTaskStatus('${taskId}', 'in-progress')">
                    <i class="fas fa-play"></i>
                </button>
                <button class="btn-icon" onclick="event.stopPropagation(); completeTask('${taskId}')">
                    <i class="fas fa-check"></i>
                </button>
            </div>
        </div>
    `;

    return card;
}

// Update task status
async function updateTaskStatus(taskId, newStatus) {
    try {
        await updateDocument('tasks', taskId, { status: newStatus });
        await logAudit('task_update', `Task ${taskId} moved to ${newStatus}`);
        await createNotification(getCurrentUser()?.uid, 'Task status updated', 'Task Update');
        
        showSuccess('Task status updated');
        loadMyTasks();
        
    } catch (error) {
        showError('Error updating task: ' + error.message);
    }
}

// Complete task
async function completeTask(taskId) {
    try {
        await updateDocument('tasks', taskId, {
            status: 'done',
            completedAt: new Date()
        });

        await logAudit('task_complete', `Task ${taskId} completed`);
        await createNotification(getCurrentUser()?.uid, 'Task completed! Great job!', 'Task Complete');
        
        showSuccess('Task completed!');
        loadMyTasks();
        
    } catch (error) {
        showError('Error completing task: ' + error.message);
    }
}

// View task details
function viewTask(taskId) {
    showInfo('Task details view - ID: ' + taskId);
}

// Add CSS for task cards
const taskStyles = document.createElement('style');
taskStyles.textContent = `
    .task-card {
        background: white;
        border-radius: 12px;
        padding: 15px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .task-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }

    .task-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }

    .task-title {
        font-size: 16px;
        color: var(--dark);
        margin: 0;
    }

    .task-priority {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
    }

    .task-description {
        font-size: 13px;
        color: var(--gray);
        margin-bottom: 15px;
        line-height: 1.5;
    }

    .task-checklist {
        margin-bottom: 15px;
    }

    .checklist-header {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        margin-bottom: 5px;
    }

    .checklist-progress {
        height: 4px;
        background: var(--border);
        border-radius: 2px;
        overflow: hidden;
    }

    .checklist-progress-fill {
        height: 100%;
        background: var(--primary);
        transition: width 0.3s ease;
    }

    .task-meta {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        margin-bottom: 15px;
    }

    .task-project {
        color: var(--gray);
    }

    .task-due-date {
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .task-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 10px;
        border-top: 1px solid var(--border);
    }

    .task-hours {
        font-size: 12px;
        color: var(--gray);
    }

    .task-actions {
        display: flex;
        gap: 5px;
    }
`;
document.head.appendChild(taskStyles);

// Export task functions
window.openTaskModal = openTaskModal;
window.closeTaskModal = closeTaskModal;
window.addChecklistItem = addChecklistItem;
window.createTask = createTask;
window.loadMyTasks = loadMyTasks;
window.updateTaskStatus = updateTaskStatus;
window.completeTask = completeTask;
window.viewTask = viewTask;
window.loadTaskStages = loadTaskStages;
