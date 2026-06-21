import { useEffect, useState, useCallback, useRef } from 'react'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { processRecurringTransactions } from '../lib/recurringProcessor'
import { monthRange, yearRange } from '../lib/formatters'
import type { Transaction, Category, PaymentMethod, Member, RecurringTransaction } from '../types'

function userCol(uid: string, name: string) {
  return collection(db, `users/${uid}/${name}`)
}
function userDoc(uid: string, col: string, id: string) {
  return doc(db, `users/${uid}/${col}/${id}`)
}

export function useCategories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  useEffect(() => {
    if (!user) return
    const q = query(userCol(user.uid, 'categories'), orderBy('order'))
    return onSnapshot(q, snap => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)))
    })
  }, [user])
  return categories
}

export function usePaymentMethods() {
  const { user } = useAuth()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  useEffect(() => {
    if (!user) return
    return onSnapshot(userCol(user.uid, 'paymentMethods'), snap => {
      setMethods(snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentMethod)))
    })
  }, [user])
  return methods
}

export function useMembers() {
  const { user } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  useEffect(() => {
    if (!user) return
    return onSnapshot(userCol(user.uid, 'members'), snap => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Member)))
    })
  }, [user])
  return members
}

export function useMonthTransactions(year: number, month: number) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!user) return
    const { start, end } = monthRange(year, month)
    const q = query(
      userCol(user.uid, 'transactions'),
      where('date', '>=', start),
      where('date', '<=', end),
      orderBy('date', 'desc'),
    )
    setLoading(true)
    return onSnapshot(q, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)))
      setLoading(false)
    })
  }, [user, year, month])
  return { transactions, loading }
}

export function useYearTransactions(year: number) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!user) return
    const { start, end } = yearRange(year)
    const q = query(
      userCol(user.uid, 'transactions'),
      where('date', '>=', start),
      where('date', '<=', end),
      orderBy('date', 'desc'),
    )
    setLoading(true)
    return onSnapshot(q, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)))
      setLoading(false)
    })
  }, [user, year])
  return { transactions, loading }
}

export function useRecurringTransactions() {
  const { user } = useAuth()
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([])
  useEffect(() => {
    if (!user) return
    return onSnapshot(userCol(user.uid, 'recurringTransactions'), snap => {
      setRecurring(snap.docs.map(d => ({ id: d.id, ...d.data() } as RecurringTransaction)))
    })
  }, [user])
  return recurring
}

export function useTransactionActions() {
  const { user } = useAuth()
  const addTransaction = useCallback(async (data: Omit<Transaction, 'id'>) => {
    if (!user) return
    await addDoc(userCol(user.uid, 'transactions'), data)
  }, [user])
  const deleteTransaction = useCallback(async (id: string) => {
    if (!user) return
    await deleteDoc(userDoc(user.uid, 'transactions', id))
  }, [user])
  const updateTransaction = useCallback(async (id: string, data: Record<string, unknown>) => {
    if (!user) return
    await updateDoc(userDoc(user.uid, 'transactions', id), data)
  }, [user])
  return { addTransaction, deleteTransaction, updateTransaction }
}

export function useCategoryActions() {
  const { user } = useAuth()
  const addCategory = useCallback(async (data: Omit<Category, 'id'>) => {
    if (!user) return
    await addDoc(userCol(user.uid, 'categories'), data)
  }, [user])
  const deleteCategory = useCallback(async (id: string) => {
    if (!user) return
    await deleteDoc(userDoc(user.uid, 'categories', id))
  }, [user])
  const updateCategory = useCallback(async (id: string, data: Partial<Category>) => {
    if (!user) return
    await updateDoc(userDoc(user.uid, 'categories', id), data as Record<string, unknown>)
  }, [user])
  return { addCategory, deleteCategory, updateCategory }
}

export function usePaymentMethodActions() {
  const { user } = useAuth()
  const addPaymentMethod = useCallback(async (data: Omit<PaymentMethod, 'id'>) => {
    if (!user) return
    await addDoc(userCol(user.uid, 'paymentMethods'), data)
  }, [user])
  const deletePaymentMethod = useCallback(async (id: string) => {
    if (!user) return
    await deleteDoc(userDoc(user.uid, 'paymentMethods', id))
  }, [user])
  return { addPaymentMethod, deletePaymentMethod }
}

export function useMemberActions() {
  const { user } = useAuth()
  const addMember = useCallback(async (data: Omit<Member, 'id'>) => {
    if (!user) return
    await addDoc(userCol(user.uid, 'members'), data)
  }, [user])
  const deleteMember = useCallback(async (id: string) => {
    if (!user) return
    await deleteDoc(userDoc(user.uid, 'members', id))
  }, [user])
  return { addMember, deleteMember }
}

export function useRecurringActions() {
  const { user } = useAuth()
  const addRecurring = useCallback(async (data: Omit<RecurringTransaction, 'id'>) => {
    if (!user) return
    await addDoc(userCol(user.uid, 'recurringTransactions'), data)
  }, [user])
  const deleteRecurring = useCallback(async (id: string) => {
    if (!user) return
    await deleteDoc(userDoc(user.uid, 'recurringTransactions', id))
  }, [user])
  const updateRecurring = useCallback(async (id: string, data: Partial<RecurringTransaction>) => {
    if (!user) return
    await updateDoc(userDoc(user.uid, 'recurringTransactions', id), data as Record<string, unknown>)
  }, [user])
  return { addRecurring, deleteRecurring, updateRecurring }
}

export function useRecurringProcessor() {
  const { user } = useAuth()
  const { addTransaction } = useTransactionActions()
  const { updateRecurring } = useRecurringActions()
  const done = useRef(false)

  useEffect(() => {
    if (!user) { done.current = false; return }
    if (done.current) return

    const unsub = onSnapshot(userCol(user.uid, 'recurringTransactions'), (snap) => {
      if (done.current) return
      done.current = true
      const recurring = snap.docs.map(d => ({ id: d.id, ...d.data() } as RecurringTransaction))
      void processRecurringTransactions(recurring, addTransaction, updateRecurring)
    })

    return unsub
  }, [user, addTransaction, updateRecurring])
}
