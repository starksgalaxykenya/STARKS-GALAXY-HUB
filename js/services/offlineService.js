// Offline sync service

let isOffline = false;
let syncQueue = [];

// Initialize offline detection
function initOfflineDetection() {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    isOffline = !navigator.onLine;
    if (isOffline) {
        handleOffline();
    }
}

// Handle online status
function handleOnline() {
    isOffline = false;
    showToast('Connection restored. Syncing data...', 'success');
    syncOfflineData();
}

// Handle offline status
function handleOffline() {
    isOffline = true;
    showToast('You are offline. Changes will be synced when connection resumes.', 'warning');
}

// Queue operation for offline sync
function queueOperation(operation) {
    syncQueue.push({
        ...operation,
        id: Date.now(),
        timestamp: new Date()
    });
    
    // Save to IndexedDB for persistence
    saveQueueToIndexedDB();
    
    // If online, sync immediately
    if (!isOffline) {
        syncOfflineData();
    }
}

// Sync offline data
async function syncOfflineData() {
    if (isOffline || syncQueue.length === 0) return;
    
    const queue = [...syncQueue];
    syncQueue = [];
    
    for (const operation of queue) {
        try {
            await processOperation(operation);
        } catch (error) {
            console.error('Error syncing operation:', error);
            // Re-queue failed operations
            syncQueue.push(operation);
        }
    }
    
    // Save updated queue
    saveQueueToIndexedDB();
}

// Process individual operation
async function processOperation(operation) {
    switch (operation.type) {
        case 'create':
            await db.collection(operation.collection).add(operation.data);
            break;
        case 'update':
            await db.collection(operation.collection).doc(operation.id).update(operation.data);
            break;
        case 'delete':
            await db.collection(operation.collection).doc(operation.id).delete();
            break;
    }
}

// Save queue to IndexedDB
async function saveQueueToIndexedDB() {
    try {
        const db = await openIndexedDB();
        const tx = db.transaction('syncQueue', 'readwrite');
        const store = tx.objectStore('syncQueue');
        
        // Clear existing queue
        await store.clear();
        
        // Add all items
        for (const item of syncQueue) {
            await store.add(item);
        }
    } catch (error) {
        console.error('Error saving queue to IndexedDB:', error);
    }
}

// Load queue from IndexedDB
async function loadQueueFromIndexedDB() {
    try {
        const db = await openIndexedDB();
        const tx = db.transaction('syncQueue', 'readonly');
        const store = tx.objectStore('syncQueue');
        const items = await store.getAll();
        
        syncQueue = items;
    } catch (error) {
        console.error('Error loading queue from IndexedDB:', error);
    }
}

// Open IndexedDB connection
function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('StarksGalaxyHub', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('syncQueue')) {
                db.createObjectStore('syncQueue', { keyPath: 'id' });
            }
        };
    });
}

// Check if online
function isOnline() {
    return !isOffline;
}

// Get offline status
function getOfflineStatus() {
    return isOffline;
}

// Export offline functions
window.initOfflineDetection = initOfflineDetection;
window.queueOperation = queueOperation;
window.syncOfflineData = syncOfflineData;
window.isOnline = isOnline;
window.getOfflineStatus = getOfflineStatus;
