# Tasks: mvp-easypanel-persistence-and-storage

## 1. Infraestructura de Almacenamiento Local y Pipeline Base64 (`backend-node`)

- [ ] 1.1 Ampliar `FileStoragePort` y `LocalDiskStorageAdapter` en `backend/src/services/file-storage.service.ts` incorporando el método `guardarBase64(dataUrl: string, subDirectorio: string, prefijo: string): Promise<{ rutaFisica: string; urlRelativa: string; pesoBytes: number; mimeType: string }>` con sanitización de rutas contra Path Traversal, creación recursiva de directorios y generación de nombres únicos (UUID/timestamp). Verificar que retorne URLs relativas cortas (`/uploads/...`) menores a 80 caracteres.
- [ ] 1.2 Configurar el servicio estático seguro de archivos en `backend/src/app.ts` montando `express.static` en la ruta `/uploads` apuntando a `STORAGE_PATH` (o `uploads/` local por defecto) con opciones de seguridad (`dotfiles: 'ignore'`, `index: false`, encabezados `X-Content-Type-Options: nosniff` y caché). Verificar mediante solicitud HTTP `GET /uploads/...` que los archivos se sirvan correctamente.
- [ ] 1.3 Crear suite de pruebas unitarias en `backend/test/services/file-storage.service.spec.ts` validando decodificación de Data URLs PNG/JPEG, escritura en disco, rechazo de payloads corruptos, bloqueo de secuencias de escape `../` (Path Traversal) y cálculo correcto de URLs relativas. Verificar con `npm test backend/test/services/file-storage.service.spec.ts`.

## 2. Persistencia de Inspección de Salida F-GMT-MAN-004 y Retorno a Planta (`backend-node`)

- [ ] 2.1 Refactorizar `InspectionService` en `backend/src/services/inspection.service.ts` para conectar con Prisma:
  - Crear registro en `InspeccionSalida_F_GMT` con kilometraje, horómetro, items de checklist (JSON) y estado (`CONFORME` o `NO_CONFORME`).
  - Procesar el lote de fotografías perimetrales 360° (`FRONTAL`, `LATERAL_IZQUIERDA`, `TRASERA`, `LATERAL_DERECHA`) guardándolas físicamente en `${STORAGE_PATH}/inspecciones/salida/` vía `LocalDiskStorageAdapter.guardarBase64` y persistiendo los registros correspondientes en `FotoInspeccion` vinculados a `inspeccionSalidaId` con su `archivoUrl` relativo corto.
  - Ejecutar `aplicarBloqueoSeguridad` si la inspección resulta bloqueada por falla crítica, actualizando el estado del `Vehiculo` a `DESHABILITADO` y emitiendo el evento de auditoría en MySQL.
- [ ] 2.2 Conectar los endpoints `POST /api/inspecciones/salida` y `POST /api/inspecciones/fotos-360` en `backend/src/routes/inspeccion.routes.ts` a los nuevos métodos de `InspectionService`, eliminando respuestas mock y garantizando transaccionalidad mediante `prisma.$transaction`. Verificar con respuestas HTTP 201 y validación de inserción en MySQL.
- [ ] 2.3 Implementar la persistencia de `POST /api/inspecciones/retorno` en `backend/src/routes/inspeccion.routes.ts` guardando el registro en `InspeccionRetornoPlanta` (kilometraje final, horómetro final, estado general, novedades) y guardando físicamente las fotografías de retorno asociadas en `FotoInspeccion` (`inspeccionRetornoId`). Verificar inserción en base de datos.
- [ ] 2.4 Crear pruebas de integración en `backend/test/routes/inspeccion.routes.spec.ts` que simulen el envío de checklists y fotos en Base64, comprobando que se guarden los archivos en disco, se creen las filas en MySQL y ninguna URL desborde el límite `VARCHAR(191)`. Verificar con `npm test backend/test/routes/inspeccion.routes.spec.ts`.

## 3. Persistencia del Ciclo de Transporte y Terreno (`backend-node`)

- [ ] 3.1 Refactorizar `TransportCycleService` en `backend/src/services/transport-cycle.service.ts` transformando los métodos en operaciones asíncronas conectadas a Prisma:
  - `registrarLlegada`: actualizar `CicloTransporte` con `horaLlegadaFaena = horaLlegada`, estado `EN_FAENA`, y registrar coordenadas si se proporcionan.
  - `autorizarInicioFaena`: decodificar firma táctil (SVG/PNG Data URL) guardándola en `${STORAGE_PATH}/ciclo-transporte/firmas/`, crear registro en `AutorizacionFaena` con `nombreCliente`, `rutCliente`, `firmaClienteSvg` y actualizar estado a `FAENA_AUTORIZADA`.
  - `registrarFotoFaena`: decodificar imagen en `${STORAGE_PATH}/ciclo-transporte/fotos/`, crear registro en `FotoFaenaEPP` con `archivoUrl` relativo e indexar simultáneamente en `ExpedienteDocumental` (`DocumentoExpediente` con categoría `FOTO_FAENA_PROCESO` o `FOTO_EPP_SEGURIDAD`).
  - `finalizarRecepcion`: decodificar firma del acta y/o foto de respaldo si existen guardándolas en disco, crear registro en `ActaRecepcion` (`CONFORME`, `CON_OBSERVACIONES`, `SIN_FIRMA_RECHAZO`), actualizar estado de `CicloTransporte` a `RETIRO_COMPLETADO` y sincronizar estado de `OrdenServicio` en una transacción atómica `prisma.$transaction`.
- [ ] 3.2 Actualizar `backend/src/routes/ciclo-transporte.routes.ts` para invocar los nuevos métodos asíncronos transaccionales de `TransportCycleService`, eliminando respuestas mock y asegurando control de errores robusto. Verificar mediante llamadas a los endpoints.
- [ ] 3.3 Crear suite de pruebas de integración en `backend/test/routes/ciclo-transporte.routes.spec.ts` validando el ciclo completo de terreno (llegada -> autorización faena -> fotos EPP -> acta de recepción), comprobando que los archivos físicos existan en el sistema de archivos y las entidades queden correctamente asociadas en MySQL. Verificar con `npm test backend/test/routes/ciclo-transporte.routes.spec.ts`.

## 4. Persistencia Relacional de Tracking y Eliminación de Mocks en Memoria (`backend-node`)

- [ ] 4.1 Erradicar definitivamente las variables en memoria `TELEMETRIA_STORE` y `EVIDENCIAS_STORE` de `backend/src/routes/tracking.routes.ts`.
- [ ] 4.2 Actualizar el endpoint `POST /api/jornadas/:id/geolocalizacion` para persistir cada punto de telemetría en la tabla `registros_telemetria_gps` (`RegistroTelemetriaGPS`) con `latitud`, `longitud`, `precisionMts`, `jornadaId`, `ordenServicioId` y timestamp.
- [ ] 4.3 Actualizar el endpoint `GET /api/clientes/ordenes/:id/tracking` y `GET /api/operaciones/flota-en-vivo` para obtener la última posición registrada mediante consulta Prisma a `RegistroTelemetriaGPS` (`orderBy: { timestamp: 'desc' }, take: 1`), asociando datos de vehículo y conductor desde las relaciones existentes y aplicando filtro estricto de Tenant Isolation para rol `CLIENTE`.
- [ ] 4.4 Actualizar el endpoint `GET /api/clientes/ordenes/:id/expediente-en-vivo` para consultar en vivo las evidencias físicas registradas en `DocumentoExpediente`, `FotoInspeccion` y `FotoFaenaEPP` asociadas a la orden, retornando las URLs relativas reales servidas por el backend.
- [ ] 4.5 Crear pruebas de integración en `backend/test/routes/tracking.routes.spec.ts` validando el registro y lectura de telemetría desde MySQL, reinicio simulado del servidor sin pérdida de datos, y cumplimiento estricto de Tenant Isolation. Verificar con `npm test backend/test/routes/tracking.routes.spec.ts`.

## 5. Streaming Seguro de Expedientes y Archivos Físicos (`backend-node`)

- [ ] 5.1 Revisar y ajustar `backend/src/routes/expediente.routes.ts` asegurando que la resolución de rutas de almacenamiento convierta URLs relativas (`/uploads/...`) a rutas absolutas bajo `STORAGE_PATH`, verificando físicamente la existencia del archivo mediante `fs.existsSync(filePath)` antes de agregarlo al archivo ZIP o transmitirlo individualmente, omitiendo de forma segura archivos ausentes y prohibiendo la generación de archivos simulados `.txt`.
- [ ] 5.2 Crear pruebas de integración en `backend/test/routes/expediente.routes.spec.ts` validando la descarga individual en streaming y la descarga consolidada en ZIP con archivos físicos reales en disco. Verificar con `npm test backend/test/routes/expediente.routes.spec.ts`.

## 6. Verificación de Modelos y Datos Base (`database-prisma`)

- [ ] 6.1 Ejecutar `npx prisma validate` en `backend/` para corroborar la validez del esquema Prisma existente y confirmar que no se requieran migraciones destructivas.
- [ ] 6.2 Verificar y actualizar `backend/prisma/seed.ts` si se requiere para garantizar que las órdenes de prueba contengan ciclos de transporte inicializados (`CicloTransporte`) listos para probar el ciclo de terreno y tracking sin errores de clave foránea. Verificar ejecutando `npm run seed`.

## 7. Verificación de Integración Frontend (`frontend-react`)

- [ ] 7.1 Auditar los componentes de cliente y tablet (`TabletConductorView.tsx`, `ClientPortalView.tsx`, `TrackingMapView.tsx`, `TouchSignaturePad.tsx`) comprobando que los payloads enviados hacia la API coincidan con los contratos de las rutas actualizadas y que las imágenes se carguen desde las URLs relativas estáticas servidas por `/uploads/`.
- [ ] 7.2 Verificar que no existan llamadas con URLs hardcodeadas a `http://localhost:3000` y que todo el tráfico fluya a través del cliente configurado con `VITE_API_URL`.

## 8. Seguridad, Aislamiento y Preparación DevOps para EasyPanel (`security-reviewer`, `tester`, `devops`)

- [ ] 8.1 Auditar seguridad y aislamiento multi-tenant (`security-reviewer`): comprobar que ningún cliente pueda consultar coordenadas de telemetría, evidencias fotográficas ni descargar archivos de otra empresa.
- [ ] 8.2 Auditar sanitización contra Path Traversal en `file-storage.service.ts` y acceso a `/uploads` (`security-reviewer`), comprobando el bloqueo de rutas maliciosas con `..`.
- [ ] 8.3 Ejecutar la suite completa de pruebas unitarias y de integración (`tester`): ejecutar `npm test` en `backend/` asegurando 100% de tests pasando.
- [ ] 8.4 Ejecutar compilación de producción en backend y frontend (`devops`): ejecutar `npm run build` en la raíz verificando compilación limpia en TypeScript sin errores de tipos.
- [ ] 8.5 Validar configuración de despliegue en EasyPanel (`devops`): verificar que `docker-compose.yml` y `Dockerfile` tengan configurada la variable `STORAGE_PATH=/app/uploads` y el volumen montado `uploads_data:/app/uploads`.

## Workflow follow-up

- Ejecutar `openspec-apply-change mvp-easypanel-persistence-and-storage` para orquestar la implementación guiada por OpenSpec con los subagentes ejecutores.
- Archivar el cambio con `openspec-archive-change` una vez implementadas, probadas y validadas todas las tareas.
