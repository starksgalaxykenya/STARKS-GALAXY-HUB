// Notification service

let notifications = [];
let unsubscribeNotifications = null;

// Load notifications for current user
async function loadNotifications() {
    if (!getCurrentUser()) return;
    
    const notificationsRef = db.collection('notifications')
        .where('userId', '==', getCurrentUser().uid)
        .orderBy('createdAt', 'desc')
        .limit(50);
    
    unsubscribeNotifications = notificationsRef.onSnapshot((snapshot) => {
        notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateNotificationBadge();
        renderNotifications();
    });
}

// Update notification badge
function updateNotificationBadge() {
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationCount');
    if (badge) {
        badge.textContent = unreadCount;
    }
}

// Render notifications in panel
function renderNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (notifications.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="far fa-bell"></i><p>No notifications</p></div>';
        return;
    }
    
    notifications.forEach(notification => {
        const date = notification.createdAt?.toDate ? 
            formatRelativeTime(notification.createdAt.toDate()) : '';
        
        const item = document.createElement('div');
        item.className = `notification-item ${notification.read ? '' : 'unread'}`;
        item.onclick = () => markNotificationAsRead(notification.id);
        
        item.innerHTML = `
            <div class="notification-title">${notification.title || 'Notification'}</div>
            <div class="notification-message">${notification.message}</div>
            <div class="notification-time">${date}</div>
        `;
        
        list.appendChild(item);
    });
}

// Create new notification
async function createNotification(userId, message, title = 'Notification', type = 'info') {
    try {
        await db.collection('notifications').add({
            userId: userId,
            title: title,
            message: message,
            type: type,
            read: false,
            createdAt: new Date()
        });
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

// Mark notification as read
async function markNotificationAsRead(notificationId) {
    try {
        await db.collection('notifications').doc(notificationId).update({
            read: true
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Mark all notifications as read
async function markAllAsRead() {
    const unread = notifications.filter(n => !n.read);
    
    const batch = db.batch();
    unread.forEach(notification => {
        const ref = db.collection('notifications').doc(notification.id);
        batch.update(ref, { read: true });
    });
    
    try {
        await batch.commit();
    } catch (error) {
        console.error('Error marking all as read:', error);
    }
}

// Clear all notifications
async function clearAllNotifications() {
    const batch = db.batch();
    notifications.forEach(notification => {
        const ref = db.collection('notifications').doc(notification.id);
        batch.delete(ref);
    });
    
    try {
        await batch.commit();
    } catch (error) {
        console.error('Error clearing notifications:', error);
    }
}

// Toggle notification panel
function toggleNotifications() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.classList.toggle('active');
    }
}

// Show toast notification (for in-app messages)
function showToast(message, type = 'info', duration = 3000) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${getToastIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    // Style toast
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Remove after duration
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Get toast icon based on type
function getToastIcon(type) {
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    return icons[type] || 'fa-info-circle';
}

// Export notification functions
window.loadNotifications = loadNotifications;
window.createNotification = createNotification;
window.markNotificationAsRead = markNotificationAsRead;
window.markAllAsRead = markAllAsRead;
window.clearAllNotifications = clearAllNotifications;
window.toggleNotifications = toggleNotifications;
window.showToast = showToast;
