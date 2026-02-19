// Clients Module

// Load clients list
async function loadClients() {
    try {
        showLoading();

        const clients = await db.collection('clients')
            .where('company', '==', getCurrentCompany())
            .orderBy('name')
            .get();

        const grid = document.getElementById('clientsList');
        if (!grid) return;

        grid.innerHTML = '';

        if (clients.empty) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-handshake"></i>
                    <h3>No clients found</h3>
                    <p>Add your first client to get started</p>
                    <button class="btn btn-primary" onclick="addClient()">
                        <i class="fas fa-user-plus"></i> Add Client
                    </button>
                </div>
            `;
            return;
        }

        clients.forEach(doc => {
            const client = doc.data();
            const lastActive = client.lastActive ? formatRelativeTime(client.lastActive) : 'Never';

            grid.innerHTML += `
                <div class="client-card" onclick="viewClient('${doc.id}')">
                    <div class="client-header">
                        <div class="client-avatar" style="background: ${getAvatarColor(client.name)}">
                            ${(client.name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div class="client-status ${client.status}"></div>
                    </div>
                    <div class="client-body">
                        <h4 class="client-name">${client.name}</h4>
                        <p class="client-company">${client.company || 'No company'}</p>
                        <div class="client-contact">
                            <div><i class="far fa-envelope"></i> ${client.email}</div>
                            ${client.phone ? `<div><i class="fas fa-phone"></i> ${client.phone}</div>` : ''}
                        </div>
                    </div>
                    <div class="client-footer">
                        <div class="client-metrics">
                            <span class="metric">
                                <strong>${client.projects || 0}</strong> Projects
                            </span>
                            <span class="metric">
                                <strong>${client.invoices || 0}</strong> Invoices
                            </span>
                        </div>
                        <div class="client-last-active">
                            Last active: ${lastActive}
                        </div>
                    </div>
                    <div class="client-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); editClient('${doc.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="event.stopPropagation(); deleteClient('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        hideLoading();

    } catch (error) {
        hideLoading();
        console.error('Error loading clients:', error);
        showError('Failed to load clients');
    }
}

// Add new client
function addClient() {
    // Create client modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Add New Client</h3>
                <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form id="clientForm" onsubmit="event.preventDefault(); submitClient(this)">
                <div class="form-row">
                    <div class="form-group">
                        <label>Company Name *</label>
                        <input type="text" id="clientCompany" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Contact Person</label>
                        <input type="text" id="clientContactName" class="form-control">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" id="clientEmail" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="tel" id="clientPhone" class="form-control">
                    </div>
                </div>
                <div class="form-group">
                    <label>Address</label>
                    <textarea id="clientAddress" class="form-control" rows="2"></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Website</label>
                        <input type="url" id="clientWebsite" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Tax ID / VAT</label>
                        <input type="text" id="clientTaxId" class="form-control">
                    </div>
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="clientNotes" class="form-control" rows="3"></textarea>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">Add Client</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
}

// Submit new client
async function submitClient(form) {
    const companyName = document.getElementById('clientCompany').value;
    const contactName = document.getElementById('clientContactName').value;
    const email = document.getElementById('clientEmail').value;
    const phone = document.getElementById('clientPhone').value;
    const address = document.getElementById('clientAddress').value;
    const website = document.getElementById('clientWebsite').value;
    const taxId = document.getElementById('clientTaxId').value;
    const notes = document.getElementById('clientNotes').value;

    if (!companyName || !email) {
        showError('Please fill in required fields');
        return;
    }

    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }

    try {
        showLoading();

        await db.collection('clients').add({
            name: companyName,
            contactName,
            email,
            phone,
            address,
            website,
            taxId,
            notes,
            status: 'active',
            projects: 0,
            invoices: 0,
            company: getCurrentCompany(),
            createdBy: getCurrentUser()?.uid,
            createdAt: new Date(),
            lastActive: new Date()
        });

        hideLoading();
        document.querySelector('.modal.active').remove();
        showSuccess('Client added successfully');
        loadClients();

    } catch (error) {
        hideLoading();
        showError('Error adding client: ' + error.message);
    }
}

// View client details
async function viewClient(clientId) {
    try {
        const client = await getDocument('clients', clientId);
        if (!client) return;

        // Get client projects
        const projects = await db.collection('projects')
            .where('clientId', '==', clientId)
            .get();

        // Get client invoices
        const invoices = await db.collection('invoices')
            .where('clientId', '==', clientId)
            .orderBy('date', 'desc')
            .limit(5)
            .get();

        // Create client detail modal
        const modal = document.createElement('div');
        modal.className = 'modal active modal-lg';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${client.name}</h3>
                    <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                
                <div class="client-detail-tabs">
                    <button class="tab-btn active" onclick="switchClientTab('info')">Info</button>
                    <button class="tab-btn" onclick="switchClientTab('projects')">Projects</button>
                    <button class="tab-btn" onclick="switchClientTab('invoices')">Invoices</button>
                    <button class="tab-btn" onclick="switchClientTab('files')">Files</button>
                </div>

                <div id="clientInfoTab" class="client-tab active">
                    <div class="client-info-grid">
                        <div class="info-item">
                            <label>Contact Person</label>
                            <p>${client.contactName || 'Not specified'}</p>
                        </div>
                        <div class="info-item">
                            <label>Email</label>
                            <p><a href="mailto:${client.email}">${client.email}</a></p>
                        </div>
                        <div class="info-item">
                            <label>Phone</label>
                            <p>${client.phone || 'Not specified'}</p>
                        </div>
                        <div class="info-item">
                            <label>Website</label>
                            <p>${client.website ? `<a href="${client.website}" target="_blank">${client.website}</a>` : 'Not specified'}</p>
                        </div>
                        <div class="info-item full-width">
                            <label>Address</label>
                            <p>${client.address || 'Not specified'}</p>
                        </div>
                        <div class="info-item full-width">
                            <label>Tax ID / VAT</label>
                            <p>${client.taxId || 'Not specified'}</p>
                        </div>
                        <div class="info-item full-width">
                            <label>Notes</label>
                            <p>${client.notes || 'No notes'}</p>
                        </div>
                    </div>
                </div>

                <div id="clientProjectsTab" class="client-tab" style="display: none;">
                    <div class="projects-list">
                        ${projects.size === 0 ? '<p>No projects yet</p>' : ''}
                        ${projects.docs.map(doc => {
                            const project = doc.data();
                            return `
                                <div class="project-item" onclick="viewProject('${doc.id}')">
                                    <h4>${project.name}</h4>
                                    <p>Status: ${project.status}</p>
                                    <p>Budget: ${formatCurrency(project.budget)}</p>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div id="clientInvoicesTab" class="client-tab" style="display: none;">
                    <div class="invoices-list">
                        ${invoices.size === 0 ? '<p>No invoices yet</p>' : ''}
                        ${invoices.docs.map(doc => {
                            const invoice = doc.data();
                            return `
                                <div class="invoice-item" onclick="viewInvoice('${doc.id}')">
                                    <div class="invoice-header">
                                        <span class="invoice-number">${invoice.number}</span>
                                        <span class="invoice-status status-${invoice.status}">${invoice.status}</span>
                                    </div>
                                    <div class="invoice-details">
                                        <span>Date: ${formatDate(invoice.date)}</span>
                                        <span>Amount: ${formatCurrency(invoice.amount)}</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div id="clientFilesTab" class="client-tab" style="display: none;">
                    <div class="files-upload">
                        <div class="file-upload-area" onclick="uploadClientFile('${clientId}')">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Click to upload files for this client</p>
                        </div>
                    </div>
                    <div id="clientFilesList" class="files-list">
                        <!-- Files will be loaded here -->
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Load client files
        loadClientFiles(clientId);

    } catch (error) {
        showError('Error loading client details: ' + error.message);
    }
}

// Switch client detail tabs
function switchClientTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.client-detail-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Hide all tabs
    document.querySelectorAll('.client-tab').forEach(tab => {
        tab.style.display = 'none';
    });

    // Show selected tab
    document.getElementById(`client${capitalizeFirst(tabName)}Tab`).style.display = 'block';
}

// Load client files
async function loadClientFiles(clientId) {
    try {
        const files = await db.collection('clientFiles')
            .where('clientId', '==', clientId)
            .orderBy('uploadedAt', 'desc')
            .get();

        const filesList = document.getElementById('clientFilesList');
        if (!filesList) return;

        filesList.innerHTML = '';

        files.forEach(doc => {
            const file = doc.data();
            filesList.innerHTML += `
                <div class="file-item">
                    <i class="fas fa-file-alt"></i>
                    <span class="file-name">${file.name}</span>
                    <span class="file-date">${formatDate(file.uploadedAt)}</span>
                    <div class="file-actions">
                        <button class="btn-icon" onclick="downloadClientFile('${file.path}')">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn-icon" onclick="deleteClientFile('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error('Error loading client files:', error);
    }
}

// Upload client file
function uploadClientFile(clientId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            showLoading();

            // Upload to storage
            const storageRef = storage.ref(`clients/${clientId}/${file.name}`);
            await storageRef.put(file);
            const url = await storageRef.getDownloadURL();

            // Save to database
            await db.collection('clientFiles').add({
                clientId,
                name: file.name,
                path: storageRef.fullPath,
                url,
                size: file.size,
                uploadedBy: getCurrentUser()?.uid,
                uploadedAt: new Date()
            });

            showSuccess('File uploaded');
            loadClientFiles(clientId);

        } catch (error) {
            showError('Error uploading file: ' + error.message);
        } finally {
            hideLoading();
        }
    };
    input.click();
}

// Download client file
async function downloadClientFile(path) {
    try {
        const url = await storage.ref(path).getDownloadURL();
        window.open(url, '_blank');
    } catch (error) {
        showError('Error downloading file');
    }
}

// Delete client file
async function deleteClientFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
        showLoading();

        const file = await getDocument('clientFiles', fileId);
        if (file?.path) {
            await storage.ref(file.path).delete();
        }
        await deleteDocument('clientFiles', fileId);

        showSuccess('File deleted');
        loadClientFiles(file.clientId);

    } catch (error) {
        showError('Error deleting file: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Edit client
async function editClient(clientId) {
    const client = await getDocument('clients', clientId);
    if (!client) return;

    // Create edit modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Edit Client</h3>
                <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form id="editClientForm" onsubmit="event.preventDefault(); updateClient('${clientId}', this)">
                <div class="form-row">
                    <div class="form-group">
                        <label>Company Name *</label>
                        <input type="text" id="editClientCompany" class="form-control" value="${client.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Contact Person</label>
                        <input type="text" id="editClientContactName" class="form-control" value="${client.contactName || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" id="editClientEmail" class="form-control" value="${client.email || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="tel" id="editClientPhone" class="form-control" value="${client.phone || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Address</label>
                    <textarea id="editClientAddress" class="form-control" rows="2">${client.address || ''}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Website</label>
                        <input type="url" id="editClientWebsite" class="form-control" value="${client.website || ''}">
                    </div>
                    <div class="form-group">
                        <label>Tax ID / VAT</label>
                        <input type="text" id="editClientTaxId" class="form-control" value="${client.taxId || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="editClientStatus" class="form-control">
                        <option value="active" ${client.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="inactive" ${client.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                        <option value="lead" ${client.status === 'lead' ? 'selected' : ''}>Lead</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="editClientNotes" class="form-control" rows="3">${client.notes || ''}</textarea>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">Update Client</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
}

// Update client
async function updateClient(clientId, form) {
    const companyName = document.getElementById('editClientCompany').value;
    const contactName = document.getElementById('editClientContactName').value;
    const email = document.getElementById('editClientEmail').value;
    const phone = document.getElementById('editClientPhone').value;
    const address = document.getElementById('editClientAddress').value;
    const website = document.getElementById('editClientWebsite').value;
    const taxId = document.getElementById('editClientTaxId').value;
    const status = document.getElementById('editClientStatus').value;
    const notes = document.getElementById('editClientNotes').value;

    if (!companyName || !email) {
        showError('Please fill in required fields');
        return;
    }

    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }

    try {
        showLoading();

        await updateDocument('clients', clientId, {
            name: companyName,
            contactName,
            email,
            phone,
            address,
            website,
            taxId,
            status,
            notes,
            updatedAt: new Date()
        });

        hideLoading();
        document.querySelector('.modal.active').remove();
        showSuccess('Client updated successfully');
        loadClients();

    } catch (error) {
        hideLoading();
        showError('Error updating client: ' + error.message);
    }
}

// Delete client
async function deleteClient(clientId) {
    if (!confirm('Are you sure you want to delete this client? This will also delete all associated data.')) return;

    try {
        showLoading();

        // Delete client files
        const files = await db.collection('clientFiles')
            .where('clientId', '==', clientId)
            .get();

        const batch = db.batch();
        files.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete the client
        batch.delete(db.collection('clients').doc(clientId));

        await batch.commit();

        showSuccess('Client deleted');
        loadClients();

    } catch (error) {
        showError('Error deleting client: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Add CSS for clients module
const clientStyles = document.createElement('style');
clientStyles.textContent = `
    .client-card {
        background: white;
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
    }

    .client-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .client-header {
        position: relative;
        display: inline-block;
        margin-bottom: 15px;
    }

    .client-avatar {
        width: 60px;
        height: 60px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        font-size: 24px;
    }

    .client-status {
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid white;
    }

    .client-status.active {
        background: var(--success);
    }

    .client-status.inactive {
        background: var(--gray);
    }

    .client-status.lead {
        background: var(--warning);
    }

    .client-name {
        font-size: 18px;
        margin-bottom: 5px;
    }

    .client-company {
        color: var(--gray);
        font-size: 14px;
        margin-bottom: 10px;
    }

    .client-contact {
        font-size: 13px;
        margin-bottom: 15px;
    }

    .client-contact div {
        margin-bottom: 5px;
        color: var(--gray);
    }

    .client-contact i {
        width: 20px;
        color: var(--primary);
    }

    .client-footer {
        border-top: 1px solid var(--border);
        padding-top: 15px;
    }

    .client-metrics {
        display: flex;
        justify-content: space-around;
        margin-bottom: 10px;
    }

    .metric {
        text-align: center;
        font-size: 12px;
        color: var(--gray);
    }

    .metric strong {
        display: block;
        font-size: 16px;
        color: var(--dark);
    }

    .client-last-active {
        font-size: 11px;
        color: var(--gray);
        text-align: center;
    }

    .client-actions {
        position: absolute;
        top: 10px;
        right: 10px;
        display: none;
        gap: 5px;
    }

    .client-card:hover .client-actions {
        display: flex;
    }

    .client-detail-tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        border-bottom: 1px solid var(--border);
        padding-bottom: 10px;
    }

    .tab-btn {
        padding: 8px 16px;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 14px;
        color: var(--gray);
        border-radius: 8px;
    }

    .tab-btn.active {
        background: var(--light);
        color: var(--primary);
        font-weight: 600;
    }

    .client-info-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
    }

    .info-item {
        padding: 10px;
        background: var(--light);
        border-radius: 8px;
    }

    .info-item.full-width {
        grid-column: span 2;
    }

    .info-item label {
        display: block;
        font-size: 11px;
        color: var(--gray);
        margin-bottom: 5px;
    }

    .info-item p {
        font-size: 14px;
    }

    .info-item a {
        color: var(--primary);
        text-decoration: none;
    }

    .info-item a:hover {
        text-decoration: underline;
    }

    .project-item, .invoice-item {
        padding: 15px;
        background: var(--light);
        border-radius: 8px;
        margin-bottom: 10px;
        cursor: pointer;
    }

    .project-item:hover, .invoice-item:hover {
        background: #e5e7eb;
    }

    .invoice-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
    }

    .invoice-number {
        font-weight: 600;
    }

    .invoice-details {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: var(--gray);
    }

    .file-item {
        display: flex;
        align-items: center;
        padding: 10px;
        background: var(--light);
        border-radius: 8px;
        margin-bottom: 10px;
    }

    .file-item i {
        margin-right: 10px;
        color: var(--primary);
    }

    .file-name {
        flex: 1;
    }

    .file-date {
        font-size: 11px;
        color: var(--gray);
        margin-right: 15px;
    }

    .file-actions {
        display: flex;
        gap: 5px;
    }
`;
document.head.appendChild(clientStyles);

// Export client functions
window.loadClients = loadClients;
window.addClient = addClient;
window.submitClient = submitClient;
window.viewClient = viewClient;
window.editClient = editClient;
window.updateClient = updateClient;
window.deleteClient = deleteClient;
window.switchClientTab = switchClientTab;
window.uploadClientFile = uploadClientFile;
window.downloadClientFile = downloadClientFile;
window.deleteClientFile = deleteClientFile;
