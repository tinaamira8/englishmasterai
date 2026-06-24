import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, updateProfile } from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore'

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

export async function saveProgress(uid, progress, streak, displayName) {
  const lessonsCount = Object.keys(progress.lessons || {}).filter(k => progress.lessons[k]).length
  const vocabCount = (progress.vocab || []).length
  const quizzesCount = Object.keys(progress.quizzes || {}).length
  const score = lessonsCount * 10 + quizzesCount * 5 + vocabCount
  await setDoc(doc(db, 'users', uid), {
    progress, streak, updatedAt: Date.now(),
    leaderboard: { score, lessonsCount, vocabCount, quizzesCount, displayName: displayName || 'Learner', streak }
  }, { merge: true })
}

export async function getLeaderboard() {
  const q = query(collection(db, 'users'), orderBy('leaderboard.score', 'desc'), limit(20))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ uid: d.id, ...d.data().leaderboard })).filter(e => e.score > 0)
}

export async function loadProgress(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

export async function saveSubscription(uid, sub) {
  await setDoc(doc(db, 'users', uid), { subscription: sub, updatedAt: Date.now() }, { merge: true })
}

export async function getSubscription(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return snap.data().subscription || null
}

const TRIAL_DAYS = 4

export function getTrialStatus(user) {
  if (!user) return { active: false, daysLeft: 0 }
  const created = new Date(user.metadata.creationTime)
  const now = new Date()
  const diff = Math.floor((now - created) / (1000 * 60 * 60 * 24))
  const daysLeft = Math.max(0, TRIAL_DAYS - diff)
  return { active: daysLeft > 0, daysLeft }
}

export { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, signInWithPopup, sendPasswordResetEmail, updateProfile }
