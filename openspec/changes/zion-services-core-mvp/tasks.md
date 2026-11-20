# Tasks: Implementación Zion Services Core MVP (Actualizado v3)

## 1. Scaffolding y Configuración Base del Monolito

- [ ] 1.1 Configurar estructura de monorepo (`backend/` Express/TypeScript y `frontend/` React/Vite/TypeScript) y verificar compilación base con `npm run build`.
- [ ] 1.2 Configurar Prisma ORM con MySQL 8 y verificar sintaxis de conexión mediante `npx prisma validate`.
- [ ] 1.3 Configurar variables de entorno y logger estructurado auditando no exposición de credenciales.

## 2. Modelo de Datos Prisma y Migraciones

- [ ] 2.1 Definir modelos de `Usuario`, `Rol`, `EmpresaCliente`, `SucursalFaena`, `ContratoCliente` y `EstadoDePago` en `schema.prisma`.
- [ ] 2.2 Definir modelos de `Vehiculo`, `Conductor`, `InspeccionSalida_F_GMT` (80 ítems), `InspeccionRetornoPlanta`, `AutochecklistRuta` y `FotoInspeccion` (4 ángulos).
- [ ] 2.3 Definir modelos de `SolicitudServicio`, `OrdenServicio`, `Jornada` (modalidades `LOCAL_SANTIAGO` y `VIAJE_INTERREGIONAL`), `CicloTransporte`, `AutorizacionFaena`, `FotoFaenaEPP` y `ActaRecepcion`.
- [ ] 2.4 Definir modelos de `VisitaDestino`, `CertificacionSIDREP`, `ExpedienteDocumental`, `Documento` e `HistorialEstado`.
- [ ] 2.5 Ejecutar la migración estructurada con `npx prisma migrate dev --name init_zion_schema_v3` y verificar integridad de tablas.

## 3. Seguridad, Autenticación y Tenant Isolation

- [ ] 3.1 Implementar autenticación JWT con HTTP-only cookies y rotación de refresh tokens.
- [ ] 3.2 Implementar middleware de autorización RBAC (`ADMIN`, `OPERACIONES`, `COMERCIAL`, `CONDUCTOR`, `CLIENTE`).
- [ ] 3.3 Implementar middleware de Tenant Isolation que impida a clientes acceder a datos o expedientes de otras empresas.

## 4. Dominio Comercial: Solicitudes, Órdenes y Estados de Pago

- [ ] 4.1 Implementar endpoints de creación de solicitudes de retiro (spot y contrato) con validación Zod.
- [ ] 4.2 Implementar flujo de revisión y aprobación comercial emitiendo Orden de Servicio con folio inmutable.
- [ ] 4.3 Implementar servicio de corte y generación de `EstadoDePago` periódico (quincenal/mensual) agrupando múltiples órdenes de servicio.
- [ ] 4.4 Implementar validación de Orden de Compra (OC) obligatoria para clientes contractuales antes de habilitar para facturación.

## 5. Inspecciones de Flota, Fotos 360° y Autocontrol en Ruta

- [ ] 5.1 Implementar endpoint para registro del checklist preoperacional `F-GMT-MAN-004` (80 ítems) con bloqueo automático del camión ante fallas críticas.
- [ ] 5.2 Implementar captura y validación obligatoria de las **4 fotos del camión** (Frontal, Lateral Izq, Trasera, Lateral Der) en Salida de Planta Zion.
- [ ] 5.3 Implementar módulo de **Autochecklist Diario de Ruta** para viajes fuera de Santiago con transmisión de estado y alertas a panel de Santiago.
- [ ] 5.4 Implementar endpoint para checklist de retorno vehicular a Planta Zion con las **4 fotos finales** y servicio de comparativa visual Salida vs. Retorno.

## 6. Motor de Jornadas y Modos de Enrutamiento

- [ ] 6.1 Implementar planificación de jornadas con selector de modalidad: `LOCAL_SANTIAGO` vs. `VIAJE_INTERREGIONAL`.
- [ ] 6.2 En modalidad local, imponer la invariante física estricta que bloquee retiros consecutivos sin descarga intermedia en destino.
- [ ] 6.3 En modalidad interregional, permitir la programación de traslados y servicios consecutivos en la zona de campaña.

## 7. Terreno en Tablet Android: Llegada, Firmas y Fotos de Faena/EPP

- [ ] 7.1 Implementar botón de `Marcar Llegada` en tablet con registro de hora exacta y coordenadas.
- [ ] 7.2 Implementar canvas táctil para firma digital de la **Orden de Trabajo** por el cliente autorizando el inicio de labores.
- [ ] 7.3 Implementar captura y subida obligatoria de **fotografías del trabajo en proceso** y del uso de **EPP de los operarios** inmediatamente después de firmada la OT.
- [ ] 7.4 Implementar captura de foto de Guía de Despacho física entregada por el cliente.
- [ ] 7.5 Implementar canvas táctil para firma de acta de recepción (conforme, con observaciones o constancia explícita de negativa de firma).

## 8. Destino: Ventanilla Única y Certificación SIDREP

- [ ] 8.1 Implementar conector/descarga del documento oficial SIDREP emitido por el generador desde Ventanilla Única.
- [ ] 8.2 Implementar captura con cámara de la tablet del SIDREP sellado y timbrado por la romana de la planta de destino junto al ticket de pesaje.
- [ ] 8.3 Validar que el ciclo de transporte no pueda cerrarse sin la evidencia fotográfica del timbre de romana en el SIDREP.

## 9. Expediente Digital Zero-Paper y Descarga ZIP

- [ ] 9.1 Implementar `FileStoragePort` con adaptador a volumen persistente en VPS.
- [ ] 9.2 Implementar indexación en tiempo real de todos los archivos y fotos subidos durante la atención.
- [ ] 9.3 Implementar empaquetador dinámico en archivo ZIP estructurado en carpetas (`/documentos`, `/fotos_camion`, `/fotos_faena`) para descarga del cliente o auditoría.

## 10. Frontend React con SATEM Design System y Cultura Zion

- [ ] 10.1 Inyectar tokens oficiales SATEM (Dark Mode `#0f172a`, acento `#00a896`, Outfit/Inter) en `src/index.css`.
- [ ] 10.2 Construir layout para tablet de conductores con ergonomía táctil (botones ≥ 38px, asistente paso a paso con cámara integrada).
- [ ] 10.3 Construir interfaz de Backoffice para Operaciones (planificación de jornadas, mapa de hitos, revisión de checklists y visor comparativo 360°).
- [ ] 10.4 Construir interfaz de Gestión Comercial (aprobación de solicitudes, generación de Estados de Pago periódicos y control de OC).
- [ ] 10.5 Construir Portal de Clientes con consulta de solicitudes, tracking de hitos y descarga de Estados de Pago con paquete ZIP.

## 11. Despliegue en VPS con EasyPanel y Validación E2E

- [ ] 11.1 Crear `Dockerfile` optimizado y `docker-compose.yml` con volúmenes persistentes para MySQL y `/uploads`.
- [ ] 11.2 Configurar plantilla y variables de entorno en EasyPanel.
- [ ] 11.3 Ejecutar validación end-to-end simulando el ciclo completo en tablet: Checklist F-GMT-MAN-004 + 4 fotos salida -> Salida -> Llegada cliente -> Firma OT -> Fotos Faena/EPP -> Firma Recepción -> Destino (SIDREP sellado + Ticket romana) -> Retorno + 4 fotos llegada.
