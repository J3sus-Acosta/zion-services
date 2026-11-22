# Tasks: Core Flow Persistence, REST Routing & Realtime Dossier

## 1. Persistencia Real en Prisma / MySQL (Fase 2)

- [x] 1.1 Incorporar el modelo `RegistroTelemetriaGPS` en `backend/prisma/schema.prisma` y generar la migración Prisma (`npx prisma migrate dev --name add_telemetria_gps`).
- [x] 1.2 Adaptar `AuthService` y `UserManagementService` en `backend/src/services/` para consultar y mutar directamente la tabla `Usuario` en MySQL vía Prisma Client, eliminando el almacenamiento volátil en memoria.
- [x] 1.3 Implementar seed de inicialización de usuarios demo en MySQL y verificar persistencia ejecutando pruebas unitarias de autenticación con `npm --prefix backend test`.

## 2. Exposición de Routers REST Troncales (Fase 3)

- [x] 2.1 Crear `backend/src/routes/inspeccion.routes.ts` para checklist de salida F-GMT-MAN-004, captura de fotos 360° y checklist de retorno, conectándolo con `InspectionService`.
- [x] 2.2 Crear `backend/src/routes/ciclo-transporte.routes.ts` para llegada a faena, autorización con firma táctil (trazo manuscrito + nombre, apellido y RUT), evidencias de faena y acta de recepción conforme con `TransportCycleService`.
- [x] 2.3 Crear `backend/src/routes/solicitudes.routes.ts` y `backend/src/routes/ordenes.routes.ts` para creación/aprobación de solicitudes y despacho de Órdenes de Servicio con `CommercialService`.
- [x] 2.4 Crear `backend/src/routes/expediente.routes.ts` para consulta de expediente en tiempo real y descarga de paquete consolidado ZIP vía streaming con `archiver` y `DossierIndexService`.
- [x] 2.5 Registrar todos los nuevos routers en `backend/src/index.ts` y verificar que compila con `npm --prefix backend run build`.
- [x] 2.6 Crear pruebas de integración en `backend/tests/` para verificar los endpoints de inspección, ciclo de transporte y expediente.

## 3. Componente de Firma Táctil y Centralización de Evidencias (Fase 4 - UI)

- [x] 3.1 Crear `frontend/src/components/signature/TouchSignaturePad.tsx` utilizando HTML5 Canvas con eventos pointer (`pointerdown`, `pointermove`, `pointerup`), botón de limpiar trazo y campos obligatorios de Nombre, Apellido y RUT del encargado.
- [x] 3.2 Integrar `TouchSignaturePad` en el flujo de la tablet del conductor para la autorización digital de inicio de faena (CU-17) reemplazando cualquier mock previo.
- [x] 3.3 Actualizar `frontend/src/components/client/ClientPortalView.tsx` para centralizar la visualización y descarga de fotos dentro de la tabla/lista del expediente documental, eliminando la sección de galería separada en vivo.

## 4. Frontend Routing y Sincronización Offline Definitiva (Fase 4 - Infraestructura)

- [x] 4.1 Configurar `react-router-dom` en `frontend/` y refactorizar `App.tsx` en rutas protegidas por rol (`/login`, `/tablet`, `/operaciones`, `/admin/usuarios`, `/portal-cliente`).
- [x] 4.2 Implementar el despachador de cola `syncWorker` en `frontend/src/services/offline-storage.ts` que escuche `window.addEventListener('online')` y envíe las inspecciones y fotos acumuladas a los endpoints REST correspondientes.
- [x] 4.3 Ejecutar verificación integral de compilación (`npm --prefix backend run build` y `npm --prefix frontend run build`) y validar que no existan errores de TypeScript.
