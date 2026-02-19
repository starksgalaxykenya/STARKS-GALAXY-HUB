// Global constants and configurations

// Company names mapping
const COMPANIES = {
    'starks': 'Starks Galaxy Limited',
    'fortifyai': 'FortifyAI International',
    'epicsounds': 'Epic Sounds RL'
};

// Permission definitions
const PERMISSIONS = {
    superadmin: {
        canManageCompanies: true,
        canManageAllUsers: true,
        canViewAllProjects: true,
        canManagePermissions: true,
        canAccessVault: true,
        canGenerateReports: true,
        canManageBilling: true,
        canDeleteData: true
    },
    admin: {
        canManageUsers: true,
        canViewAllProjects: true,
        canDeleteProjects: true,
        canEditSettings: true,
        canAccessVault: true,
        canGenerateReports: true,
        canManagePermissions: true
    },
    manager: {
        canViewAllProjects: true,
        canManageTeam: true,
        canCreateProjects: true,
        canAccessVault: false,
        canGenerateReports: true,
        canApproveTasks: true
    },
    artist: {
        canViewAssignedProjects: true,
        canUploadPortfolio: true,
        canViewBriefs: true,
        canTrackTime: true,
        canAccessVault: false,
        canGenerateReports: false
    },
    user: {
        canViewAssignedTasks: true,
        canTrackTime: true,
        canUseChat: true,
        canAccessVault: false,
        canGenerateReports: false
    },
    client: {
        canViewClientProjects: true,
        canProvideFeedback: true,
        canViewInvoices: true,
        canDownloadDeliverables: true,
        canUseClientPortal: true
    }
};

// Default module visibility
const DEFAULT_MODULE_VISIBILITY = {
    dashboard: true,
    projects: true,
    tasks: true,
    calendar: true,
    chat: true,
    video: true,
    team: true,
    artists: true,
    portfolio: true,
    briefs: true,
    rights: true,
    gantt: true,
    time: true,
    expenses: true,
    hr: true,
    documents: true,
    vault: false,
    templates: true,
    clients: true,
    portal: true,
    invoices: true,
    reports: true,
    analytics: true,
    workflows: true,
    rules: true,
    admin: false,
    companies: false,
    permissions: false,
    audit: false,
    security: false
};

// Activity types and colors
const ACTIVITY_ICONS = {
    'project': 'fa-project-diagram',
    'task': 'fa-tasks',
    'user': 'fa-user',
    'comment': 'fa-comment',
    'file': 'fa-file',
    'login': 'fa-sign-in-alt',
    'logout': 'fa-sign-out-alt'
};

const ACTIVITY_COLORS = {
    'project': '#6366f1',
    'task': '#10b981',
    'user': '#f59e0b',
    'comment': '#8b5cf6',
    'file': '#3b82f6',
    'login': '#10b981',
    'logout': '#ef4444'
};

// Priority colors
const PRIORITY_COLORS = {
    'low': '#10b981',
    'medium': '#f59e0b',
    'high': '#ef4444',
    'critical': '#7f1d1d'
};

// Phase colors
const PHASE_COLORS = {
    'idea': '#8b5cf6',
    'planning': '#6366f1',
    'execution': '#3b82f6',
    'monitoring': '#10b981',
    'closure': '#f59e0b'
};

// Event type colors
const EVENT_TYPE_COLORS = {
    'meeting': '#6366f1',
    'deadline': '#ef4444',
    'milestone': '#10b981',
    'review': '#f59e0b',
    'holiday': '#8b5cf6',
    'other': '#6b7280'
};

// Export constants
window.COMPANIES = COMPANIES;
window.PERMISSIONS = PERMISSIONS;
window.DEFAULT_MODULE_VISIBILITY = DEFAULT_MODULE_VISIBILITY;
window.ACTIVITY_ICONS = ACTIVITY_ICONS;
window.ACTIVITY_COLORS = ACTIVITY_COLORS;
window.PRIORITY_COLORS = PRIORITY_COLORS;
window.PHASE_COLORS = PHASE_COLORS;
window.EVENT_TYPE_COLORS = EVENT_TYPE_COLORS;
