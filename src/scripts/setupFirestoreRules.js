import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rulesContent = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can access data
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Only allow users to read/write tank refills
    match /tankRefills/{refillId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.resource.data.operator == request.auth.token.email;
    }
    
    // Only allow users to read/write readings
    match /readings/{date} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Only allow admins to manage users
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}`;

const outputPath = path.join(__dirname, '../../firestore.rules');

fs.writeFileSync(outputPath, rulesContent);
console.log(`Firestore rules written to ${outputPath}`);
console.log('To deploy these rules, run: firebase deploy --only firestore:rules');