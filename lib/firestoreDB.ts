import {
  doc, setDoc, onSnapshot, collection, query, where, orderBy,
  getDocs, deleteDoc, getCountFromServer, Unsubscribe,
  waitForPendingWrites, limit as firestoreLimit, startAfter, DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Task, TaskGroup, DailyRecord, Milestone, TimeSlot, ScheduleTemplates, Habit, FocusSession, Project, Expense, BalanceItem, DiaryEntry, DiaryFileEntry } from '../types';

// ===== App Data (tasks, groups, milestones, schedule) =====

export interface AppData {
  tasks: Task[];
  groups: TaskGroup[];
  milestones: Milestone[];
  schedule?: TimeSlot[];                // legacy (backward compat)
  scheduleTemplates?: ScheduleTemplates;
  deletedDefaultTaskIds?: string[];    // Track which default tasks user has deleted
  habits?: Habit[];                    // Habit tracker data
  projects?: Project[];               // Project management data
  expenses?: Expense[];               // Expense tracker data
  balanceItems?: BalanceItem[];       // Balance sheet items (assets & liabilities)
}

/** Real-time listener on user's appData document */
export function subscribeAppData(
  uid: string,
  callback: (data: AppData | null) => void,
): Unsubscribe {
  const ref = doc(db, 'users', uid, 'config', 'appData');
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? snap.data() as AppData : null);
  });
}

/** Strip undefined values recursively (Firestore rejects undefined) */
function stripUndefined(obj: unknown): unknown {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (typeof obj === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v !== undefined) clean[k] = stripUndefined(v);
    }
    return clean;
  }
  return obj;
}

/** Save app data to Firestore.
 *  merge=true (default): partial update, only writes included fields.
 *  merge=false: full overwrite, replaces entire document — use when saving ALL fields.
 *  Note: With persistentLocalCache, setDoc resolves after local IndexedDB write (fast).
 *  Server confirmation happens asynchronously via onSnapshot echoes. */
export async function saveAppData(uid: string, data: Partial<AppData>, merge = true) {
  const ref = doc(db, 'users', uid, 'config', 'appData');
  const cleaned = stripUndefined(data) as Partial<AppData>;

  // Flush old pending writes first so they don't overwrite our data on the server
  await waitForPendingWrites(db);

  if (merge) {
    await setDoc(ref, cleaned, { merge: true });
  } else {
    await setDoc(ref, cleaned);
  }
}

// ===== Daily Records =====

function recordsCollection(uid: string) {
  return collection(db, 'users', uid, 'dailyRecords');
}

export async function addDailyRecordFS(uid: string, record: DailyRecord) {
  const ref = doc(db, 'users', uid, 'dailyRecords', record.id);
  await setDoc(ref, stripUndefined(record) as DailyRecord, { merge: true });
}

export async function getDailyRecordsByDate(uid: string, date: string): Promise<DailyRecord[]> {
  const q = query(recordsCollection(uid), where('date', '==', date));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as DailyRecord);
}

export async function getDailyRecordCount(uid: string): Promise<number> {
  const snap = await getCountFromServer(recordsCollection(uid));
  return snap.data().count;
}

export async function deleteDailyRecord(uid: string, recordId: string) {
  await deleteDoc(doc(db, 'users', uid, 'dailyRecords', recordId));
}

/** Get daily records within a date range (inclusive, YYYY-MM-DD) */
export async function getDailyRecordsInRange(
  uid: string, startDate: string, endDate: string,
): Promise<DailyRecord[]> {
  const q = query(
    recordsCollection(uid),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as DailyRecord);
}

// ===== Focus Sessions =====

function focusCollection(uid: string) {
  return collection(db, 'users', uid, 'focusSessions');
}

export async function addFocusSessionFS(uid: string, session: FocusSession) {
  const ref = doc(db, 'users', uid, 'focusSessions', session.id);
  await setDoc(ref, stripUndefined(session) as FocusSession, { merge: true });
}

export async function getFocusSessionsByDate(uid: string, date: string): Promise<FocusSession[]> {
  const q = query(focusCollection(uid), where('date', '==', date));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as FocusSession);
}

export async function getFocusSessionsInRange(
  uid: string, startDate: string, endDate: string,
): Promise<FocusSession[]> {
  const q = query(
    focusCollection(uid),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as FocusSession);
}

// ===== Diary Entries =====

function diaryCollection(uid: string) {
  return collection(db, 'users', uid, 'diaryEntries');
}

export async function saveDiaryEntry(uid: string, entry: DiaryEntry) {
  const ref = doc(db, 'users', uid, 'diaryEntries', entry.id);
  await setDoc(ref, stripUndefined(entry) as DiaryEntry, { merge: true });
}

export async function deleteDiaryEntry(uid: string, entryId: string) {
  await deleteDoc(doc(db, 'users', uid, 'diaryEntries', entryId));
}

export function subscribeDiaryEntries(
  uid: string,
  callback: (entries: DiaryEntry[]) => void,
  maxEntries = 50,
): Unsubscribe {
  const q = query(
    diaryCollection(uid),
    orderBy('createdAt', 'desc'),
    firestoreLimit(maxEntries),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id }) as DiaryEntry));
  }, (err) => {
    console.error('[Diary] Subscribe error:', err);
    callback([]);
  });
}

export async function getDiaryEntriesByHashtag(
  uid: string, hashtag: string,
): Promise<DiaryEntry[]> {
  const q = query(
    diaryCollection(uid),
    where('hashtags', 'array-contains', hashtag),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id }) as DiaryEntry);
}

// ===== Diary Files (uploaded .md) =====

function diaryFilesCollection(uid: string) {
  return collection(db, 'users', uid, 'diaryFiles');
}

/** Save (or replace) an uploaded .md diary file */
export async function saveDiaryFile(uid: string, file: DiaryFileEntry) {
  const ref = doc(db, 'users', uid, 'diaryFiles', file.id);
  await setDoc(ref, stripUndefined(file) as DiaryFileEntry, { merge: true });
}

/** Delete an uploaded .md diary file */
export async function deleteDiaryFile(uid: string, fileId: string) {
  await deleteDoc(doc(db, 'users', uid, 'diaryFiles', fileId));
}

/** Subscribe to all uploaded .md diary files (sorted by date desc) */
export function subscribeDiaryFiles(
  uid: string,
  callback: (files: DiaryFileEntry[]) => void,
  maxFiles = 200,
): Unsubscribe {
  const q = query(
    diaryFilesCollection(uid),
    orderBy('date', 'desc'),
    firestoreLimit(maxFiles),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id }) as DiaryFileEntry));
  }, (err) => {
    console.error('[DiaryFiles] Subscribe error:', err);
    callback([]);
  });
}
