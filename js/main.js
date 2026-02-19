// Main application entry point

// Global state
let moduleVisibility = { ...DEFAULT_MODULE_VISIBILITY };
let charts = {};
let quillEditors = {};

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize services
    initOfflineDetection();
    initKeyboardShortcuts();
    
    // Check auth state
    if (auth.currentUser) {
        await initializeApp();
    }
    
    // Setup company selector
    document.querySelectorAll('.company-badge').forEach(badge => {
        badge.addEventListener('click', function() {
            document.querySelectorAll('.company-badge').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCompany = this.dataset.company;
        });
    });
});

// Initialize app after login
async function initializeApp() {
    try {
        showLoading();
        
        // Load user data
        await loadUserData();
        
        // Load module visibility
        await loadModuleVisibility();
        
        // Load dashboard data
        await loadDashboardData();
        
        // Load notifications
        await loadNotifications();
        
        // Initialize UI components
        initializeCalendar();
        initializeCharts();
        initializeRichTextEditors();
        
        // Setup real-time listeners
        setupRealtimeListeners();
        
        // Apply permissions
        applyPermissions();
        
        // Check first time user
        checkFirstTimeUser();
        
        hideLoading();
        
    } catch (error) {
        hideLoading();
        console.error('Error initializing app:', error);
        showError('Failed to initialize application');
    }
}

// Load module visibility settings
async function loadModuleVisibility() {
    try {
        const settingsDoc = await db.collection('settings').doc('moduleVisibility').get();
        if (settingsDoc.exists) {
            moduleVisibility = { ...moduleVisibility, ...settingsDoc.data() };
        }
        applyModuleVisibility();
    } catch (error) {
        console.error('Error loading module visibility:', error);
    }
}

// Apply module visibility to menu
function applyModuleVisibility() {
    for (const [module, visible] of Object.entries(moduleVisibility)) {
        const menuItem = document.querySelector(`.menu-item[onclick="switchTab('${module}')"]`);
        if (menuItem) {
            menuItem.style.display = visible ? 'flex' : 'none';
        }
    }
}

// Apply permissions-based UI changes
function applyPermissions() {
    if (!hasPermission('canAccessVault')) {
        const vaultItem = document.querySelector('.menu-item[onclick="switchTab(\'vault\')"]');
        if (vaultItem) vaultItem.style.display = 'none';
    }
    
    if (!hasPermission('canGenerateReports')) {
        const reportsItem = document.querySelector('.menu-item[onclick="switchTab(\'reports\')"]');
        if (reportsItem) reportsItem.style.display = 'none';
    }
    
    if (getCurrentUserRole() === 'client') {
        const quickActions = document.getElementById('quickActions');
        if (quickActions) quickActions.style.display = 'none';
    }
}

// Setup real-time listeners
function setupRealtimeListeners() {
    // Listen for new projects
    db.collection('projects')
        .where('company', '==', getCurrentCompany())
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    createNotification(
                        getCurrentUser().uid, 
                        'New project created: ' + change.doc.data().name
                    );
                    loadDashboardData();
                }
            });
        });

    // Listen for tasks assigned to current user
    if (getCurrentUser()) {
        db.collection('tasks')
            .where('assignee', '==', getCurrentUser().uid)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        createNotification(
                            getCurrentUser().uid, 
                            'New task assigned to you'
                        );
                        if (typeof loadMyTasks === 'function') {
                            loadMyTasks();
                        }
                    }
                });
            });
    }
}

// Initialize rich text editors
function initializeRichTextEditors() {
    // Initialize Quill editors if they exist
    const editors = document.querySelectorAll('.quill-editor');
    editors.forEach((editor, index) => {
        quillEditors[`editor${index}`] = new Quill(editor, {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    ['link', 'blockquote', 'code-block'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }]
                ]
            }
        });
    });
}

// Check if first time user and start onboarding
function checkFirstTimeUser() {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial && typeof startOnboarding === 'function') {
        startOnboarding();
    }
}

// Switch between tabs
function switchTab(tabName) {
    // Update menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeMenuItem = event?.target?.closest('.menu-item');
    if (activeMenuItem) {
        activeMenuItem.classList.add('active');
    }

    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    // Show selected tab
    const tabElement = document.getElementById(tabName + 'Tab');
    if (tabElement) {
        tabElement.style.display = 'block';
    }
    
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = capitalizeFirst(tabName);
    }

    // Load tab-specific data
    loadTabData(tabName);
}

// Load data for specific tab
function loadTabData(tabName) {
    switch(tabName) {
        case 'projects':
            if (typeof loadAllProjects === 'function') loadAllProjects();
            break;
        case 'tasks':
            if (typeof loadMyTasks === 'function') loadMyTasks();
            break;
        case 'chat':
            if (typeof loadChannels === 'function') loadChannels();
            break;
        case 'artists':
            if (typeof loadArtistData === 'function') loadArtistData();
            break;
        case 'gantt':
            if (typeof loadProjectSelectors === 'function') loadProjectSelectors();
            break;
        case 'time':
            if (typeof loadTimesheet === 'function') loadTimesheet();
            break;
        case 'expenses':
            if (typeof loadExpenses === 'function') loadExpenses();
            break;
        case 'hr':
            if (typeof loadHRData === 'function') loadHRData();
            break;
        case 'documents':
            if (typeof loadDocuments === 'function') loadDocuments();
            break;
        case 'clients':
            if (typeof loadClients === 'function') loadClients();
            break;
        case 'reports':
            if (typeof loadRecentReports === 'function') loadRecentReports();
            break;
        case 'admin':
            if (typeof loadUserManagement === 'function') loadUserManagement();
            break;
        case 'audit':
            if (typeof loadAuditLog === 'function') loadAuditLog();
            break;
        case 'profile':
            if (typeof loadProfile === 'function') loadProfile();
            break;
    }
}

// Log audit events
async function logAudit(action, details) {
    if (!getCurrentUser()) return;
    
    try {
        await db.collection('audit').add({
            userId: getCurrentUser().uid,
            userEmail: getCurrentUser().email,
            userName: getCurrentUser().displayName || getCurrentUser().email,
            action: action,
            details: details,
            company: getCurrentCompany(),
            timestamp: new Date(),
            userAgent: navigator.userAgent
        });
    } catch (error) {
        console.error('Error logging audit:', error);
    }
}

// Export main functions
window.switchTab = switchTab;
window.logAudit = logAudit;
window.initializeApp = initializeApp;
