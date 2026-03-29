import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "fake-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "localhost",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "theta-bliss-486220-s1",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "fake-app-id",
};

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  firestore = getFirestore(app);

  // Connect to local emulators in development
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    connectFirestoreEmulator(firestore, "localhost", 8080);
  }
} catch {
  app = null as unknown as FirebaseApp;
  auth = null as unknown as Auth;
  firestore = null as unknown as Firestore;
}

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => {
  if (!auth) throw new Error("Firebase not initialized");
  return signInWithPopup(auth, googleProvider);
};

export const logout = () => {
  if (!auth) return Promise.resolve();
  return signOut(auth);
};

export const getIdToken = async (): Promise<string | null> => {
  if (!auth) return null;
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
};

export { auth, firestore, onAuthStateChanged, type User };
