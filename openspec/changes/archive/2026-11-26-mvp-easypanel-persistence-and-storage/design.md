# Design: mvp-easypanel-persistence-and-storage

## 1. Context & Goals / Non-Goals

### Context
Zion Services opera bajo una arquitectura contenerizada en Docker desplegada en servidores VPS administrados por EasyPanel. Actualmente el frontend (portal web operacional/cliente y aplicación de tablets para conductores de camión) transmite información operativa crítica: checklists preoperacionales de 80 ítems (F-GMT-MAN-004), fotografías perimetrales 360°, firmas táctiles manuscritas de autorización de faena, coordenadas de telemetría GPS y actas de recepción conforme.

Sin embargo, existía un desfase ("gap") crítico entre los endpoints REST del backend y la persistencia relacional en MySQL 8 gestionada por Prisma:
1. **Colecciones volátiles en memoria**: Módulos esenciales de seguimiento y telemetría (`tracking.routes.ts`) dependían de variables en memoria (`TELEMETRIA_STORE`, `EVIDENCIAS_STORE`). Cada reinicio del proceso Node.js o redespliegue del contenedor en EasyPanel borraba de inmediato el posicionamiento en vivo y el registro de evidencias.
2. **Stubs sin inserción en base de datos**: En el ciclo de terreno (`TransportCycleService` / `ciclo-transporte.routes.ts`) y en las inspecciones de flota (`InspectionService` / `inspeccion.routes.ts`), las operaciones devolvían respuestas simuladas con éxito artificial, omitiendo la inserción transaccional en `CicloTransporte`, `AutorizacionFaena`, `FotoFaenaEPP`, `ActaRecepcion`, `InspeccionSalida_F_GMT`, `FotoInspeccion` e `InspeccionRetornoPlanta`.
3. **Riesgo crítico de desbordamiento de tipo en MySQL (`ER_DATA_TOO_LONG`)**: Las tablets de terreno capturan fotografías de alta resolución y firmas táctiles en formato Data URL / Base64 (`data:image/jpeg;base64,...` o `data:image/png;base64,...`). En MySQL con Prisma, las columnas tipo `String` sin anotación explícita (como `archivoUrl`, `rutaAlmacenamiento` y `fotoRespaldoUrl`) se compilan por defecto a `VARCHAR(191)`. Intentar persistir cadenas Base64 (que superan fácilmente los cientos de kilobytes o megabytes) causa de forma instantánea el fallo fatal `ER_DATA_TOO_LONG`, abortando la operación.
4. **Ausencia de pipeline de archivos físicos y servicio estático**: No se encontraba configurada la decodificación atómica de Base64 hacia el volumen persistente montado en disco local (`/app/uploads`), ni el guardado exclusivo de URIs relativas cortas (< 100 caracteres) en MySQL, ni el middleware `express.static` en `app.ts` para servir `/uploads`.
5. **Robustez en el expediente documental y descargas ZIP**: La descarga consolidada en ZIP y la descarga individual requerían verificar la existencia física de los archivos en disco (`fs.existsSync`) para prevenir excepciones no controladas durante el streaming, prohibiendo terminantemente archivos ficticios `.txt`.

### Goals
- **Persistencia Transaccional Completa**: Conectar todos los endpoints de inspección preoperacional/retorno, ciclo de transporte y tracking a Prisma ORM y la base de datos MySQL 8.
- **Eliminación Total de Stores en Memoria**: Erradicar `TELEMETRIA_STORE` y `EVIDENCIAS_STORE`, consultando e insertando directamente en `RegistroTelemetriaGPS`, `DocumentoExpediente`, `FotoInspeccion` y `FotoFaenaEPP`.
- **Almacenamiento Local en Volumen Docker EasyPanel (Zero AWS / Zero S3)**: Utilizar exclusivamente el disco local montado en el contenedor (`/app/uploads` configurable mediante `STORAGE_PATH`), descartando cualquier servicio de AWS o nube pública externa para simplificar la infraestructura y anular costos variables y latencia.
- **Pipeline de Decodificación Base64 a Disco**: Decodificar atómicamente los Data URLs y firmas canvas del frontend en el backend a archivos binarios (.png, .jpg) almacenados en subcarpetas estructuradas, registrando en MySQL únicamente rutas relativas URIs cortas (< 100 caracteres, ej: `/uploads/ciclo-transporte/firmas/...`), inmunes a desbordamientos `VARCHAR(191)`.
- **Servicio Estático Seguro en Express**: Montar `express.static` para `/uploads` en `app.ts` con opciones de seguridad (`dotfiles: 'ignore'`, `index: false`, cabeceras de caché) y sanitización estricta de rutas contra ataques de *Directory / Path Traversal*.
- **Agregación Dinámica de Evidencias con Tenant Isolation**: Construir la galería de evidencias y tracking mediante consultas indexadas con filtro obligatorio por `empresaClienteId` para usuarios con rol `CLIENTE`.
- **Descargas Robustas sin Mocks**: Asegurar streaming de paquetes ZIP y descargas individuales verificando la existencia real del archivo físico en disco mediante `fs.existsSync`, sin archivos ficticios `.txt`.

### Non-Goals
- Migración a AWS S3, Google Cloud Storage o Azure Blob Storage (prohibido terminantemente en la arquitectura de Zion Services).
- OCR o procesamiento de imágenes con modelos pesados de Inteligencia Artificial (la validación se limita a formato MIME, extensión y tamaño de buffer).
- Modificación estructural del esquema de base de datos (`schema.prisma` ya cuenta con los modelos necesarios: `CicloTransporte`, `AutorizacionFaena`, `FotoFaenaEPP`, `ActaRecepcion`, `InspeccionSalida_F_GMT`, `FotoInspeccion`, `InspeccionRetornoPlanta`, `RegistroTelemetriaGPS`, `ExpedienteDocumental`, `DocumentoExpediente`).
- Firma Electrónica Avanzada bajo estándar PKI / eIDAS (la firma táctil en pantalla con Nombre, Apellido y RUT cumple con los requerimientos operacionales y normativos de terreno vigentes).

---

## 2. Architecture & Data Flow

### 2.1 Diagrama de Arquitectura y Flujo de Datos

```mermaid
flowchart TD
    subgraph Frontend["Frontend (Tablet Conductor / Portal Cliente)"]
        UI_Tablet["Tablet Conductor<br/>(Checklist 360°, TouchCanvas, Fotos Faena)"]
        UI_Cliente["Portal Cliente / Jefe Op<br/>(Tracking en Vivo, Expediente Digital)"]
    end

    subgraph ExpressAPI["Backend Node.js / Express API"]
        App["app.ts<br/>(Middlewares, express.static('/uploads'))"]
        AuthMid["auth.middleware.ts<br/>(authenticate, enforceTenantIsolation)"]
        
        subgraph ControllersRoutes["Capa de Rutas & Controladores"]
            R_Tracking["tracking.routes.ts<br/>(GET tracking, POST geolocalizacion)"]
            R_Ciclo["ciclo-transporte.routes.ts<br/>(Llegada, Autorización, Fotos, Acta)"]
            R_Insp["inspeccion.routes.ts<br/>(Salida 360°, Retorno Planta)"]
            R_Exp["expediente.routes.ts<br/>(Descarga ZIP, Descarga individual)"]
        end
        
        subgraph DomainServices["Capa de Servicios de Dominio"]
            S_Insp["InspectionService<br/>(Validación 80 ítems, Bloqueo de Vehículo)"]
            S_Ciclo["TransportCycleService<br/>(Gestión de Estados, Acta Recepción)"]
            S_Track["TrackingService<br/>(Última posición GPS, Agregación evidencias)"]
            S_Dossier["DossierIndexService<br/>(Indexación en ExpedienteDocumental)"]
        end

        subgraph StorageCore["Capa de Almacenamiento Local (LocalDiskStorageAdapter)"]
            FilePort["FileStoragePort / LocalDiskStorageAdapter"]
            B64Helper["saveBase64Image(dataUrl, subDir, prefix)<br/>1. Regex MIME & Base64<br/>2. Buffer.from(data, 'base64')<br/>3. fs.promises.writeFile()<br/>4. Retorna URI relativa (/uploads/...)"]
        end
    end

    subgraph PersistenceLayer["Persistencia"]
        subgraph LocalDisk["Disco Local / EasyPanel Volume (/app/uploads)"]
            Vol_Insp["/app/uploads/inspecciones/"]
            Vol_Ciclo["/app/uploads/ciclo-transporte/firmas/<br/>/app/uploads/ciclo-transporte/fotos/"]
            Vol_Docs["/app/uploads/documentos/"]
            Vol_Actas["/app/uploads/ciclo-transporte/actas/"]
        end

        subgraph MySQLDB["Base de Datos MySQL 8 (Prisma ORM)"]
            T_GPS["registros_telemetria_gps"]
            T_Insp["inspecciones_salida_fgmt<br/>fotos_inspeccion"]
            T_Ciclo["ciclos_transporte<br/>autorizaciones_faena<br/>fotos_faena_epp<br/>actas_recepcion"]
            T_Exp["expedientes_documentales<br/>documentos_expediente"]
            T_Veh["vehiculos (bloqueo DESHABILITADO)"]
            T_Ord["ordenes_servicio (estado RETIRO_COMPLETADO)"]
        end
    end

    %% Interacciones
    UI_Tablet -->|Payload JSON con Base64 / DataURL| App
    UI_Cliente -->|Peticiones GET tracking / expediente / ZIP| App
    App --> AuthMid
    AuthMid --> ControllersRoutes

    R_Insp --> S_Insp
    R_Ciclo --> S_Ciclo
    R_Tracking --> S_Track
    R_Exp --> S_Dossier

    S_Insp --> B64Helper
    S_Ciclo --> B64Helper
    B64Helper --> LocalDisk
    B64Helper -->|URI relativa < 100 chars| DomainServices

    S_Insp -->|Prisma $transaction| MySQLDB
    S_Ciclo -->|Prisma $transaction| MySQLDB
    S_Track -->|Prisma findFirst / findMany| MySQLDB
    R_Exp -->|archiver stream leyendo de| LocalDisk
    App -.->|express.static('/uploads') sirve| LocalDisk
```

### 2.2 Componentes Involucrados y Responsabilidades Técnicas

#### 1. `FileStoragePort` & `LocalDiskStorageAdapter` (`file-storage.service.ts`)
- **Responsabilidad**: Centralizar y aislar las operaciones de sistema de archivos.
- **Configuración de Ruta**: Lee `process.env.STORAGE_PATH || path.resolve(process.cwd(), 'uploads')`.
- **Estructura de Directorios Automática**: Al iniciar y antes de escribir cualquier archivo, crea de forma recursiva (`fs.mkdirSync(dir, { recursive: true })`) las carpetas:
  - `/app/uploads/inspecciones/`
  - `/app/uploads/ciclo-transporte/firmas/`
  - `/app/uploads/ciclo-transporte/fotos/`
  - `/app/uploads/ciclo-transporte/actas/`
  - `/app/uploads/bitacora/`
  - `/app/uploads/documentos/`
- **Helper `guardarBase64` / `saveBase64Image`**:
  - Extrae el tipo MIME y el payload binario mediante expresión regular: `/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/`.
  - Soporta imágenes (`image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`) y documentos (`application/pdf`).
  - Decodifica la cadena a `Buffer` binario (`Buffer.from(rawBase64, 'base64')`).
  - Genera un nombre de archivo único inmune a colisiones: `${prefijo}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${extension}`.
  - Escribe el buffer de forma asíncrona mediante `fs.promises.writeFile`.
  - Retorna un objeto estructurado:
    ```typescript
    {
      rutaRelativa: string; // Ej: '/uploads/ciclo-transporte/firmas/firma_1710000000_abcd1234.png' (64 chars)
      rutaAbsoluta: string; // Ej: '/app/uploads/ciclo-transporte/firmas/firma_1710000000_abcd1234.png'
      pesoBytes: number;
      mimeType: string;
    }
    ```

#### 2. Express `app.ts`: Servicio Estático Seguro
- Montaje del middleware de servicio estático en la raíz `/uploads`:
  ```typescript
  const storagePath = process.env.STORAGE_PATH || path.resolve(process.cwd(), 'uploads');
  app.use('/uploads', express.static(storagePath, {
    dotfiles: 'ignore',
    index: false,
    maxAge: '1d',
    immutable: true,
    fallthrough: false
  }));
  ```
- **Protección**: `dotfiles: 'ignore'` y `index: false` previenen la inspección de carpetas del servidor y ocultan archivos de configuración ocultos. `fallthrough: false` asegura que solicitudes a recursos inexistentes bajo `/uploads` devuelvan inmediatamente un HTTP 404 estandarizado.

#### 3. Ciclo de Transporte (`TransportCycleService` & `ciclo-transporte.routes.ts`)
Conexión de los 4 hitos operacionales a Prisma con transacciones atómicas:
- **`registrarLlegada`**:
  - Actualiza el registro `CicloTransporte` con `horaLlegadaFaena = new Date()` y `estado = EstadoCicloTransporte.EN_FAENA`.
  - Si se envían coordenadas GPS, inserta un registro en `RegistroTelemetriaGPS` vinculado a la orden.
- **`autorizarInicioFaena`**:
  - Recibe el trazo manuscrito (`firmaDataUrl` o `firmaSvg`), Nombre, Apellido y RUT.
  - Guarda la firma como imagen binaria `.png` en disco y obtiene su URI relativa corta.
  - En una transacción Prisma:
    1. Actualiza o crea `AutorizacionFaena` vinculada al `cicloTransporteId`, almacenando la ruta relativa en `firmaClienteSvg`, el nombre completo y el RUT.
    2. Actualiza `CicloTransporte.estado` a `FAENA_AUTORIZADA`.
- **`registrarFotoFaena`**:
  - Valida que el ciclo se encuentre en `FAENA_AUTORIZADA` o `EN_FAENA`.
  - Decodifica la fotografía a disco en `/app/uploads/ciclo-transporte/fotos/`.
  - En una transacción Prisma:
    1. Inserta en `FotoFaenaEPP` con la URI relativa corta en `archivoUrl`.
    2. Indexa el documento en `DocumentoExpediente` bajo la categoría `FOTO_FAENA_PROCESO` o `FOTO_EPP_SEGURIDAD` para su disponibilidad inmediata en el portal cliente.
- **`finalizarRecepcion`**:
  - Valida la regla de negocio: si es `CONFORME`, la firma táctil es obligatoria; si es `CON_OBSERVACIONES` o `SIN_FIRMA_RECHAZO`, exige observaciones y opcionalmente `fotoRespaldoUrl`.
  - Guarda la firma y/o foto de respaldo en disco a través del adapter.
  - En una transacción Prisma (`prisma.$transaction`):
    1. Crea `ActaRecepcion` con `tipo`, `nombreFirmante`, `rutFirmante`, `firmaSvg` (ruta corta), `observaciones` y `fotoRespaldoUrl`.
    2. Actualiza `CicloTransporte` con `horaSalidaFaena = new Date()` y estado `FINALIZADO` (o `RETIRO_COMPLETADO`).
    3. Sincroniza `OrdenServicio.estado` a `RETIRO_COMPLETADO` o `RECEPCION_OBSERVADA`.
    4. Indexa el acta en `DocumentoExpediente` con categoría `ACTA_RECEPCION_FIRMADA`.

#### 4. Inspecciones de Flota (`InspectionService` & `inspeccion.routes.ts`)
- **Checklist F-GMT-MAN-004 de Salida (`POST /api/inspecciones/salida`)**:
  - Exige y valida la presencia obligatoria de las 4 fotos perimetrales (`FRONTAL`, `LATERAL_IZQUIERDA`, `TRASERA`, `LATERAL_DERECHA`).
  - Decodifica y persiste físicamente las 4 imágenes en `/app/uploads/inspecciones/`.
  - Evalúa los 80 ítems del checklist preoperacional: si existe alguna falla crítica (`esCritico && estado === 'MALO'`), califica como `NO_CONFORME` y activa el bloqueo.
  - En `prisma.$transaction`:
    1. Inserta `InspeccionSalida_F_GMT` con `itemsChecklist` (JSON estructurado), kilometraje, horómetro y estado de inspección.
    2. Inserta las 4 filas en `FotoInspeccion` asociadas a la inspección con sus URLs relativas cortas.
    3. Si la inspección es no conforme, actualiza el camión en `Vehiculo` a `estado = DESHABILITADO`, `origenBloqueo = CHECKLIST_SEGURIDAD` y registra el motivo detallado.
- **Inspección de Retorno a Planta (`POST /api/inspecciones/retorno`)**:
  - Persiste fotos de cierre en disco.
  - Inserta en `InspeccionRetornoPlanta` (kilometraje final, horómetro final, daños, herramientas) y asocia las imágenes en `FotoInspeccion`.

#### 5. Telemetría y Tracking en Vivo (`tracking.routes.ts`)
- **Ingesta de Posición (`POST /api/jornadas/:id/geolocalizacion` o `/api/tracking/posicion`)**:
  - Inserta directamente en la tabla relacional `registros_telemetria_gps` (`RegistroTelemetriaGPS`) con coordenadas, precisión, velocidad, rumbo y timestamp.
- **Consulta de Tracking (`GET /api/clientes/ordenes/:id/tracking`)**:
  - Resuelve la orden en MySQL aplicando validación de Tenant Isolation (`orden.solicitudServicio.empresaClienteId === req.user.empresaClienteId`).
  - Consulta la última posición registrada en base de datos mediante:
    ```typescript
    const ultimaPosicion = await prisma.registroTelemetriaGPS.findFirst({
      where: { ordenServicioId: orden.id },
      orderBy: { timestamp: 'desc' }
    });
    ```
  - Evalúa la ventana activa de servicio y responde con coordenadas reales sin consultar mapas en memoria.
- **Agregación de Evidencias en Vivo (`GET /api/clientes/ordenes/:id/expediente-en-vivo`)**:
  - Consulta `DocumentoExpediente` vinculado a la orden (`visibleParaCliente: true`), ordenado por `fechaCarga DESC`.
  - Mapea las evidencias reales con sus URLs relativas accesibles vía Express.

#### 6. Robustecimiento del Expediente Documental (`expediente.routes.ts`)
- **Descarga ZIP (`GET /api/expedientes/:ordenId/descargar-zip`)**:
  - Resuelve las rutas físicas en disco mediante `STORAGE_PATH` y `doc.rutaAlmacenamiento`.
  - Verifica la existencia previa de cada archivo binario con `fs.existsSync(filePath)`.
  - Añade únicamente archivos reales al stream de `archiver` (`archive.file(filePath, ...)`).
  - Incluye el manifiesto `MANIFIESTO_<FOLIO>.json`.
  - Prohíbe de manera absoluta archivos simulados o extensiones ficticias `.txt`.
- **Descarga Individual (`GET /api/expedientes/:ordenId/documentos/:documentoId/descargar`)**:
  - Valida Tenant Isolation y existencia física con `fs.existsSync`.
  - Transmite el archivo mediante `res.download(filePath, doc.nombreArchivo)`.

---

## 3. Decisions & Trade-offs

### Decisión 1: Almacenamiento Local en Volumen Docker de EasyPanel vs. Cloud Object Storage (AWS S3)
- **Elección**: Almacenamiento local persistente en disco en `/app/uploads`, mapeado a un volumen Docker (`uploads_data:/app/uploads`), orquestado por EasyPanel en el VPS de producción.
- **Razón y Justificación**:
  1. *Cero Dependencia de Terceros y Costo Fijo*: Elimina la necesidad de cuentas AWS, credenciales IAM y costos variables por peticiones GET/PUT o transferencia saliente de datos (egress).
  2. *Latencia Ultrabaja*: Las operaciones de I/O se ejecutan a velocidad de bus NVMe/SSD local (< 2ms frente a 150-300ms de latencia de red a S3).
  3. *Copias de Seguridad Consistentes*: Los backups del VPS y snapshots de EasyPanel respaldan en un único punto temporal tanto la base de datos MySQL como el volumen de archivos `/app/uploads`.
  4. *Simplicidad de Despliegue*: No requiere configurar SDKs pesados (`@aws-sdk/client-s3`) ni gestionar configuraciones complejas de CORS en buckets remotos.
- **Trade-off y Mitigación**: El almacenamiento queda acotado a la capacidad del disco del VPS. Esto se mitiga estableciendo cuotas de subida (`10mb` por petición), compresión de fotos en tablets antes del envío y políticas de monitoreo de disco en EasyPanel.

### Decisión 2: Pipeline de Decodificación Server-Side de Data URLs vs. Multipart/form-data
- **Elección**: Aceptar Data URLs / Base64 en el cuerpo JSON de los endpoints existentes y decodificarlos en el backend antes de escribir en disco y base de datos.
- **Razón y Justificación**:
  1. *Compatibilidad Inmediata con Frontend*: Los componentes React ya capturan firmas táctiles en canvas (`canvas.toDataURL('image/png')`) y fotos de cámara como Data URLs. Mantener el contrato JSON evita una reescritura invasiva del frontend hacia `FormData` y `multer`.
  2. *Transacciones Atómicas*: En un solo payload JSON se transmiten los metadatos (checklist de 80 ítems, datos del encargado, observaciones) junto con las firmas e imágenes.
  3. *Eliminación Garantizada de `ER_DATA_TOO_LONG`*: El backend decodifica la cadena Base64 a binario en disco y guarda en MySQL únicamente la URI corta (`/uploads/...`), garantizando que las columnas `VARCHAR(191)` contengan menos de 85 caracteres.
- **Trade-off y Mitigación**: Base64 introduce una sobrecarga de tamaño de ~33%. Dado que las imágenes capturadas en tablet se comprimen a ~300-800 KB, el payload total rara vez excede 4-5 MB, manteniéndose cómodamente dentro del límite de `10mb` de `express.json`.

### Decisión 3: Consistencia Transaccional mediante `prisma.$transaction`
- **Elección**: Encapsular todas las escrituras compuestas (inspección + fotos + bloqueo de camión, o firma + fotos de faena + acta + cambio de estado en orden de servicio) dentro de llamadas a `prisma.$transaction`.
- **Razón**: Si falla la inserción de una fila dependiente o la sincronización del estado de la orden, la transacción ejecuta un rollback automático en MySQL. Los archivos escritos en disco que pudiesen quedar huérfanos ante un fallo de base de datos no comprometen la integridad relacional y pueden purgarse mediante tareas de mantenimiento.

### Decisión 4: Streaming Directo de Archiver a HTTP Response vs. Creación de Archivos Temporales en Disco
- **Elección**: Canalizar directamente la salida de compresión de `archiver` hacia la respuesta HTTP (`archive.pipe(res)`) sin generar un archivo `.zip` intermedio en el disco del servidor.
- **Razón**: Elimina la doble operación de I/O en disco (escribir el archivo zip y luego leerlo para transferirlo) y ahorra espacio de almacenamiento en el VPS. El consumo de memoria es constante y despreciable (< 20 MB) al procesar archivos en chunks mediante streams.

---

## 4. Risks & Mitigations

| Riesgo Técnico | Impacto | Estrategia de Mitigación |
| :--- | :--- | :--- |
| **Desbordamiento de almacenamiento en VPS por acumulación de fotos** | Alto (El disco del VPS podría saturarse, deteniendo MySQL) | 1. Límite de carga en Express configurado a `10mb` (`express.json({ limit: '10mb' })`).<br/>2. Validación estricta de extensiones y rechazo de tipos no permitidos.<br/>3. Alerta temprana de espacio en disco en EasyPanel.<br/>4. Estructura de carpetas normalizada por categoría para facilitar purgas o archivado futuro. |
| **Inyección de rutas (Path / Directory Traversal)** | Crítico (Lectura o sobreescritura maliciosa de archivos fuera de `STORAGE_PATH`) | 1. Sanitización exhaustiva en `LocalDiskStorageAdapter` mediante `path.resolve` y verificación de que `path.relative(STORAGE_PATH, rutaAbsoluta)` no inicie con `..` ni sea absoluta.<br/>2. Nombres de archivo generados exclusivamente por el servidor usando marcas de tiempo y UUIDs, descartando nombres provistos por clientes.<br/>3. `express.static` con `dotfiles: 'ignore'` y `index: false`. |
| **Directorios inexistentes al primer arranque del contenedor** | Medio (Errores `ENOENT` al guardar la primera fotografía o firma) | Creación automática y recursiva de la jerarquía de carpetas (`fs.mkdirSync(dir, { recursive: true })`) tanto en la inicialización del adapter como antes de escribir cualquier archivo físico. |
| **Desbordamiento de columnas MySQL (`VARCHAR(191)`)** | Crítico (Fallo de inserción `ER_DATA_TOO_LONG` y pérdida de registros) | `LocalDiskStorageAdapter.guardarBase64` guarda el contenido binario en disco y retorna únicamente la ruta relativa `/uploads/<subdir>/<archivo>`, cuya longitud máxima oscila entre 50 y 75 caracteres, cumpliendo holgadamente el límite de 191 caracteres de MySQL. Queda estrictamente prohibido pasar strings Base64 a Prisma. |
| **Archivos faltantes al compilar el ZIP del expediente** | Medio (Interrupción del streaming HTTP o error fatal no controlado) | Verificación previa con `fs.existsSync(filePath)` para cada registro de `DocumentoExpediente`. Si el archivo físico no existe en disco, se registra un `logger.warn` y se omite del archivo comprimido sin abortar la descarga ni insertar archivos `.txt` ficticios. |
| **Violación de Aislamiento de Clientes (Tenant Isolation)** | Crítico (Un cliente podría consultar coordenadas o descargar documentos de otra empresa) | Aplicación obligatoria del middleware `enforceTenantIsolation` o verificación explícita del `empresaClienteId` del token JWT contra la orden en todas las rutas de tracking, visualización de expedientes y descargas. |

---

## 5. Implementation & Code Details

### 5.1 Adaptador de Almacenamiento Local (`LocalDiskStorageAdapter`)

```typescript
// backend/src/services/file-storage.service.ts
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import { logger } from '../utils/logger.js';

export interface FileStoragePort {
  guardarArchivo(buffer: Buffer, rutaRelativa: string): Promise<string>;
  guardarBase64(
    dataUrlOrBase64: string,
    subDir: string,
    prefijo: string
  ): Promise<{
    rutaRelativa: string;
    rutaAbsoluta: string;
    pesoBytes: number;
    mimeType: string;
  }>;
  obtenerLectura(rutaRelativa: string): fs.ReadStream;
  crearArchivoZip(archivos: { rutaFisica: string; nombreEnZip: string }[]): Promise<NodeJS.ReadableStream>;
}

export class LocalDiskStorageAdapter implements FileStoragePort {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || process.env.STORAGE_PATH || path.resolve(process.cwd(), 'uploads');
    this.asegurarDirectorios();
  }

  private asegurarDirectorios(): void {
    const subcarpetas = [
      '',
      'inspecciones',
      'ciclo-transporte/firmas',
      'ciclo-transporte/fotos',
      'ciclo-transporte/actas',
      'bitacora',
      'documentos'
    ];
    for (const sub of subcarpetas) {
      const fullPath = path.join(this.baseDir, sub);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
  }

  async guardarBase64(
    dataUrlOrBase64: string,
    subDir: string,
    prefijo: string
  ): Promise<{ rutaRelativa: string; rutaAbsoluta: string; pesoBytes: number; mimeType: string }> {
    if (!dataUrlOrBase64 || typeof dataUrlOrBase64 !== 'string') {
      throw new Error('Carga Base64 o Data URL inválida.');
    }

    let mimeType = 'image/png';
    let rawBase64 = dataUrlOrBase64;

    const matches = dataUrlOrBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      rawBase64 = matches[2];
    }

    let extension = '.png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = '.jpg';
    else if (mimeType.includes('webp')) extension = '.webp';
    else if (mimeType.includes('svg')) extension = '.svg';
    else if (mimeType.includes('pdf')) extension = '.pdf';

    const buffer = Buffer.from(rawBase64, 'base64');
    if (buffer.length === 0) {
      throw new Error('El buffer decodificado tiene tamaño cero.');
    }

    const uniqueId = crypto.randomUUID().slice(0, 8);
    const nombreArchivo = `${prefijo}_${Date.now()}_${uniqueId}${extension}`;
    const rutaRelativa = path.posix.join('/uploads', subDir, nombreArchivo);
    
    // Normalización y protección contra Path Traversal
    const rutaAbsoluta = path.resolve(this.baseDir, subDir, nombreArchivo);
    const relativeCheck = path.relative(this.baseDir, rutaAbsoluta);
    if (relativeCheck.startsWith('..') || path.isAbsolute(relativeCheck)) {
      throw new Error('Ruta de archivo no autorizada (Path Traversal detectado).');
    }

    const targetDir = path.dirname(rutaAbsoluta);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    await fs.promises.writeFile(rutaAbsoluta, buffer);

    return {
      rutaRelativa, // Longitud típicamente 50-70 caracteres (< 191)
      rutaAbsoluta,
      pesoBytes: buffer.length,
      mimeType
    };
  }

  async guardarArchivo(buffer: Buffer, rutaRelativa: string): Promise<string> {
    const cleanRel = rutaRelativa.replace(/^\/uploads\/?/, '');
    const destinoCompleto = path.resolve(this.baseDir, cleanRel);
    
    const relativeCheck = path.relative(this.baseDir, destinoCompleto);
    if (relativeCheck.startsWith('..') || path.isAbsolute(relativeCheck)) {
      throw new Error('Ruta de archivo no autorizada (Path Traversal detectado).');
    }

    const dir = path.dirname(destinoCompleto);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(destinoCompleto, buffer);
    return destinoCompleto;
  }

  obtenerLectura(rutaRelativa: string): fs.ReadStream {
    const cleanRel = rutaRelativa.replace(/^\/uploads\/?/, '');
    const destinoCompleto = path.resolve(this.baseDir, cleanRel);
    return fs.createReadStream(destinoCompleto);
  }

  async crearArchivoZip(archivos: { rutaFisica: string; nombreEnZip: string }[]): Promise<NodeJS.ReadableStream> {
    const archive = archiver('zip', { zlib: { level: 9 } });
    for (const item of archivos) {
      if (fs.existsSync(item.rutaFisica)) {
        archive.file(item.rutaFisica, { name: item.nombreEnZip });
      } else {
        logger.warn(`Archivo físico no encontrado para inclusión en ZIP: ${item.rutaFisica}`);
      }
    }
    setImmediate(() => {
      archive.finalize();
    });
    return archive;
  }
}

export const fileStorage = new LocalDiskStorageAdapter();
```

### 5.2 Servicio Estático Seguro en `app.ts`

```typescript
// backend/src/app.ts
import path from 'path';
import express from 'express';

// Definición de ruta base para almacenamiento persistente
const STORAGE_PATH = process.env.STORAGE_PATH || path.resolve(process.cwd(), 'uploads');

// Montaje de archivos estáticos con directivas de seguridad
app.use('/uploads', express.static(STORAGE_PATH, {
  dotfiles: 'ignore',
  index: false,
  maxAge: '1d',
  immutable: true,
  fallthrough: false
}));
```

---

## 6. Migration & Rollout Plan

1. **Verificación de Esquema Prisma y Compatibilidad**:
   - Verificar que los modelos Prisma existentes cubren todas las necesidades:
     - `FotoInspeccion.archivoUrl`: `String` (VARCHAR 191 en MySQL). Las rutas relativas (`/uploads/inspecciones/...`) miden < 75 caracteres.
     - `FotoFaenaEPP.archivoUrl`: `String`.
     - `ActaRecepcion.fotoRespaldoUrl`: `String?`.
     - `DocumentoExpediente.rutaAlmacenamiento`: `String`.
     - `RegistroTelemetriaGPS`: Índices en `timestamp`, `ordenServicioId` y `jornadaId` listos.
   - Ejecutar `npx prisma validate` para asegurar la integridad sintáctica del esquema.

2. **Configuración de Variables de Entorno**:
   - En entorno Docker / EasyPanel: `STORAGE_PATH=/app/uploads`.
   - En desarrollo local: `STORAGE_PATH=./uploads` (o resolución automática a `./uploads`).

3. **Verificación de Volumen Persistente en EasyPanel**:
   - Confirmar en `docker-compose.yml`:
     ```yaml
     backend:
       environment:
         STORAGE_PATH: /app/uploads
       volumes:
         - uploads_data:/app/uploads
     volumes:
       uploads_data:
         driver: local
     ```
   - En el dashboard de EasyPanel, confirmar que el volumen `uploads_data` esté montado en la ruta `/app/uploads` del contenedor `zion-backend`.

4. **Validación de Tests Unitarios y de Integración**:
   - Ejecutar suite de pruebas:
     - `npm test -- transport-cycle.test.ts`
     - `npm test -- inspection.service.test.ts`
     - `npm test -- dossier.comparison.test.ts`
   - Asegurar que ningún test dependa de `TELEMETRIA_STORE` ni genere archivos `.txt` mock.

5. **Puesta en Marcha (Rollout)**:
   - Despliegue en EasyPanel (Build + Deploy).
   - Verificación de la creación automática de subdirectorios en `/app/uploads`.
   - Comprobación del endpoint `/health` y prueba funcional de checklist preoperacional con fotos desde la tablet del conductor.
