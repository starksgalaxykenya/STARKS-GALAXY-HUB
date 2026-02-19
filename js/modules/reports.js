// Reports Module

let reportChart = null;

// Generate report
async function generateReport() {
    const type = document.getElementById('reportType').value;
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    const format = document.getElementById('reportFormat').value;
    const schedule = document.getElementById('reportSchedule').value;

    if (!startDate || !endDate) {
        showError('Please select date range');
        return;
    }

    try {
        showLoading();

        let reportData = {};

        switch(type) {
            case 'project':
                reportData = await generateProjectReport(startDate, endDate);
                break;
            case 'artist':
                reportData = await generateArtistReport(startDate, endDate);
                break;
            case 'timeline':
                reportData = await generateTimelineReport(startDate, endDate);
                break;
            case 'resource':
                reportData = await generateResourceReport(startDate, endDate);
                break;
            case 'budget':
                reportData = await generateBudgetReport(startDate, endDate);
                break;
            case 'productivity':
                reportData = await generateProductivityReport(startDate, endDate);
                break;
            case 'client':
                reportData = await generateClientReport(startDate, endDate);
                break;
        }

        // Save report
        const reportRef = await db.collection('reports').add({
            type,
            data: reportData,
            format,
            dateRange: { start: startDate, end: endDate },
            generatedBy: getCurrentUser()?.uid,
            generatedAt: new Date(),
            schedule: schedule !== 'none' ? schedule : null,
            company: getCurrentCompany()
        });

        // Schedule if needed
        if (schedule !== 'none') {
            await db.collection('scheduledReports').add({
                reportId: reportRef.id,
                type,
                schedule,
                dateRange: { start: startDate, end: endDate },
                format,
                recipients: [getCurrentUser()?.email],
                nextRun: calculateNextRun(schedule),
                active: true,
                createdBy: getCurrentUser()?.uid,
                createdAt: new Date()
            });
            showSuccess(`Report scheduled: ${schedule}`);
        }

        // Generate file
        await exportReport(reportData, type, format);

        await logAudit('report_generate', `Report generated: ${type}`);
        
        hideLoading();
        showSuccess('Report generated successfully');
        loadRecentReports();
        loadScheduledReports();

    } catch (error) {
        hideLoading();
        showError('Error generating report: ' + error.message);
    }
}

// Calculate next run date for scheduled report
function calculateNextRun(schedule) {
    const date = new Date();
    switch(schedule) {
        case 'daily':
            date.setDate(date.getDate() + 1);
            break;
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'quarterly':
            date.setMonth(date.getMonth() + 3);
            break;
    }
    return date;
}

// Generate project report
async function generateProjectReport(startDate, endDate) {
    const projects = await db.collection('projects')
        .where('company', '==', getCurrentCompany())
        .get();
        
    const tasks = await db.collection('tasks')
        .where('company', '==', getCurrentCompany())
        .get();

    const start = new Date(startDate);
    const end = new Date(endDate);

    return {
        generatedAt: new Date().toISOString(),
        dateRange: { start: startDate, end: endDate },
        summary: {
            totalProjects: projects.size,
            activeProjects: projects.docs.filter(p => p.data().status === 'active').length,
            completedProjects: projects.docs.filter(p => p.data().status === 'completed').length,
            totalTasks: tasks.size,
            completedTasks: tasks.docs.filter(t => t.data().status === 'done').length
        },
        projects: projects.docs.map(doc => {
            const project = doc.data();
            const projectTasks = tasks.docs.filter(t => t.data().projectId === doc.id);
            const completedTasks = projectTasks.filter(t => t.data().status === 'done').length;
            
            return {
                id: doc.id,
                name: project.name,
                phase: project.phase,
                priority: project.priority,
                status: project.status,
                progress: project.progress,
                startDate: project.startDate,
                deadline: project.deadline,
                taskCount: projectTasks.length,
                completedTasks,
                completionRate: projectTasks.length ? (completedTasks / projectTasks.length * 100).toFixed(1) : 0,
                budget: project.budget || 0,
                spent: project.spent || 0,
                budgetVariance: (project.budget || 0) - (project.spent || 0)
            };
        })
    };
}

// Generate artist report
async function generateArtistReport(startDate, endDate) {
    const users = await db.collection('users')
        .where('company', '==', getCurrentCompany())
        .where('role', 'in', ['artist', 'manager'])
        .get();
        
    const tasks = await db.collection('tasks')
        .where('company', '==', getCurrentCompany())
        .where('completedAt', '>=', new Date(startDate))
        .where('completedAt', '<=', new Date(endDate))
        .get();

    return {
        generatedAt: new Date().toISOString(),
        dateRange: { start: startDate, end: endDate },
        artists: users.docs.map(doc => {
            const user = doc.data();
            const userTasks = tasks.docs.filter(t => t.data().assignee === doc.id);
            const completedTasks = userTasks.filter(t => t.data().status === 'done');
            const totalHours = userTasks.reduce((sum, t) => sum + (t.data().actualHours || 0), 0);
            
            return {
                id: doc.id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                totalTasks: userTasks.length,
                completedTasks: completedTasks.length,
                completionRate: userTasks.length ? (completedTasks.length / userTasks.length * 100).toFixed(1) : 0,
                totalHours,
                averageHoursPerTask: userTasks.length ? (totalHours / userTasks.length).toFixed(1) : 0
            };
        })
    };
}

// Generate timeline report
async function generateTimelineReport(startDate, endDate) {
    const tasks = await db.collection('tasks')
        .where('company', '==', getCurrentCompany())
        .where('dueDate', '>=', startDate)
        .where('dueDate', '<=', endDate)
        .orderBy('dueDate')
        .get();

    const projects = await db.collection('projects')
        .where('company', '==', getCurrentCompany())
        .get();

    const projectMap = {};
    projects.docs.forEach(doc => {
        projectMap[doc.id] = doc.data().name;
    });

    return {
        generatedAt: new Date().toISOString(),
        dateRange: { start: startDate, end: endDate },
        summary: {
            totalTasks: tasks.size,
            overdue: tasks.docs.filter(t => {
                const task = t.data();
                return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
            }).length,
            completed: tasks.docs.filter(t => t.data().status === 'done').length
        },
        tasks: tasks.docs.map(doc => {
            const task = doc.data();
            return {
                id: doc.id,
                title: task.title,
                project: projectMap[task.projectId] || 'Unknown',
                projectId: task.projectId,
                dueDate: task.dueDate,
                status: task.status,
                priority: task.priority,
                assignee: task.assigneeName,
                completedAt: task.completedAt ? new Date(task.completedAt.toDate()).toISOString() : null
            };
        })
    };
}

// Generate resource report
async function generateResourceReport(startDate, endDate) {
    const users = await db.collection('users')
        .where('company', '==', getCurrentCompany())
        .get();
        
    const tasks = await db.collection('tasks')
        .where('company', '==', getCurrentCompany())
        .where('createdAt', '>=', new Date(startDate))
        .where('createdAt', '<=', new Date(endDate))
        .get();

    const projects = await db.collection('projects')
        .where('company', '==', getCurrentCompany())
        .get();

    return {
        generatedAt: new Date().toISOString(),
        dateRange: { start: startDate, end: endDate },
        summary: {
            totalResources: users.size,
            totalTasks: tasks.size,
            averageTasksPerResource: users.size ? (tasks.size / users.size).toFixed(1) : 0
        },
        resourceUtilization: users.docs.map(doc => {
            const user = doc.data();
            const userTasks = tasks.docs.filter(t => t.data().assignee === doc.id);
            const totalHours = userTasks.reduce((sum, t) => sum + (t.data().estimatedHours || 0), 0);
            
            return {
                id: doc.id,
                name: user.name,
                role: user.role,
                department: user.department,
                taskCount: userTasks.length,
                totalEstimatedHours: totalHours,
                projects: [...new Set(userTasks.map(t => t.data().projectId))].length
            };
        }),
        projectWorkload: projects.docs.map(doc => {
            const project = doc.data();
            const projectTasks = tasks.docs.filter(t => t.data().projectId === doc.id);
            const totalHours = projectTasks.reduce((sum, t) => sum + (t.data().estimatedHours || 0), 0);
            
            return {
                id: doc.id,
                name: project.name,
                taskCount: projectTasks.length,
                totalEstimatedHours: totalHours,
                resources: [...new Set(projectTasks.map(t => t.data().assignee))].filter(Boolean).length
            };
        })
    };
}

// Generate budget report
async function generateBudgetReport(startDate, endDate) {
    const projects = await db.collection('projects')
        .where('company', '==', getCurrentCompany())
        .get();

    const expenses = await db.collection('expenses')
        .where('company', '==', getCurrentCompany())
        .where('date', '>=', new Date(startDate))
        .where('date', '<=', new Date(endDate))
        .get();

    let totalBudget = 0;
    let totalSpent = 0;
    let totalExpenses = 0;

    projects.docs.forEach(doc => {
        const project = doc.data();
        totalBudget += project.budget || 0;
        totalSpent += project.spent || 0;
    });

    expenses.docs.forEach(doc => {
        totalExpenses += doc.data().amount || 0;
    });

    return {
        generatedAt: new Date().toISOString(),
        dateRange: { start: startDate, end: endDate },
        summary: {
            totalBudget,
            totalSpent,
            totalExpenses,
            remainingBudget: totalBudget - totalSpent,
            utilizationRate: totalBudget ? (totalSpent / totalBudget * 100).toFixed(1) : 0
        },
        projects: projects.docs.map(doc => {
            const project = doc.data();
            return {
                id: doc.id,
                name: project.name,
                budget: project.budget || 0,
                spent: project.spent || 0,
                remaining: (project.budget || 0) - (project.spent || 0),
                variance: project.budget ? (((project.budget - (project.spent || 0)) / project.budget * 100)).toFixed(1) : 0
            };
        }),
        expenses: expenses.docs.map(doc => {
            const expense = doc.data();
            return {
                id: doc.id,
                category: expense.category,
                amount: expense.amount,
                currency: expense.currency,
                date: expense.date,
                description: expense.description,
                project: expense.projectName,
                status: expense.status
            };
        })
    };
}

// Generate productivity report
async function generateProductivityReport(startDate, endDate) {
    const tasks = await db.collection('tasks')
        .where('company', '==', getCurrentCompany())
        .where('completedAt', '>=', new Date(startDate))
        .where('completedAt', '<=', new Date(endDate))
        .get();

    const timeEntries = await db.collection('timeEntries')
        .where('company', '==', getCurrentCompany())
        .where('date', '>=', new Date(startDate))
        .where('date', '<=', new Date(endDate))
        .get();

    // Group by day
    const dailyData = {};
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dailyData[dateStr] = {
            date: dateStr,
            tasksCompleted: 0,
            hoursLogged: 0,
            tasks: []
        };
    }

    tasks.docs.forEach(doc => {
        const task = doc.data();
        const completedDate = task.completedAt?.toDate().toISOString().split('T')[0];
        if (completedDate && dailyData[completedDate]) {
            dailyData[completedDate].tasksCompleted++;
            dailyData[completedDate].tasks.push({
                id: doc.id,
                title: task.title,
                project: task.projectName
            });
        }
    });

    timeEntries.docs.forEach(doc => {
        const entry = doc.data();
        const entryDate = entry.date?.toDate().toISOString().split('T')[0];
        if (entryDate && dailyData[entryDate]) {
            dailyData[entryDate].hoursLogged += entry.hours || 0;
        }
    });

    return {
        generatedAt: new Date().toISOString(),
        dateRange: { start: startDate, end: endDate },
        summary: {
            totalTasksCompleted: tasks.size,
            totalHoursLogged: timeEntries.docs.reduce((sum, e) => sum + (e.data().hours || 0), 0),
            averageTasksPerDay: (tasks.size / ((end - start) / (1000 * 60 * 60 * 24) + 1)).toFixed(1),
            averageHoursPerDay: (timeEntries.docs.reduce((sum, e) => sum + (e.data().hours || 0), 0) / ((end - start) / (1000 * 60 * 60 * 24) + 1)).toFixed(1)
        },
        dailyData: Object.values(dailyData)
    };
}

// Generate client report
async function generateClientReport(startDate, endDate) {
    const clients = await db.collection('clients')
        .where('company', '==', getCurrentCompany())
        .get();

    const projects = await db.collection('projects')
        .where('company', '==', getCurrentCompany())
        .get();

    const invoices = await db.collection('invoices')
        .where('company', '==', getCurrentCompany())
        .where('date', '>=', new Date(startDate))
        .where('date', '<=', new Date(endDate))
        .get();

    let totalRevenue = 0;
    let totalInvoiced = 0;

    invoices.docs.forEach(doc => {
        const invoice = doc.data();
        if (invoice.status === 'paid') {
            totalRevenue += invoice.amount || 0;
        }
        totalInvoiced += invoice.amount || 0;
    });

    return {
        generatedAt: new Date().toISOString(),
        dateRange: { start: startDate, end: endDate },
        summary: {
            totalClients: clients.size,
            activeProjects: projects.docs.filter(p => p.data().status === 'active').length,
            totalInvoiced,
            totalRevenue,
            outstandingRevenue: totalInvoiced - totalRevenue
        },
        clients: clients.docs.map(doc => {
            const client = doc.data();
            const clientProjects = projects.docs.filter(p => p.data().clientId === doc.id);
            const clientInvoices = invoices.docs.filter(i => i.data().clientId === doc.id);
            
            return {
                id: doc.id,
                name: client.name,
                contactName: client.contactName,
                email: client.email,
                status: client.status,
                projectCount: clientProjects.length,
                invoiceCount: clientInvoices.length,
                totalInvoiced: clientInvoices.reduce((sum, i) => sum + (i.data().amount || 0), 0),
                lastActive: client.lastActive
            };
        })
    };
}

// Export report
async function exportReport(reportData, type, format) {
    let content, filename, mimeType;
    
    if (format === 'pdf') {
        // For PDF, we'd use a library like jsPDF
        // For now, create HTML content
        content = generateReportHTML(reportData, type);
        filename = `report_${type}_${Date.now()}.html`;
        mimeType = 'text/html';
    } else if (format === 'excel') {
        content = convertToExcel(reportData);
        filename = `report_${type}_${Date.now()}.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
        content = JSON.stringify(reportData, null, 2);
        filename = `report_${type}_${Date.now()}.json`;
        mimeType = 'application/json';
    }

    downloadFile(content, filename, mimeType);
}

// Generate HTML report
function generateReportHTML(reportData, type) {
    const title = type.charAt(0).toUpperCase() + type.slice(1) + ' Report';
    
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                h1 { color: #2563eb; }
                .summary { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th { background: #2563eb; color: white; padding: 10px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
                .footer { margin-top: 40px; color: #6b7280; font-size: 12px; }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>Date Range: ${reportData.dateRange?.start} to ${reportData.dateRange?.end}</p>
            
            <div class="summary">
                <h2>Summary</h2>
                ${generateSummaryHTML(reportData.summary)}
            </div>
            
            <h2>Details</h2>
            ${generateDetailsHTML(reportData, type)}
            
            <div class="footer">
                Generated by Starks Galaxy Hub
            </div>
        </body>
        </html>
    `;
    
    return html;
}

// Generate summary HTML
function generateSummaryHTML(summary) {
    if (!summary) return '<p>No summary data</p>';
    
    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">';
    
    for (const [key, value] of Object.entries(summary)) {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        html += `
            <div style="background: white; padding: 15px; border-radius: 8px;">
                <div style="font-size: 12px; color: #6b7280;">${label}</div>
                <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${value}</div>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

// Generate details HTML
function generateDetailsHTML(reportData, type) {
    if (type === 'project' && reportData.projects) {
        return `
            <table>
                <tr>
                    <th>Project</th>
                    <th>Phase</th>
                    <th>Progress</th>
                    <th>Tasks</th>
                    <th>Completed</th>
                    <th>Budget</th>
                    <th>Spent</th>
                </tr>
                ${reportData.projects.map(p => `
                    <tr>
                        <td>${p.name}</td>
                        <td>${p.phase}</td>
                        <td>${p.progress}%</td>
                        <td>${p.taskCount}</td>
                        <td>${p.completedTasks}</td>
                        <td>${formatCurrency(p.budget)}</td>
                        <td>${formatCurrency(p.spent)}</td>
                    </tr>
                `).join('')}
            </table>
        `;
    }
    
    if (type === 'artist' && reportData.artists) {
        return `
            <table>
                <tr>
                    <th>Artist</th>
                    <th>Role</th>
                    <th>Tasks</th>
                    <th>Completed</th>
                    <th>Rate</th>
                    <th>Hours</th>
                </tr>
                ${reportData.artists.map(a => `
                    <tr>
                        <td>${a.name}</td>
                        <td>${a.role}</td>
                        <td>${a.totalTasks}</td>
                        <td>${a.completedTasks}</td>
                        <td>${a.completionRate}%</td>
                        <td>${a.totalHours}</td>
                    </tr>
                `).join('')}
            </table>
        `;
    }
    
    return '<p>No detailed data available</p>';
}

// Convert to Excel (CSV format)
function convertToExcel(reportData) {
    let csv = '';
    
    // Add summary
    if (reportData.summary) {
        csv += 'Summary\n';
        for (const [key, value] of Object.entries(reportData.summary)) {
            csv += `${key},${value}\n`;
        }
        csv += '\n';
    }
    
    // Add details
    if (reportData.projects) {
        csv += 'Projects\n';
        csv += 'Name,Phase,Progress,Tasks,Completed,Budget,Spent\n';
        reportData.projects.forEach(p => {
            csv += `${p.name},${p.phase},${p.progress},${p.taskCount},${p.completedTasks},${p.budget},${p.spent}\n`;
        });
    }
    
    return csv;
}

// Download file
function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Load recent reports
async function loadRecentReports() {
    try {
        const reports = await db.collection('reports')
            .where('generatedBy', '==', getCurrentUser()?.uid)
            .orderBy('generatedAt', 'desc')
            .limit(10)
            .get();

        const list = document.getElementById('recentReportsList');
        if (!list) return;

        list.innerHTML = '';

        if (reports.empty) {
            list.innerHTML = '<div class="empty-state"><p>No reports generated yet</p></div>';
            return;
        }

        reports.forEach(doc => {
            const report = doc.data();
            const date = report.generatedAt?.toDate ? formatRelativeTime(report.generatedAt.toDate()) : '';
            
            list.innerHTML += `
                <div class="report-item" onclick="viewReport('${doc.id}')">
                    <div class="report-icon">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <div class="report-info">
                        <div class="report-type">${report.type.replace('_', ' ').toUpperCase()}</div>
                        <div class="report-date">${date}</div>
                    </div>
                    <div class="report-format">${report.format}</div>
                </div>
            `;
        });

    } catch (error) {
        console.error('Error loading recent reports:', error);
    }
}

// Load scheduled reports
async function loadScheduledReports() {
    try {
        const reports = await db.collection('scheduledReports')
            .where('createdBy', '==', getCurrentUser()?.uid)
            .where('active', '==', true)
            .orderBy('nextRun')
            .get();

        const list = document.getElementById('scheduledReportsList');
        if (!list) return;

        list.innerHTML = '';

        if (reports.empty) {
            list.innerHTML = '<div class="empty-state"><p>No scheduled reports</p></div>';
            return;
        }

        reports.forEach(doc => {
            const report = doc.data();
            const nextRun = report.nextRun?.toDate ? formatDate(report.nextRun.toDate()) : '';

            list.innerHTML += `
                <div class="scheduled-report-item">
                    <div class="report-header">
                        <span class="report-type">${report.type.replace('_', ' ').toUpperCase()}</span>
                        <span class="report-schedule">${report.schedule}</span>
                    </div>
                    <div class="report-next-run">Next: ${nextRun}</div>
                    <div class="report-actions">
                        <button class="btn-icon" onclick="editSchedule('${doc.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="deleteSchedule('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error('Error loading scheduled reports:', error);
    }
}

// View report
async function viewReport(reportId) {
    try {
        const report = await getDocument('reports', reportId);
        if (!report) return;

        // Create preview modal
        const modal = document.createElement('div');
        modal.className = 'modal active modal-lg';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Report Preview</h3>
                    <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="report-preview">
                    <pre>${JSON.stringify(report.data, null, 2)}</pre>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="downloadReport('${reportId}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

    } catch (error) {
        showError('Error loading report: ' + error.message);
    }
}

// Download report
async function downloadReport(reportId) {
    try {
        const report = await getDocument('reports', reportId);
        if (!report) return;

        await exportReport(report.data, report.type, report.format);

    } catch (error) {
        showError('Error downloading report: ' + error.message);
    }
}

// Edit schedule
async function editSchedule(scheduleId) {
    const schedule = await getDocument('scheduledReports', scheduleId);
    if (!schedule) return;

    // Create edit modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Edit Schedule</h3>
                <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form id="editScheduleForm" onsubmit="event.preventDefault(); updateSchedule('${scheduleId}', this)">
                <div class="form-group">
                    <label>Schedule</label>
                    <select id="scheduleFrequency" class="form-control">
                        <option value="daily" ${schedule.schedule === 'daily' ? 'selected' : ''}>Daily</option>
                        <option value="weekly" ${schedule.schedule === 'weekly' ? 'selected' : ''}>Weekly</option>
                        <option value="monthly" ${schedule.schedule === 'monthly' ? 'selected' : ''}>Monthly</option>
                        <option value="quarterly" ${schedule.schedule === 'quarterly' ? 'selected' : ''}>Quarterly</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Recipients (comma separated)</label>
                    <input type="text" id="scheduleRecipients" class="form-control" value="${schedule.recipients?.join(', ') || ''}">
                </div>
                <div class="form-group">
                    <label>Format</label>
                    <select id="scheduleFormat" class="form-control">
                        <option value="pdf" ${schedule.format === 'pdf' ? 'selected' : ''}>PDF</option>
                        <option value="excel" ${schedule.format === 'excel' ? 'selected' : ''}>Excel</option>
                        <option value="json" ${schedule.format === 'json' ? 'selected' : ''}>JSON</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Update Schedule</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
}

// Update schedule
async function updateSchedule(scheduleId, form) {
    const frequency = document.getElementById('scheduleFrequency').value;
    const recipients = document.getElementById('scheduleRecipients').value.split(',').map(r => r.trim());
    const format = document.getElementById('scheduleFormat').value;

    try {
        showLoading();

        await updateDocument('scheduledReports', scheduleId, {
            schedule: frequency,
            recipients,
            format,
            nextRun: calculateNextRun(frequency),
            updatedAt: new Date()
        });

        hideLoading();
        document.querySelector('.modal.active').remove();
        showSuccess('Schedule updated');
        loadScheduledReports();

    } catch (error) {
        hideLoading();
        showError('Error updating schedule: ' + error.message);
    }
}

// Delete schedule
async function deleteSchedule(scheduleId) {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
        showLoading();
        await deleteDocument('scheduledReports', scheduleId);
        showSuccess('Schedule deleted');
        loadScheduledReports();
    } catch (error) {
        showError('Error deleting schedule: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Add CSS for reports module
const reportStyles = document.createElement('style');
reportStyles.textContent = `
    .report-item {
        display: flex;
        align-items: center;
        padding: 12px;
        border-bottom: 1px solid var(--border);
        cursor: pointer;
    }

    .report-item:hover {
        background: var(--light);
    }

    .report-icon {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        background: var(--light);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary);
        margin-right: 12px;
    }

    .report-info {
        flex: 1;
    }

    .report-type {
        font-weight: 600;
        margin-bottom: 3px;
    }

    .report-date {
        font-size: 11px;
        color: var(--gray);
    }

    .report-format {
        font-size: 11px;
        padding: 2px 8px;
        background: var(--light);
        border-radius: 12px;
    }

    .scheduled-report-item {
        background: white;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 10px;
        border: 1px solid var(--border);
    }

    .report-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
    }

    .report-schedule {
        font-size: 11px;
        padding: 2px 8px;
        background: var(--primary);
        color: white;
        border-radius: 12px;
    }

    .report-next-run {
        font-size: 12px;
        color: var(--gray);
        margin-bottom: 10px;
    }

    .report-actions {
        display: flex;
        justify-content: flex-end;
        gap: 5px;
    }

    .report-preview {
        max-height: 500px;
        overflow-y: auto;
        background: var(--light);
        padding: 15px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
    }

    .modal-footer {
        margin-top: 20px;
        display: flex;
        justify-content: flex-end;
    }
`;
document.head.appendChild(reportStyles);

// Export report functions
window.generateReport = generateReport;
window.loadRecentReports = loadRecentReports;
window.loadScheduledReports = loadScheduledReports;
window.viewReport = viewReport;
window.downloadReport = downloadReport;
window.editSchedule = editSchedule;
window.updateSchedule = updateSchedule;
window.deleteSchedule = deleteSchedule;
