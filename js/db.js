/* ==========================================================================
   FITE — db.js
   Minimal promise-based IndexedDB wrapper. No external dependencies so the
   app has zero network requirement for its data layer.
   ========================================================================== */

const FiteDB = (() => {
  const DB_NAME = 'fiteDB';
  const DB_VERSION = 1;
  const STORES = [
    'settings',       // key: string -> any value
    'workoutLogs',    // key: iso date+ts -> {date, day, exercises, notes}
    'checklistDays',  // key: yyyy-mm-dd -> {date, items:[{id,label,time,done}]}
    'notes',          // key: yyyy-mm-dd -> {date, text}
    'gallery',        // key: id -> {id,type,blob,name,note,date,folderDate}
    'galleryTrash',   // key: id -> same shape + deletedAt
    'moneyEntries',   // key: id -> {id,date,type,amount,category,note}
    'foods',          // key: id -> {id,day,meal,name,cal,protein,carbs,fat,checked}
    'icons',          // key: appId -> base64 image
    'meta'            // key: string -> any (misc, e.g. wallpapers)
  ];

  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        STORES.forEach(name => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' === storeKeyPath(name) ? undefined : undefined });
          }
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  // We use out-of-line keys everywhere (simpler generic API): put(store, key, value)
  function storeKeyPath(){ return null; }

  async function put(store, key, value) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function get(store, key) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function del(store, key) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getAll(store) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const os = tx.objectStore(store);
      const keysReq = os.getAllKeys();
      const valsReq = os.getAll();
      let keys, vals;
      keysReq.onsuccess = () => { keys = keysReq.result; done(); };
      valsReq.onsuccess = () => { vals = valsReq.result; done(); };
      tx.onerror = () => reject(tx.error);
      function done(){
        if (keys && vals) {
          resolve(keys.map((k,i) => ({ key:k, value:vals[i] })));
        }
      }
    });
  }

  async function clearStore(store) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function clearAll() {
    for (const s of STORES) await clearStore(s);
  }

  async function exportAll() {
    const out = {};
    for (const s of STORES) {
      out[s] = await getAll(s);
    }
    out.__meta = { exportedAt: new Date().toISOString(), version: DB_VERSION };
    return out;
  }

  async function importAll(data) {
    for (const s of STORES) {
      if (Array.isArray(data[s])) {
        await clearStore(s);
        for (const row of data[s]) {
          await put(s, row.key, row.value);
        }
      }
    }
    return true;
  }

  return { put, get, del, getAll, clearStore, clearAll, exportAll, importAll, STORES };
})();
