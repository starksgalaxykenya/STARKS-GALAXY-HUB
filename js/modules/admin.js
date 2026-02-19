// Admin Module

// Load user management
async function loadUserManagement() {
    try {
        const users = await db.collection('users')
            .where('company', '==', getCurrentCompany())
            .orderBy('createdAt', 'desc')
            .get();
            
        const list = document.getElementById('userManagementList');
        if (!list) return;

        list.innerHTML = '';

        if (users.empty) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No users found</p></div>';
            return;
        }

        users.forEach(doc => {
            const user = doc.data();
            const statusColor = {
                'online': 'var(--success)',
                'away': 'var(--warning)',
                'busy': 'var(--danger)',
                'offline': 'var(--gray)'
            }[user.status] || 'var(--gray)';

            const userDiv = document.createElement('div');
            userDiv.className = 'admin-user-item';
            userDiv.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar-container">
                        <div class="user-avatar" style="background: ${getAvatarColor(user.name)}">
                            ${(user.name || user.email).charAt(0).toUpperCase()}
                        </div>
                        <span class="user-status" style="background: ${statusColor}"></span>
                    </div>
                    <div class="user-details">
                        <div class="user-name">${user.name || 'No name'}</div>
                        <div class="user-email">${user.email}</div>
                        <div class="user-meta">
                            <span>${user.position || 'No position'}</span>
                            <span>•</span>
                            <span>${user.department || 'No department'}</span>
                        </div>
                    </div>
                </div>
                <div class="user-controls">
                    <select class="form-control role-select" onchange="updateUserRole('${doc.id}', this.value)">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>Manager</option>
                        <option value="artist" ${user.role === 'artist' ? 'selected' : ''}>Artist</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        <option value="client" ${user.role === 'client' ? 'selected' : ''}>Client</option>
                    </select>
                    <button class="btn-icon" onclick="editUser('${doc.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="deleteUser('${doc.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            list.appendChild(userDiv);
        });

        // Add search functionality
        setupUserSearch();

    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users');
    }
}

// Setup user search
function setupUserSearch() {
    const searchInput = document.getElementById('userSearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', debounce((e) => {
        const searchTerm = e.target.value.toLowerCase();
        const users = document.querySelectorAll('.admin-user-item');

        users.forEach(user => {
            const name = user.querySelector('.user-name')?.textContent.toLowerCase() || '';
            const email = user.querySelector('.user-email')?.textContent.toLowerCase() || '';
            const matches = name.includes(searchTerm) || email.includes(searchTerm);
            user.style.display = matches ? 'flex' : 'none';
        });
    }, 300));
}

// Open user modal
function openUserModal() {
    openModal('userModal');
}

// Close user modal
function closeUserModal() {
    closeModal('userModal');
    document.getElementById('userForm').reset();
}

// Add new user
async function addUser() {
    const name = document.getElementById('newUserName').value;
    const email = document.getElementById('newUserEmail').value;
    const company = document.getElementById('newUserCompany').value;
    const department = document.getElementById('newUserDepartment').value;
    const position = document.getElementById('newUserPosition').value;
    const role = document.getElementById('newUserRole').value;
    const sendInvite = document.getElementById('sendInvite').checked;

    if (!name || !email) {
        showError('Please fill in required fields');
        return;
    }

    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }

    try {
        showLoading();

        // Generate temporary password
        const tempPassword = generateTempPassword();

        // Create user in Firebase Auth (this would normally be done via Admin SDK)
        // For demo, we'll create in Firestore
        const userData = {
            name,
            email,
            company,
            department,
            position,
            role,
            status: sendInvite ? 'invited' : 'pending',
            createdAt: new Date(),
            createdBy: getCurrentUser()?.uid,
            settings: {
                notifications: true,
                theme: 'light'
            },
            leaveBalance: {
                vacation: 20,
                sick: 10,
                personal: 5,
                unpaid: 0
            }
        };

        const userRef = await db.collection('users').add(userData);

        if (sendInvite) {
            // Create invitation notification
            await createNotification(
                userRef.id,
                `Welcome to Starks Galaxy Hub! Your account has been created.`,
                'Account Created',
                'success'
            );

            // Send email (simulated)
            await db.collection('emailQueue').add({
                to: email,
                subject: 'Welcome to Starks Galaxy Hub',
                template: 'welcome',
                data: {
                    name,
                    email,
                    tempPassword,
                    loginUrl: window.location.origin
                },
                status: 'pending',
                createdAt: new Date()
            });
        }

        await logAudit('user_create', `User created: ${name} (${role})`);

        hideLoading();
        closeUserModal();
        showSuccess('User added successfully');
        loadUserManagement();

    } catch (error) {
        hideLoading();
        showError('Error adding user: ' + error.message);
    }
}

// Generate temporary password
function generateTempPassword() {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

// Edit user
async function editUser(userId) {
    const user = await getDocument('users', userId);
    if (!user) return;

    // Create edit modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Edit User</h3>
                <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form id="editUserForm" onsubmit="event.preventDefault(); updateUser('${userId}', this)">
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" id="editUserName" class="form-control" value="${user.name || ''}" required>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="editUserEmail" class="form-control" value="${user.email || ''}" required disabled>
                </div>
                <div class="form-group">
                    <label>Department</label>
                    <input type="text" id="editUserDepartment" class="form-control" value="${user.department || ''}">
                </div>
                <div class="form-group">
                    <label>Position</label>
                    <input type="text" id="editUserPosition" class="form-control" value="${user.position || ''}">
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <select id="editUserRole" class="form-control">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>Manager</option>
                        <option value="artist" ${user.role === 'artist' ? 'selected' : ''}>Artist</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        <option value="client" ${user.role === 'client' ? 'selected' : ''}>Client</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="editUserStatus" class="form-control">
                        <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                        <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Update User</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
}

// Update user
async function updateUser(userId, form) {
    const name = document.getElementById('editUserName').value;
    const department = document.getElementById('editUserDepartment').value;
    const position = document.getElementById('editUserPosition').value;
    const role = document.getElementById('editUserRole').value;
    const status = document.getElementById('editUserStatus').value;

    try {
        showLoading();

        await updateDocument('users', userId, {
            name,
            department,
            position,
            role,
            status,
            updatedAt: new Date()
        });

        await logAudit('user_update', `User ${userId} updated`);

        hideLoading();
        document.querySelector('.modal.active').remove();
        showSuccess('User updated successfully');
        loadUserManagement();

    } catch (error) {
        hideLoading();
        showError('Error updating user: ' + error.message);
    }
}

// Update user role
async function updateUserRole(userId, newRole) {
    try {
        await updateDocument('users', userId, { role: newRole });
        await logAudit('user_role_update', `User ${userId} role changed to ${newRole}`);
        showSuccess('User role updated');
    } catch (error) {
        showError('Error updating role: ' + error.message);
    }
}

// Delete user
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
        showLoading();

        // Delete user's data
        const user = await getDocument('users', userId);
        
        // Delete user's files from storage
        const files = await db.collection('documents')
            .where('uploadedBy', '==', userId)
            .get();

        const batch = db.batch();
        
        files.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete user
        batch.delete(db.collection('users').doc(userId));

        await batch.commit();

        await logAudit('user_delete', `User ${userId} deleted`);

        showSuccess('User deleted');
        loadUserManagement();

    } catch (error) {
        showError('Error deleting user: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Load companies
async function loadCompanies() {
    try {
        const companies = await db.collection('companies')
            .orderBy('name')
            .get();

        const list = document.getElementById('subsidiariesList');
        if (!list) return;

        list.innerHTML = '';

        companies.forEach(doc => {
            const company = doc.data();
            list.innerHTML += `
                <div class="company-item">
                    <div class="company-logo" style="background: ${company.color || 'linear-gradient(135deg, var(--primary), var(--secondary))'};">
                        ${company.logo ? `<img src="${company.logo}" alt="${company.name}">` : company.name.charAt(0)}
                    </div>
                    <div class="company-details">
                        <div class="company-name">${company.name}</div>
                        <div class="company-domain">${company.domain || 'No domain'}</div>
                        <div class="company-stats">
                            <span><i class="fas fa-users"></i> ${company.userCount || 0} users</span>
                            <span><i class="fas fa-project-diagram"></i> ${company.projectCount || 0} projects</span>
                        </div>
                    </div>
                    <div class="company-actions">
                        <button class="btn-icon" onclick="editCompany('${doc.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="deleteCompany('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error('Error loading companies:', error);
    }
}

// Add company
function addCompany() {
    openModal('companyModal');
}

// Close company modal
function closeCompanyModal() {
    closeModal('companyModal');
    document.getElementById('companyForm').reset();
}

// Create company
async function createCompany() {
    const name = document.getElementById('companyName').value;
    const code = document.getElementById('companyCode').value;
    const domain = document.getElementById('companyDomain').value;
    const color = document.getElementById('companyColor').value;
    const plan = document.getElementById('companyPlan').value;
    const maxUsers = parseInt(document.getElementById('companyMaxUsers').value);
    const logoFile = document.getElementById('companyLogo').files[0];

    if (!name) {
        showError('Please enter company name');
        return;
    }

    try {
        showLoading();

        let logoUrl = null;

        // Upload logo if provided
        if (logoFile) {
            const storageRef = storage.ref(`companies/${Date.now()}_${logoFile.name}`);
            await storageRef.put(logoFile);
            logoUrl = await storageRef.getDownloadURL();
        }

        const companyData = {
            name,
            code,
            domain,
            color,
            plan,
            maxUsers,
            logo: logoUrl,
            userCount: 0,
            projectCount: 0,
            createdAt: new Date(),
            createdBy: getCurrentUser()?.uid
        };

        await db.collection('companies').add(companyData);

        await logAudit('company_create', `Company created: ${name}`);

        hideLoading();
        closeCompanyModal();
        showSuccess('Company created successfully');
        loadCompanies();

    } catch (error) {
        hideLoading();
        showError('Error creating company: ' + error.message);
    }
}

// Load system settings
async function loadSystemSettings() {
    try {
        const settings = await db.collection('settings').doc('system').get();
        const data = settings.exists ? settings.data() : {};

        document.getElementById('twoFAEnforcement').value = data.twoFAEnforcement || 'optional';
        document.getElementById('sessionTimeout').value = data.sessionTimeout || 30;
        document.getElementById('passwordPolicy').value = data.passwordPolicy || 'medium';

    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save security settings
async function saveSecuritySettings() {
    const twoFA = document.getElementById('twoFAEnforcement').value;
    const timeout = document.getElementById('sessionTimeout').value;
    const passwordPolicy = document.getElementById('passwordPolicy').value;

    try {
        showLoading();

        await db.collection('settings').doc('system').set({
            twoFAEnforcement: twoFA,
            sessionTimeout: parseInt(timeout),
            passwordPolicy,
            updatedAt: new Date(),
            updatedBy: getCurrentUser()?.uid
        });

        await logAudit('security_update', 'Security settings updated');

        showSuccess('Security settings saved');

    } catch (error) {
        showError('Error saving settings: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Add CSS for admin module
const adminStyles = document.createElement('style');
adminStyles.textContent = `
    .admin-user-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        border-bottom: 1px solid var(--border);
    }

    .admin-user-item:hover {
        background: var(--light);
    }

    .user-info {
        display: flex;
        align-items: center;
        gap: 15px;
    }

    .user-avatar-container {
        position: relative;
    }

    .user-avatar {
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

    .user-status {
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid white;
    }

    .user-details {
        flex: 1;
    }

    .user-name {
        font-weight: 600;
        margin-bottom: 3px;
    }

    .user-email {
        font-size: 12px;
        color: var(--gray);
        margin-bottom: 3px;
    }

    .user-meta {
        font-size: 11px;
        color: var(--gray);
    }

    .user-controls {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .role-select {
        width: 120px;
    }

    .company-item {
        display: flex;
        align-items: center;
        padding: 15px;
        background: white;
        border-radius: 12px;
        margin-bottom: 10px;
        border: 1px solid var(--border);
    }

    .company-logo {
        width: 50px;
        height: 50px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        margin-right: 15px;
        overflow: hidden;
    }

    .company-logo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .company-details {
        flex: 1;
    }

    .company-name {
        font-weight: 600;
        margin-bottom: 5px;
    }

    .company-domain {
        font-size: 12px;
        color: var(--gray);
        margin-bottom: 5px;
    }

    .company-stats {
        display: flex;
        gap: 15px;
        font-size: 11px;
        color: var(--gray);
    }

    .company-actions {
        display: flex;
        gap: 5px;
    }
`;
document.head.appendChild(adminStyles);

// Export admin functions
window.loadUserManagement = loadUserManagement;
window.openUserModal = openUserModal;
window.closeUserModal = closeUserModal;
window.addUser = addUser;
window.editUser = editUser;
window.updateUser = updateUser;
window.updateUserRole = updateUserRole;
window.deleteUser = deleteUser;
window.loadCompanies = loadCompanies;
window.addCompany = addCompany;
window.closeCompanyModal = closeCompanyModal;
window.createCompany = createCompany;
window.loadSystemSettings = loadSystemSettings;
window.saveSecuritySettings = saveSecuritySettings;
