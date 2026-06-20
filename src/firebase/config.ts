import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBkPLP3bYA3MdcyQJAVyZrdSutDis85fqg',
  authDomain: 'finance-tracker-bb9f5.firebaseapp.com',
  projectId: 'finance-tracker-bb9f5',
  storageBucket: 'finance-tracker-bb9f5.firebasestorage.app',
  messagingSenderId: '396241441982',
  appId: '1:396241441982:web:5c1dec5952f53494defaef',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
