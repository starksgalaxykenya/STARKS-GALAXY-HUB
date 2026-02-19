// Dashboard module

// Load dashboard data
async function loadDashboardData() {
    try {
        showLoading();

        // Load projects count
        const projects = await queryDocuments('projects', []);
        document.getElementById('totalProjects').textContent = projects.length;
        document.getElementById('projectBadge').textContent = projects.length;

        // Load users count
        const users = await queryDocuments('users', []);
        document.getElementById('teamMembers').textContent = users.length;

        // Load active tasks
        const activeTasks = await queryDocuments('tasks', [
            { field: 'status', operator: 'in', value: ['todo', 'in-progress'] },
            { field: 'assignee', operator: '==', value: getCurrentUser()?.uid }
        ]);
        document.getElementById('activeTasks').textContent = activeTasks.length;
        document.getElementById('taskBadge').textContent = activeTasks.length;

        // Load completion rate
        const completedTasks = await queryDocuments('tasks', [
            { field: 'status', operator: '==', value: 'done' },
            { field: 'assignee', operator: '==', value: getCurrentUser()?.uid }
        ]);
        const allTasks = await queryDocuments('tasks', [
            { field: 'assignee', operator: '==', value: getCurrentUser()?.uid }
        ]);
        const rate = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;
        document.getElementById('completionRate').textContent = rate + '%';

        // Load activity feed
        await loadActivityFeed();
        
        // Load upcoming deadlines
        await loadUpcomingDeadlines();

        // Load online team members
        await loadOnlineTeam();

        // Load recent documents
        await loadRecentDocuments();

        hideLoading();

    } catch (error) {
        hideLoading();
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data');
    }
}

// Load activity feed
async function loadActivityFeed() {
    try {
        const activities = await db.collection('activities')
            .where('company', '==', getCurrentCompany())
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        const feed = document.getElementById('activityFeed');
        if (!feed) return;

        feed.innerHTML = '';

        if (activities.empty) {
            feed.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><h3>No recent activity</h3><p>Activities will appear here</p></div>';
            return;
        }

        activities.forEach(doc => {
            const activity = doc.data();
            const date = activity.timestamp?.toDate ? formatRelativeTime(activity.timestamp.toDate()) : '';
            
            feed.innerHTML += `
                <div class="activity-item">
                    <div class="activity-icon" style="background: ${ACTIVITY_COLORS[activity.type] || '#6b7280'}">
                        <i class="fas ${ACTIVITY_ICONS[activity.type] || 'fa-circle'}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-text">
                            <strong>${activity.userName || activity.user}</strong> ${activity.action}
                        </div>
                        <div class="activity-time">${date}</div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading activity feed:', error);
    }
}

// Load upcoming deadlines
async function loadUpcomingDeadlines() {
    try {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const tasks = await db.collection('tasks')
            .where('dueDate', '>=', today.toISOString().split('T')[0])
            .where('dueDate', '<=', nextWeek.toISOString().split('T')[0])
            .where('status', '!=', 'done')
            .where('assignee', '==', getCurrentUser()?.uid)
            .orderBy('dueDate')
            .limit(5)
            .get();

        const deadlines = document.getElementById('upcomingDeadlines');
        if (!deadlines) return;

        deadlines.innerHTML = '';

        if (tasks.empty) {
            deadlines.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-check"></i><p>No upcoming deadlines</p></div>';
            return;
        }

        tasks.forEach(doc => {
            const task = doc.data();
            const dueDate = formatDate(task.dueDate);
            const dueColor = getDueDateColor(task.dueDate);
            
            deadlines.innerHTML += `
                <div class="deadline-item" onclick="viewTask('${doc.id}')">
                    <div class="deadline-info">
                        <div class="deadline-title">${task.title}</div>
                        <div class="deadline-project">${task.projectName || 'No project'}</div>
                    </div>
                    <div class="deadline-meta">
                        <div class="deadline-date" style="color: ${dueColor}">${dueDate}</div>
                        <div class="deadline-priority priority-${task.priority}">${task.priority || 'normal'}</div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading deadlines:', error);
    }
}

// Load online team members
async function loadOnlineTeam() {
    try {
        const users = await db.collection('users')
            .where('company', '==', getCurrentCompany())
            .where('status', 'in', ['online', 'away', 'busy'])
            .limit(5)
            .get();

        const onlineDiv = document.getElementById('onlineTeam');
        if (!onlineDiv) return;

        onlineDiv.innerHTML = '';

        if (users.empty) {
            onlineDiv.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No team members online</p></div>';
            return;
        }

        users.forEach(doc => {
            const user = doc.data();
            const statusColor = {
                'online': 'var(--success)',
                'away': 'var(--warning)',
                'busy': 'var(--danger)'
            }[user.status] || 'var(--gray)';

            onlineDiv.innerHTML += `
                <div class="team-member-item">
                    <div class="member-avatar-container">
                        <div class="member-avatar" style="background: ${getAvatarColor(user.name)}">
                            ${(user.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span class="member-status" style="background: ${statusColor}"></span>
                    </div>
                    <div class="member-info">
                        <div class="member-name">${user.name || 'Unknown'}</div>
                        <div class="member-role">${user.position || 'Team Member'}</div>
                    </div>
                    <button class="btn-icon" onclick="startChat('${doc.id}')">
                        <i class="fas fa-comment"></i>
                    </button>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading online team:', error);
    }
}

// Load recent documents
async function loadRecentDocuments() {
    try {
        const docs = await db.collection('documents')
            .where('company', '==', getCurrentCompany())
            .orderBy('updatedAt', 'desc')
            .limit(5)
            .get();

        const docsDiv = document.getElementById('recentDocuments');
        if (!docsDiv) return;

        docsDiv.innerHTML = '';

        if (docs.empty) {
            docsDiv.innerHTML = '<div class="empty-state"><i class="fas fa-file"></i><p>No recent documents</p></div>';
            return;
        }

        docs.forEach(doc => {
            const document = doc.data();
            const date = document.updatedAt?.toDate ? formatRelativeTime(document.updatedAt.toDate()) : '';
            
            docsDiv.innerHTML += `
                <div class="document-item" onclick="viewDocument('${doc.id}')">
                    <i class="fas fa-file-alt document-icon"></i>
                    <div class="document-info">
                        <div class="document-name">${document.name}</div>
                        <div class="document-meta">${date} • ${formatFileSize(document.size)}</div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading recent documents:', error);
    }
}

// Add CSS for dashboard items
const dashboardStyles = document.createElement('style');
dashboardStyles.textContent = `
    .activity-item {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 15px;
        border-bottom: 1px solid var(--border);
    }

    .activity-icon {
        width: 35px;
        height: 35px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
    }

    .activity-content {
        flex: 1;
    }

    .activity-text {
        font-size: 14px;
        margin-bottom: 5px;
    }

    .activity-time {
        font-size: 11px;
        color: var(--gray);
    }

    .deadline-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px;
        background: var(--light);
        border-radius: 10px;
        margin-bottom: 10px;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .deadline-item:hover {
        transform: translateX(5px);
        background: #e5e7eb;
    }

    .deadline-title {
        font-weight: 600;
        margin-bottom: 5px;
    }

    .deadline-project {
        font-size: 11px;
        color: var(--gray);
    }

    .deadline-meta {
        text-align: right;
    }

    .deadline-date {
        font-weight: 600;
        margin-bottom: 5px;
    }

    .deadline-priority {
        font-size: 10px;
        padding: 2px 8px;
        border-radius: 12px;
        display: inline-block;
    }

    .priority-high {
        background: #fee2e2;
        color: #dc2626;
    }

    .priority-medium {
        background: #fef3c7;
        color: #d97706;
    }

    .priority-low {
        background: #d1fae5;
        color: #059669;
    }

    .team-member-item {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 10px;
        border-bottom: 1px solid var(--border);
    }

    .member-avatar-container {
        position: relative;
    }

    .member-avatar {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
    }

    .member-status {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: 2px solid white;
    }

    .member-info {
        flex: 1;
    }

    .member-name {
        font-weight: 600;
        margin-bottom: 5px;
    }

    .member-role {
        font-size: 11px;
        color: var(--gray);
    }

    .btn-icon {
        width: 30px;
        height: 30px;
        border: none;
        background: var(--light);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        color: var(--gray);
    }

    .btn-icon:hover {
        background: var(--primary);
        color: white;
    }

    .document-item {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 10px;
        border-bottom: 1px solid var(--border);
        cursor: pointer;
    }

    .document-item:hover {
        background: var(--light);
    }

    .document-icon {
        font-size: 20px;
        color: var(--primary);
    }

    .document-info {
        flex: 1;
    }

    .document-name {
        font-weight: 600;
        margin-bottom: 5px;
    }

    .document-meta {
        font-size: 11px;
        color: var(--gray);
    }
`;
document.head.appendChild(dashboardStyles);

// Export dashboard functions
window.loadDashboardData = loadDashboardData;
