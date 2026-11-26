# Proposal: mvp-easypanel-persistence-and-storage

## Why

Zion Services se encuentra en la etapa crítica de transición desde un prototipo funcional/híbrido hacia un MVP 100% operativo y listo para su despliegue y puesta en marcha en EasyPanel (servidor VPS con orquestación Docker). Actualmente persisten brechas arquitectónicas de persistencia que impiden un funcionamiento confiable en producción:

1. **Dependencia de almacenamiento volátil y mocks en memoria**: Módulos críticos como el seguimiento de unidades y telemetría (`tracking.routes.ts`) dependen de colecciones en memoria (`TELEMETRIA_STORE`, `EVIDENCIAS_STORE`). Si el contenedor de Docker o el proceso Node se reinicia o se despliega una nueva versión, toda la trazabilidad y eventos en vivo se pierden de inmediato.
2. **Stubs sin inserción en base de datos**: En el ciclo de terreno (`ciclo-transporte.routes.ts`) y las inspecciones de flota (`inspeccion.routes.ts`), varios endpoints actúan como stubs que responden estructuras de éxito calculadas pero no ejecutan transacciones con Prisma ni guardan los registros en las tablas correspondientes (`CicloTransporte`, `ActaRecepcion`, `InspeccionSalida_F_GMT`, `FotoInspeccion`, `InspeccionRetornoPlanta`).
3. **Riesgo crítico de desbordamiento de tipos en MySQL (Base64 vs VARCHAR)**: Las tablets de terreno capturan fotografías de alta resolución (inspección 360°, faena, EPP, SIDREP y comprobantes de romana) y firmas manuscritas en formato Data URL / Base64. Intentar guardar cadenas Base64 de megabytes en columnas relacionales de MySQL definidas como `VARCHAR(191)` o `VARCHAR(255)` provoca fallos fatales de inserción (`ER_DATA_TOO_LONG`), mientras que forzar `LONGTEXT` saturaría la base de datos y degradaría las copias de seguridad.
4. **Ausencia de pipeline de archivos físicos y servicio estático**: No se encuentra configurado el pipeline que decodifique atómicamente estas cargas Base64 a archivos binarios en el volumen montado en disco local (`/app/uploads`), ni el middleware de servicio estático seguro en `app.ts` (`/uploads`), ni el guardado exclusivo de rutas relativas URI cortas (< 191 caracteres) en MySQL.
5. **Inconsistencias en el expediente documental y descargas ZIP**: La descarga consolidada en ZIP y la descarga individual requieren verificar la existencia física de los archivos en disco en lugar de suponer su presencia o depender de archivos simulados.

Para resolver estas deficiencias de forma definitiva, esta propuesta establece la arquitectura de persistencia completa: almacenamiento local persistente en disco (/app/uploads montado como volumen Docker en EasyPanel, sin AWS ni S3), pipeline de decodificación y persistencia física de fotos y firmas, conexión de todos los flujos de terreno, inspección y tracking a Prisma/MySQL, y unificación transparente con el expediente documental.

## What Changes

- **Almacenamiento Persistente en Disco Local (EasyPanel Docker Volume & Express Static)**:
  - Definición y uso estricto de la variable de entorno `STORAGE_PATH` (por defecto `/app/uploads` en contenedor de producción y `./uploads` relativo en desarrollo local).
  - Configuración del servicio estático seguro en `app.ts` mediante `app.use('/uploads', express.static(STORAGE_PATH))` con cabeceras de caché apropiadas y sanitización contra vulnerabilidades de *Path Traversal*.
  - Prohibición explícita de AWS S3 o servicios externos en la nube: toda persistencia de archivos binarios es local y persistida mediante el volumen Docker montado en EasyPanel (`uploads_data:/app/uploads`).
  - Convención de almacenamiento de rutas relativas URI en base de datos MySQL siempre inferiores a 191 caracteres (ej. `/uploads/inspecciones/salida-frontal-uuid.jpg`).
- **Pipeline Unificado de Procesamiento y Persistencia de Fotos y Firmas**:
  - Implementación en `FileStorageService` / `LocalDiskStorageAdapter` de métodos atómicos para decodificar cadenas Data URL / Base64 (`data:image/jpeg;base64,...`) y buffers de streams.
  - Validación de extensiones seguras (`.jpg`, `.png`, `.webp`, `.svg`), extracción binaria y escritura asíncrona en subdirectorios categorizados (`/app/uploads/inspecciones/`, `/app/uploads/ciclo-transporte/`, `/app/uploads/bitacora/`, `/app/uploads/documentos/`).
  - Generación de nombres de archivo no colisionables basados en identificadores únicos y marcas de tiempo.
  - Garantía de que ninguna cadena Base64 se persista en columnas de texto relacionales en MySQL.
- **Conexión Transaccional de Ciclo de Terreno (`ciclo-transporte.routes.ts`)**:
  - Reemplazo de las respuestas simuladas de `TransportCycleService` por persistencia real en Prisma:
    - *Llegada a Faena*: Actualización del registro `CicloTransporte` con coordenadas GPS (`lat`, `lng`), timestamp exacto y cambio de estado a `EN_FAENA`.
    - *Autorización de Faena*: Decodificación y guardado en disco de la firma táctil (`/uploads/ciclo-transporte/firmas/...`), almacenamiento del Nombre, Apellido y RUT del encargado cliente, y actualización de estado a `FAENA_AUTORIZADA`.
    - *Evidencias de Faena y EPP*: Decodificación de fotos, almacenamiento en disco y registro inmediato en `DocumentoExpediente` con categorías `FOTO_FAENA_PROCESO` y `FOTO_EPP_SEGURIDAD`.
    - *Acta de Recepción Conforme*: Guardado físico de firma y foto de respaldo en disco, creación del registro `ActaRecepcion`, actualización de `CicloTransporte` y transición de `OrdenServicio` a `RETIRO_COMPLETADO` o `RECEPCION_OBSERVADA`.
- **Conexión de Inspecciones F-GMT-MAN-004 y Retorno (`inspeccion.routes.ts`)**:
  - Persistencia de `InspeccionSalida_F_GMT`: registro de odómetro, horómetro, estado de evaluación de los 80 ítems (JSON estructurado) y enlace al conductor y vehículo.
  - Persistencia física de las 4 fotos perimetrales 360° obligatorias (Frontal, Lateral Izquierda, Trasera, Lateral Derecha) a través del pipeline de archivos, creando los registros en `FotoInspeccion` e indexándolas en `DocumentoExpediente`.
  - Aplicación automática de bloqueo en la tabla `vehiculos` (`DESHABILITADO` con `motivoEstado`) si se detecta cualquier falla crítica en la inspección.
  - Persistencia de `InspeccionRetornoPlanta`: odómetro de retorno, horómetro final, estado de herramientas, daños reportados y fotos perimetrales finales de cierre.
- **Telemetría y Tracking en Vivo (`tracking.routes.ts`) sobre MySQL**:
  - Eliminación total de `TELEMETRIA_STORE` y `EVIDENCIAS_STORE` en memoria.
  - Ingesta de geolocalización desde la tablet hacia la tabla `registros_telemetria_gps` (`RegistroTelemetriaGPS`) con coordenadas, precisión, velocidad y timestamp.
  - Endpoint de consulta de tracking para el cliente (`GET /api/clientes/ordenes/:id/tracking`) y operaciones (`GET /api/operaciones/flota-en-vivo`) consultando el último registro de telemetría directamente desde la base de datos.
  - Agregación dinámica de evidencias en vivo mediante consulta a `DocumentoExpediente` y `FotoInspeccion` asociados a la orden de servicio.
- **Robustecimiento del Expediente Documental (Descarga ZIP e Individual)**:
  - Corrección de `expediente.routes.ts` para resolver rutas físicas reales en `STORAGE_PATH` antes de transferir por streaming (`res.sendFile` o `archive.file`).
  - Verificación de existencia de archivo en disco (`fs.existsSync`) para prevenir excepciones no controladas durante la generación de paquetes ZIP.
  - Prohibición terminante de archivos ficticios `.txt` o datos mock en las descargas.

## Capabilities

### New Capabilities
- `local-storage`: Servicio centralizado de almacenamiento en disco físico local montado en Docker (/app/uploads), decodificación atómica de Base64/Data URLs hacia archivos físicos, servicio estático seguro en Express y normalización de URLs relativas cortas (< 191 caracteres) en MySQL. PROHIBIDO AWS, PROHIBIDO S3.

### Modified Capabilities
- `transport-cycle`: Persistencia completa en MySQL con Prisma para hitos de llegada, autorización con firma táctil, fotos de faena y EPP, y cierre con acta de recepción conforme o negativa con foto de respaldo.
- `fleet-inspection`: Persistencia íntegra de inspecciones preoperacionales F-GMT-MAN-004, fotos perimetrales 360° e inspección de retorno a planta en MySQL y expediente documental.
- `tracking-telemetry`: Sustitución de almacenes temporales en memoria (`TELEMETRIA_STORE`, `EVIDENCIAS_STORE`) por persistencia relacional en `RegistroTelemetriaGPS` y agregación de evidencias reales desde la base de datos.
- `document-dossier`: Indexación estricta de archivos físicos reales en disco y descarga individual y consolidada en ZIP con streaming nativo y respeto de aislamiento por cliente (Tenant Isolation).

## Impact

- **Backend**:
  - Actualización de `app.ts` para exponer el middleware `express.static('/uploads')` apuntando a `process.env.STORAGE_PATH || '/app/uploads'`.
  - Refactor de `TransportCycleService` para reemplazar stubs por consultas y transacciones `prisma.cicloTransporte`, `prisma.actaRecepcion` y `prisma.documentoExpediente`.
  - Refactor de `inspeccion.routes.ts` para ejecutar inserciones en `prisma.inspeccionSalida_F_GMT`, `prisma.fotoInspeccion` y `prisma.inspeccionRetornoPlanta`.
  - Refactor de `tracking.routes.ts` para consultar e insertar en `prisma.registroTelemetriaGPS` y consultar evidencias desde `prisma.documentoExpediente`.
  - Extensión de `FileStorageService` para encapsular la decodificación de Data URLs, guardado de archivos y generación de rutas cortas.
- **Base de Datos MySQL**:
  - Asegurar que todas las columnas que guardan referencias a imágenes y firmas (`archivoUrl`, `rutaAlmacenamiento`, `fotoRespaldoUrl`, etc.) almacenen únicamente rutas relativas URIs de longitud menor a 191 caracteres, protegiendo contra `ER_DATA_TOO_LONG`.
  - Uso de índices existentes en `registros_telemetria_gps` (`jornadaId`, `ordenServicioId`, `timestamp`) para consultas de alta velocidad.
- **Frontend / Tablets**:
  - Las aplicaciones tablet y portales envían fotografías y firmas en base64 o multipart según el flujo actual, y reciben URLs relativas normalizadas (ej. `/uploads/...`), consumibles directamente a través de `VITE_API_URL`.
- **DevOps e Infraestructura (Docker / EasyPanel)**:
  - Garantizar la existencia del volumen montado `uploads_data:/app/uploads` en `docker-compose.yml` y configuración en EasyPanel.
  - Asegurar permisos de lectura y escritura para el usuario contenedor en `/app/uploads`.
- **Seguridad**:
  - Sanitización estricta de rutas de archivos para evitar vulnerabilidades de *Directory Traversal* (`..`).
  - Mantenimiento inalterable del aislamiento de datos por empresa cliente (*Tenant Isolation*) en todos los endpoints de consulta de expedientes, tracking y descargas.
