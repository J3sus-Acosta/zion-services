# Design: Core Flow Persistence, REST Routing & Realtime Dossier

## Context

El backend de Zion Services dispone de servicios desacoplados y probados para inspecciones, operaciones en terreno, destino y expedientes. Sin embargo, la autenticación y la telemetría utilizaban estructuras `Map` en memoria, la capa de controladores REST carecía de endpoints expuestos para la mayoría de los servicios, y la interfaz de usuario en `App.tsx` se comportaba como un monolito basado en estados locales.

Adicionalmente, el cliente de negocio definió dos requerimientos específicos:
1. La autorización de inicio de faena (CU-17) debe realizarse con trazo táctil/lápiz (touch canvas) en la tablet, registrando obligatoriamente nombre, apellido y RUT del encargado (sin archivos de imagen ni firmas electrónicas externas).
2. Se prescinde de una galería fotográfica en vivo aislada en el portal de clientes; las fotos deben integrarse y estar disponibles inmediatamente para previsualización y descarga en el expediente digital.
3. Se pospone el hardening de seguridad avanzado (Fase 1) para un ciclo posterior por desarrollarse en local, avanzando directamente con las Fases 2, 3 y 4.

## Goals / Non-Goals

**Goals:**
- Migrar el manejo de usuarios y telemetría a persistencia real en MySQL mediante Prisma ORM.
- Exponer routers REST para inspecciones preoperacionales, ciclo de transporte, solicitudes comerciales, órdenes de servicio y expedientes documentales.
- Implementar un componente de firma táctil en pantalla (`TouchSignaturePad.tsx`) que capture el trazo manuscrito junto con Nombre, Apellido y RUT.
- Reestructurar el frontend utilizando `react-router-dom` con rutas independientes protegidas por rol.
- Centralizar la visualización y descarga de fotos en el expediente digital del portal de clientes desde el instante de su subida.
- Completar el motor de sincronización offline en `offline-storage.ts` para enviar la cola pendiente al reconectarse a la red.

**Non-Goals:**
- Hardening avanzado de seguridad en local (rate limiting agresivo, mitigaciones de fuerza bruta o rotación compleja de secretos en esta fase).
- Firma electrónica avanzada mediante proveedores externos (e.g. DocuSign o PKI).
- Galería fotográfica independiente en tiempo real para clientes.

## Decisions

### 1. Persistencia Prisma MySQL para Usuarios y Telemetría
- **Decisión:** Reemplazar el `Map` en memoria de `auth.service.ts` y `user-management.service.ts` por operaciones Prisma directas sobre el modelo `Usuario`.
- **Esquema:** Agregar a `prisma/schema.prisma` el modelo `RegistroTelemetriaGPS` con relación a `Jornada` y `OrdenServicio` para registrar el histórico de posiciones.
- **Alternativas consideradas:** Mantener mocks en memoria durante desarrollo local. *Descartado:* impide validar la integridad referencial y causa pérdida de sesiones y datos tras cada reinicio del contenedor.

### 2. Exposición Modular de Routers REST en Express
- **Decisión:** Crear módulos de rutas dedicados en `backend/src/routes/`:
  - `inspeccion.routes.ts`: `POST /api/inspecciones/salida`, `POST /api/inspecciones/retorno`, `POST /api/inspecciones/fotos-360`.
  - `ciclo-transporte.routes.ts`: `POST /api/ciclo-transporte/llegada`, `POST /api/ciclo-transporte/autorizar-faena`, `POST /api/ciclo-transporte/evidencias`, `POST /api/ciclo-transporte/recepcion-conforme`.
  - `solicitudes.routes.ts`: `POST /api/solicitudes`, `GET /api/solicitudes`, `PATCH /api/solicitudes/:id/aprobar`.
  - `ordenes.routes.ts`: `POST /api/ordenes`, `GET /api/ordenes`, `GET /api/ordenes/:id`.
  - `expediente.routes.ts`: `GET /api/expedientes/:ordenId/en-vivo`, `GET /api/expedientes/:ordenId/descargar-zip`.
- **Alternativas consideradas:** Exponer todo en un único archivo `api.routes.ts`. *Descartado:* viola la separación de responsabilidades SATEM.

### 3. Componente de Firma Táctil en Pantalla (`TouchSignaturePad.tsx`)
- **Decisión:** Implementar un componente React nativo utilizando HTML5 `<canvas>` con eventos Pointer (`pointerdown`, `pointermove`, `pointerup`) y prevención de scroll táctil (`touch-action: none`).
- **Formulario:** Acompañado de campos controlados para:
  - Nombre (obligatorio, texto)
  - Apellido (obligatorio, texto)
  - RUT (obligatorio, formato chileno)
- **Salida:** Genera un dataUrl base64 del trazo manuscrito y payload JSON estructurado: `{ firmaDataUrl, encargadoNombre, encargadoApellido, encargadoRut }`.
- **Alternativas consideradas:** Permitir subir archivo de imagen o firma digital externa. *Descartado por requerimiento expreso del usuario.*

### 4. Integración de Evidencias en Expediente sin Galería Separada
- **Decisión:** El portal de cliente consulta directamente el endpoint de expediente en vivo. Las fotografías tomadas por el conductor (perimetrales, succión, EPP) se indexan en tiempo real en `DossierIndexService` y se despliegan como ítems descargables y previsualizables con thumbnail dentro del expediente.
- **Alternativas consideradas:** Vista de galería separada tipo carrusel social. *Descartado:* el cliente prefiere un enfoque técnico-documental unificado.

### 5. Frontend Routing con `react-router-dom` y Sincronización Automática
- **Decisión:** Separar las pantallas en rutas:
  - `/login`: Inicio de sesión
  - `/tablet`: Flujo completo del conductor (Checklist, Fotos 360, Llegada, Firma Touch, Evidencias, Retorno)
  - `/operaciones`: Mapa de flota y despacho
  - `/admin/usuarios`: Gestión de usuarios
  - `/portal-cliente`: Seguimiento y expediente documental
- **Sincronizador:** En `offline-storage.ts`, crear un listener de `window.addEventListener('online')` que procesa la cola de IndexedDB enviando las peticiones acumuladas con reintentos lineales.

## Risks / Trade-offs

- **[Riesgo: Migraciones de Prisma con datos existentes]** → *Mitigación:* Usar `npx prisma migrate dev` preservando la tabla `Usuario` y agregando los nuevos modelos sin alterar tablas críticas.
- **[Riesgo: Pérdida de trazo en tablets con latencia de render]** → *Mitigación:* Optimizar el loop de render del canvas con `requestAnimationFrame` y trazos suaves cuadráticos.
- **[Riesgo: Dispositivos sin conexión prolongada]** → *Mitigación:* IndexedDB almacena las firmas y fotos localmente; se notifica al conductor con un badge de sincronización pendiente.

## Migration Plan

1. Actualizar `schema.prisma` y ejecutar migración en base de datos MySQL local.
2. Adaptar `AuthService` y `UserManagementService` para operar con Prisma.
3. Crear y registrar los routers REST en Express.
4. Desarrollar el componente `TouchSignaturePad` en el frontend.
5. Configurar `react-router-dom` en `frontend/src/` y reemplazar vistas de `App.tsx`.
6. Conectar la sincronización de IndexedDB con los nuevos endpoints del backend.
