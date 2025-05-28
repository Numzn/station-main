import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
    initializeFirestore, 
    enableIndexedDbPersistence,
    CACHE_SIZE_UNLIMITED 
} from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with persistence
const db = initializeFirestore(app, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

// Enable offline persistence
enableIndexedDbPersistence(db)
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            // Multiple tabs open, persistence can only be enabled in one tab at a time
            console.warn('Multiple tabs open, persistence only enabled in one tab');
        } else if (err.code === 'unimplemented') {
            // The current browser doesn't support persistence
            console.warn('This browser does not support persistence');
        } else {
            console.error('Error enabling persistence:', err);
        }
    });

export { db };
console.log('Firebase initialized with project:', firebaseConfig.projectId);

export default app;