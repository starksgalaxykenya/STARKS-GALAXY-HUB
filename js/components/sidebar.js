// Sidebar component

// Toggle sidebar collapsed state
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
        
        // Update chevron icon
        const chevron = sidebar.querySelector('.fa-chevron-left');
        if (chevron) {
            chevron.style.transform = sidebar.classList.contains('collapsed') ? 'rotate(180deg)' : '';
        }
    }
}

// Toggle mobile sidebar
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('mobile-open');
    }
}

// Close mobile sidebar when clicking outside
document.addEventListener('click', (event) => {
    const sidebar = document.getElementById('sidebar');
    const menuIcon = document.querySelector('.fa-bars');
    
    if (sidebar && sidebar.classList.contains('mobile-open')) {
        if (!sidebar.contains(event.target) && !menuIcon?.contains(event.target)) {
            sidebar.classList.remove('mobile-open');
        }
    }
});

// Update sidebar based on user role
function updateSidebarForRole(role) {
    const adminSection = document.getElementById('adminMenuSection');
    if (adminSection) {
        adminSection.style.display = (role === 'admin' || role === 'superadmin') ? 'block' : 'none';
    }
    
    // Hide artist panel for non-artists
    const artistItem = document.querySelector('.menu-item[onclick="switchTab(\'artists\')"]');
    if (artistItem) {
        artistItem.style.display = (role === 'artist' || role === 'admin') ? 'flex' : 'none';
    }
    
    // Hide client portal for non-clients
    const portalItem = document.querySelector('.menu-item[onclick="switchTab(\'portal\')"]');
    if (portalItem) {
        portalItem.style.display = (role === 'client') ? 'flex' : 'none';
    }
}

// Export sidebar functions
window.toggleSidebar = toggleSidebar;
window.toggleMobileSidebar = toggleMobileSidebar;
window.updateSidebarForRole = updateSidebarForRole;
