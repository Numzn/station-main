// This script seeds the Firestore database with a sample 'readings' document for the new project.
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

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
const db = getFirestore(app);

async function seedReadings() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateString = today.toISOString().split('T')[0];

  const readingsRef = doc(db, 'readings', dateString);
  const sampleReading = {
    date: serverTimestamp(),
    petrolPumps: [
      { opening: 10000, closing: 10500, sales: 500 },
      { opening: 20000, closing: 20800, sales: 800 },
      { opening: 30000, closing: 30800, sales: 800 },
      { opening: 40000, closing: 40800, sales: 800 }
    ],
    dieselPumps: [
      { opening: 15000, closing: 15600, sales: 600 },
      { opening: 25000, closing: 25800, sales: 800 },
      { opening: 35000, closing: 35800, sales: 800 },
      { opening: 45000, closing: 45800, sales: 800 }
    ],
    petrolTank: {
      opening: 15000,
      closing: 13700,
      dipReading: 110,
      tankSales: 1300,
      pumpSales: 1300,
      variance: 0,
      meterReading: 110
    },
    dieselTank: {
      opening: 18000,
      closing: 17400,
      dipReading: 130,
      tankSales: 600,
      pumpSales: 600,
      variance: 0,
      meterReading: 130
    }
  };

  try {
    await setDoc(readingsRef, sampleReading);
    console.log('Sample reading added successfully');
  } catch (error) {
    console.error('Error adding sample reading:', error);
  }
}

seedReadings();
