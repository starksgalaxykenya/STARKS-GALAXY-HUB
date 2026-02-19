// Authentication service

// Current user state
let currentUser = null;
let currentUserRole = 'user';
let currentCompany = 'starks';
let currentUserPermissions = {};

// Auth state observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData();
        document.dispatchEvent(new CustomEvent('userLoggedIn', { detail: user }));
    } else {
        currentUser = null;
        document.dispatchEvent(new CustomEvent('userLoggedOut'));
    }
});

// Load user data from Firestore
async function loadUserData() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            currentUserRole = userData.role;
            currentCompany = userData.company || 'starks';
            currentUserPermissions = PERMISSIONS[currentUserRole] || PERMISSIONS.user;
            
            // Update UI
            updateUserInterface(userData);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Update UI with user data
function updateUserInterface(userData) {
    const avatar = document.getElementById('userAvatar');
    if (avatar) {
        avatar.textContent = (userData.name || currentUser.email).charAt(0).toUpperCase();
    }
    
    const dropdownName = document.getElementById('dropdownUserName');
    if (dropdownName) {
        dropdownName.textContent = userData.name || currentUser.email;
    }
    
    const dropdownEmail = document.getElementById('dropdownUserEmail');
    if (dropdownEmail) {
        dropdownEmail.textContent = currentUser.email;
    }
    
    const companyInfo = document.getElementById('currentCompany');
    if (companyInfo) {
        companyInfo.textContent = COMPANIES[currentCompany] || currentCompany;
    }
}

// Login function
async function login(email, password, remember = false) {
    try {
        showLoading();
        
        await auth.setPersistence(
            remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION
        );
        
        const result = await auth.signInWithEmailAndPassword(email, password);
        
        await logAudit('login', 'User logged in');
        hideLoading();
        return result;
        
    } catch (error) {
        hideLoading();
        throw error;
    }
}

// Logout function
async function logout() {
    try {
        await logAudit('logout', 'User logged out');
        await auth.signOut();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Register request
async function requestRegistration(userData) {
    try {
        showLoading();
        
        await db.collection('registrationRequests').add({
            ...userData,
            status: 'pending',
            createdAt: new Date()
        });
        
        hideLoading();
        return true;
        
    } catch (error) {
        hideLoading();
        throw error;
    }
}

// Reset password
async function resetPassword(email) {
    try {
        showLoading();
        await auth.sendPasswordResetEmail(email);
        hideLoading();
        return true;
    } catch (error) {
        hideLoading();
        throw error;
    }
}

// Update user status
async function updateUserStatus(status) {
    if (!currentUser) return;
    
    try {
        await db.collection('users').doc(currentUser.uid).update({
            status: status,
            lastSeen: new Date()
        });
        
        // Update UI
        const statusElement = document.getElementById('userStatus');
        if (statusElement) {
            statusElement.className = `user-status status-${status}`;
        }
        
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

// Get current user
function getCurrentUser() {
    return currentUser;
}

// Get current user role
function getCurrentUserRole() {
    return currentUserRole;
}

// Get current company
function getCurrentCompany() {
    return currentCompany;
}

// Check permission
function hasPermission(permission) {
    return currentUserPermissions && currentUserPermissions[permission] === true;
}

// Export auth functions
window.login = login;
window.logout = logout;
window.requestRegistration = requestRegistration;
window.resetPassword = resetPassword;
window.updateUserStatus = updateUserStatus;
window.getCurrentUser = getCurrentUser;
window.getCurrentUserRole = getCurrentUserRole;
window.getCurrentCompany = getCurrentCompany;
window.hasPermission = hasPermission;
