import { db } from '../config/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';

export interface GensetReading {
  timestamp: string;
  runningHours: number;
  hoursSinceLastRefuel: number;
  fuelAdded: number; // Always 20L
  fuelConsumptionRate: number;
  operator: string;
  gensetStatus: 'running' | 'stopped'; // ADDED
  powerOutageStart: string; // ADDED, ISO string
}

const COLLECTION_NAME = 'gensetReadings';

export const saveGensetReading = async (reading: GensetReading) => {
  try {
    await addDoc(collection(db, COLLECTION_NAME), {
      ...reading
    });
  } catch (error) {
    console.error('Error saving genset reading:', error);
    throw error;
  }
};

export const getLatestGensetReadings = async (limitCount: number = 10) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ 
      id: doc.id,
      ...doc.data() 
    })) as (GensetReading & { id: string })[];
  } catch (error) {
    console.error('Error fetching genset readings:', error);
    throw error;
  }
};
