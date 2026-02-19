// Documents module

let currentFolder = 'root';
let currentPath = [{ id: 'root', name: 'Root' }];

// Load documents
async function loadDocuments() {
    try {
        showLoading();

        // Load folders
        const folders = await db.collection('folders')
            .where('company', '==', getCurrentCompany())
            .where('parent', '==', currentFolder)
            .orderBy('name')
            .get();

        // Load documents
        const docs = await db.collection('documents')
            .where('company', '==', getCurrentCompany())
            .where('folder', '==', currentFolder)
            .orderBy('name')
            .get();

        const grid = document.getElementById('documentsGrid');
        if (!grid) return;

        grid.innerHTML = '';

        // Display folders
        folders.forEach(doc => {
            const folder = doc.data();
            grid.innerHTML += `
                <div class="folder-item" onclick="navigateToFolder('${doc.id}', '${folder.name}')">
                    <div class="folder-icon">
                        <i class="fas fa-folder"></i>
                    </div>
                    <div class="folder-info">
                        <div class="folder-name">${folder.name}</div>
                        <div class="folder-meta">${folder.itemCount || 0} items</div>
                    </div>
                    <div class="folder-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); renameFolder('${doc.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="event.stopPropagation(); deleteFolder('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        // Display documents
        docs.forEach(doc => {
            const document = doc.data();
            const date = document.updatedAt?.toDate ? formatRelativeTime(document.updatedAt.toDate()) : '';
            
            grid.innerHTML += `
                <div class="document-item" onclick="viewDocument('${doc.id}')">
                    <div class="document-icon">
                        <i class="fas ${getFileIcon(document.type)}"></i>
                    </div>
                    <div class="document-info">
                        <div class="document-name">${document.name}</div>
                        <div class="document-meta">
                            <span>${date}</span>
                            <span>${formatFileSize(document.size)}</span>
                        </div>
                    </div>
                    <div class="document-badge">v${document.version || 1}</div>
                    <div class="document-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); downloadDocument('${doc.id}')">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn-icon" onclick="event.stopPropagation(); shareDocument('${doc.id}')">
                            <i class="fas fa-share-alt"></i>
                        </button>
                        <button class="btn-icon" onclick="event.stopPropagation(); deleteDocument('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        // Empty state
        if (folders.empty && docs.empty) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-folder-open"></i>
                    <h3>This folder is empty</h3>
                    <p>Upload files or create folders to get started</p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button class="btn btn-primary" onclick="uploadDocument()">
                            <i class="fas fa-upload"></i> Upload
                        </button>
                        <button class="btn btn-outline" onclick="createFolder()">
                            <i class="fas fa-folder-plus"></i> New Folder
                        </button>
                    </div>
                </div>
            `;
        }

        updateBreadcrumb();
        hideLoading();

    } catch (error) {
        hideLoading();
        console.error('Error loading documents:', error);
        showError('Failed to load documents');
    }
}

// Get file icon based on mime type
function getFileIcon(mimeType) {
    if (!mimeType) return 'fa-file';
    
    if (mimeType.startsWith('image/')) return 'fa-file-image';
    if (mimeType.startsWith('video/')) return 'fa-file-video';
    if (mimeType.startsWith('audio/')) return 'fa-file-audio';
    if (mimeType.includes('pdf')) return 'fa-file-pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'fa-file-word';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return 'fa-file-excel';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fa-file-powerpoint';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'fa-file-archive';
    if (mimeType.includes('text')) return 'fa-file-alt';
    
    return 'fa-file';
}

// Update breadcrumb navigation
function updateBreadcrumb() {
    const breadcrumb = document.getElementById('documentBreadcrumb');
    if (!breadcrumb) return;

    breadcrumb.innerHTML = currentPath.map((item, index) => {
        if (index === currentPath.length - 1) {
            return `<span class="breadcrumb-current">${item.name}</span>`;
        }
        return `<span class="breadcrumb-item" onclick="navigateToFolder('${item.id}', '${item.name}')">${item.name}</span>`;
    }).join(' <i class="fas fa-chevron-right"></i> ');
}

// Navigate to folder
function navigateToFolder(folderId, folderName) {
    currentFolder = folderId;
    
    // Update path
    if (folderId === 'root') {
        currentPath = [{ id: 'root', name: 'Root' }];
    } else {
        const index = currentPath.findIndex(item => item.id === folderId);
        if (index !== -1) {
            currentPath = currentPath.slice(0, index + 1);
        } else {
            currentPath.push({ id: folderId, name: folderName });
        }
    }
    
    loadDocuments();
}

// Create new folder
async function createFolder() {
    const name = prompt('Enter folder name:');
    if (!name) return;

    try {
        showLoading();

        await db.collection('folders').add({
            name,
            company: getCurrentCompany(),
            parent: currentFolder,
            createdBy: getCurrentUser()?.uid,
            createdAt: new Date(),
            itemCount: 0
        });

        showSuccess('Folder created successfully');
        loadDocuments();

    } catch (error) {
        hideLoading();
        showError('Error creating folder: ' + error.message);
    }
}

// Rename folder
async function renameFolder(folderId) {
    const folder = await getDocument('folders', folderId);
    if (!folder) return;

    const newName = prompt('Enter new folder name:', folder.name);
    if (!newName || newName === folder.name) return;

    try {
        showLoading();
        await updateDocument('folders', folderId, { name: newName });
        showSuccess('Folder renamed');
        loadDocuments();
    } catch (error) {
        hideLoading();
        showError('Error renaming folder: ' + error.message);
    }
}

// Delete folder
async function deleteFolder(folderId) {
    if (!confirm('Are you sure you want to delete this folder? All contents will be moved to root.')) return;

    try {
        showLoading();

        // Move all documents to root
        const documents = await db.collection('documents')
            .where('folder', '==', folderId)
            .get();

        const batch = db.batch();
        documents.forEach(doc => {
            batch.update(doc.ref, { folder: 'root' });
        });

        // Move all subfolders to root
        const subfolders = await db.collection('folders')
            .where('parent', '==', folderId)
            .get();

        subfolders.forEach(doc => {
            batch.update(doc.ref, { parent: 'root' });
        });

        // Delete the folder
        batch.delete(db.collection('folders').doc(folderId));

        await batch.commit();

        showSuccess('Folder deleted');
        loadDocuments();

    } catch (error) {
        hideLoading();
        showError('Error deleting folder: ' + error.message);
    }
}

// Upload document
function uploadDocument() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = handleFileUpload;
    input.click();
}

// Handle file upload
async function handleFileUpload(event) {
    const files = event.target.files;
    if (!files.length) return;

    showLoading();

    try {
        for (let file of files) {
            // Upload to storage
            const storageRef = storage.ref(`documents/${Date.now()}_${file.name}`);
            await storageRef.put(file);
            const url = await storageRef.getDownloadURL();

            // Create document record
            await db.collection('documents').add({
                name: file.name,
                path: storageRef.fullPath,
                url,
                size: file.size,
                type: file.type,
                folder: currentFolder,
                company: getCurrentCompany(),
                uploadedBy: getCurrentUser()?.uid,
                uploadedAt: new Date(),
                updatedAt: new Date(),
                version: 1,
                versions: [{
                    version: 1,
                    path: storageRef.fullPath,
                    uploadedAt: new Date(),
                    uploadedBy: getCurrentUser()?.uid
                }]
            });

            // Update folder item count
            if (currentFolder !== 'root') {
                const folderRef = db.collection('folders').doc(currentFolder);
                const folder = await folderRef.get();
                if (folder.exists) {
                    await folderRef.update({
                        itemCount: (folder.data().itemCount || 0) + 1
                    });
                }
            }
        }

        showSuccess('Files uploaded successfully');
        loadDocuments();

    } catch (error) {
        console.error('Error uploading files:', error);
        showError('Error uploading files: ' + error.message);
    } finally {
        hideLoading();
    }
}

// View document
function viewDocument(docId) {
    // Open document preview modal
    showDocumentPreview(docId);
}

// Show document preview
async function showDocumentPreview(docId) {
    try {
        const doc = await getDocument('documents', docId);
        if (!doc) return;

        // Create preview modal
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3>${doc.name}</h3>
                    <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="document-preview">
                    ${doc.type?.startsWith('image/') ? 
                        `<img src="${doc.url}" alt="${doc.name}" style="max-width: 100%;">` :
                        doc.type?.includes('pdf') ?
                        `<iframe src="${doc.url}" style="width: 100%; height: 500px;"></iframe>` :
                        `<div class="document-info-preview">
                            <i class="fas ${getFileIcon(doc.type)}" style="font-size: 64px;"></i>
                            <p>${doc.name}</p>
                            <p>Size: ${formatFileSize(doc.size)}</p>
                            <p>Uploaded: ${formatDate(doc.uploadedAt)}</p>
                            <p>Version: ${doc.version || 1}</p>
                            <a href="${doc.url}" download class="btn btn-primary" style="margin-top: 20px;">
                                <i class="fas fa-download"></i> Download
                            </a>
                        </div>`
                    }
                </div>
                <div class="document-versions">
                    <h4>Version History</h4>
                    ${doc.versions?.map(v => `
                        <div class="version-item" onclick="downloadVersion('${v.path}')">
                            <span>Version ${v.version}</span>
                            <span>${formatDate(v.uploadedAt)}</span>
                        </div>
                    `).join('') || '<p>No version history</p>'}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);

    } catch (error) {
        console.error('Error showing document preview:', error);
        showError('Failed to load document preview');
    }
}

// Download document
async function downloadDocument(docId) {
    try {
        const doc = await getDocument('documents', docId);
        if (!doc) return;

        window.open(doc.url, '_blank');
        await logAudit('document_download', `Downloaded document: ${doc.name}`);

    } catch (error) {
        showError('Error downloading document: ' + error.message);
    }
}

// Download specific version
async function downloadVersion(path) {
    try {
        const url = await storage.ref(path).getDownloadURL();
        window.open(url, '_blank');
    } catch (error) {
        showError('Error downloading version: ' + error.message);
    }
}

// Share document
async function shareDocument(docId) {
    // Create share modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Share Document</h3>
                <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="form-group">
                <label>Share with</label>
                <select id="shareWith" class="form-control" multiple style="height: 150px;">
                    ${/* Users will be loaded dynamically */''}
                </select>
            </div>
            <div class="form-group">
                <label>Permissions</label>
                <select id="sharePermissions" class="form-control">
                    <option value="view">Can View</option>
                    <option value="edit">Can Edit</option>
                    <option value="comment">Can Comment</option>
                </select>
            </div>
            <div class="form-group">
                <label>Message (optional)</label>
                <textarea id="shareMessage" class="form-control" rows="3"></textarea>
            </div>
            <button class="btn btn-primary" onclick="shareDocumentWithUsers('${docId}')">Share</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Load users
    const users = await queryDocuments('users', []);
    const select = document.getElementById('shareWith');
    users.forEach(user => {
        if (user.id !== getCurrentUser()?.uid) {
            select.innerHTML += `<option value="${user.id}">${user.name || user.email}</option>`;
        }
    });
}

// Share document with users
async function shareDocumentWithUsers(docId) {
    const userIds = Array.from(document.getElementById('shareWith').selectedOptions).map(opt => opt.value);
    const permissions = document.getElementById('sharePermissions').value;
    const message = document.getElementById('shareMessage').value;

    if (userIds.length === 0) {
        showError('Please select users to share with');
        return;
    }

    try {
        showLoading();

        const doc = await getDocument('documents', docId);

        // Create share records
        const batch = db.batch();
        userIds.forEach(userId => {
            const shareRef = db.collection('shares').doc();
            batch.set(shareRef, {
                documentId: docId,
                documentName: doc.name,
                sharedBy: getCurrentUser()?.uid,
                sharedWith: userId,
                permissions,
                message,
                sharedAt: new Date()
            });

            // Create notification
            const notificationRef = db.collection('notifications').doc();
            batch.set(notificationRef, {
                userId,
                title: 'Document Shared',
                message: `${getCurrentUser()?.displayName || 'Someone'} shared "${doc.name}" with you`,
                type: 'share',
                read: false,
                createdAt: new Date()
            });
        });

        await batch.commit();

        showSuccess('Document shared successfully');
        document.querySelector('.modal.active').remove();

    } catch (error) {
        hideLoading();
        showError('Error sharing document: ' + error.message);
    }
}

// Delete document
async function deleteDocument(docId) {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
        showLoading();

        const doc = await getDocument('documents', docId);
        
        // Delete from storage
        if (doc && doc.path) {
            await storage.ref(doc.path).delete();
        }

        // Delete from firestore
        await deleteDocument('documents', docId);

        // Update folder count
        if (doc && doc.folder && doc.folder !== 'root') {
            const folderRef = db.collection('folders').doc(doc.folder);
            const folder = await folderRef.get();
            if (folder.exists) {
                await folderRef.update({
                    itemCount: Math.max(0, (folder.data().itemCount || 1) - 1)
                });
            }
        }

        showSuccess('Document deleted');
        loadDocuments();

    } catch (error) {
        hideLoading();
        showError('Error deleting document: ' + error.message);
    }
}

// Add CSS for document module
const documentStyles = document.createElement('style');
documentStyles.textContent = `
    .folder-item {
        background: white;
        border-radius: 12px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 2px solid transparent;
        position: relative;
    }

    .folder-item:hover {
        border-color: var(--primary);
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }

    .folder-icon {
        font-size: 48px;
        color: #f59e0b;
        margin-bottom: 10px;
        text-align: center;
    }

    .folder-info {
        text-align: center;
    }

    .folder-name {
        font-weight: 600;
        margin-bottom: 5px;
    }

    .folder-meta {
        font-size: 12px;
        color: var(--gray);
    }

    .folder-actions {
        position: absolute;
        top: 10px;
        right: 10px;
        display: none;
        gap: 5px;
    }

    .folder-item:hover .folder-actions {
        display: flex;
    }

    .breadcrumb-item {
        cursor: pointer;
        color: var(--primary);
    }

    .breadcrumb-item:hover {
        text-decoration: underline;
    }

    .breadcrumb-current {
        font-weight: 600;
        color: var(--dark);
    }

    .document-versions {
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid var(--border);
    }

    .version-item {
        display: flex;
        justify-content: space-between;
        padding: 10px;
        background: var(--light);
        border-radius: 8px;
        margin-bottom: 5px;
        cursor: pointer;
    }

    .version-item:hover {
        background: #e5e7eb;
    }
`;
document.head.appendChild(documentStyles);

// Export document functions
window.loadDocuments = loadDocuments;
window.createFolder = createFolder;
window.uploadDocument = uploadDocument;
window.navigateToFolder = navigateToFolder;
window.viewDocument = viewDocument;
window.downloadDocument = downloadDocument;
window.shareDocument = shareDocument;
window.deleteDocument = deleteDocument;
window.shareDocumentWithUsers = shareDocumentWithUsers;
