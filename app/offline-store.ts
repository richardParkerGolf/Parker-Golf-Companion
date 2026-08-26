export type SyncState = "saved" | "pending" | "synced";

export type LessonRecord = {
  id: string;
  client: string;
  createdAt: string;
  updatedAt: string;
  stage: string;
  theirWords: string;
  curiosity: string;
  purpose: string;
  task: string;
  intention: string;
  feedback: string;
  boundary: string;
  reflection: string;
  discovery: string;
  transfer: string;
  takeaway: string;
  reps: number;
  minutes: number;
  syncState: SyncState;
};

const DB_NAME = "parker-companion";
const STORE = "lessons";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listLessons(): Promise<LessonRecord[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result as LessonRecord[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    request.onerror = () => reject(request.error);
  });
}

export async function saveLesson(lesson: LessonRecord): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(lesson);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/** Optional Google Apps Script bridge: POSTs pending lesson records when online. */
export async function syncLesson(lesson: LessonRecord, endpoint: string): Promise<boolean> {
  if (!endpoint || typeof fetch === "undefined") return false;
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "lesson", lesson }) });
    return response.ok;
  } catch { return false; }
}

export function newLesson(): LessonRecord {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), client: "", createdAt: now, updatedAt: now, stage: "listen", theirWords: "", curiosity: "", purpose: "", task: "", intention: "", feedback: "", boundary: "", reflection: "", discovery: "", transfer: "", takeaway: "", reps: 0, minutes: 0, syncState: "saved" };
}
