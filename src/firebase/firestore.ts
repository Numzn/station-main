import { getFirestore, doc, setDoc, getDoc, Timestamp, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import app from '../config/firebase';

const db = getFirestore(app);

// Enable offline persistence (DISABLED for debugging connectivity issues)
// enableIndexedDbPersistence(db)
//   .then(() => {
//     console.log('Firestore persistence enabled');
//   })
//   .catch((err) => {
//     console.error('Error enabling persistence:', err);
//     if (err.code === 'failed-precondition') {
//       // Multiple tabs open, persistence can only be enabled in one tab at a time
//       console.warn('Multiple tabs open, persistence only enabled in one tab');
//     } else if (err.code === 'unimplemented') {
//       // The current browser does not support all of the features required for persistence
//       console.warn('This browser does not support persistence');
//     }
//   });
export interface ReadingData {
  date: Timestamp;
  petrolPumps: {
    opening: number;
    closing: number;
    sales: number;
  }[];
  dieselPumps: {
    opening: number;
    closing: number;
    sales: number;
  }[];
  petrolTank: {
    opening: number;
    closing: number;
    dipReading: number;
    tankSales: number;
    pumpSales: number;
    variance: number;
    meterReading: number;
  };
  dieselTank: {
    opening: number;
    closing: number;
    dipReading: number;
    tankSales: number;
    pumpSales: number;
    variance: number;
    meterReading: number;
  };
}

export const saveReadings = async (data: Omit<ReadingData, 'date'>) => {
  try {
    console.log('Starting saveReadings with data:', data);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const readingData: ReadingData = {
      ...data,
      date: Timestamp.fromDate(today)
    };

    const dateString = today.toISOString().split('T')[0];
    console.log('Saving readings for date:', dateString);
    
    const readingsRef = doc(db, 'readings', dateString);
    await setDoc(readingsRef, readingData);
    console.log('Successfully saved readings to Firestore');
    return true;
  } catch (error) {
    console.error('Error in saveReadings:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    throw error;
  }
};
export const getReadings = async (date: Date) => {
  // Ensure date is set to midnight UTC
  const searchDate = new Date(date);
  searchDate.setHours(0, 0, 0, 0);
  
  const dateString = searchDate.toISOString().split('T')[0];
  console.log('Searching for readings on date:', dateString);
  
  const readingsRef = doc(db, 'readings', dateString);
  const docSnap = await getDoc(readingsRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data() as ReadingData;
    console.log('Found readings:', data);
    return data;
  }
  console.log('No readings found for date:', dateString);
  return null;
};

export const getLatestReadings = async () => {
  try {
    console.log('Fetching latest readings...');
    const readingsCollection = collection(db, 'readings');
    const q = query(readingsCollection, orderBy('date', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const latestDoc = querySnapshot.docs[0];
      console.log('Found latest reading from:', latestDoc.id);
      return latestDoc.data() as ReadingData;
    }
    
    console.log('No readings found in the collection');
    return null;
  } catch (error) {
    console.error('Error fetching latest readings:', error);
    throw error;
  }

};
// Add this function to test basic connectivity
export const testFirestoreConnection = async () => {
  try {
    console.log('Testing Firestore connection...');
    const testDoc = doc(db, 'test', 'test-doc');
    await setDoc(testDoc, { test: true, timestamp: new Date().toISOString() });
    console.log('Successfully wrote to Firestore');
    
    const docSnap = await getDoc(testDoc);
    console.log('Successfully read from Firestore:', docSnap.exists());
    
    return true;
  } catch (error) {
    console.error('Firestore connection test failed:', error);
    return false;
  }
};