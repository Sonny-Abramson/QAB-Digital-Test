// Local-only storage. IndexedDB with an in-memory fallback (flagged to the UI).
// Nothing here touches the network.

const DB_NAME = "qab-local";
const STORE = "sessions";
const META = "meta";

let dbp = null;
let memory = new Map();
let memMeta = new Map();
export let persistent = true;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE, { keyPath: "id" });
        req.result.createObjectStore(META);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) { reject(e); }
  }).catch(() => { persistent = false; return null; });
  return dbp;
}

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const r = fn(t.objectStore(store));
    t.oncomplete = () => resolve(r && "result" in r ? r.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function init() { await open(); return persistent; }

export async function saveSession(s) {
  s.updatedAt = new Date().toISOString();
  const db = await open();
  if (!db) { memory.set(s.id, structuredClone(s)); return; }
  await tx(db, STORE, "readwrite", (st) => st.put(JSON.parse(JSON.stringify(s))));
}

export async function allSessions() {
  const db = await open();
  if (!db) return [...memory.values()].map((x) => structuredClone(x));
  return (await tx(db, STORE, "readonly", (st) => st.getAll())) || [];
}

export async function getSession(id) {
  const db = await open();
  if (!db) return memory.get(id) ? structuredClone(memory.get(id)) : null;
  return (await tx(db, STORE, "readonly", (st) => st.get(id))) || null;
}

export async function deleteSession(id) {
  const db = await open();
  if (!db) { memory.delete(id); return; }
  await tx(db, STORE, "readwrite", (st) => st.delete(id));
}

export async function wipeAll() {
  const db = await open();
  if (!db) { memory.clear(); memMeta.clear(); return; }
  await tx(db, STORE, "readwrite", (st) => st.clear());
  await tx(db, META, "readwrite", (st) => st.clear());
}

export async function getMeta(key) {
  const db = await open();
  if (!db) return memMeta.get(key);
  return await tx(db, META, "readonly", (st) => st.get(key));
}
export async function setMeta(key, value) {
  const db = await open();
  if (!db) { memMeta.set(key, value); return; }
  await tx(db, META, "readwrite", (st) => st.put(value, key));
}

export function newId() {
  return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
}
