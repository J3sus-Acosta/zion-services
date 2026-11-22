# Proposal: Core Flow Persistence, REST Routing & Realtime Dossier

## Why

El sistema cuenta actualmente con la lógica de negocio y pruebas unitarias de los servicios troncales (inspecciones, ciclo de transporte, romana, comercial y expedientes), pero su persistencia de usuarios y telemetría operaba en memoria volátil (`Map`), carecía de endpoints HTTP para conectar la interfaz de usuario con dichos servicios, y el frontend concentraba la navegación en un componente monolítico sin enrutador desacoplado.

Asimismo, es necesario refinar dos reglas operacionales clave solicitadas por el negocio:
1. La autorización de inicio de faena (CU-17) debe realizarse exclusivamente mediante trazo táctil/lápiz (touch canvas) en la tablet, capturando nombre, apellido y RUT del encargado en terreno (sin firmas prehechas ni certificados externos).
2. El cliente no requiere una galería de fotos en vivo separada; todas las evidencias fotográficas deben visualizarse y descargarse centralizadamente dentro de su expediente documental desde el instante en que el conductor las sincroniza.

Por decisión de desarrollo en entorno local, se posterga el hardening de seguridad avanzado (Fase 1) y se prioriza la persistencia real en base de datos, la exposición de la API REST y la modernización del frontend con enrutamiento y sincronización offline.

## What Changes

- **Fase 2 — Persistencia Real en Prisma / MySQL**:
  - Migración de `AuthService` y `UserManagementService` desde almacenes volátiles en memoria hacia el modelo `Usuario` en Prisma ORM.
  - Creación del modelo `RegistroTelemetriaGPS` en `schema.prisma` para almacenar el histórico de posicionamiento de las jornadas y órdenes.
  - Sembrado (seed) automático de usuarios base en MySQL para pruebas locales.

- **Fase 3 — Exposición de Routers REST Troncales**:
  - `inspeccion.routes.ts`: Endpoints para checklist de salida F-GMT-MAN-004 (80 ítems), captura de 4 fotos perimetrales 360° y checklist de retorno a Zion.
  - `ciclo-transporte.routes.ts`: Endpoints para marcado de llegada a faena, autorización de faena con firma táctil (stroke SVG/base64 + nombre, apellido y RUT del encargado), evidencias de trabajo y acta de recepción conforme.
  - `solicitudes.routes.ts` y `ordenes.routes.ts`: Endpoints para creación de solicitudes de clientes y generación/despacho de Órdenes de Servicio (OS).
  - `expediente.routes.ts`: Endpoints para consulta de expediente en tiempo real y descarga de paquete consolidado ZIP vía streaming con `archiver`.

- **Fase 4 — Frontend Routing, Firma Táctil y Sincronización Offline**:
  - Refactor de `App.tsx` adoptando `react-router-dom` con rutas estructuradas y protegidas por rol (`/login`, `/tablet`, `/operaciones`, `/admin/usuarios`, `/portal-cliente`).
  - Componente táctil dedicado de firma en pantalla (`TouchSignaturePad.tsx`) que captura el trazo con stylus o dedo, junto a campos obligatorios para Nombre, Apellido y RUT del encargado de faena.
  - Centralización de la visualización y descarga de evidencias fotográficas dentro de la vista de expediente del portal de clientes, removiendo la galería separada y garantizando disponibilidad inmediata al subirse.
  - Implementación del motor de sincronización (`syncWorker`) en `offline-storage.ts` que despacha automáticamente la cola IndexedDB al backend ante el evento `online`.

## Capabilities

### Modified Capabilities

- `transport-cycle`: Modifica la autorización de inicio de faena para exigir captura de firma manuscrita corta mediante pantalla táctil/stylus en la tablet y registro de nombre, apellido y RUT del encargado de faena.
- `client-portal`: Elimina la galería independiente de fotos en vivo y centraliza la visualización y descarga de todas las evidencias y fotos dentro del expediente documental en tiempo real desde el momento en que son cargadas por el conductor.

## Impact

- **Backend**:
  - `backend/prisma/schema.prisma`: Nuevo modelo para telemetría GPS e histórico de tracking.
  - `backend/src/routes/`: Nuevos archivos de ruta para inspecciones, ciclo de transporte, solicitudes y expedientes, registrados en `backend/src/index.ts`.
  - `backend/src/services/auth.service.ts` y `backend/src/services/user-management.service.ts`: Adaptados para consultar la base de datos MySQL mediante `prisma`.
- **Frontend**:
  - `frontend/src/App.tsx`: Migración a estructura basada en rutas con `react-router-dom`.
  - `frontend/src/components/`: Nuevo componente `TouchSignaturePad.tsx` y actualización de vistas de tablet y portal de cliente.
  - `frontend/src/services/offline-storage.ts`: Consumidor activo de la cola `syncQueue` con reintento automático al recuperar conexión.
- **Base de Datos**:
  - Generación y ejecución de migración Prisma para soportar el esquema completo.
