// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Your Firebase configuration
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

// Create collections and sample documents
async function createCollections() {
  try {
    console.log("Starting to create collections...");

    // 1. Create tankRefills collection with sample document
    console.log("Creating tankRefills collection...");
    await setDoc(doc(db, "tankRefills", "sample-refill"), {
      tankType: "petrol",
      initialDip: 120,
      initialVolume: 15000,
      expectedDelivery: 5000,
      finalDip: 150,
      finalVolume: 19800,
      operator: "station@gmail.com",
      signature: true,
      invoiceNumber: "INV-2023-001",
      notes: "Sample tank refill",
      timestamp: serverTimestamp(),
      overage: -200,
      overagePercentage: -4
    });
    console.log("tankRefills collection created successfully");

    // 2. Create readings collection with sample document
    console.log("Creating readings collection...");
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    
    await setDoc(doc(db, "readings", dateString), {
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
    });
    console.log("readings collection created successfully");

    // 3. Create users collection with sample document
    console.log("Creating users collection...");
    await setDoc(doc(db, "users", "station-admin"), {
      email: "station@gmail.com",
      role: "admin",
      name: "Station Admin",
      lastLogin: serverTimestamp(),
      createdAt: serverTimestamp()
    });
    console.log("users collection created successfully");

    // 4. Create stations collection with sample document
    console.log("Creating stations collection...");
    await setDoc(doc(db, "stations", "main-station"), {
      name: "Main Station",
      location: "City Center",
      tanks: [
        {
          type: "petrol",
          capacity: 25000,
          currentLevel: 15000,
          lastRefill: serverTimestamp()
        },
        {
          type: "diesel",
          capacity: 25000,
          currentLevel: 18000,
          lastRefill: serverTimestamp()
        }
      ]
    });
    console.log("stations collection created successfully");

    console.log("All collections created successfully!");
  } catch (error) {
    console.error("Error creating collections:", error);
  }
}

// Run the function
createCollections();