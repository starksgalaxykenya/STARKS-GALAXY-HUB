// Authentication module

// Show login form
function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('forgotPasswordForm').style.display = 'none';
}

// Show register form
function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('forgotPasswordForm').style.display = 'none';
}

// Show forgot password form
function showForgotPassword() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('forgotPasswordForm').style.display = 'block';
}

// Handle login
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const remember = document.getElementById('rememberMe')?.checked || false;

    if (!email || !password) {
        showError('Please enter email and password');
        return;
    }

    try {
        showLoading();
        await login(email, password, remember);
        hideLoading();
        showSuccess('Login successful!');
    } catch (error) {
        hideLoading();
        showError('Login failed: ' + error.message);
    }
}

// Handle registration request
async function handleRegister() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const company = document.getElementById('regCompany').value;
    const department = document.getElementById('regDepartment').value;
    const role = document.getElementById('regRole').value;

    if (!name || !email) {
        showError('Please fill in all required fields');
        return;
    }

    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }

    try {
        showLoading();
        await requestRegistration({
            name,
            email,
            company,
            department,
            role
        });
        hideLoading();
        showSuccess('Registration request submitted. An admin will review your account.');
        showLogin();
    } catch (error) {
        hideLoading();
        showError('Registration failed: ' + error.message);
    }
}

// Handle logout
async function handleLogout() {
    try {
        showLoading();
        await logout();
        hideLoading();
        showSuccess('Logged out successfully');
    } catch (error) {
        hideLoading();
        showError('Logout failed: ' + error.message);
    }
}

// Handle password reset
async function handleResetPassword() {
    const email = document.getElementById('resetEmail').value;

    if (!email) {
        showError('Please enter your email');
        return;
    }

    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }

    try {
        showLoading();
        await resetPassword(email);
        hideLoading();
        showSuccess('Password reset email sent! Check your inbox.');
        showLogin();
    } catch (error) {
        hideLoading();
        showError('Error: ' + error.message);
    }
}

// Update user status
async function updateStatus(status) {
    try {
        await updateUserStatus(status);
        showSuccess(`Status updated to ${status}`);
    } catch (error) {
        showError('Error updating status: ' + error.message);
    }
}

// Toggle user menu
function toggleUserMenu() {
    document.getElementById('userDropdown').classList.toggle('active');
}

// Close user menu when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('userDropdown');
    const avatar = document.getElementById('userAvatar');
    if (avatar && dropdown && !avatar.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.classList.remove('active');
    }
});

// Export auth functions
window.showLogin = showLogin;
window.showRegister = showRegister;
window.showForgotPassword = showForgotPassword;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.handleResetPassword = handleResetPassword;
window.updateStatus = updateStatus;
window.toggleUserMenu = toggleUserMenu;
