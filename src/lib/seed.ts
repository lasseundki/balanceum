import { collection, writeBatch, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Category, PaymentMethod, Member } from '../types'

const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Wohnen', icon: '🏠', color: '#7BA89B', type: 'expense', order: 0 },
  { name: 'Lebensmittel', icon: '🛒', color: '#C9A05A', type: 'expense', order: 1 },
  { name: 'Transport', icon: '🚗', color: '#7A9EC4', type: 'expense', order: 2 },
  { name: 'Gesundheit', icon: '💊', color: '#C47A91', type: 'expense', order: 3 },
  { name: 'Freizeit', icon: '🎉', color: '#A891C4', type: 'expense', order: 4 },
  { name: 'Restaurant', icon: '🍽️', color: '#7AB4C4', type: 'expense', order: 5 },
  { name: 'Kleidung', icon: '👕', color: '#C9A05A', type: 'expense', order: 6 },
  { name: 'Bildung', icon: '📚', color: '#7A9EC4', type: 'expense', order: 7 },
  { name: 'Reisen', icon: '✈️', color: '#7BA89B', type: 'expense', order: 8 },
  { name: 'Technik', icon: '💻', color: '#A891C4', type: 'expense', order: 9 },
  { name: 'Haushalt', icon: '🧹', color: '#C47A91', type: 'expense', order: 10 },
  { name: 'Fixkosten', icon: '📋', color: '#6E6860', type: 'expense', order: 11 },
  { name: 'Business', icon: '💼', color: '#3D6B5E', type: 'both', order: 12 },
  { name: 'Gehalt', icon: '💰', color: '#7BA89B', type: 'income', order: 13 },
  { name: 'Provision', icon: '📈', color: '#C9A05A', type: 'income', order: 14 },
  { name: 'Sonstiges', icon: '📌', color: '#A09890', type: 'both', order: 15 },
]

const DEFAULT_PAYMENT_METHODS: Omit<PaymentMethod, 'id'>[] = [
  { name: 'Bar', type: 'cash', color: '#C9A05A' },
  { name: 'Überweisung', type: 'transfer', color: '#7A9EC4' },
  { name: 'Kreditkarte', type: 'card', color: '#7BA89B' },
]

const DEFAULT_MEMBERS: Omit<Member, 'id'>[] = [
  { name: 'Ich', relation: 'Ich', isMe: true },
]

export async function seedUserData(uid: string) {
  const batch = writeBatch(db)

  for (const cat of DEFAULT_CATEGORIES) {
    const ref = doc(collection(db, `users/${uid}/categories`))
    batch.set(ref, cat)
  }

  for (const pm of DEFAULT_PAYMENT_METHODS) {
    const ref = doc(collection(db, `users/${uid}/paymentMethods`))
    batch.set(ref, pm)
  }

  for (const m of DEFAULT_MEMBERS) {
    const ref = doc(collection(db, `users/${uid}/members`))
    batch.set(ref, m)
  }

  await batch.commit()
}
