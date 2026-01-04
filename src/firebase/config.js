import { initializeApp } from 'firebase/app'
import {
  getAuth,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyCyvYMhxJWXZdCB60MBrZFKeONnR4fXDcc",
  authDomain: "dk-social.firebaseapp.com",
  databaseURL: "https://dk-social-default-rtdb.firebaseio.com",
  projectId: "dk-social",
  storageBucket: "dk-social.appspot.com",
  messagingSenderId: "932389139148",
  appId: "1:932389139148:web:f7fc25c78a52114c1ec869"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig)

// Inicializar serviços
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export { onAuthStateChanged }
export {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  Timestamp,
  onSnapshot
}

export default app

