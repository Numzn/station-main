// This script lists all Firestore collections using the Firebase Admin SDK for Node.js (works outside Vite/react context)
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();

(async function main() {
  const collections = await db.listCollections();
  for (const col of collections) {
    console.log(col.id);
  }
})();
