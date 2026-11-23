/**
 * Servicio de almacenamiento local resiliente (IndexedDB / LocalStorage)
 * y motor de sincronización offline automática (syncWorker) para faenas sin cobertura.
 */

import { apiUrl } from '../config/api';

const DB_NAME = 'ZionFleetOfflineDB';
const DB_VERSION = 2;
const STORE_CHECKLISTS = 'checklists';
const STORE_PHOTOS = 'photos';
const STORE_SYNC_QUEUE = 'syncQueue';

export interface QueueItem {
  id?: number;
  tipo: 'CHECKLIST_SALIDA' | 'CHECKLIST_RETORNO' | 'FOTO_360' | 'AUTORIZAR_FAENA' | 'FOTO_FAENA' | 'RECEPCION_CONFORME' | 'BITACORA_INCIDENCIA';
  endpoint: string;
  payload: any;
  timestamp: number;
  reintentos?: number;
}

export interface EstadoJornadaActiva {
  ordenServicioId: string;
  pasoTablet: number;
  checklistSalidaListo: boolean;
  fotosSalida: string[];
  llegadaMarcada: boolean;
  otFirmada: boolean;
  datosFirmaOT: any | null;
  fotosFaena: string[];
  recepcionFirmada: boolean;
  sidrepSellado: boolean;
  checklistRetornoListo: boolean;
  fotosRetorno: string[];
  updatedAt?: number;
}

export class OfflineStorageService {
  private static dbPromise: Promise<IDBDatabase> | null = null;
  private static syncInProgress = false;

  private static getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB no soportado en este entorno'));
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

  /**
   * Guarda un elemento en la cola de sincronización diferida
   */
  static async encolarPeticion(
    tipo: QueueItem['tipo'],
    endpoint: string,
    payload: any
  ): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
      const item: QueueItem = {
        tipo,
        endpoint,
        payload,
        timestamp: Date.now(),
        reintentos: 0
      };
      tx.objectStore(STORE_SYNC_QUEUE).add(item);
    } catch {
      // Fallback a localStorage si IndexedDB no está disponible
      const colaStr = localStorage.getItem('zion_offline_sync_queue') || '[]';
      try {
        const cola = JSON.parse(colaStr);
        cola.push({ tipo, endpoint, payload, timestamp: Date.now() });
        localStorage.setItem('zion_offline_sync_queue', JSON.stringify(cola));
      } catch { }
    }
  }

  /**
   * Guarda checklist preoperacional o de retorno
   */
  static async guardarChecklist(id: string, payload: any, esRetorno = false): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction([STORE_CHECKLISTS, STORE_SYNC_QUEUE], 'readwrite');
      tx.objectStore(STORE_CHECKLISTS).put({ id, payload, fecha: new Date().toISOString() });

      const tipo = esRetorno ? 'CHECKLIST_RETORNO' : 'CHECKLIST_SALIDA';
      const endpoint = esRetorno ? '/api/inspecciones/retorno' : '/api/inspecciones/salida';

      tx.objectStore(STORE_SYNC_QUEUE).add({
        tipo,
        endpoint,
        payload,
        timestamp: Date.now(),
        reintentos: 0
      });
    } catch {
      localStorage.setItem(`zion_offline_chk_${id}`, JSON.stringify(payload));
    }
  }

  /**
   * Guarda fotografía perimetral o de faena
   */
  static async guardarFoto(id: string, tipo: string, dataUrl: string, payloadExtra: any = {}): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction([STORE_PHOTOS, STORE_SYNC_QUEUE], 'readwrite');
      tx.objectStore(STORE_PHOTOS).put({ id, tipo, dataUrl, fecha: new Date().toISOString() });

      const esFaena = tipo.startsWith('FAENA') || tipo.startsWith('EPP');
      const endpoint = esFaena ? '/api/ciclo-transporte/evidencias' : '/api/inspecciones/fotos-360';
      const queueTipo = esFaena ? 'FOTO_FAENA' : 'FOTO_360';

      tx.objectStore(STORE_SYNC_QUEUE).add({
        tipo: queueTipo,
        endpoint,
        payload: {
          idReferencia: id,
          tipoFoto: tipo,
          archivoUrl: dataUrl,
          ...payloadExtra
        },
        timestamp: Date.now(),
        reintentos: 0
      });
    } catch {
      localStorage.setItem(`zion_offline_foto_${id}`, dataUrl.substring(0, 500));
    }
  }

  /**
   * Obtiene la cantidad de ítems pendientes por sincronizar
   */
  static async getItemsPendientesCount(): Promise<number> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_SYNC_QUEUE, 'readonly');
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      const req = store.count();

      return new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result || 0);
        req.onerror = () => resolve(0);
      });
    } catch {
      return 0;
    }
  }

  /**
   * Procesa y vacía la cola de sincronización enviando cada petición al backend
   */
  static async procesarColaSync(): Promise<{ procesados: number; fallidos: number }> {
    if (this.syncInProgress) {
      return { procesados: 0, fallidos: 0 };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { procesados: 0, fallidos: 0 };
    }

    this.syncInProgress = true;
    let procesados = 0;
    let fallidos = 0;

    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_SYNC_QUEUE, 'readonly');
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      const req = store.getAll();

      const items: QueueItem[] = await new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });

      for (const item of items) {
        try {
          const url = item.endpoint.startsWith('http')
            ? item.endpoint
            : apiUrl(item.endpoint);

          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(item.payload)
          });

          if (res.ok) {
            // Eliminar elemento sincronizado con éxito
            if (item.id !== undefined) {
              const deleteTx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
              deleteTx.objectStore(STORE_SYNC_QUEUE).delete(item.id);
            }
            procesados++;
          } else {
            fallidos++;
          }
        } catch {
          fallidos++;
        }
      }
    } catch {
      // Ignorar fallos de acceso a la BD
    } finally {
      this.syncInProgress = false;
    }

    return { procesados, fallidos };
  }

  /**
   * Inicializa el despachador de eventos online para sincronización reactiva
   */
  static iniciarSyncWorker(onSyncComplete?: (resultado: { procesados: number; fallidos: number }) => void): () => void {
    if (typeof window === 'undefined') return () => { };

    const handleOnline = async () => {
      console.log('[Zion OfflineWorker] Conexión a internet restablecida. Iniciando sincronización...');
      const resultado = await OfflineStorageService.procesarColaSync();
      if (onSyncComplete) onSyncComplete(resultado);
    };

    window.addEventListener('online', handleOnline);

    // Intento inicial en caso de arrancar con conexión activa y cola previa
    if (navigator.onLine) {
      OfflineStorageService.procesarColaSync().then((res) => {
        if (res.procesados > 0 && onSyncComplete) onSyncComplete(res);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }

  /**
   * Persiste el estado de la jornada activa del conductor en IndexedDB y fallback a localStorage
   */
  static async guardarEstadoJornadaActiva(
    ordenServicioId: string,
    estado: Partial<EstadoJornadaActiva>
  ): Promise<void> {
    const key = `jornada_${ordenServicioId}`;
    const payload = {
      id: key,
      ordenServicioId,
      ...estado,
      updatedAt: Date.now()
    };

    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_CHECKLISTS, 'readwrite');
      tx.objectStore(STORE_CHECKLISTS).put(payload);
    } catch {
      // Fallback a localStorage si IndexedDB no responde
    }

    try {
      localStorage.setItem(`zion_jornada_${ordenServicioId}`, JSON.stringify(payload));
    } catch {
      // Ignorar si cuota de localStorage está copada
    }
  }

  /**
   * Recupera el estado de la jornada activa de la tablet desde IndexedDB o localStorage
   */
  static async recuperarEstadoJornadaActiva(
    ordenServicioId: string
  ): Promise<EstadoJornadaActiva | null> {
    const key = `jornada_${ordenServicioId}`;

    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_CHECKLISTS, 'readonly');
      const store = tx.objectStore(STORE_CHECKLISTS);
      const req = store.get(key);

      const record: any = await new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });

      if (record) {
        return record as EstadoJornadaActiva;
      }
    } catch {
      // Continuar con fallback
    }

    // Fallback a localStorage
    try {
      const saved = localStorage.getItem(`zion_jornada_${ordenServicioId}`);
      if (saved) {
        return JSON.parse(saved) as EstadoJornadaActiva;
      }
    } catch {
      return null;
    }

    return null;
  }

  /**
   * Encola un evento o incidencia de bitácora para sincronización resiliente offline.
   */
  static async encolarIncidenciaBitacora(incidencia: {
    ordenServicioId: string;
    tipoEvento: string;
    descripcion: string;
    latitud?: number | null;
    longitud?: number | null;
  }): Promise<void> {
    await this.encolarPeticion(
      'BITACORA_INCIDENCIA',
      '/api/bitacora',
      incidencia
    );
  }
}
