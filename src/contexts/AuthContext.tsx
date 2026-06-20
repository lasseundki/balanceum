import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import { seedUserData } from '../lib/seed'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function register(email: string, password: string, displayName: string) {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(newUser, { displayName })
    await setDoc(doc(db, 'users', newUser.uid, 'profile', 'data'), {
      displayName,
      email,
      createdAt: Date.now(),
    })
    await seedUserData(newUser.uid)
  }

  async function logout() {
    await signOut(auth)
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export async function ensureUserSeeded(uid: string) {
  const profileRef = doc(db, 'users', uid, 'profile', 'data')
  const snap = await getDoc(profileRef)
  if (!snap.exists()) {
    await seedUserData(uid)
  }
}
