// HR Management Module

// Load HR data
async function loadHRData() {
    try {
        showLoading();

        // Load leave balance
        await loadLeaveBalance();
        
        // Load leave requests
        await loadLeaveRequests();
        
        // Load employee directory
        await loadEmployeeDirectory();
        
        // Load upcoming birthdays
        await loadUpcomingBirthdays();
        
        // Load training assignments
        await loadTrainingAssignments();

        hideLoading();

    } catch (error) {
        hideLoading();
        console.error('Error loading HR data:', error);
        showError('Failed to load HR data');
    }
}

// Load leave balance
async function loadLeaveBalance() {
    const balanceDiv = document.getElementById('leaveBalance');
    if (!balanceDiv) return;

    try {
        // Get user's leave balance from database
        const userDoc = await db.collection('users').doc(getCurrentUser()?.uid).get();
        const userData = userDoc.data() || {};
        
        const leaveBalance = userData.leaveBalance || {
            vacation: 20,
            sick: 10,
            personal: 5,
            unpaid: 0
        };

        balanceDiv.innerHTML = `
            <div class="balance-item">
                <div class="balance-days">${leaveBalance.vacation}</div>
                <div class="balance-label">Vacation Days</div>
                <div class="balance-used">Used: ${userData.usedLeave?.vacation || 0}</div>
            </div>
            <div class="balance-item">
                <div class="balance-days">${leaveBalance.sick}</div>
                <div class="balance-label">Sick Days</div>
                <div class="balance-used">Used: ${userData.usedLeave?.sick || 0}</div>
            </div>
            <div class="balance-item">
                <div class="balance-days">${leaveBalance.personal}</div>
                <div class="balance-label">Personal Days</div>
                <div class="balance-used">Used: ${userData.usedLeave?.personal || 0}</div>
            </div>
            <div class="balance-item">
                <div class="balance-days">${leaveBalance.unpaid}</div>
                <div class="balance-label">Unpaid Leave</div>
                <div class="balance-used">Available</div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading leave balance:', error);
    }
}

// Load leave requests
async function loadLeaveRequests() {
    const requestsDiv = document.getElementById('leaveRequests');
    if (!requestsDiv) return;

    try {
        const requests = await db.collection('leaveRequests')
            .where('userId', '==', getCurrentUser()?.uid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        requestsDiv.innerHTML = '<h4 style="margin: 20px 0 10px;">Recent Requests</h4>';

        if (requests.empty) {
            requestsDiv.innerHTML += '<div class="empty-state"><p>No leave requests</p></div>';
            return;
        }

        requests.forEach(doc => {
            const request = doc.data();
            const statusClass = `status-${request.status}`;
            const typeClass = `type-${request.type}`;
            
            requestsDiv.innerHTML += `
                <div class="leave-request-card">
                    <div class="request-header">
                        <span class="leave-type ${typeClass}">${request.type}</span>
                        <span class="leave-status ${statusClass}">${request.status}</span>
                    </div>
                    <div class="request-dates">
                        <i class="far fa-calendar"></i> ${formatDate(request.startDate)} - ${formatDate(request.endDate)}
                    </div>
                    <div class="request-days">${request.days} days</div>
                    ${request.reason ? `<div class="request-reason">${request.reason}</div>` : ''}
                    <div class="request-footer">
                        <span class="request-date">Submitted: ${formatRelativeTime(request.createdAt)}</span>
                        ${request.status === 'pending' ? `
                            <div class="request-actions">
                                <button class="btn-icon" onclick="cancelLeaveRequest('${doc.id}')">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading leave requests:', error);
    }
}

// Request leave
async function requestLeave() {
    // Create leave request modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Request Leave</h3>
                <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form id="leaveRequestForm" onsubmit="event.preventDefault(); submitLeaveRequest(this)">
                <div class="form-group">
                    <label>Leave Type</label>
                    <select id="leaveType" class="form-control" required>
                        <option value="vacation">Vacation</option>
                        <option value="sick">Sick Leave</option>
                        <option value="personal">Personal Leave</option>
                        <option value="unpaid">Unpaid Leave</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Start Date</label>
                        <input type="date" id="leaveStartDate" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>End Date</label>
                        <input type="date" id="leaveEndDate" class="form-control" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Number of Days</label>
                    <input type="number" id="leaveDays" class="form-control" readonly>
                </div>
                <div class="form-group">
                    <label>Reason</label>
                    <textarea id="leaveReason" class="form-control" rows="3" placeholder="Please provide a reason for your leave request"></textarea>
                </div>
                <div class="form-group">
                    <label>Handover Notes</label>
                    <textarea id="handoverNotes" class="form-control" rows="2" placeholder="Who will cover your work?"></textarea>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">Submit Request</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Add date change listeners
    document.getElementById('leaveStartDate').addEventListener('change', calculateLeaveDays);
    document.getElementById('leaveEndDate').addEventListener('change', calculateLeaveDays);
}

// Calculate leave days
function calculateLeaveDays() {
    const start = document.getElementById('leaveStartDate').value;
    const end = document.getElementById('leaveEndDate').value;
    
    if (start && end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        document.getElementById('leaveDays').value = diffDays;
    }
}

// Submit leave request
async function submitLeaveRequest(form) {
    const type = document.getElementById('leaveType').value;
    const startDate = document.getElementById('leaveStartDate').value;
    const endDate = document.getElementById('leaveEndDate').value;
    const days = parseInt(document.getElementById('leaveDays').value);
    const reason = document.getElementById('leaveReason').value;
    const handoverNotes = document.getElementById('handoverNotes').value;

    if (!startDate || !endDate || !days) {
        showError('Please select dates');
        return;
    }

    try {
        showLoading();

        // Get user's manager
        const userDoc = await db.collection('users').doc(getCurrentUser()?.uid).get();
        const managerId = userDoc.data()?.managerId;

        await db.collection('leaveRequests').add({
            userId: getCurrentUser()?.uid,
            userName: userDoc.data()?.name || getCurrentUser()?.email,
            type,
            startDate,
            endDate,
            days,
            reason,
            handoverNotes,
            status: 'pending',
            managerId: managerId || null,
            createdAt: new Date()
        });

        // Notify manager
        if (managerId) {
            await createNotification(
                managerId,
                `${userDoc.data()?.name || 'An employee'} has requested ${days} days of ${type} leave`,
                'Leave Request',
                'info'
            );
        }

        hideLoading();
        document.querySelector('.modal.active').remove();
        showSuccess('Leave request submitted successfully');
        loadHRData();

    } catch (error) {
        hideLoading();
        showError('Error submitting leave request: ' + error.message);
    }
}

// Cancel leave request
async function cancelLeaveRequest(requestId) {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;

    try {
        showLoading();
        await deleteDocument('leaveRequests', requestId);
        showSuccess('Leave request cancelled');
        loadHRData();
    } catch (error) {
        hideLoading();
        showError('Error cancelling request: ' + error.message);
    }
}

// Load employee directory
async function loadEmployeeDirectory() {
    const directoryDiv = document.getElementById('employeeDirectory');
    if (!directoryDiv) return;

    try {
        const users = await queryDocuments('users', []);
        
        directoryDiv.innerHTML = '';

        users.forEach(user => {
            const statusColor = {
                'online': 'var(--success)',
                'away': 'var(--warning)',
                'busy': 'var(--danger)',
                'offline': 'var(--gray)'
            }[user.status] || 'var(--gray)';

            directoryDiv.innerHTML += `
                <div class="employee-item" onclick="viewEmployeeProfile('${user.id}')">
                    <div class="employee-avatar-container">
                        <div class="employee-avatar" style="background: ${getAvatarColor(user.name)}">
                            ${(user.name || user.email).charAt(0).toUpperCase()}
                        </div>
                        <span class="employee-status" style="background: ${statusColor}"></span>
                    </div>
                    <div class="employee-info">
                        <div class="employee-name">${user.name || 'Unknown'}</div>
                        <div class="employee-position">${user.position || 'Team Member'}</div>
                        <div class="employee-department">${user.department || 'No Department'}</div>
                    </div>
                    <div class="employee-contact">
                        <a href="mailto:${user.email}" class="btn-icon" onclick="event.stopPropagation()">
                            <i class="far fa-envelope"></i>
                        </a>
                        ${user.phone ? `
                            <a href="tel:${user.phone}" class="btn-icon" onclick="event.stopPropagation()">
                                <i class="fas fa-phone"></i>
                            </a>
                        ` : ''}
                        <button class="btn-icon" onclick="event.stopPropagation(); startChat('${user.id}')">
                            <i class="fas fa-comment"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        // Add search functionality
        setupEmployeeSearch();

    } catch (error) {
        console.error('Error loading employee directory:', error);
    }
}

// Setup employee search
function setupEmployeeSearch() {
    const searchInput = document.getElementById('employeeSearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', debounce((e) => {
        const searchTerm = e.target.value.toLowerCase();
        const employees = document.querySelectorAll('.employee-item');

        employees.forEach(emp => {
            const name = emp.querySelector('.employee-name').textContent.toLowerCase();
            const position = emp.querySelector('.employee-position').textContent.toLowerCase();
            const department = emp.querySelector('.employee-department').textContent.toLowerCase();
            
            const matches = name.includes(searchTerm) || 
                           position.includes(searchTerm) || 
                           department.includes(searchTerm);
            
            emp.style.display = matches ? 'flex' : 'none';
        });
    }, 300));
}

// Load upcoming birthdays
async function loadUpcomingBirthdays() {
    const birthdaysDiv = document.getElementById('upcomingBirthdays');
    if (!birthdaysDiv) return;

    try {
        const users = await queryDocuments('users', []);
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());

        const upcomingBirthdays = users.filter(user => {
            if (!user.dateOfBirth) return false;
            const dob = new Date(user.dateOfBirth);
            const birthdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
            return birthdayThisYear >= today && birthdayThisYear <= nextMonth;
        }).sort((a, b) => {
            const aDate = new Date(today.getFullYear(), new Date(a.dateOfBirth).getMonth(), new Date(a.dateOfBirth).getDate());
            const bDate = new Date(today.getFullYear(), new Date(b.dateOfBirth).getMonth(), new Date(b.dateOfBirth).getDate());
            return aDate - bDate;
        });

        birthdaysDiv.innerHTML = '<h4 style="margin-bottom: 15px;">Upcoming Birthdays</h4>';

        if (upcomingBirthdays.length === 0) {
            birthdaysDiv.innerHTML += '<div class="empty-state"><p>No upcoming birthdays</p></div>';
            return;
        }

        upcomingBirthdays.forEach(user => {
            const dob = new Date(user.dateOfBirth);
            const birthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
            const daysUntil = Math.ceil((birthday - today) / (1000 * 60 * 60 * 24));

            birthdaysDiv.innerHTML += `
                <div class="birthday-item">
                    <div class="birthday-avatar" style="background: ${getAvatarColor(user.name)}">
                        ${(user.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div class="birthday-info">
                        <div class="birthday-name">${user.name}</div>
                        <div class="birthday-date">${formatDate(user.dateOfBirth)}</div>
                    </div>
                    <div class="birthday-countdown">
                        ${daysUntil === 0 ? 'Today!' : `${daysUntil} days`}
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error('Error loading birthdays:', error);
    }
}

// Load training assignments
async function loadTrainingAssignments() {
    const trainingDiv = document.getElementById('trainingList');
    if (!trainingDiv) return;

    try {
        const trainings = await db.collection('trainings')
            .where('assignedTo', 'array-contains', getCurrentUser()?.uid)
            .where('status', '==', 'active')
            .orderBy('dueDate', 'asc')
            .get();

        trainingDiv.innerHTML = '<h4 style="margin-bottom: 15px;">Training Assignments</h4>';

        if (trainings.empty) {
            trainingDiv.innerHTML += '<div class="empty-state"><p>No training assignments</p></div>';
            return;
        }

        trainings.forEach(doc => {
            const training = doc.data();
            const dueDate = training.dueDate ? new Date(training.dueDate) : null;
            const isOverdue = dueDate && dueDate < new Date();

            trainingDiv.innerHTML += `
                <div class="training-card ${isOverdue ? 'overdue' : ''}" onclick="viewTraining('${doc.id}')">
                    <div class="training-icon">
                        <i class="fas fa-graduation-cap"></i>
                    </div>
                    <div class="training-info">
                        <div class="training-title">${training.title}</div>
                        <div class="training-meta">
                            <span>${training.provider || 'Internal'}</span>
                            <span>${training.duration} hours</span>
                        </div>
                        <div class="training-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${training.progress || 0}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="training-deadline">
                        ${dueDate ? `Due: ${formatDate(dueDate)}` : 'No deadline'}
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error('Error loading trainings:', error);
    }
}

// View employee profile
function viewEmployeeProfile(userId) {
    showInfo('Employee profile - ID: ' + userId);
}

// View training details
function viewTraining(trainingId) {
    showInfo('Training details - ID: ' + trainingId);
}

// Add CSS for HR module
const hrStyles = document.createElement('style');
hrStyles.textContent = `
    .leave-request-card {
        background: white;
        border-radius: 12px;
        padding: 15px;
        margin-bottom: 10px;
        border: 1px solid var(--border);
    }

    .request-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
    }

    .leave-type {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
    }

    .type-vacation {
        background: #dbeafe;
        color: #2563eb;
    }

    .type-sick {
        background: #fee2e2;
        color: #dc2626;
    }

    .type-personal {
        background: #fef3c7;
        color: #d97706;
    }

    .type-unpaid {
        background: #e5e7eb;
        color: #4b5563;
    }

    .leave-status {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
    }

    .status-pending {
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

    .request-dates {
        font-size: 13px;
        margin-bottom: 5px;
        color: var(--gray);
    }

    .request-days {
        font-weight: 600;
        margin-bottom: 10px;
    }

    .request-reason {
        font-size: 13px;
        color: var(--gray);
        margin-bottom: 10px;
        padding: 10px;
        background: var(--light);
        border-radius: 8px;
    }

    .request-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        color: var(--gray);
    }

    .request-actions {
        display: flex;
        gap: 5px;
    }

    .employee-item {
        display: flex;
        align-items: center;
        padding: 15px;
        border-bottom: 1px solid var(--border);
        cursor: pointer;
    }

    .employee-item:hover {
        background: var(--light);
    }

    .employee-avatar-container {
        position: relative;
        margin-right: 15px;
    }

    .employee-avatar {
        width: 50px;
        height: 50px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        font-size: 20px;
    }

    .employee-status {
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid white;
    }

    .employee-info {
        flex: 1;
    }

    .employee-name {
        font-weight: 600;
        margin-bottom: 5px;
    }

    .employee-position {
        font-size: 12px;
        color: var(--gray);
        margin-bottom: 3px;
    }

    .employee-department {
        font-size: 11px;
        color: var(--gray);
    }

    .employee-contact {
        display: flex;
        gap: 5px;
    }

    .birthday-item {
        display: flex;
        align-items: center;
        padding: 10px;
        border-bottom: 1px solid var(--border);
    }

    .birthday-avatar {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        margin-right: 15px;
    }

    .birthday-info {
        flex: 1;
    }

    .birthday-name {
        font-weight: 600;
        margin-bottom: 3px;
    }

    .birthday-date {
        font-size: 11px;
        color: var(--gray);
    }

    .birthday-countdown {
        font-size: 12px;
        font-weight: 600;
        color: var(--primary);
    }

    .training-card {
        display: flex;
        align-items: center;
        padding: 15px;
        background: white;
        border-radius: 12px;
        margin-bottom: 10px;
        border: 1px solid var(--border);
        cursor: pointer;
    }

    .training-card.overdue {
        border-left: 4px solid var(--danger);
    }

    .training-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: var(--light);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary);
        margin-right: 15px;
    }

    .training-info {
        flex: 1;
    }

    .training-title {
        font-weight: 600;
        margin-bottom: 5px;
    }

    .training-meta {
        display: flex;
        gap: 15px;
        font-size: 11px;
        color: var(--gray);
        margin-bottom: 10px;
    }

    .training-progress {
        width: 200px;
    }

    .training-deadline {
        font-size: 12px;
        color: var(--gray);
        margin-left: 15px;
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
    }
`;
document.head.appendChild(hrStyles);

// Export HR functions
window.loadHRData = loadHRData;
window.requestLeave = requestLeave;
window.cancelLeaveRequest = cancelLeaveRequest;
window.submitLeaveRequest = submitLeaveRequest;
window.viewEmployeeProfile = viewEmployeeProfile;
window.viewTraining = viewTraining;
