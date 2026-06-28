import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'

const NOTES_KEY = 'balanceum_notes'
const EMAILS_KEY = 'balanceum_emails'

let _syncUid: string | null = null

export function setNoteSyncUid(uid: string | null): void {
  _syncUid = uid
}

export function saveNoteToHistory(note: string): void {
  if (!note.trim()) return
  const existing: string[] = JSON.parse(localStorage.getItem(NOTES_KEY) ?? '[]')
  const updated = [note.trim(), ...existing.filter(n => n !== note.trim())].slice(0, 50)
  localStorage.setItem(NOTES_KEY, JSON.stringify(updated))
  if (_syncUid) {
    setDoc(doc(db, 'users', _syncUid, 'settings', 'prefs'), { noteHistory: updated }, { merge: true }).catch(() => {})
  }
}

export function getNoteHistory(): string[] {
  return JSON.parse(localStorage.getItem(NOTES_KEY) ?? '[]')
}

export function mergeRemoteNotes(remoteNotes: string[]): void {
  if (!remoteNotes.length) return
  const local: string[] = JSON.parse(localStorage.getItem(NOTES_KEY) ?? '[]')
  const merged = [...remoteNotes, ...local.filter(n => !remoteNotes.includes(n))].slice(0, 50)
  localStorage.setItem(NOTES_KEY, JSON.stringify(merged))
}

export function saveEmailToHistory(email: string): void {
  if (!email.trim()) return
  const existing: string[] = JSON.parse(localStorage.getItem(EMAILS_KEY) ?? '[]')
  const updated = [email.trim(), ...existing.filter(e => e !== email.trim())].slice(0, 5)
  localStorage.setItem(EMAILS_KEY, JSON.stringify(updated))
}

export function getEmailHistory(): string[] {
  return JSON.parse(localStorage.getItem(EMAILS_KEY) ?? '[]')
}
