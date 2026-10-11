import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth, signInAnonymously, User } from 'firebase/auth';

export interface FirebaseConfigType {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export const getFirebaseConfig = (): FirebaseConfigType | null => {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    return null;
  }

  return {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
  };
};

const config = getFirebaseConfig();
let currentApp: FirebaseApp | null = null;
let currentAuth: Auth | null = null;
let currentDb: Firestore | null = null;

if (config) {
  currentApp = !getApps().length ? initializeApp(config) : getApp();
  currentAuth = getAuth(currentApp);
  currentDb = getFirestore(currentApp);
} else {
  console.info("[Firebase] No live Firebase credentials detected in environment. Using secure backend storage.");
}

export const app = currentApp;
export const auth = currentAuth;
export const db = currentDb;
export const isConfigured = Boolean(config);

export const ensureFirebaseAuth = async (): Promise<User | null> => {
  if (!auth) return null;
  try {
    if (auth.currentUser) return auth.currentUser;
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    console.warn("[Firebase] Auth notice:", err);
    return null;
  }
};

export default app;
