# Tasks: Implementación Zion Services Core MVP

## 1. Scaffolding y Configuración Base del Monolito

- [ ] 1.1 Inicializar la estructura modular del proyecto (`backend/` y `frontend/`) con TypeScript strict y verificar compilación base con `npm run build`.
- [ ] 1.2 Configurar Prisma ORM con datasource MySQL 8 y verificar conexión y validación de schema mediante `npx prisma validate`.
- [ ] 1.3 Configurar variables de entorno y utilidades de log centralizadas sin exposición de credenciales y verificar con prueba unitaria.

## 2. Modelo de Datos Prisma y Migraciones

- [ ] 2.1 Definir en `schema.prisma` los modelos de `Usuario`, `Rol`, `EmpresaCliente`, `SucursalFaena`, `Contrato` y verificar sintaxis con `npx prisma validate`.
- [ ] 2.2 Definir los modelos de `Vehiculo`, `Conductor`, `InspeccionPreoperacional`, `ItemChecklist` con banderas de falla crítica.
- [ ] 2.3 Definir los modelos de `SolicitudServicio`, `OrdenServicio`, `Jornada`, `HojaDeRuta`, `TramoRuta` y `CicloTransporte`.
- [ ] 2.4 Definir los modelos de `VisitaDestino`, `RegistroPesaje` (pesaje de entrada, pesaje de salida, comprobantes) y `AntecedenteSIDREP`.
- [ ] 2.5 Definir los modelos de `ExpedienteDocumental`, `Documento`, `VersionDocumento` e `HistorialEstado`.
- [ ] 2.6 Generar y aplicar la primera migración estructurada con `npx prisma migrate dev --name init_core_schema` en base de datos local.

## 3. Autenticación, Seguridad y Auditoría

- [ ] 3.1 Implementar servicio de autenticación con JWT y cookies HTTP-only (login, refresh token y logout) y verificar con tests unitarios.
- [ ] 3.2 Implementar middleware de autorización RBAC (`ADMIN`, `OPERACIONES`, `COMERCIAL`, `CONDUCTOR`, `CLIENTE`) y verificar rechazo 403 ante permisos insuficientes.
- [ ] 3.3 Implementar middleware de auditoría obligatoria para mutaciones críticas (pesajes y cambios de estado) y verificar persistencia en `HistorialEstado`.

## 4. Dominio Comercial: Solicitudes y Órdenes de Servicio

- [ ] 4.1 Implementar endpoints y servicios para creación y consulta de solicitudes de retiro con validación Zod y verificar con tests de integración.
- [ ] 4.2 Implementar flujo de revisión y aprobación comercial de solicitudes spot y contractuales.
- [ ] 4.3 Implementar generación de Orden de Servicio con folio inmutable único vinculado a la solicitud y verificar no duplicidad.

## 5. Flota y Checklist Preoperacional

- [ ] 5.1 Implementar endpoints de administración de vehículos y conductores con validación de estado operativo.
- [ ] 5.2 Implementar registro del checklist preoperacional con verificación estricta de ítems críticos y test unitario que compruebe el bloqueo automático del camión ante fallas de seguridad.
- [ ] 5.3 Implementar protocolo de desbloqueo auditado por Jefe de Operaciones ante subsanación de fallas.

## 6. Planificación de Jornadas y Regla Invariante de Descarga Intermedia

- [ ] 6.1 Implementar servicio de creación de jornadas y asignación secuencial de hojas de ruta.
- [ ] 6.2 Implementar validador de regla de negocio en backend (`JourneyValidationService`) que impida programar o iniciar un segundo retiro sin pesaje y descarga completa en destino del retiro previo.
- [ ] 6.3 Escribir suite de pruebas automatizadas que intenten forzar dos retiros consecutivos y verificar que el backend retorne error `INVARIANTE_DESCARGA_PENDIENTE`.

## 7. Terreno: Ciclo de Transporte y Acta de Recepción

- [ ] 7.1 Implementar endpoints móviles para conductores: salida de planta, llegada a cliente, inicio y término de carga.
- [ ] 7.2 Implementar endpoint para captura de acta de recepción en cliente: firma digital conforme, recepción con observaciones o constancia explícita de negativa de firma sin inventar conformidad.
- [ ] 7.3 Implementar soporte de almacenamiento local temporal en frontend para tolerar desconexión en faenas remotas.

## 8. Destino: Pesajes Dobles y Antecedentes SIDREP

- [ ] 8.1 Implementar registro de visita a planta de destino con captura obligatoria de `pesoEntrada` y su comprobante.
- [ ] 8.2 Implementar registro de pesaje de salida tras descarga, cálculo de residuo neto descargado y validación de que `pesoSalida < pesoEntrada`.
- [ ] 8.3 Implementar vinculación de antecedentes documentales y folios del sistema SIDREP a la Orden de Servicio.

## 9. Expediente Documental y Descarga ZIP

- [ ] 9.1 Implementar puerto de almacenamiento `FileStoragePort` y adaptador local para almacenamiento persistente en volumen Docker.
- [ ] 9.2 Implementar subida, clasificación por metadatos y versionado de documentos en el expediente de la atención.
- [ ] 9.3 Implementar servicio de empaquetado y streaming dinámico de archivo comprimido (.zip) con los documentos autorizados según rol del solicitante.

## 10. Portal de Clientes y Aislamiento de Datos

- [ ] 10.1 Implementar middleware de Tenant Isolation que filtre estrictamente todas las consultas para que un cliente solo acceda a sus propias sucursales y expedientes.
- [ ] 10.2 Implementar endpoint de consulta de estado por hitos para el portal de clientes (sin telemetría interna sensible).

## 11. Frontend React con SATEM Design System

- [ ] 11.1 Configurar tipografías Outfit/Inter e inyectar tokens CSS oficiales de SATEM en `src/index.css`.
- [ ] 11.2 Construir layout base de Backoffice (`AppLayout`, sidebar, header con breadcrumbs y drawer móvil).
- [ ] 11.3 Construir interfaz responsive del conductor para checklist preoperacional e hitos de faena con botones táctiles ≥ 38px.
- [ ] 11.4 Construir vistas de gestión de solicitudes, asignación de jornadas, visor de expedientes y descarga ZIP.
- [ ] 11.5 Construir Portal de Clientes con vista de seguimiento y descarga documental autorizada.

## 12. Dockerización, Despliegue en EasyPanel y Validación E2E

- [ ] 12.1 Crear `Dockerfile` optimizado para frontend (Nginx) y backend (Node Alpine), junto a `docker-compose.yml` para entorno de producción en VPS.
- [ ] 12.2 Configurar volúmenes persistentes en EasyPanel para `/var/lib/mysql` y `/uploads`.
- [ ] 12.3 Ejecutar validación integral end-to-end simulando una jornada completa: Checklist -> Retiro -> Destino (Pesajes + SIDREP) -> Segundo Retiro -> Cierre y verificar cumplimiento de todas las invariantes.
