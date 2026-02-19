// Artists module - Specialized for creative professionals

// Load artist data
async function loadArtistData() {
    try {
        showLoading();

        // Load artist tasks
        await loadArtistTasks();
        
        // Load active briefs
        await loadActiveBriefs();
        
        // Load performance metrics
        await loadPerformanceMetrics();
        
        // Load recent deliverables
        await loadRecentDeliverables();
        
        // Initialize performance chart
        initializeArtistChart();

        hideLoading();

    } catch (error) {
        hideLoading();
        console.error('Error loading artist data:', error);
        showError('Failed to load artist data');
    }
}

// Load artist tasks
async function loadArtistTasks() {
    const tasks = await db.collection('tasks')
        .where('assignee', '==', getCurrentUser()?.uid)
        .where('status', 'in', ['todo', 'in-progress', 'review'])
        .orderBy('createdAt', 'desc')
        .get();

    const tasksList = document.getElementById('artistTasksList');
    if (!tasksList) return;

    tasksList.innerHTML = '<h4 style="margin-bottom: 15px;">Current Tasks</h4>';

    if (tasks.empty) {
        tasksList.innerHTML += '<div class="empty-state"><p>No tasks assigned</p></div>';
        return;
    }

    tasks.forEach(doc => {
        const task = doc.data();
        const priorityColor = PRIORITY_COLORS[task.priority] || '#6b7280';
        
        tasksList.innerHTML += `
            <div class="artist-task-card" onclick="viewTask('${doc.id}')">
                <div class="artist-task-header">
                    <strong>${task.title}</strong>
                    <span class="task-priority-badge" style="background: ${priorityColor}20; color: ${priorityColor}">
                        ${task.priority}
                    </span>
                </div>
                <div class="artist-task-meta">
                    <span class="artist-task-project">
                        <i class="fas fa-folder"></i> ${task.projectName || 'No project'}
                    </span>
                    <span class="artist-task-deadline ${isOverdue(task.dueDate) ? 'overdue' : ''}">
                        <i class="far fa-calendar"></i> ${task.dueDate ? formatDate(task.dueDate) : 'No date'}
                    </span>
                </div>
                <div class="artist-task-status status-${task.status}">
                    ${task.status.replace('-', ' ')}
                </div>
                <button class="btn btn-primary btn-sm start-task-btn" onclick="event.stopPropagation(); updateTaskStatus('${doc.id}', 'in-progress')">
                    Start Task
                </button>
            </div>
        `;
    });
}

// Check if date is overdue
function isOverdue(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
}

// Load active briefs
async function loadActiveBriefs() {
    const briefs = await db.collection('briefs')
        .where('assignee', '==', getCurrentUser()?.uid)
        .where('status', '==', 'active')
        .orderBy('deadline', 'asc')
        .get();

    const briefsList = document.getElementById('activeBriefs');
    if (!briefsList) return;

    briefsList.innerHTML = '<h4 style="margin-bottom: 15px;">Active Creative Briefs</h4>';

    if (briefs.empty) {
        briefsList.innerHTML += '<div class="empty-state"><p>No active briefs</p></div>';
        return;
    }

    briefs.forEach(doc => {
        const brief = doc.data();
        const isUrgent = brief.deadline && new Date(brief.deadline) < new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
        
        briefsList.innerHTML += `
            <div class="brief-card ${isUrgent ? 'urgent' : ''}" onclick="viewBrief('${doc.id}')">
                <div class="brief-header">
                    <strong>${brief.title}</strong>
                    <span class="brief-deadline">
                        ${brief.deadline ? formatDate(brief.deadline) : 'No deadline'}
                    </span>
                </div>
                <p class="brief-description">${truncateText(brief.description, 100)}</p>
                <div class="brief-footer">
                    <span class="brief-project">${brief.projectName || 'No project'}</span>
                    <span class="brief-attachments">
                        <i class="fas fa-paperclip"></i> ${brief.attachments?.length || 0}
                    </span>
                </div>
            </div>
        `;
    });
}

// Load performance metrics
async function loadPerformanceMetrics() {
    // Get completed tasks
    const completedTasks = await db.collection('tasks')
        .where('assignee', '==', getCurrentUser()?.uid)
        .where('status', '==', 'done')
        .get();

    document.getElementById('tasksCompleted').textContent = completedTasks.size;

    // Calculate on-time rate
    let onTimeCount = 0;
    completedTasks.forEach(doc => {
        const task = doc.data();
        if (task.completedAt && task.dueDate) {
            const completedDate = task.completedAt.toDate();
            const dueDate = new Date(task.dueDate);
            if (completedDate <= dueDate) {
                onTimeCount++;
            }
        }
    });

    const onTimeRate = completedTasks.size > 0 
        ? Math.round((onTimeCount / completedTasks.size) * 100) 
        : 0;
    document.getElementById('onTimeRate').textContent = onTimeRate + '%';

    // Calculate quality rating (based on feedback)
    const feedback = await db.collection('feedback')
        .where('recipientId', '==', getCurrentUser()?.uid)
        .get();

    let totalRating = 0;
    feedback.forEach(doc => {
        totalRating += doc.data().rating || 0;
    });
    
    const avgRating = feedback.size > 0 ? (totalRating / feedback.size).toFixed(1) : 0;
    document.getElementById('qualityRating').textContent = avgRating + '/5';
}

// Load recent deliverables
async function loadRecentDeliverables() {
    const deliverables = await db.collection('deliverables')
        .where('artistId', '==', getCurrentUser()?.uid)
        .orderBy('submittedAt', 'desc')
        .limit(5)
        .get();

    const deliverablesList = document.getElementById('recentDeliverables');
    if (!deliverablesList) return;

    deliverablesList.innerHTML = '<h4 style="margin-bottom: 15px;">Recent Deliverables</h4>';

    if (deliverables.empty) {
        deliverablesList.innerHTML += '<div class="empty-state"><p>No deliverables yet</p></div>';
        return;
    }

    deliverables.forEach(doc => {
        const deliverable = doc.data();
        const date = deliverable.submittedAt?.toDate ? formatDate(deliverable.submittedAt.toDate()) : '';
        
        deliverablesList.innerHTML += `
            <div class="deliverable-item" onclick="viewDeliverable('${doc.id}')">
                <div class="deliverable-icon">
                    <i class="fas fa-file-image"></i>
                </div>
                <div class="deliverable-info">
                    <div class="deliverable-name">${deliverable.name}</div>
                    <div class="deliverable-meta">
                        <span>${deliverable.projectName}</span>
                        <span>${date}</span>
                    </div>
                </div>
                <div class="deliverable-status status-${deliverable.status}">
                    ${deliverable.status}
                </div>
            </div>
        `;
    });
}

// Initialize artist performance chart
function initializeArtistChart() {
    const ctx = document.getElementById('artistPerformanceChart')?.getContext('2d');
    if (!ctx) return;

    // Get weekly task completion data
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const completionData = [5, 8, 6, 12]; // This would come from real data

    if (charts.artistPerformance) {
        charts.artistPerformance.destroy();
    }
    
    charts.artistPerformance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeks,
            datasets: [{
                label: 'Tasks Completed',
                data: completionData,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        display: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Submit deliverable
async function submitDeliverable(taskId, file) {
    try {
        showLoading();

        // Upload file
        const storageRef = storage.ref(`deliverables/${taskId}/${file.name}`);
        await storageRef.put(file);
        const url = await storageRef.getDownloadURL();

        // Create deliverable record
        await db.collection('deliverables').add({
            taskId,
            name: file.name,
            path: storageRef.fullPath,
            url,
            size: file.size,
            artistId: getCurrentUser()?.uid,
            projectName: '', // Get from task
            submittedAt: new Date(),
            status: 'pending_review'
        });

        // Update task status
        await db.collection('tasks').doc(taskId).update({
            status: 'review',
            deliverableUrl: url
        });

        // Notify project manager
        const task = await getDocument('tasks', taskId);
        if (task && task.createdBy) {
            await createNotification(
                task.createdBy,
                `Deliverable submitted for task: ${task.title}`,
                'Deliverable Ready for Review'
            );
        }

        hideLoading();
        showSuccess('Deliverable submitted successfully!');
        loadArtistData();

    } catch (error) {
        hideLoading();
        showError('Error submitting deliverable: ' + error.message);
    }
}

// View brief details
function viewBrief(briefId) {
    showInfo('Brief details - ID: ' + briefId);
}

// View deliverable
function viewDeliverable(deliverableId) {
    showInfo('Deliverable details - ID: ' + deliverableId);
}

// Add CSS for artist module
const artistStyles = document.createElement('style');
artistStyles.textContent = `
    .artist-task-card {
        background: white;
        border-radius: 12px;
        padding: 15px;
        margin-bottom: 10px;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 1px solid var(--border);
    }

    .artist-task-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }

    .artist-task-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }

    .task-priority-badge {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
    }

    .artist-task-meta {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: var(--gray);
        margin-bottom: 10px;
    }

    .artist-task-deadline.overdue {
        color: var(--danger);
    }

    .artist-task-status {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        margin-bottom: 10px;
    }

    .status-todo {
        background: #fef3c7;
        color: #d97706;
    }

    .status-in-progress {
        background: #dbeafe;
        color: #2563eb;
    }

    .status-review {
        background: #e0e7ff;
        color: #4f46e5;
    }

    .start-task-btn {
        width: 100%;
    }

    .brief-card {
        background: white;
        border-radius: 12px;
        padding: 15px;
        margin-bottom: 10px;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 1px solid var(--border);
    }

    .brief-card.urgent {
        border-left: 4px solid var(--danger);
    }

    .brief-card:hover {
        transform: translateX(5px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }

    .brief-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }

    .brief-deadline {
        font-size: 12px;
        color: var(--gray);
    }

    .brief-description {
        font-size: 13px;
        color: var(--gray);
        margin-bottom: 10px;
        line-height: 1.5;
    }

    .brief-footer {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: var(--gray);
    }

    .deliverable-item {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 10px;
        border-bottom: 1px solid var(--border);
        cursor: pointer;
    }

    .deliverable-item:hover {
        background: var(--light);
    }

    .deliverable-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: var(--light);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary);
    }

    .deliverable-info {
        flex: 1;
    }

    .deliverable-name {
        font-weight: 600;
        margin-bottom: 5px;
    }

    .deliverable-meta {
        display: flex;
        gap: 15px;
        font-size: 11px;
        color: var(--gray);
    }

    .deliverable-status {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
    }

    .status-pending_review {
        background: #fef3c7;
        color: #d97706;
    }

    .status-approved {
        background: #d1fae5;
        color: #059669;
    }

    .status-rejected {
        background: #fee2e2;
        color: #dc2626;
    }
`;
document.head.appendChild(artistStyles);

// Export artist functions
window.loadArtistData = loadArtistData;
window.submitDeliverable = submitDeliverable;
window.viewBrief = viewBrief;
window.viewDeliverable = viewDeliverable;
