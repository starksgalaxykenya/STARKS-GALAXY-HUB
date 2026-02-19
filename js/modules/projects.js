// Projects module

// Open project modal
function openProjectModal() {
    openModal('projectModal');
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('projectStartDate').value = today;
    
    // Load users for assignees
    loadUsersForProject();
    
    // Initialize rich text editor
    if (!quillEditors.projectDescription) {
        quillEditors.projectDescription = new Quill('#projectDescriptionEditor', {
            theme: 'snow',
            placeholder: 'Enter project description...',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    ['link', 'blockquote', 'code-block'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }]
                ]
            }
        });
    }
}

// Close project modal
function closeProjectModal() {
    closeModal('projectModal');
    document.getElementById('projectForm').reset();
    document.getElementById('milestonesList').innerHTML = '';
    document.getElementById('projectFilePreview').innerHTML = '';
}

// Load users for project assignees
async function loadUsersForProject() {
    try {
        const users = await queryDocuments('users', []);
        const select = document.getElementById('projectAssignees');
        if (!select) return;
        
        select.innerHTML = '';
        
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name || user.email;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Add milestone to project
function addMilestone() {
    const milestonesList = document.getElementById('milestonesList');
    const milestoneDiv = document.createElement('div');
    milestoneDiv.className = 'milestone-item';
    milestoneDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px;';
    
    milestoneDiv.innerHTML = `
        <input type="text" class="form-control milestone-name" placeholder="Milestone name" style="flex: 2;">
        <input type="date" class="form-control milestone-date" style="flex: 1;">
        <input type="number" class="form-control milestone-budget" placeholder="Budget" style="flex: 1;">
        <button type="button" class="btn btn-danger btn-sm" style="width: 40px;" onclick="this.parentElement.remove()">×</button>
    `;
    
    milestonesList.appendChild(milestoneDiv);
}

// Handle project file uploads
function handleProjectFiles(files) {
    const preview = document.getElementById('projectFilePreview');
    preview.innerHTML = '';
    
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML += `
                <div class="file-preview-item">
                    ${file.type.startsWith('image/') ? 
                        `<img src="${e.target.result}" alt="${file.name}">` : 
                        `<i class="fas fa-file" style="font-size: 40px; color: var(--primary);"></i>`
                    }
                    <div class="file-preview-remove" onclick="this.parentElement.remove()">×</div>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    });
}

// Create new project
async function createProject() {
    const name = document.getElementById('projectName').value;
    const code = document.getElementById('projectCode').value;
    const company = document.getElementById('projectCompany').value;
    const department = document.getElementById('projectDepartment').value;
    const phase = document.getElementById('projectPhase').value;
    const priority = document.getElementById('projectPriority').value;
    const startDate = document.getElementById('projectStartDate').value;
    const deadline = document.getElementById('projectDeadline').value;
    const budget = document.getElementById('projectBudget').value;
    const currency = document.getElementById('projectCurrency').value;
    const tags = document.getElementById('projectTags').value;
    const assignees = Array.from(document.getElementById('projectAssignees').selectedOptions).map(opt => opt.value);

    if (!name) {
        showError('Please enter a project name');
        return;
    }

    // Get description from Quill editor
    const description = quillEditors.projectDescription ? quillEditors.projectDescription.root.innerHTML : '';

    // Get milestones
    const milestoneNames = document.querySelectorAll('.milestone-name');
    const milestoneDates = document.querySelectorAll('.milestone-date');
    const milestoneBudgets = document.querySelectorAll('.milestone-budget');
    const milestones = [];

    for (let i = 0; i < milestoneNames.length; i++) {
        if (milestoneNames[i].value) {
            milestones.push({
                name: milestoneNames[i].value,
                date: milestoneDates[i].value,
                budget: parseFloat(milestoneBudgets[i]?.value) || 0,
                completed: false
            });
        }
    }

    try {
        showLoading();

        const projectData = {
            name,
            code,
            description,
            company,
            department,
            phase,
            priority,
            startDate,
            deadline,
            budget: parseFloat(budget) || 0,
            currency,
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            assignees,
            milestones,
            createdBy: getCurrentUser()?.uid,
            createdAt: new Date(),
            status: 'active',
            progress: 0,
            spent: 0
        };

        const projectRef = await createDocument('projects', projectData);

        // Upload files if any
        const files = document.getElementById('projectFiles').files;
        if (files.length > 0) {
            for (let file of files) {
                const storageRef = storage.ref(`projects/${projectRef.id}/${file.name}`);
                await storageRef.put(file);
                await db.collection('projectFiles').add({
                    projectId: projectRef.id,
                    name: file.name,
                    path: storageRef.fullPath,
                    uploadedBy: getCurrentUser()?.uid,
                    uploadedAt: new Date()
                });
            }
        }

        // Create calendar events for milestones
        milestones.forEach(milestone => {
            if (milestone.date) {
                createDocument('events', {
                    title: `Milestone: ${milestone.name} - ${name}`,
                    type: 'milestone',
                    start: milestone.date,
                    end: milestone.date,
                    color: '#10b981',
                    projectId: projectRef.id,
                    company
                });
            }
        });

        // Create activity log
        await db.collection('activities').add({
            type: 'project',
            action: `created project "${name}"`,
            user: getCurrentUser()?.email,
            userName: getCurrentUser()?.displayName || getCurrentUser()?.email,
            userId: getCurrentUser()?.uid,
            company: getCurrentCompany(),
            timestamp: new Date()
        });

        await logAudit('project_create', `Project created: ${name}`);
        
        // Notify assignees
        assignees.forEach(async (userId) => {
            await createNotification(userId, `You have been assigned to project: ${name}`, 'New Project Assignment');
        });

        hideLoading();
        closeProjectModal();
        showSuccess('Project created successfully!');
        
        // Refresh data
        loadDashboardData();
        loadAllProjects();

    } catch (error) {
        hideLoading();
        showError('Error creating project: ' + error.message);
    }
}

// Load all projects
async function loadAllProjects() {
    try {
        const filter = document.getElementById('projectFilter')?.value || 'all';
        
        let projects;
        if (filter === 'all') {
            projects = await queryDocuments('projects', []);
        } else {
            projects = await queryDocuments('projects', [
                { field: 'status', operator: '==', value: filter }
            ]);
        }
        
        const container = document.getElementById('projectsList');
        if (!container) return;

        container.innerHTML = '';

        if (projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-project-diagram"></i>
                    <h3>No projects found</h3>
                    <p>Create your first project to get started</p>
                    <button class="btn btn-primary" onclick="openProjectModal()">Create Project</button>
                </div>
            `;
            return;
        }

        projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        projects.forEach(project => {
            const progress = project.progress || 0;
            const phaseColor = PHASE_COLORS[project.phase] || '#6b7280';
            const priorityColor = PRIORITY_COLORS[project.priority] || '#6b7280';
            
            container.innerHTML += `
                <div class="project-card" onclick="viewProject('${project.id}')">
                    <div class="project-header">
                        <span class="project-phase" style="background: ${phaseColor}20; color: ${phaseColor}">
                            ${project.phase}
                        </span>
                        <span class="project-priority" style="color: ${priorityColor}">
                            <i class="fas fa-flag"></i> ${project.priority}
                        </span>
                    </div>
                    <h4 class="project-title">${project.name}</h4>
                    <p class="project-description">${truncateText(project.description?.replace(/<[^>]*>/g, ''), 100)}</p>
                    
                    <div class="project-progress">
                        <div class="progress-header">
                            <span>Progress</span>
                            <span>${progress}%</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar-fill" style="width: ${progress}%"></div>
                        </div>
                    </div>
                    
                    <div class="project-footer">
                        <span><i class="far fa-calendar"></i> ${project.deadline ? formatDate(project.deadline) : 'No deadline'}</span>
                        <span><i class="far fa-user"></i> ${project.assignees?.length || 0} members</span>
                    </div>
                    
                    ${project.budget ? `
                        <div class="project-budget">
                            <i class="fas fa-dollar-sign"></i> Budget: ${formatCurrency(project.budget, project.currency)}
                        </div>
                    ` : ''}
                </div>
            `;
        });

    } catch (error) {
        console.error('Error loading projects:', error);
        showError('Failed to load projects');
    }
}

// Filter projects
function filterProjects() {
    loadAllProjects();
}

// View project details
function viewProject(projectId) {
    // Open project detail modal
    showInfo('Project details view - ID: ' + projectId);
}

// Add CSS for project cards
const projectStyles = document.createElement('style');
projectStyles.textContent = `
    .project-card {
        background: white;
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .project-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .project-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 15px;
    }

    .project-phase {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
    }

    .project-priority {
        font-size: 12px;
    }

    .project-title {
        font-size: 18px;
        margin-bottom: 10px;
        color: var(--dark);
    }

    .project-description {
        font-size: 13px;
        color: var(--gray);
        margin-bottom: 15px;
        line-height: 1.5;
    }

    .project-progress {
        margin-bottom: 15px;
    }

    .progress-header {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        margin-bottom: 5px;
    }

    .progress-bar-container {
        width: 100%;
        height: 6px;
        background: var(--border);
        border-radius: 3px;
        overflow: hidden;
    }

    .progress-bar-fill {
        height: 100%;
        background: var(--primary);
        border-radius: 3px;
        transition: width 0.3s ease;
    }

    .project-footer {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: var(--gray);
        margin-bottom: 10px;
    }

    .project-budget {
        font-size: 12px;
        color: var(--gray);
        padding-top: 10px;
        border-top: 1px solid var(--border);
    }
`;
document.head.appendChild(projectStyles);

// Export project functions
window.openProjectModal = openProjectModal;
window.closeProjectModal = closeProjectModal;
window.addMilestone = addMilestone;
window.handleProjectFiles = handleProjectFiles;
window.createProject = createProject;
window.loadAllProjects = loadAllProjects;
window.filterProjects = filterProjects;
window.viewProject = viewProject;
