import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const missingVars = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

const firebaseConfigError = missingVars.length
    ? `Configuração Firebase incompleta. Defina: ${missingVars.join(', ')}.`
    : null;

const app = firebaseConfigError ? null : initializeApp(firebaseConfig);
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const functions = app ? getFunctions(app) : null;

const useAuthEmulator = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_AUTH_EMULATOR === 'true';
const authEmulatorHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST || 'http://127.0.0.1:9099';
const useFirestoreEmulator = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_FIRESTORE_EMULATOR === 'true';
const firestoreEmulatorHost = import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST || '127.0.0.1';
const firestoreEmulatorPort = Number(import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT || 8080);
const useFunctionsEmulator = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_FUNCTIONS_EMULATOR === 'true';
const functionsEmulatorHost = import.meta.env.VITE_FIREBASE_FUNCTIONS_EMULATOR_HOST || '127.0.0.1';
const functionsEmulatorPort = Number(import.meta.env.VITE_FIREBASE_FUNCTIONS_EMULATOR_PORT || 5001);

if (auth && useAuthEmulator) {
    connectAuthEmulator(auth, authEmulatorHost, { disableWarnings: true });
}

if (db && useFirestoreEmulator) {
    connectFirestoreEmulator(db, firestoreEmulatorHost, firestoreEmulatorPort);
}

if (functions && useFunctionsEmulator) {
    connectFunctionsEmulator(functions, functionsEmulatorHost, functionsEmulatorPort);
}

export { app, auth, db, functions, firebaseConfigError };
