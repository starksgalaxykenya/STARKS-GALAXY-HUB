// Keyboard shortcut handling

// Shortcut definitions
const SHORTCUTS = {
    'search': { key: 'k', ctrl: true, action: 'Focus search' },
    'newTask': { key: 't', ctrl: true, action: 'Create new task' },
    'newProject': { key: 'p', ctrl: true, action: 'Create new project' },
    'save': { key: 's', ctrl: true, action: 'Save current item' },
    'dashboard': { key: 'd', ctrl: true, action: 'Go to dashboard' },
    'tasks': { key: 't', ctrl: true, shift: true, action: 'Go to tasks' },
    'chat': { key: 'c', ctrl: true, action: 'Open chat' },
    'toggleSidebar': { key: 'b', ctrl: true, action: 'Toggle sidebar' },
    'quickActions': { key: '/', ctrl: true, action: 'Show quick actions' },
    'help': { key: '?', action: 'Show help' }
};

// Initialize keyboard shortcuts
function initKeyboardShortcuts() {
    document.addEventListener('keydown', handleKeyDown);
}

// Handle keydown events
function handleKeyDown(e) {
    // Don't trigger shortcuts when typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }

    // Search: Ctrl/Cmd + K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('globalSearch')?.focus();
    }
    
    // New Task: Ctrl/Cmd + T
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        if (typeof window.openTaskModal === 'function') {
            window.openTaskModal();
        }
    }
    
    // New Project: Ctrl/Cmd + P
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        if (typeof window.openProjectModal === 'function') {
            window.openProjectModal();
        }
    }
    
    // Dashboard: Ctrl/Cmd + D
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (typeof window.switchTab === 'function') {
            window.switchTab('dashboard');
        }
    }
    
    // Quick Actions: Ctrl/Cmd + /
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        highlightQuickActions();
    }
    
    // Help: ?
    if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (typeof window.showKeyboardShortcuts === 'function') {
            window.showKeyboardShortcuts();
        }
    }
}

// Highlight quick actions bar
function highlightQuickActions() {
    const quickActions = document.getElementById('quickActions');
    if (quickActions) {
        quickActions.style.animation = 'pulse 1s';
        setTimeout(() => {
            quickActions.style.animation = '';
        }, 1000);
    }
}

// Show keyboard shortcuts modal
function showKeyboardShortcuts() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) {
        modal.classList.add('active');
    }
}

// Close keyboard shortcuts modal
function closeKeyboardShortcuts() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Export keyboard functions
window.initKeyboardShortcuts = initKeyboardShortcuts;
window.showKeyboardShortcuts = showKeyboardShortcuts;
window.closeKeyboardShortcuts = closeKeyboardShortcuts;
