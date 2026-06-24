import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, updateProfile } from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAIrIUuz5EbFGVxcPJw1siUZuoqaj9hrzE",
  authDomain: "englishmaster-68428.firebaseapp.com",
  projectId: "englishmaster-68428",
  storageBucket: "englishmaster-68428.firebasestorage.app",
  messagingSenderId: "668559786896",
  appId: "1:668559786896:web:8bab7c62506c272a36e915",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

export async function saveProgress(uid, progress, streak) {
  await setDoc(doc(db, 'users', uid), { progress, streak, updatedAt: Date.now() }, { merge: true })
}

export async function loadProgress(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

export { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, signInWithPopup, sendPasswordResetEmail, updateProfile }
