// Firestore database service

// Generic CRUD operations

// Create document
async function createDocument(collection, data) {
    try {
        const docRef = await db.collection(collection).add({
            ...data,
            company: getCurrentCompany(),
            createdBy: getCurrentUser()?.uid,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        await logAudit('create', `Created ${collection} document: ${docRef.id}`);
        return docRef;
        
    } catch (error) {
        console.error(`Error creating ${collection}:`, error);
        throw error;
    }
}

// Read document
async function getDocument(collection, id) {
    try {
        const doc = await db.collection(collection).doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (error) {
        console.error(`Error getting ${collection}:`, error);
        throw error;
    }
}

// Update document
async function updateDocument(collection, id, data) {
    try {
        await db.collection(collection).doc(id).update({
            ...data,
            updatedAt: new Date()
        });
        
        await logAudit('update', `Updated ${collection} document: ${id}`);
        return true;
        
    } catch (error) {
        console.error(`Error updating ${collection}:`, error);
        throw error;
    }
}

// Delete document
async function deleteDocument(collection, id) {
    try {
        await db.collection(collection).doc(id).delete();
        
        await logAudit('delete', `Deleted ${collection} document: ${id}`);
        return true;
        
    } catch (error) {
        console.error(`Error deleting ${collection}:`, error);
        throw error;
    }
}

// Query documents
async function queryDocuments(collection, constraints = []) {
    try {
        let query = db.collection(collection);
        
        // Add company filter
        query = query.where('company', '==', getCurrentCompany());
        
        // Add additional constraints
        constraints.forEach(constraint => {
            query = query.where(constraint.field, constraint.operator, constraint.value);
        });
        
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
    } catch (error) {
        console.error(`Error querying ${collection}:`, error);
        throw error;
    }
}

// Get real-time updates
function subscribeToCollection(collection, constraints, callback) {
    let query = db.collection(collection).where('company', '==', getCurrentCompany());
    
    constraints.forEach(constraint => {
        query = query.where(constraint.field, constraint.operator, constraint.value);
    });
    
    return query.onSnapshot((snapshot) => {
        const documents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(documents);
    }, (error) => {
        console.error(`Error subscribing to ${collection}:`, error);
    });
}

// Batch write
async function batchWrite(operations) {
    const batch = db.batch();
    
    operations.forEach(op => {
        const ref = db.collection(op.collection).doc(op.id);
        if (op.type === 'set') {
            batch.set(ref, op.data);
        } else if (op.type === 'update') {
            batch.update(ref, op.data);
        } else if (op.type === 'delete') {
            batch.delete(ref);
        }
    });
    
    try {
        await batch.commit();
        return true;
    } catch (error) {
        console.error('Error in batch write:', error);
        throw error;
    }
}

// Export firestore functions
window.createDocument = createDocument;
window.getDocument = getDocument;
window.updateDocument = updateDocument;
window.deleteDocument = deleteDocument;
window.queryDocuments = queryDocuments;
window.subscribeToCollection = subscribeToCollection;
window.batchWrite = batchWrite;
