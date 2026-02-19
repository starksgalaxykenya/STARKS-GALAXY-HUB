// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDyre2oxURYXHZOLIHUeG2itz56i5ehAYo",
    authDomain: "company-doc-generator.firebaseapp.com",
    projectId: "company-doc-generator",
    storageBucket: "company-doc-generator.firebasestorage.app",
    messagingSenderId: "891677147775",
    appId: "1:891677147775:web:a1ffebf23572f5ca18f54a",
    measurementId: "G-1MMCF9W7HF"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Enable offline persistence
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('Multiple tabs open, persistence enabled in one tab only');
        } else if (err.code == 'unimplemented') {
            console.log('Browser doesn\'t support persistence');
        }
    });

// Export for use in other modules
window.firebaseApp = firebase;
window.auth = auth;
window.db = db;
window.storage = storage;
