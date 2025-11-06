// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBf5GVdTQWOUrUtOOWb3aC7q4uXJgkdzfU",
  authDomain: "iot-wifi-tc25.firebaseapp.com",
  projectId: "iot-wifi-tc25",
  storageBucket: "iot-wifi-tc25.firebasestorage.app",
  messagingSenderId: "765431657193",
  appId: "1:765431657193:web:a149c2f336224c6132b678",
  measurementId: "G-M10W1JGEYG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// Firestore database
export const db = getFirestore(app);
// Authentication (anonymous helper)
export const auth = getAuth(app);

/**
 * Ensure we have an anonymous authenticated user.
 * Returns the user credential or throws the underlying error.
 */
export async function ensureAnonymousSignIn() {
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    // bubble up so callers can decide how to handle
    throw err;
  }
}