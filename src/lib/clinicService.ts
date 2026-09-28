import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';

import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';

// ─── APPOINTMENT INTERFACES ──────────────────────────────────────

export interface ClinicAppointment {
  id: string;
  clinicId: string;
  patientName: string;
  ownerName: string;
  ownerPhone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  vetId: string;
  vetName: string;
  type: 'consultation' | 'surgery' | 'grooming' | 'vaccination' | 'follow-up' | 'emergency';
  status: 'Scheduled' | 'Checked In' | 'In Progress' | 'Completed' | 'No Show' | 'Cancelled';
  isRecurring: boolean;
  recurrencePattern?: 'None' | 'Daily' | 'Weekly' | 'Monthly';
  isBlocked?: boolean;
  blockedReason?: string;
  createdAt: number;
  notes?: string;
  userId?: string;
  sent6hReminder?: boolean;
}

// ─── KEYS FOR OFFLINE CACHE ─────────────────────────────────────
const LOCAL_APPTS_KEY = 'va_clinic_appointments';

let offlineOverride = false;

function isCloud() {
  return isFirebaseConfigured && db && !offlineOverride;
}

function cleanUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as any;
  }
  const result = { ...obj } as any;
  Object.keys(result).forEach(key => {
    if (result[key] === undefined) {
      delete result[key];
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = cleanUndefined(result[key]);
    }
  });
  return result;
}

export const ClinicService = {
  setOfflineOverride(val: boolean) {
    offlineOverride = val;
  },

  // ─── ALIGN SYNCHRONIZER ────────────────────────
  async syncOfflineDataWithServer(): Promise<void> {
    if (!isFirebaseConfigured || !db) return;

    try {
      const appts: ClinicAppointment[] = JSON.parse(localStorage.getItem(LOCAL_APPTS_KEY) || '[]');
      for (const a of appts) await setDoc(doc(db, 'clinic_appointments', a.id), cleanUndefined(a));
    } catch (err) {
      console.error('[VetAxis] Error during appointment sync:', err);
    }
  },

  // ─── APPOINTMENT ACTIONS ───────────────────────
  async fetchAppointments(clinicId: string): Promise<ClinicAppointment[]> {
    if (isCloud()) {
      try {
        const q = query(collection(db, 'clinic_appointments'), where('clinicId', '==', clinicId));
        const snaps = await getDocs(q);
        const results = snaps.docs.map(d => d.data() as ClinicAppointment);
        return results.filter(a => !['1', '2', '3', '4'].includes(a.id.replace(`apt_${clinicId}_`, '')));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'clinic_appointments');
        return [];
      }
    } else {
      let local = localStorage.getItem(LOCAL_APPTS_KEY);
      if (!local) {
        localStorage.setItem(LOCAL_APPTS_KEY, JSON.stringify([]));
        return [];
      }
      const parsed = JSON.parse(local) as ClinicAppointment[];
      return parsed.filter(a => !['1', '2', '3', '4'].includes(a.id.replace(`apt_${clinicId}_`, '')));
    }
  },

  async fetchAppointmentsByUserId(userId: string): Promise<ClinicAppointment[]> {
    if (isCloud()) {
      try {
        const q = query(collection(db, 'clinic_appointments'), where('userId', '==', userId));
        const snaps = await getDocs(q);
        return snaps.docs.map(d => d.data() as ClinicAppointment);
      } catch (err) {
        console.error('Error fetching appointments by user:', err);
        return [];
      }
    } else {
      const localStr = localStorage.getItem(LOCAL_APPTS_KEY) || '[]';
      const all = JSON.parse(localStr) as ClinicAppointment[];
      return all.filter(a => a.userId === userId);
    }
  },

  async saveAppointment(appt: ClinicAppointment): Promise<void> {
    const cleaned = cleanUndefined(appt);
    if (isCloud()) {
      try {
        await setDoc(doc(db, 'clinic_appointments', appt.id), cleaned);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `clinic_appointments/${appt.id}`);
      }
    } else {
      const allStr = localStorage.getItem(LOCAL_APPTS_KEY) || '[]';
      const all = JSON.parse(allStr) as ClinicAppointment[];
      const idx = all.findIndex(a => a.id === appt.id);
      if (idx !== -1) {
        all[idx] = cleaned;
      } else {
        all.push(cleaned);
      }
      localStorage.setItem(LOCAL_APPTS_KEY, JSON.stringify(all));
    }
  },

  async deleteAppointment(id: string): Promise<void> {
    if (isCloud()) {
      try {
        await deleteDoc(doc(db, 'clinic_appointments', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `clinic_appointments/${id}`);
      }
    } else {
      const allStr = localStorage.getItem(LOCAL_APPTS_KEY) || '[]';
      const all = JSON.parse(allStr) as ClinicAppointment[];
      const filtered = all.filter(a => a.id !== id);
      localStorage.setItem(LOCAL_APPTS_KEY, JSON.stringify(filtered));
    }
  }
};
