// This script lists all Firestore collections using Node.js (CommonJS) for compatibility with Windows and 'type: module'.
import { getFirestore, listCollections } from 'firebase/firestore';
import { db } from '../config/firebase';

(async function main() {
  const firestore = db;
  const collections = await listCollections(firestore);
  for (const col of collections) {
    console.log(col.id);
  }
})();
