const DB_NAME = 'BiliAnalyzerDB';
const DB_VERSION = 1;
const STORE_VIDEOS = 'videos';
const STORE_CACHE = 'cache';

let db = null;

async function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(STORE_VIDEOS)) {
        const videoStore = database.createObjectStore(STORE_VIDEOS, { keyPath: 'id' });
        videoStore.createIndex('keyword', 'keyword', { unique: false });
        videoStore.createIndex('bvid', 'bvid', { unique: false });
        videoStore.createIndex('pubdate', 'pubdate', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORE_CACHE)) {
        const cacheStore = database.createObjectStore(STORE_CACHE, { keyPath: 'keyword' });
        cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

async function saveVideos(videos, keyword) {
  const database = await initDB();
  const tx = database.transaction(STORE_VIDEOS, 'readwrite');
  const store = tx.objectStore(STORE_VIDEOS);

  const promises = videos.map(video => {
    const record = {
      ...video,
      keyword,
      collectedAt: Date.now()
    };
    return new Promise((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });

  await Promise.all(promises);
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getVideosByKeyword(keyword) {
  const database = await initDB();
  const tx = database.transaction(STORE_VIDEOS, 'readonly');
  const store = tx.objectStore(STORE_VIDEOS);
  const index = store.index('keyword');

  return new Promise((resolve, reject) => {
    const request = index.getAll(IDBKeyRange.only(keyword));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function clearVideosByKeyword(keyword) {
  const database = await initDB();
  const tx = database.transaction(STORE_VIDEOS, 'readwrite');
  const store = tx.objectStore(STORE_VIDEOS);
  const index = store.index('keyword');

  return new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only(keyword));
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

async function saveCache(keyword, totalPages, totalVideos) {
  const database = await initDB();
  const tx = database.transaction(STORE_CACHE, 'readwrite');
  const store = tx.objectStore(STORE_CACHE);

  const cacheRecord = {
    keyword,
    totalPages,
    totalVideos,
    timestamp: Date.now()
  };

  return new Promise((resolve, reject) => {
    const request = store.put(cacheRecord);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getCache(keyword) {
  const database = await initDB();
  const tx = database.transaction(STORE_CACHE, 'readonly');
  const store = tx.objectStore(STORE_CACHE);

  return new Promise((resolve, reject) => {
    const request = store.get(keyword);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function isCacheValid(keyword, maxAgeMs = 10 * 60 * 1000) {
  const cache = await getCache(keyword);
  if (!cache) return false;
  return Date.now() - cache.timestamp < maxAgeMs;
}

async function clearAllData() {
  const database = await initDB();
  
  const tx = database.transaction([STORE_VIDEOS, STORE_CACHE], 'readwrite');
  
  await Promise.all([
    new Promise((resolve, reject) => {
      const request = tx.objectStore(STORE_VIDEOS).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }),
    new Promise((resolve, reject) => {
      const request = tx.objectStore(STORE_CACHE).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    })
  ]);
}

export {
  initDB,
  saveVideos,
  getVideosByKeyword,
  clearVideosByKeyword,
  saveCache,
  getCache,
  isCacheValid,
  clearAllData
};
