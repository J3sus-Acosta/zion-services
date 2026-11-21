/**
 * Servicio de almacenamiento local resiliente (IndexedDB / LocalStorage)
 * Permite guardar checklists, fotos y eventos en terreno sin señal.
 */

const DB_NAME = 'ZionFleetOfflineDB';
const DB_VERSION = 1;
const STORE_CHECKLISTS = 'checklists';
const STORE_PHOTOS = 'photos';
const STORE_SYNC_QUEUE = 'syncQueue';

export class OfflineStorageService {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB no soportado'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_CHECKLISTS)) {
          db.createObjectStore(STORE_CHECKLISTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
          db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
          db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  static async guardarChecklist(id: string, payload: any): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction([STORE_CHECKLISTS, STORE_SYNC_QUEUE], 'readwrite');
      tx.objectStore(STORE_CHECKLISTS).put({ id, payload, fecha: new Date().toISOString() });
      tx.objectStore(STORE_SYNC_QUEUE).add({
        tipo: 'CHECKLIST',
        idReferencia: id,
        payload,
        timestamp: Date.now()
      });
    } catch {
      // Fallback a localStorage
      localStorage.setItem(`zion_offline_chk_${id}`, JSON.stringify(payload));
    }
  }

  static async guardarFoto(id: string, tipo: string, dataUrl: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction([STORE_PHOTOS, STORE_SYNC_QUEUE], 'readwrite');
      tx.objectStore(STORE_PHOTOS).put({ id, tipo, dataUrl, fecha: new Date().toISOString() });
      tx.objectStore(STORE_SYNC_QUEUE).add({
        tipo: 'FOTO',
        idReferencia: id,
        tipoFoto: tipo,
        timestamp: Date.now()
      });
    } catch {
      localStorage.setItem(`zion_offline_foto_${id}`, dataUrl.substring(0, 500));
    }
  }

  static async sincronizarPendientes(): Promise<number> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_SYNC_QUEUE, 'readonly');
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      const req = store.getAll();

      return new Promise((resolve) => {
        req.onsuccess = () => {
          const items = req.result || [];
          resolve(items.length);
        };
        req.onerror = () => resolve(0);
      });
    } catch {
      return 0;
    }
  }
}
