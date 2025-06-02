// src/firebase/tankLevelController.ts
import { db } from '../config/firebase';
import {
  doc,
  collection,
  runTransaction,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';

// Utility: Update tank level (atomic, safe for concurrent writes)
async function updateTankLevel(
  type: 'diesel' | 'petrol',
  delta: number,
  meta: { event: string; refId: string; user: string }
) {
  const tankRef = doc(db, 'tankLevels', 'current');
  await runTransaction(db, async (transaction) => {
    const tankSnap = await transaction.get(tankRef);
    const prev = tankSnap.exists() ? tankSnap.data() : { diesel: 0, petrol: 0 };
    const newLevel = Math.max(0, (prev[type] || 0) + delta);
    transaction.set(
      tankRef,
      {
        ...prev,
        [type]: newLevel,
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );
    // Optional: log the event
    const logRef = doc(collection(db, 'logs'));
    transaction.set(logRef, {
      type,
      delta,
      newLevel,
      event: meta.event,
      refId: meta.refId,
      user: meta.user,
      timestamp: serverTimestamp(),
    });
  });
}

// Listen for new refills and update tank levels
export function listenForRefills() {
  return onSnapshot(collection(db, 'refills'), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const { type, litersAdded, addedBy } = change.doc.data();
        updateTankLevel(type, litersAdded, {
          event: 'refill',
          refId: change.doc.id,
          user: addedBy,
        });
      }
    });
  });
}

// Listen for new sales and update tank levels
export function listenForSales() {
  return onSnapshot(collection(db, 'sales'), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const { type, litersSold, recordedBy } = change.doc.data();
        updateTankLevel(type, -Math.abs(litersSold), {
          event: 'sale',
          refId: change.doc.id,
          user: recordedBy,
        });
      }
    });
  });
}
