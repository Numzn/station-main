// This script seeds the Firestore database with a sample user for authentication testing.
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB8wXU3HgNBKtWUz77oBROzZOmv5YzLnRk",
  authDomain: "loan-management-ed9b9.firebaseapp.com",
  projectId: "loan-management-ed9b9",
  storageBucket: "loan-management-ed9b9.firebasestorage.app",
  messagingSenderId: "292423766629",
  appId: "1:292423766629:web:00a122785874bbceeeac8c",
  measurementId: "G-EJ2J5HYR2R"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function seedUser() {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, 'station@gmail.com', '123456');
    console.log('User created:', userCredential.user.email);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('User already exists: station@gmail.com');
    } else {
      console.error('Error creating user:', error);
    }
  }
}

seedUser();
