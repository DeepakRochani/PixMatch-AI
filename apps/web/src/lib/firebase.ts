// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD1UDAk4_p2LqWLtrK2F3C3d9sCma9o5zo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "pixmatch-ai.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pixmatch-ai",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "pixmatch-ai.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "192095419966",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:192095419966:web:c652cf4568471e17d01b6f",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-Y5SQXN1XNC"
};

// Initialize Firebase (safely handles SSR and hot reloads)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Analytics conditionally (only in browser environment)
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics fallback / ignore in non-browser or unsupported environments
  });
}

export default app;
