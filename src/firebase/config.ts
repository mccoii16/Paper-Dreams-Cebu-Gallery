import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import defaultConfig from '../../firebase-applet-config.json';

// Support Vercel and custom environment variables, with fallback to firebase-applet-config.json
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || defaultConfig.measurementId || "",
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore
// If user configured their own project on Vercel without custom database ID, default to standard '(default)' database
const configuredDatabaseId = 
  import.meta.env.VITE_FIREBASE_DATABASE_ID || 
  (import.meta.env.VITE_FIREBASE_PROJECT_ID ? '(default)' : defaultConfig.firestoreDatabaseId);

export const db = (configuredDatabaseId && configuredDatabaseId !== '(default)')
  ? getFirestore(app, configuredDatabaseId)
  : getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Cloud Storage
export const storage = getStorage(app);

// Connection test as required by SKILL.md
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is running in offline mode. Please verify network connectivity.');
      return false;
    }
    // A permission-denied error is also normal because /test/connection is denied by default rules
    return true;
  }
}
