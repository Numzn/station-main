import { db } from '../config/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';

export interface TankRefill {
  timestamp: string;
  tankType: 'petrol' | 'diesel';
  initialDip: number;
  initialVolume: number;
  expectedDelivery: number;
  finalDip: number;
  finalVolume: number;
  overage: number;
  overagePercentage: number;
  operator: string;
  signature: boolean;
  invoiceNumber: string;
  notes?: string;
}

const COLLECTION_NAME = 'tankRefills';

export const saveTankRefill = async (refill: TankRefill) => {
  try {
    await addDoc(collection(db, COLLECTION_NAME), {
      ...refill,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving tank refill:', error);
    throw error;
  }
};

export const getLatestTankRefills = async (limitCount: number = 10) => {
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
    })) as (TankRefill & { id: string })[];
  } catch (error) {
    console.error('Error fetching tank refills:', error);
    throw error;
  }
};
