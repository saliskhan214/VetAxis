import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where
} from 'firebase/firestore';

import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import { LivestockFarm, LivestockAnimal, LivestockBatch, LivestockTask } from '../types';

const LOCAL_FARMS_KEY = 'va_farms';
const LOCAL_ANIMALS_KEY = 'va_animals';
const LOCAL_BATCHES_KEY = 'va_batches';
const LOCAL_TASKS_KEY = 'va_tasks';

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

// Date helper to add days
export function addDays(dateStr: string | undefined, days: number): string {
  const base = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(base.getTime())) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }
  const clone = new Date(base.getTime());
  clone.setDate(clone.getDate() + days);
  return clone.toISOString().split('T')[0];
}

// Date helper to add months (useful for booster triggers)
export function addMonths(dateStr: string | undefined, months: number): string {
  const base = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(base.getTime())) {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  }
  const clone = new Date(base.getTime());
  clone.setMonth(clone.getMonth() + months);
  return clone.toISOString().split('T')[0];
}

export const LivestockService = {
  // ─────────────────────────────────────────────────────────────────
  // FARMS SERVICE
  // ─────────────────────────────────────────────────────────────────
  async fetchFarms(): Promise<LivestockFarm[]> {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'livestock_farms'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() })) as LivestockFarm[];
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'livestock_farms');
      }
    } else {
      try {
        return JSON.parse(localStorage.getItem(LOCAL_FARMS_KEY) || '[]');
      } catch {
        return [];
      }
    }
    return [];
  },

  async createFarm(farm: Partial<LivestockFarm>): Promise<LivestockFarm> {
    const newFarm: LivestockFarm = {
      id: 'farm_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: farm.name || 'My Farm',
      location: farm.location || 'Capital Area, Islamabad',
      farmType: farm.farmType || 'Mixed Farm',
      mixedOptions: farm.mixedOptions,
      ownerUid: farm.ownerUid || '',
      ownerName: farm.ownerName || 'Fermer',
      ownerEmail: farm.ownerEmail || '',
      managerUid: farm.managerUid,
      managerName: farm.managerName,
      managerRole: farm.managerRole,
      managerStatus: farm.managerStatus || 'unassigned',
      createdAt: Date.now(),
      team: farm.team || []
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'livestock_farms', newFarm.id), cleanUndefined(newFarm));
        return newFarm;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `livestock_farms/${newFarm.id}`);
      }
    } else {
      const list = await this.fetchFarms();
      list.push(newFarm);
      localStorage.setItem(LOCAL_FARMS_KEY, JSON.stringify(list));
      return newFarm;
    }
    return newFarm;
  },

  async updateFarm(farmId: string, updates: Partial<LivestockFarm>): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'livestock_farms', farmId), cleanUndefined(updates));
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `livestock_farms/${farmId}`);
      }
    } else {
      const list = await this.fetchFarms();
      const idx = list.findIndex(f => f.id === farmId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem(LOCAL_FARMS_KEY, JSON.stringify(list));
      }
    }
  },

  async deleteFarm(farmId: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'livestock_farms', farmId));
        // Delete cascade for related animals, batches, and tasks (on Firestore these would optionally stay or cascade)
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `livestock_farms/${farmId}`);
      }
    } else {
      // Cascade delete locally
      const farms = await this.fetchFarms();
      localStorage.setItem(LOCAL_FARMS_KEY, JSON.stringify(farms.filter(f => f.id !== farmId)));

      const animals = await this.fetchAllAnimals();
      localStorage.setItem(LOCAL_ANIMALS_KEY, JSON.stringify(animals.filter(a => a.farmId !== farmId)));

      const batches = await this.fetchAllBatches();
      localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify(batches.filter(b => b.farmId !== farmId)));

      const tasks = await this.fetchAllTasks();
      localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks.filter(t => t.farmId !== farmId)));
    }
  },

  // ─────────────────────────────────────────────────────────────────
  // ANIMALS SERVICE (Individual Entry Mode)
  // ─────────────────────────────────────────────────────────────────
  async fetchAllAnimals(): Promise<LivestockAnimal[]> {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'livestock_animals'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() })) as LivestockAnimal[];
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'livestock_animals');
      }
    } else {
      try {
        return JSON.parse(localStorage.getItem(LOCAL_ANIMALS_KEY) || '[]');
      } catch {
        return [];
      }
    }
    return [];
  },

  async fetchAnimals(farmId: string): Promise<LivestockAnimal[]> {
    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, 'livestock_animals'), where('farmId', '==', farmId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() })) as LivestockAnimal[];
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'livestock_animals');
      }
    } else {
      const all = await this.fetchAllAnimals();
      return all.filter(a => a.farmId === farmId);
    }
    return [];
  },

  async createAnimal(animal: Partial<LivestockAnimal>): Promise<LivestockAnimal> {
    const newAnimal: LivestockAnimal = {
      id: 'animal_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      farmId: animal.farmId || '',
      animalId: animal.animalId || '',
      species: animal.species || 'Cattle',
      tagNumber: animal.tagNumber,
      gender: animal.gender || 'Female',
      dob: animal.dob || new Date().toISOString().split('T')[0],
      breed: animal.breed,
      weight: animal.weight,
      healthStatus: animal.healthStatus || 'Healthy',
      entryType: 'individual',
      createdAt: Date.now()
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'livestock_animals', newAnimal.id), cleanUndefined(newAnimal));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `livestock_animals/${newAnimal.id}`);
      }
    } else {
      const list = await this.fetchAllAnimals();
      list.push(newAnimal);
      localStorage.setItem(LOCAL_ANIMALS_KEY, JSON.stringify(list));
    }

    // Smart Scheduling Trigger:
    await this.autoGenerateSchedulesForAnimal(newAnimal);

    return newAnimal;
  },

  async autoGenerateSchedulesForAnimal(animal: LivestockAnimal) {
    // Generate system scheduled events automatically based on DOB
    const dob = animal.dob || new Date().toISOString().split('T')[0];
    const tasksToSchedule: Partial<LivestockTask>[] = [];

    if (animal.species === 'Cattle' || animal.species === 'Buffalo') {
      tasksToSchedule.push({
        serviceType: 'Deworming (First Dose)',
        dueDate: addDays(dob, 30),
        autoScheduleNext: false
      });
      tasksToSchedule.push({
        serviceType: 'Vaccination (Foot-and-Mouth Disease)',
        dueDate: addDays(dob, 60),
        autoScheduleNext: false
      });
      tasksToSchedule.push({
        serviceType: 'Vaccination (Haemorrhagic Septicaemia)',
        dueDate: addDays(dob, 150),
        autoScheduleNext: false
      });
      tasksToSchedule.push({
        serviceType: 'Booster Vaccination',
        dueDate: addDays(dob, 330),
        autoScheduleNext: true // completed booster creates another booster 6 months down the road!
      });
    } else if (animal.species === 'Goat' || animal.species === 'Sheep') {
      tasksToSchedule.push({
        serviceType: 'Deworming (First Dose)',
        dueDate: addDays(dob, 21),
        autoScheduleNext: false
      });
      tasksToSchedule.push({
        serviceType: 'Vaccination (PPR / Goat Plague)',
        dueDate: addDays(dob, 45),
        autoScheduleNext: false
      });
      tasksToSchedule.push({
        serviceType: 'Booster Vaccination',
        dueDate: addDays(dob, 180),
        autoScheduleNext: true
      });
    } else {
      // General checkup
      tasksToSchedule.push({
        serviceType: 'General Checkup',
        dueDate: addDays(dob, 14),
        autoScheduleNext: false
      });
    }

    for (const task of tasksToSchedule) {
      await this.createTask({
        farmId: animal.farmId,
        targetId: animal.id,
        targetType: 'individual',
        targetName: animal.animalId + (animal.tagNumber ? ` (Tag ID: ${animal.tagNumber})` : ''),
        serviceType: task.serviceType,
        dueDate: task.dueDate,
        status: 'Pending',
        createdBy: 'system',
        autoScheduleNext: task.autoScheduleNext
      });
    }
  },

  async updateAnimal(animalId: string, updates: Partial<LivestockAnimal>): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'livestock_animals', animalId), cleanUndefined(updates));
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `livestock_animals/${animalId}`);
      }
    } else {
      const list = await this.fetchAllAnimals();
      const idx = list.findIndex(a => a.id === animalId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem(LOCAL_ANIMALS_KEY, JSON.stringify(list));
      }
    }
  },

  async deleteAnimal(animalId: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'livestock_animals', animalId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `livestock_animals/${animalId}`);
      }
    } else {
      const list = await this.fetchAllAnimals();
      localStorage.setItem(LOCAL_ANIMALS_KEY, JSON.stringify(list.filter(a => a.id !== animalId)));

      // Delete tasks associated with animal
      const tasks = await this.fetchAllTasks();
      localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks.filter(t => t.targetId !== animalId)));
    }
  },

  // ─────────────────────────────────────────────────────────────────
  // BATCHES SERVICE (Flock / Batch Entry Mode)
  // ─────────────────────────────────────────────────────────────────
  async fetchAllBatches(): Promise<LivestockBatch[]> {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'livestock_batches'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() })) as LivestockBatch[];
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'livestock_batches');
      }
    } else {
      try {
        return JSON.parse(localStorage.getItem(LOCAL_BATCHES_KEY) || '[]');
      } catch {
        return [];
      }
    }
    return [];
  },

  async fetchBatches(farmId: string): Promise<LivestockBatch[]> {
    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, 'livestock_batches'), where('farmId', '==', farmId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() })) as LivestockBatch[];
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'livestock_batches');
      }
    } else {
      const all = await this.fetchAllBatches();
      return all.filter(b => b.farmId === farmId);
    }
    return [];
  },

  async createBatch(batch: Partial<LivestockBatch>): Promise<LivestockBatch> {
    const newBatch: LivestockBatch = {
      id: 'batch_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      farmId: batch.farmId || '',
      batchName: batch.batchName || '',
      species: batch.species || 'Poultry',
      quantity: batch.quantity || 100,
      arrivalDate: batch.arrivalDate || new Date().toISOString().split('T')[0],
      breed: batch.breed,
      entryType: 'batch',
      status: 'Active',
      createdAt: Date.now()
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'livestock_batches', newBatch.id), cleanUndefined(newBatch));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `livestock_batches/${newBatch.id}`);
      }
    } else {
      const list = await this.fetchAllBatches();
      list.push(newBatch);
      localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify(list));
    }

    // Auto generate schedule for Batch (e.g., standard vaccines for Poultry flocks)
    await this.autoGenerateSchedulesForBatch(newBatch);

    return newBatch;
  },

  async autoGenerateSchedulesForBatch(batch: LivestockBatch) {
    const arrDate = batch.arrivalDate || new Date().toISOString().split('T')[0];
    const tasksToSchedule: Partial<LivestockTask>[] = [];

    if (batch.species === 'Poultry') {
      tasksToSchedule.push({
        serviceType: 'Newcastle Disease Vaccination (LaSota)',
        dueDate: addDays(arrDate, 7)
      });
      tasksToSchedule.push({
        serviceType: 'Infectious Bursal Disease Vaccine (Gumboro)',
        dueDate: addDays(arrDate, 14)
      });
      tasksToSchedule.push({
        serviceType: 'Newcastle Disease Booster Vaccine',
        dueDate: addDays(arrDate, 24)
      });
      tasksToSchedule.push({
        serviceType: 'Growth Tracking & Water Hygiene Audit',
        dueDate: addDays(arrDate, 28)
      });
      tasksToSchedule.push({
        serviceType: 'Final Pre-Market Health Audit',
        dueDate: addDays(arrDate, 38)
      });
    } else {
      // General batch care
      tasksToSchedule.push({
        serviceType: 'Batch Acclimatization Inspection',
        dueDate: addDays(arrDate, 3)
      });
      tasksToSchedule.push({
        serviceType: 'Batch Deworming Cycle',
        dueDate: addDays(arrDate, 30)
      });
    }

    for (const task of tasksToSchedule) {
      await this.createTask({
        farmId: batch.farmId,
        targetId: batch.id,
        targetType: 'batch',
        targetName: `${batch.batchName} (${batch.quantity} birds)`,
        serviceType: task.serviceType,
        dueDate: task.dueDate,
        status: 'Pending',
        createdBy: 'system'
      });
    }
  },

  async updateBatch(batchId: string, updates: Partial<LivestockBatch>): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'livestock_batches', batchId), cleanUndefined(updates));
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `livestock_batches/${batchId}`);
      }
    } else {
      const list = await this.fetchAllBatches();
      const idx = list.findIndex(b => b.id === batchId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify(list));
      }
    }
  },

  async deleteBatch(batchId: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'livestock_batches', batchId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `livestock_batches/${batchId}`);
      }
    } else {
      const list = await this.fetchAllBatches();
      localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify(list.filter(b => b.id !== batchId)));

      // Delete tasks associated with batch
      const tasks = await this.fetchAllTasks();
      localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks.filter(t => t.targetId !== batchId)));
    }
  },

  // ─────────────────────────────────────────────────────────────────
  // TASKS / REMINDER SERVICE
  // ─────────────────────────────────────────────────────────────────
  async fetchAllTasks(): Promise<LivestockTask[]> {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'livestock_tasks'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() })) as LivestockTask[];
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'livestock_tasks');
      }
    } else {
      try {
        return JSON.parse(localStorage.getItem(LOCAL_TASKS_KEY) || '[]');
      } catch {
        return [];
      }
    }
    return [];
  },

  async fetchTasks(farmId: string): Promise<LivestockTask[]> {
    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, 'livestock_tasks'), where('farmId', '==', farmId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() })) as LivestockTask[];
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'livestock_tasks');
      }
    } else {
      const all = await this.fetchAllTasks();
      return all.filter(t => t.farmId === farmId);
    }
    return [];
  },

  async createTask(task: Partial<LivestockTask>): Promise<LivestockTask> {
    const newTask: LivestockTask = {
      id: 'task_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      farmId: task.farmId || '',
      targetId: task.targetId || '',
      targetType: task.targetType || 'individual',
      targetName: task.targetName || '',
      serviceType: task.serviceType || 'General Checkup',
      dueDate: task.dueDate || new Date().toISOString().split('T')[0],
      status: task.status || 'Pending',
      completedDate: task.completedDate,
      vaccineUsed: task.vaccineUsed,
      notes: task.notes,
      createdBy: task.createdBy || 'manual',
      completedByUid: task.completedByUid,
      completedByName: task.completedByName,
      createdAt: Date.now(),
      autoScheduleNext: task.autoScheduleNext
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'livestock_tasks', newTask.id), cleanUndefined(newTask));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `livestock_tasks/${newTask.id}`);
      }
    } else {
      const list = await this.fetchAllTasks();
      list.push(newTask);
      localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(list));
    }
    return newTask;
  },

  async updateTask(taskId: string, updates: Partial<LivestockTask>): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'livestock_tasks', taskId), cleanUndefined(updates));
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `livestock_tasks/${taskId}`);
      }
    } else {
      const list = await this.fetchAllTasks();
      const idx = list.findIndex(t => t.id === taskId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(list));
      }
    }
  },

  async deleteTask(taskId: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'livestock_tasks', taskId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `livestock_tasks/${taskId}`);
      }
    } else {
      const list = await this.fetchAllTasks();
      localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(list.filter(t => t.id !== taskId)));
    }
  },

  async completeTask(taskId: string, details: { completedByUid: string, completedByName: string, vaccineUsed?: string, notes?: string }): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const updatePayload: Partial<LivestockTask> = {
      status: 'Completed',
      completedDate: today,
      completedByUid: details.completedByUid,
      completedByName: details.completedByName,
      vaccineUsed: details.vaccineUsed,
      notes: details.notes
    };

    // Retrieve full task details first to verify autoScheduleNext
    let currentTask: LivestockTask | null = null;
    if (isFirebaseConfigured && db) {
      // Fetching is simplified on clients
      const all = await this.fetchAllTasks();
      currentTask = all.find(t => t.id === taskId) || null;
    } else {
      const all = await this.fetchAllTasks();
      currentTask = all.find(t => t.id === taskId) || null;
    }

    await this.updateTask(taskId, updatePayload);

    // If autoScheduleNext is configured: Create next booster in exactly 6 months (180 days)
    if (currentTask && currentTask.autoScheduleNext) {
      const nextDueStr = addMonths(today, 6);
      await this.createTask({
        farmId: currentTask.farmId,
        targetId: currentTask.targetId,
        targetType: currentTask.targetType,
        targetName: currentTask.targetName,
        serviceType: `Booster Vaccination (Routine Cycle)`,
        dueDate: nextDueStr,
        status: 'Pending',
        createdBy: 'system',
        autoScheduleNext: true // maintain loop
      });
    }
  }
};
