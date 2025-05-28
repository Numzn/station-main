import { getFirestore } from 'firebase/firestore';

async function main() {
  const firestore = getFirestore();
  // @ts-ignore
  const collections = await firestore.listCollections();
  for (const col of collections) {
    console.log(col.id);
  }
}

main().catch(console.error);
