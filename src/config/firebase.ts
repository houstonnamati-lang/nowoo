import { getApps, initializeApp, getApp, FirebaseApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let authInitialized = false;

export function getFirebaseAuth(): Auth {
  if (!auth) {
    app = getFirebaseApp();
    if (!authInitialized) {
      // First time: initialize with AsyncStorage persistence for React Native
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
      authInitialized = true;
    } else {
      // Already initialized, get the existing instance
      const { getAuth } = require("firebase/auth");
      auth = getAuth(app);
    }
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    app = getFirebaseApp();
    db = getFirestore(app);
  }
  return db;
}

export { getFirebaseApp };
