// Storage Service - Handles file uploads, downloads, and management

// Upload file to storage
async function uploadFile(file, path = '') {
    try {
        showLoading();

        // Create storage reference
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const fullPath = path ? `${path}/${fileName}` : fileName;
        const storageRef = storage.ref(fullPath);

        // Upload file
        const snapshot = await storageRef.put(file);
        
        // Get download URL
        const downloadUrl = await snapshot.ref.getDownloadURL();

        // Return file info
        return {
            name: file.name,
            path: fullPath,
            url: downloadUrl,
            size: file.size,
            type: file.type,
            uploadedAt: new Date()
        };

    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    } finally {
        hideLoading();
    }
}

// Upload multiple files
async function uploadMultipleFiles(files, path = '') {
    const uploadPromises = Array.from(files).map(file => uploadFile(file, path));
    return Promise.all(uploadPromises);
}

// Download file
async function downloadFile(path) {
    try {
        showLoading();

        const storageRef = storage.ref(path);
        const url = await storageRef.getDownloadURL();
        
        // Create temporary link and click it
        const a = document.createElement('a');
        a.href = url;
        a.download = path.split('/').pop(); // Get filename from path
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        return url;

    } catch (error) {
        console.error('Error downloading file:', error);
        throw error;
    } finally {
        hideLoading();
    }
}

// Get download URL
async function getDownloadUrl(path) {
    try {
        const storageRef = storage.ref(path);
        return await storageRef.getDownloadURL();
    } catch (error) {
        console.error('Error getting download URL:', error);
        throw error;
    }
}

// Delete file
async function deleteFile(path) {
    try {
        showLoading();

        const storageRef = storage.ref(path);
        await storageRef.delete();

        return true;

    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    } finally {
        hideLoading();
    }
}

// Delete multiple files
async function deleteMultipleFiles(paths) {
    const deletePromises = paths.map(path => deleteFile(path));
    return Promise.all(deletePromises);
}

// List files in a directory
async function listFiles(path) {
    try {
        const listRef = storage.ref(path);
        const result = await listRef.listAll();
        
        // Get items and prefixes (folders)
        const files = await Promise.all(result.items.map(async (item) => {
            const metadata = await item.getMetadata();
            return {
                name: item.name,
                path: item.fullPath,
                size: metadata.size,
                type: metadata.contentType,
                updated: metadata.updated,
                url: await item.getDownloadURL()
            };
        }));

        const folders = result.prefixes.map(prefix => ({
            name: prefix.name,
            path: prefix.fullPath
        }));

        return { files, folders };

    } catch (error) {
        console.error('Error listing files:', error);
        throw error;
    }
}

// Get file metadata
async function getFileMetadata(path) {
    try {
        const storageRef = storage.ref(path);
        return await storageRef.getMetadata();
    } catch (error) {
        console.error('Error getting file metadata:', error);
        throw error;
    }
}

// Update file metadata
async function updateFileMetadata(path, metadata) {
    try {
        const storageRef = storage.ref(path);
        return await storageRef.updateMetadata(metadata);
    } catch (error) {
        console.error('Error updating file metadata:', error);
        throw error;
    }
}

// Copy file
async function copyFile(sourcePath, destinationPath) {
    try {
        showLoading();

        // Get source file
        const sourceRef = storage.ref(sourcePath);
        const url = await sourceRef.getDownloadURL();
        
        // Download file content
        const response = await fetch(url);
        const blob = await response.blob();

        // Upload to destination
        const destinationRef = storage.ref(destinationPath);
        await destinationRef.put(blob);

        return destinationPath;

    } catch (error) {
        console.error('Error copying file:', error);
        throw error;
    } finally {
        hideLoading();
    }
}

// Move file (copy then delete)
async function moveFile(sourcePath, destinationPath) {
    try {
        await copyFile(sourcePath, destinationPath);
        await deleteFile(sourcePath);
        return destinationPath;
    } catch (error) {
        console.error('Error moving file:', error);
        throw error;
    }
}

// Create folder (placeholder - folders are virtual in Firebase Storage)
function createFolder(path) {
    // In Firebase Storage, folders are created implicitly when you upload files
    // This function just validates the path
    if (!path.endsWith('/')) {
        path += '/';
    }
    return path;
}

// Upload profile picture
async function uploadProfilePicture(file) {
    const userId = getCurrentUser()?.uid;
    if (!userId) throw new Error('User not authenticated');

    const path = `users/${userId}/profile/${Date.now()}_${file.name}`;
    const fileInfo = await uploadFile(file, path);

    // Update user profile with new avatar URL
    await updateDocument('users', userId, {
        avatar: fileInfo.url,
        avatarPath: fileInfo.path
    });

    return fileInfo;
}

// Upload project file
async function uploadProjectFile(projectId, file) {
    const path = `projects/${projectId}/${Date.now()}_${file.name}`;
    const fileInfo = await uploadFile(file, path);

    // Save file reference in Firestore
    await db.collection('projectFiles').add({
        projectId,
        ...fileInfo,
        uploadedBy: getCurrentUser()?.uid
    });

    return fileInfo;
}

// Upload task attachment
async function uploadTaskAttachment(taskId, file) {
    const path = `tasks/${taskId}/${Date.now()}_${file.name}`;
    const fileInfo = await uploadFile(file, path);

    // Save file reference in Firestore
    await db.collection('taskAttachments').add({
        taskId,
        ...fileInfo,
        uploadedBy: getCurrentUser()?.uid
    });

    return fileInfo;
}

// Upload chat attachment
async function uploadChatAttachment(channelId, file) {
    const path = `chat/${channelId}/${Date.now()}_${file.name}`;
    return await uploadFile(file, path);
}

// Upload client document
async function uploadClientDocument(clientId, file) {
    const path = `clients/${clientId}/documents/${Date.now()}_${file.name}`;
    const fileInfo = await uploadFile(file, path);

    // Save file reference in Firestore
    await db.collection('clientDocuments').add({
        clientId,
        ...fileInfo,
        uploadedBy: getCurrentUser()?.uid
    });

    return fileInfo;
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

// Format file size
function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Validate file type
function validateFileType(file, allowedTypes) {
    return allowedTypes.some(type => file.type.includes(type));
}

// Validate file size
function validateFileSize(file, maxSizeMB) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
}

// Export storage functions
window.uploadFile = uploadFile;
window.uploadMultipleFiles = uploadMultipleFiles;
window.downloadFile = downloadFile;
window.getDownloadUrl = getDownloadUrl;
window.deleteFile = deleteFile;
window.deleteMultipleFiles = deleteMultipleFiles;
window.listFiles = listFiles;
window.getFileMetadata = getFileMetadata;
window.updateFileMetadata = updateFileMetadata;
window.copyFile = copyFile;
window.moveFile = moveFile;
window.createFolder = createFolder;
window.uploadProfilePicture = uploadProfilePicture;
window.uploadProjectFile = uploadProjectFile;
window.uploadTaskAttachment = uploadTaskAttachment;
window.uploadChatAttachment = uploadChatAttachment;
window.uploadClientDocument = uploadClientDocument;
window.getFileIcon = getFileIcon;
window.formatFileSize = formatFileSize;
window.validateFileType = validateFileType;
window.validateFileSize = validateFileSize;
