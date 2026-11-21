# Tasks

## 1. Modelo de Datos, Autenticación y RBAC (Backend)

- [x] 1.1 Actualizar el enum `RolUsuario` en `backend/prisma/schema.prisma` para incluir `SUPERADMIN`, `ADMIN`, `JEFE_OPERACIONES`, `CONDUCTOR` y `CLIENTE`, y generar el cliente Prisma. Verificar con `npx prisma generate`.
- [x] 1.2 Implementar endpoints de autenticación en backend (`POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/refresh`) con validación de credenciales, control de cuentas activas y cookies HTTP-only. Verificar con tests unitarios en Vitest.
- [x] 1.3 Actualizar middlewares `authenticate`, `authorize` y `enforceTenantIsolation` para soportar la nueva jerarquía de roles (`SUPERADMIN`, `ADMIN`, `JEFE_OPERACIONES`, `CONDUCTOR`, `CLIENTE`). Verificar denegación 403 ante rol insuficiente.

## 2. Pantalla de Login y Panel de Gestión de Usuarios (Frontend & Backend)

- [x] 2.1 Implementar endpoints de administración de usuarios en backend (`GET /api/usuarios`, `POST /api/usuarios`, `PUT /api/usuarios/:id`, `PATCH /api/usuarios/:id/estado`) protegidos exclusivamente para `SUPERADMIN` y `ADMIN`. Verificar creación y alternancia de estado activo/inactivo.
- [x] 2.2 Implementar componente `LoginScreen` en React con SATEM Design System, validación de formulario, manejo de errores y redirección contextual según el rol autenticado. Verificar inicio de sesión exitoso y bloqueo de cuentas inactivas.
- [x] 2.3 Implementar componente `UserManagementPanel` con tabla de usuarios, filtros por rol y estado, modal de creación/edición de usuario (asociando empresas clientes cuando corresponda) y switch de habilitación/deshabilitación de cuenta. Verificar actualización reactiva en pantalla.

## 3. Checklists de Conductor y Módulo de Cámara Universal (Frontend Tablet)

- [x] 3.1 Implementar componente `CameraCaptureModal` con WebRTC (`getUserMedia`), selector facingMode ("environment"), canvas snapshot y fallback automático a `<input type="file" accept="image/*" capture="environment">`. Verificar captura interactiva y compresión en cliente a < 500 KB.
- [x] 3.2 Definir la estructura de 80 ítems del checklist F-GMT-MAN-004 organizada en 5 categorías (Motor/Fluidos, Cabina/Seguridad, Luces, Neumáticos/Frenos, Equipamiento de Faena) e implementar `ChecklistSalidaModal` con opción de marcado masivo "Todo Conforme" y detección de fallas críticas. Verificar que impida avanzar ante fallas críticas.
- [x] 3.3 Implementar `ChecklistRetornoModal` en la tablet para registrar kilometraje final, horómetro, estado de herramientas y reporte de daños al retornar a Planta Zion. Verificar validación de kilometraje final.

## 4. Seguimiento GPS por Hitos y Visualización en Operaciones

- [x] 4.1 Implementar el hook y servicio `useGpsTracker` utilizando `navigator.geolocation.watchPosition` con cálculo de precisión en metros, control de fallos y pill de estado en el encabezado de la tablet. Verificar lectura de coordenadas en dispositivo.
- [x] 4.2 Integrar el registro y estampado de coordenadas GPS al confirmar los hitos de jornada (Salida de Planta, Llegada a Cliente, Fin de Faena, Romana de Destino, Retorno a Planta Zion). Verificar almacenamiento de latitud, longitud y timestamp en el backend.
- [x] 4.3 Implementar en el panel de `JEFE_OPERACIONES` la vista de mapa en vivo y estado de las unidades activas en ruta con sus últimas coordenadas reportadas. Verificar renderizado en la interfaz de Operaciones.

## 5. Portal de Clientes con Tracking Activo y Expediente en Tiempo Real

- [x] 5.1 Implementar endpoint `/api/clientes/ordenes/:id/tracking` con validación de Tenant Isolation y verificación de ventana activa (orden en tránsito o en faena). Verificar que bloquee el acceso si la orden pertenece a otra empresa o no está activa.
- [x] 5.2 Implementar en el Portal del Cliente el componente de mapa de seguimiento en vivo del camión asignado a su orden activa. Verificar visualización de ubicación exclusiva de su servicio.
- [x] 5.3 Implementar endpoint y vista en el Portal del Cliente para consultar y descargar en tiempo real las fotografías, firmas y documentos conforme el conductor los sincroniza desde la tablet. Verificar previsualización y descarga inmediata de evidencias.

## 6. Persistencia Offline-First, Integración Integral y Validación

- [x] 6.1 Implementar `offlineStorageService` sobre IndexedDB para almacenar localmente checklists, fotos perimetrales y coordenadas ante cortes de cobertura móvil, con cola de sincronización automática al detectar evento `online`. Verificar persistencia sin red.
- [x] 6.2 Integrar todos los módulos en `frontend/src/App.tsx` organizados por rol autenticado con rutas protegidas: Login -> Conductor (Tablet), Jefe de Operaciones, Superadmin/Admin (Gestión de Usuarios) y Cliente (Portal con Tracking y Expediente).
- [x] 6.3 Ejecutar verificación integral de compilación (`npm run build` en backend y frontend) y suite de pruebas automatizadas con Vitest, comprobando cero regresiones en los servicios existentes.
