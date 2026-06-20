export type TransactionType = 'expense' | 'income'
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type PaymentType = 'cash' | 'card' | 'transfer' | 'other'
export type CategoryType = 'expense' | 'income' | 'both'

export interface UserProfile {
  displayName: string
  email: string
  createdAt: number
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: CategoryType
  order: number
}

export interface PaymentMethod {
  id: string
  name: string
  type: PaymentType
  color: string
  billingDay?: number
  last4?: string
}

export interface Member {
  id: string
  name: string
  relation: string
  isMe: boolean
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  date: number
  categoryId: string
  paymentMethodId?: string
  memberId?: string
  note?: string
  isGift: boolean
  isExtraordinary: boolean
  createdAt: number
}

export interface RecurringTransaction {
  id: string
  type: TransactionType
  amount: number
  categoryId: string
  paymentMethodId?: string
  memberId?: string
  note?: string
  frequency: Frequency
  startDate: number
  lastGeneratedDate?: number
  isGift: boolean
  isExtraordinary: boolean
}
