import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: O usuário precisará substituir estas variáveis no arquivo .env
// com os dados oficiais gerados pelo painel do Firebase Console.
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSy_MOCK_KEY_FOR_DEV",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "colegio-verdy-dev.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "colegio-verdy-dev",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "colegio-verdy-dev.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "0000000000",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000:web:00000"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
