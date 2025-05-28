import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';

// Firebase configuration from your config file
const firebaseConfig = {
  apiKey: "AIzaSyCeOoHGZxUe1aK5nvbwgrBiLspBM8ysLWE",
  authDomain: "station-main-72ee2.firebaseapp.com",
  projectId: "station-main-72ee2",
  storageBucket: "station-main-72ee2.appspot.com",
  messagingSenderId: "463651573778",
  appId: "1:463651573778:web:afa0a7e10c1e16f5d948cb",
  measurementId: "G-89S8FWFDDN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Setup tankRefills collection with a sample document
async function setupTankRefills() {
  const tankRefillsRef = collection(db, 'tankRefills');
  const sampleRefill = {
    tankType: 'petrol',
    initialDip: 120,
    initialVolume: 15000,
    expectedDelivery: 5000,
    finalDip: 150,
    finalVolume: 19800,
    operator: 'operator@example.com',
    signature: true,
    invoiceNumber: 'INV-2023-001',
    notes: 'Sample tank refill',
    timestamp: serverTimestamp(),
    overage: -200,
    overagePercentage: -4
  };

  try {
    await setDoc(doc(tankRefillsRef), sampleRefill);
    console.log('Sample tank refill added successfully');
  } catch (error) {
    console.error('Error adding sample tank refill:', error);
  }
}

// Setup readings collection with a sample document
async function setupReadings() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateString = today.toISOString().split('T')[0];
  
  const readingsRef = doc(db, 'readings', dateString);
  const sampleReading = {
    date: serverTimestamp(),
    petrolPumps: [
      {
        opening: 10000,
        closing: 10500,
        sales: 500
      },
      {
        opening: 20000,
        closing: 20800,
        sales: 800
      }
    ],
    dieselPumps: [
      {
        opening: 15000,
        closing: 15600,
        sales: 600
      }
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

// Setup users collection with a sample user
async function setupUsers() {
  const usersRef = collection(db, 'users');
  const sampleUser = {
    email: 'admin@example.com',
    role: 'admin',
    name: 'Admin User',
    lastLogin: serverTimestamp(),
    createdAt: serverTimestamp()
  };

  try {
    await setDoc(doc(usersRef, 'admin-user-id'), sampleUser);
    console.log('Sample user added successfully');
  } catch (error) {
    console.error('Error adding sample user:', error);
  }
}

// Setup stations collection with a sample station
async function setupStations() {
  const stationsRef = collection(db, 'stations');
  const sampleStation = {
    name: 'Main Station',
    location: 'City Center',
    tanks: [
      {
        type: 'petrol',
        capacity: 25000,
        currentLevel: 15000,
        lastRefill: serverTimestamp()
      },
      {
        type: 'diesel',
        capacity: 25000,
        currentLevel: 18000,
        lastRefill: serverTimestamp()
      }
    ]
  };

  try {
    await setDoc(doc(stationsRef, 'main-station'), sampleStation);
    console.log('Sample station added successfully');
  } catch (error) {
    console.error('Error adding sample station:', error);
  }
}

// Run all setup functions
async function setupDatabase() {
  console.log('Setting up Firestore database...');
  await setupTankRefills();
  await setupReadings();
  await setupUsers();
  await setupStations();
  console.log('Database setup complete!');
}

setupDatabase();