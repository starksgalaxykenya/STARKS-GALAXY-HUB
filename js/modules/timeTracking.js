// Time Tracking module

let timerInterval = null;
let timerSeconds = 0;
let currentTimerEntry = null;

// Start timer
function startTimer() {
    const projectId = document.getElementById('timerProject').value;
    const taskId = document.getElementById('timerTask').value;

    if (!projectId) {
        showError('Please select a project');
        return;
    }

    if (timerInterval) return;

    // Create time entry
    currentTimerEntry = {
        userId: getCurrentUser()?.uid,
        projectId,
        taskId: taskId || null,
        startTime: new Date(),
        date: new Date(),
        isRunning: true
    };

    timerInterval = setInterval(() => {
        timerSeconds++;
        updateTimerDisplay();
    }, 1000);

    // Update UI
    document.getElementById('startTimerBtn').style.display = 'none';
    document.getElementById('pauseTimerBtn').style.display = 'inline-block';
    
    showSuccess('Timer started');
}

// Pause timer
function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        
        document.getElementById('startTimerBtn').style.display = 'inline-block';
        document.getElementById('pauseTimerBtn').style.display = 'none';
        
        showSuccess('Timer paused');
    }
}

// Stop timer
async function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    if (!currentTimerEntry) return;

    const hours = timerSeconds / 3600;
    const description = prompt('Add description for this time entry (optional):');

    try {
        showLoading();

        // Save time entry
        await db.collection('timeEntries').add({
            ...currentTimerEntry,
            endTime: new Date(),
            duration: timerSeconds,
            hours: parseFloat(hours.toFixed(2)),
            description: description || '',
            isRunning: false
        });

        // Update task actual hours if task selected
        if (currentTimerEntry.taskId) {
            const task = await getDocument('tasks', currentTimerEntry.taskId);
            if (task) {
                const newHours = (task.actualHours || 0) + hours;
                await updateDocument('tasks', currentTimerEntry.taskId, {
                    actualHours: newHours
                });
            }
        }

        // Reset timer
        timerSeconds = 0;
        currentTimerEntry = null;
        updateTimerDisplay();

        document.getElementById('startTimerBtn').style.display = 'inline-block';
        document.getElementById('pauseTimerBtn').style.display = 'none';

        showSuccess('Time entry saved');
        loadTimesheet();

    } catch (error) {
        showError('Error saving time entry: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Update timer display
function updateTimerDisplay() {
    const hours = Math.floor(timerSeconds / 3600);
    const minutes = Math.floor((timerSeconds % 3600) / 60);
    const seconds = timerSeconds % 60;
    
    document.getElementById('timerDisplay').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Load tasks for selected project
async function loadTasksForProject() {
    const projectId = document.getElementById('timerProject').value;
    const taskSelect = document.getElementById('timerTask');
    
    if (!projectId) {
        taskSelect.innerHTML = '<option value="">Select Task</option>';
        return;
    }

    try {
        const tasks = await db.collection('tasks')
            .where('projectId', '==', projectId)
            .where('status', 'in', ['todo', 'in-progress'])
            .get();

        taskSelect.innerHTML = '<option value="">Select Task (Optional)</option>';
        
        tasks.forEach(doc => {
            const task = doc.data();
            taskSelect.innerHTML += `<option value="${doc.id}">${task.title}</option>`;
        });

    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Load timesheet
async function loadTimesheet() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const entries = await db.collection('timeEntries')
            .where('userId', '==', getCurrentUser()?.uid)
            .where('date', '>=', today)
            .orderBy('startTime', 'desc')
            .get();

        const timesheet = document.getElementById('todaysTimesheet');
        if (!timesheet) return;

        timesheet.innerHTML = '<h4 style="margin-bottom: 15px;">Today\'s Entries</h4>';

        if (entries.empty) {
            timesheet.innerHTML += '<div class="empty-state"><p>No time entries for today</p></div>';
            return;
        }

        let total = 0;
        entries.forEach(doc => {
            const entry = doc.data();
            const startTime = entry.startTime?.toDate ? formatTime(entry.startTime.toDate()) : '';
            const endTime = entry.endTime?.toDate ? formatTime(entry.endTime.toDate()) : '';
            const duration = formatDuration(entry.duration || 0);
            
            total += entry.hours || 0;
            
            timesheet.innerHTML += `
                <div class="timesheet-entry">
                    <div class="timesheet-info">
                        <div class="timesheet-project">${getProjectName(entry.projectId)}</div>
                        <div class="timesheet-time">${startTime} - ${endTime || 'In Progress'}</div>
                        ${entry.description ? `<div class="timesheet-description">${entry.description}</div>` : ''}
                    </div>
                    <div class="timesheet-duration">${duration}</div>
                </div>
            `;
        });

        timesheet.innerHTML += `
            <div class="timesheet-total">
                <strong>Total</strong>
                <strong>${total.toFixed(2)} hours</strong>
            </div>
        `;

        // Load weekly summary
        await loadWeeklySummary();

    } catch (error) {
        console.error('Error loading timesheet:', error);
    }
}

// Get project name by ID
async function getProjectName(projectId) {
    if (!projectId) return 'Unknown';
    const project = await getDocument('projects', projectId);
    return project?.name || 'Unknown';
}

// Load weekly summary
async function loadWeeklySummary() {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const entries = await db.collection('timeEntries')
        .where('userId', '==', getCurrentUser()?.uid)
        .where('date', '>=', startOfWeek)
        .get();

    // Group by day
    const dailyTotals = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    entries.forEach(doc => {
        const entry = doc.data();
        const date = entry.date?.toDate ? entry.date.toDate() : new Date(entry.date);
        const day = date.getDay();
        dailyTotals[day] = (dailyTotals[day] || 0) + (entry.hours || 0);
    });

    // Update chart
    const ctx = document.getElementById('timeChart')?.getContext('2d');
    if (!ctx) return;

    if (charts.time) {
        charts.time.destroy();
    }

    charts.time = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [{
                label: 'Hours Worked',
                data: days.map((_, index) => dailyTotals[index] || 0),
                backgroundColor: '#6366f1',
                borderRadius: 8
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

// Format duration (seconds to HH:MM:SS)
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Format time (HH:MM AM/PM)
function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Add CSS for time tracking
const timeStyles = document.createElement('style');
timeStyles.textContent = `
    .timesheet-entry {
        background: var(--light);
        border-radius: 10px;
        padding: 15px;
        margin-bottom: 10px;
    }

    .timesheet-info {
        margin-bottom: 10px;
    }

    .timesheet-project {
        font-weight: 600;
        margin-bottom: 5px;
    }

    .timesheet-time {
        font-size: 12px;
        color: var(--gray);
        margin-bottom: 5px;
    }

    .timesheet-description {
        font-size: 12px;
        color: var(--gray);
        font-style: italic;
    }

    .timesheet-duration {
        font-size: 18px;
        font-weight: 600;
        color: var(--primary);
        text-align: right;
    }

    .timesheet-total {
        display: flex;
        justify-content: space-between;
        padding: 15px;
        background: white;
        border-radius: 10px;
        margin-top: 15px;
        font-size: 16px;
    }
`;
document.head.appendChild(timeStyles);

// Export time tracking functions
window.startTimer = startTimer;
window.pauseTimer = pauseTimer;
window.stopTimer = stopTimer;
window.loadTimesheet = loadTimesheet;
window.loadTasksForProject = loadTasksForProject;
