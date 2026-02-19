// Utility helper functions

// Generate random color from string
function getRandomColor(str) {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
    if (!str) return colors[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

// Get avatar color
function getAvatarColor(name) {
    return getRandomColor(name || 'user');
}

// Get due date color
function getDueDateColor(dateStr) {
    const today = new Date();
    const dueDate = new Date(dateStr);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return '#ef4444';
    if (diffDays <= 2) return '#f59e0b';
    return '#10b981';
}

// Format file size
function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Format date
function formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
}

// Format datetime
function formatDateTime(date) {
    if (!date) return '';
    return new Date(date).toLocaleString();
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show loading overlay
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

// Show error message
function showError(message) {
    // In production, use toast notification
    alert(message);
}

// Show success message
function showSuccess(message) {
    // In production, use toast notification
    alert(message);
}

// Show notification
function showNotification(message, type = 'info') {
    console.log(`${type}: ${message}`);
    // In production, use toast notification system
}

// Export helpers
window.getRandomColor = getRandomColor;
window.getAvatarColor = getAvatarColor;
window.getDueDateColor = getDueDateColor;
window.formatFileSize = formatFileSize;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.debounce = debounce;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showError = showError;
window.showSuccess = showSuccess;
window.showNotification = showNotification;
