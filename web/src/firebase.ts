import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

// Web config identifies the project. It is not a secret. Access is controlled by Auth,
// security rules and Cloud Functions. Analytics is intentionally NOT initialised (child privacy).
const firebaseConfig = {
  apiKey: "AIzaSyD5GNPv1FFOWrvLE_n3GT8r31w-Bx1L13s",
  authDomain: "deenstars-dev.firebaseapp.com",
  projectId: "deenstars-dev",
  storageBucket: "deenstars-dev.firebasestorage.app",
  messagingSenderId: "1029452540657",
  appId: "1:1029452540657:web:3ad37542bb61899e641750",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");

export const usingEmulators = import.meta.env.VITE_USE_EMULATORS === "true";
if (usingEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
