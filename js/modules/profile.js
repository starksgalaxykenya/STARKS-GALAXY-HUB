// Profile Module

// Load profile data
async function loadProfile() {
    try {
        showLoading();

        const userDoc = await db.collection('users').doc(getCurrentUser()?.uid).get();
        if (!userDoc.exists) {
            hideLoading();
            return;
        }

        const user = userDoc.data();

        // Update profile display
        document.getElementById('profileAvatar').textContent = (user.name || 'U').charAt(0).toUpperCase();
        document.getElementById('profileName').textContent = user.name || 'Unknown';
        document.getElementById('profileRole').textContent = user.role || 'User';
        document.getElementById('profileCompany').textContent = COMPANIES[user.company] || user.company;

        // Fill form fields
        document.getElementById('profileFullName').value = user.name || '';
        document.getElementById('profileEmail').value = user.email || '';
        document.getElementById('profilePhone').value = user.phone || '';
        document.getElementById('profileDepartment').value = user.department || '';
        document.getElementById('profilePosition').value = user.position || '';
        document.getElementById('profileBio').value = user.bio || '';

        // Load activity history
        await loadUserActivity();

        // Load user statistics
        await loadUserStats();

        hideLoading();

    } catch (error) {
        hideLoading();
        console.error('Error loading profile:', error);
        showError('Failed to load profile');
    }
}

// Load user activity
async function loadUserActivity() {
    try {
        const activities = await db.collection('activities')
            .where('userId', '==', getCurrentUser()?.uid)
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        const list = document.getElementById('userActivity');
        if (!list) return;

        list.innerHTML = '';

        if (activities.empty) {
            list.innerHTML = '<div class="empty-state"><p>No recent activity</p></div>';
            return;
        }

        activities.forEach(doc => {
            const activity = doc.data();
            const date = activity.timestamp?.toDate ? formatRelativeTime(activity.timestamp.toDate()) : '';

            list.innerHTML += `
                <div class="activity-item">
                    <div class="activity-icon" style="background: ${ACTIVITY_COLORS[activity.type] || '#6b7280'}">
                        <i class="fas ${ACTIVITY_ICONS[activity.type] || 'fa-circle'}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-text">${activity.action}</div>
                        <div class="activity-time">${date}</div>
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error('Error loading user activity:', error);
    }
}

// Load user statistics
async function loadUserStats() {
    try {
        // Get task statistics
        const tasks = await db.collection('tasks')
            .where('assignee', '==', getCurrentUser()?.uid)
            .get();

        const completedTasks = tasks.docs.filter(t => t.data().status === 'done').length;
        const pendingTasks = tasks.docs.filter(t => ['todo', 'in-progress'].includes(t.data().status)).length;

        // Get project statistics
        const projects = await db.collection('projects')
            .where('assignees', 'array-contains', getCurrentUser()?.uid)
            .get();

        // Get document statistics
        const documents = await db.collection('documents')
            .where('uploadedBy', '==', getCurrentUser()?.uid)
            .get();

        // Update stats display
        const statsContainer = document.getElementById('userStats');
        if (!statsContainer) return;

        statsContainer.innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${tasks.size}</div>
                <div class="stat-label">Total Tasks</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${completedTasks}</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${pendingTasks}</div>
                <div class="stat-label">Pending</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${projects.size}</div>
                <div class="stat-label">Projects</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${documents.size}</div>
                <div class="stat-label">Documents</div>
            </div>
        `;

    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

// Update profile
async function updateProfile() {
    const name = document.getElementById('profileFullName').value;
    const phone = document.getElementById('profilePhone').value;
    const department = document.getElementById('profileDepartment').value;
    const position = document.getElementById('profilePosition').value;
    const bio = document.getElementById('profileBio').value;

    try {
        showLoading();

        await updateDocument('users', getCurrentUser()?.uid, {
            name,
            phone,
            department,
            position,
            bio,
            updatedAt: new Date()
        });

        // Update display name in auth
        await getCurrentUser()?.updateProfile({
            displayName: name
        });

        await logAudit('profile_update', 'Profile updated');

        showSuccess('Profile updated successfully');
        loadProfile();

    } catch (error) {
        showError('Error updating profile: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Change avatar
function changeAvatar() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            showLoading();

            // Upload to storage
            const storageRef = storage.ref(`avatars/${getCurrentUser()?.uid}`);
            await storageRef.put(file);
            const url = await storageRef.getDownloadURL();

            // Update user document
            await updateDocument('users', getCurrentUser()?.uid, {
                avatar: url
            });

            // Update profile display
            document.getElementById('profileAvatar').innerHTML = `<img src="${url}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;

            showSuccess('Avatar updated successfully');

        } catch (error) {
            showError('Error updating avatar: ' + error.message);
        } finally {
            hideLoading();
        }
    };
    input.click();
}

// Change password
async function changePassword() {
    // Create password change modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Change Password</h3>
                <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form id="changePasswordForm" onsubmit="event.preventDefault(); submitPasswordChange(this)">
                <div class="form-group">
                    <label>Current Password</label>
                    <input type="password" id="currentPassword" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>New Password</label>
                    <input type="password" id="newPassword" class="form-control" required>
                    <small class="form-text">Minimum 8 characters, at least 1 number and 1 special character</small>
                </div>
                <div class="form-group">
                    <label>Confirm New Password</label>
                    <input type="password" id="confirmPassword" class="form-control" required>
                </div>
                <button type="submit" class="btn btn-primary">Update Password</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
}

// Submit password change
async function submitPasswordChange(form) {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showError('Please fill in all fields');
        return;
    }

    if (newPassword !== confirmPassword) {
        showError('New passwords do not match');
        return;
    }

    if (!isStrongPassword(newPassword)) {
        showError('Password must be at least 8 characters with 1 number and 1 special character');
        return;
    }

    try {
        showLoading();

        // Re-authenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(
            getCurrentUser()?.email,
            currentPassword
        );
        await getCurrentUser()?.reauthenticateWithCredential(credential);

        // Update password
        await getCurrentUser()?.updatePassword(newPassword);

        await logAudit('password_change', 'Password changed');

        hideLoading();
        document.querySelector('.modal.active').remove();
        showSuccess('Password updated successfully');

    } catch (error) {
        hideLoading();
        if (error.code === 'auth/wrong-password') {
            showError('Current password is incorrect');
        } else {
            showError('Error changing password: ' + error.message);
        }
    }
}

// Update notification settings
async function updateNotificationSettings(setting, value) {
    try {
        const userDoc = await db.collection('users').doc(getCurrentUser()?.uid).get();
        const settings = userDoc.data()?.settings || {};

        settings.notifications = {
            ...settings.notifications,
            [setting]: value
        };

        await updateDocument('users', getCurrentUser()?.uid, { settings });

        showSuccess('Notification settings updated');

    } catch (error) {
        showError('Error updating settings: ' + error.message);
    }
}

// Update privacy settings
async function updatePrivacySetting(setting, value) {
    try {
        await updateDocument('users', getCurrentUser()?.uid, {
            [`privacy.${setting}`]: value
        });

        showSuccess('Privacy setting updated');

    } catch (error) {
        showError('Error updating privacy setting: ' + error.message);
    }
}

// Change theme
function changeTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    showSuccess(`Theme changed to ${theme}`);
}

// Change font size
function changeFontSize(size) {
    const sizes = {
        'small': '14px',
        'medium': '16px',
        'large': '18px'
    };
    document.documentElement.style.fontSize = sizes[size];
    localStorage.setItem('fontSize', size);
}

// Toggle compact mode
function toggleCompact() {
    const isCompact = localStorage.getItem('compactMode') === 'true';
    localStorage.setItem('compactMode', (!isCompact).toString());
    
    if (!isCompact) {
        document.body.classList.add('compact-mode');
    } else {
        document.body.classList.remove('compact-mode');
    }
    
    showSuccess('Display mode updated');
}

// Export profile functions
window.loadProfile = loadProfile;
window.updateProfile = updateProfile;
window.changeAvatar = changeAvatar;
window.changePassword = changePassword;
window.submitPasswordChange = submitPasswordChange;
window.updateNotificationSettings = updateNotificationSettings;
window.updatePrivacySetting = updatePrivacySetting;
window.changeTheme = changeTheme;
window.changeFontSize = changeFontSize;
window.toggleCompact = toggleCompact;
