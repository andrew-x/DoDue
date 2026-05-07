import { type FirebaseApp, getApps, initializeApp } from 'firebase/app'
import { type Auth, getAuth } from 'firebase/auth'
import { type Firestore, getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
}

const requiredConfigKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const

export const missingFirebaseConfigKeys = requiredConfigKeys.filter(
  (key) => !import.meta.env[key],
)

export const isFirebaseConfigured = missingFirebaseConfigKeys.length === 0

let app: FirebaseApp | null = null
let auth: Auth | null = null
let firestore: Firestore | null = null

export function getFirebaseApp() {
  if (!isFirebaseConfigured) {
    throw new Error(
      `Missing Firebase configuration: ${missingFirebaseConfigKeys.join(', ')}`,
    )
  }

  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseConfig)
  }

  return app
}

export function getFirebaseAuth() {
  if (!auth) {
    auth = getAuth(getFirebaseApp())
  }

  return auth
}

export function getFirestoreDb() {
  if (!firestore) {
    firestore = getFirestore(getFirebaseApp())
  }

  return firestore
}
