import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// New Firebase configuration for the new project
const firebaseConfig = {
    apiKey: "AIzaSyB8wXU3HgNBKtWUz77oBROzZOmv5YzLnRk",
    authDomain: "loan-management-ed9b9.firebaseapp.com",
    projectId: "loan-management-ed9b9",
    storageBucket: "loan-management-ed9b9.firebasestorage.app",
    messagingSenderId: "292423766629",
    appId: "1:292423766629:web:00a122785874bbceeeac8c",
    measurementId: "G-EJ2J5HYR2R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log('Firebase initialized with project:', firebaseConfig.projectId);

export default app;