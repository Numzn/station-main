// This script lists all Firestore collections using Node.js (CommonJS) for compatibility with ts-node on Windows.
const { getFirestore, listCollections } = require('firebase/firestore');
const { db } = require('../config/firebase');

(async function main() {
  const firestore = db;
  const collections = await listCollections(firestore);
  for (const col of collections) {
    console.log(col.id);
  }
})();
