# Design: Arquitectura Técnica y Estrategia de Implementación Zion Services

## Context

Zion Services requiere una plataforma robusta y modular para coordinar el retiro, transporte y disposición final de residuos peligrosos. Las operaciones actuales carecen de trazabilidad digitalizada centralizada, exponiendo a la empresa a riesgos de cumplimiento ambiental, demoras en facturación y fallas en la coordinación logística.

La plataforma se despliega inicialmente en un VPS administrado con EasyPanel y Docker, utilizando MySQL 8 como base de datos relacional y un backend en Node.js/TypeScript junto a un frontend en React/TypeScript con SATEM Design System.

## Goals / Non-Goals

### Goals
- Diseñar un **monolito modular** en Node.js/TypeScript con límites de dominio claros que permita evolucionar sin acoplamiento.
- Garantizar a nivel de backend la **invariante física estricta**: un camión nunca puede realizar dos retiros consecutivos sin haber completado pesaje y descarga en planta de destino intermedia.
- Proveer una **abstracción de almacenamiento de archivos** desacoplada del filesystem local del contenedor (volumen persistente en VPS con interfaz lista para migrar a S3/MinIO/Object Storage).
- Desacoplar las máquinas de estado en 5 dimensiones independientes: Solicitud, Operación, Ciclo de Transporte, Documentación y Facturación.
- Proveer una interfaz móvil responsive para conductores optimizada para registro ágil de hitos e inspecciones en terreno.
- Garantizar estricto **Tenant Isolation** en el portal de clientes para prevenir acceso cruzado de datos.
- Soportar auditoría completa e inmutable en pesajes, transiciones de estado y modificaciones documentales.

### Non-Goals (Exclusiones explícitas para el MVP)
- No implementar microservicios ni orquestadores distribuidos (Kubernetes/Kafka).
- No implementar tracking continuo por GPS en tiempo real por telemetría satelital (el seguimiento es por hitos operativos discretos).
- No emitir directamente facturación electrónica ante el SII ni procesar pasarelas de pago online en el MVP (la integración con facturación y ERP queda para fases posteriores).
- No asumir que Zion emite por sí misma las certificaciones oficiales de SIDREP; solo gestiona y vincula sus antecedentes.
- No utilizar servicios propietarios de nube pública como AWS (S3, Lambda, RDS) como dependencia inicial obligatoria.

## Decisions

### 1. Arquitectura de Dominio (Monolito Modular)
Se organiza el backend bajo una arquitectura modular limpia por capas:
- `routes/`: Enrutamiento HTTP puro, sin lógica.
- `controllers/`: Recepción, orquestación y respuesta HTTP.
- `services/`: Lógica de negocio e invariantes de dominio.
- `repositories/`: Acceso a base de datos encapsulado con Prisma ORM.
- `schemas/`: Validación de entrada y sanitización con Zod.
- `types/`: Interfaces y contratos compartidos en TypeScript estricto.

Límites de dominio definidos:
- `identity`: Auth, usuarios, roles (RBAC) y auditoría.
- `commercial`: Clientes (spot y contratos), solicitudes y órdenes de servicio.
- `operations`: Vehículos, conductores, checklists de inspección, jornadas y hojas de ruta.
- `transport`: Tramos de ruta, hitos en faena, actas de recepción con firma/observación.
- `destination`: Visitas a plantas autorizadas, pesajes de entrada/salida y antecedentes SIDREP.
- `dossier`: Catálogo documental, control de versiones, almacenamiento y generación de ZIP.

### 2. Motor de Validación de la Invariante Física
Para asegurar que un camión no encadene retiros sin descarga intermedia:
- Cada `HojaDeRuta` se compone de una secuencia ordenada de `TramoRuta` y `HitoOperativo`.
- Antes de autorizar el cambio de estado a `EN_RUTA_A_CLIENTE` o `LLEGADA_A_CLIENTE` para una atención $N$, el `JourneyValidationService` consulta el estado de la atención $N-1$:
  $$\text{Estado}(N-1) = \text{DESCARGA\_COMPLETA\_DESTINO}$$
- Si la atención previa no ha registrado `pesoEntrada`, `pesoSalida` y `actaDescarga`, el backend bloquea la transición arrojando un error de regla de negocio inmutable.

### 3. Modelo de Pesajes Dobles Inmutables
En planta de destino, la cantidad descargada se computa como:
$$\text{Cantidad Descargada} = \text{Peso de Entrada (Bruto)} - \text{Peso de Salida (Tara)}$$
- Ambos valores se almacenan como columnas numéricas de alta precisión (`Decimal(10,2)` en MySQL) acompañados de:
  - `unidad`: `KG` o `TON`
  - `fechaHoraPesajeEntrada` y `fechaHoraPesajeSalida`
  - `ticketEntradaUrl` y `ticketSalidaUrl` (imágenes de comprobantes de báscula)
  - `operadorPlantaDestino` y `observaciones`
- Se prohíbe el guardado de pesajes calculados sin los datos brutos que los originan.

### 4. Abstracción de Almacenamiento Documental (FileStoragePort)
Se define una interfaz agnóstica de almacenamiento:
```typescript
interface FileStoragePort {
  save(file: Buffer, path: string, metadata: FileMetadata): Promise<string>;
  getStream(path: string): Promise<ReadableStream>;
  delete(path: string): Promise<void>;
  createZipArchive(paths: string[]): Promise<ReadableStream>;
}
```
- Implementación inicial: `LocalDiskStorageAdapter` que escribe en el volumen Docker montado del VPS (`/var/data/zion-uploads`).
- Migración futura sin impacto: implementación alternativa `S3CompatibleStorageAdapter` (MinIO, Cloudflare R2 o S3) mediante simple inyección de dependencias por configuración de entorno.

### 5. Máquinas de Estados Desacopladas
Se reemplaza el concepto de "estado global de atención" por estados de ciclo de vida ortogonales:
- `EstadoSolicitud`: `BORRADOR` -> `ENVIADA` -> `EN_REVISION` -> `APROBADA` -> `RECHAZADA`
- `EstadoOrdenServicio`: `EMITIDA` -> `PLANIFICADA` -> `EN_EJECUCION` -> `EJECUTADA` -> `LIQUIDADA` -> `CERRADA`
- `EstadoCicloTransporte`: `PENDIENTE` -> `EN_RUTA_CLIENTE` -> `EN_FAENA` -> `CARGADO` -> `EN_RUTA_DESTINO` -> `EN_DESTINO_PESAJE_1` -> `DESCARGADO_PESAJE_2` -> `RETORNO_A_PLANTA` -> `FINALIZADO`
- `EstadoExpediente`: `INCOMPLETO` -> `DOCUMENTOS_OPERACIONALES_OK` -> `VALIDADO_POR_OPERACIONES` -> `LISTO_PARA_FACTURAR` -> `AUDITADO`
- `EstadoComercial`: `PENDIENTE_LIQUIDACION` -> `ESTADO_PAGO_EMITIDO` -> `ESPERANDO_OC` -> `HABILITADO_FACTURAR` -> `FACTURADO` -> `PAGADO`

Cada cambio de estado registra `estadoAnterior`, `estadoNuevo`, `usuarioId`, `timestamp`, `origen` y `observacion`.

### 6. Despliegue en VPS + EasyPanel + Docker
Estructura de contenedores:
- `zion-frontend`: Contenedor Nginx sirviendo la SPA compilada en React con gzip y headers de seguridad.
- `zion-backend`: Contenedor Node.js 22 Alpine ejecutando la API Express en TypeScript.
- `zion-database`: Contenedor MySQL 8 oficial con volumen persistente mapeado en `/var/lib/mysql`.
- Volúmenes montados:
  - `mysql_data`: datos de base de datos con respaldo diario automatizado.
  - `uploads_data`: almacenamiento persistente de expedientes y comprobantes.

## Modelo Conceptual de Entidades

```
EmpresaCliente (1) ───< (N) SucursalFaena (1) ───< (N) SolicitudServicio (1) ─── (1) OrdenServicio
      │                                                                                  │ (1)
      │ (1)                                                                              │
      └───< (N) ContratoCliente                                                          ├─── (1) ExpedienteDocumental (1) ───< (N) Documento
                                                                                         │                                            │ (1)
Conductor (1) ───┐                                                                       │                                            └───< (N) VersionDocumento
                 ├───< (N) Jornada (1) ─── (1) HojaDeRuta (1) ───< (N) TramoRuta ────────┤
Vehiculo (1) ────┘            │                                                          ├─── (1) CicloTransporte (1) ─── (1) ActaRecepcion
                              └─── (1) InspeccionPreoperacional (1) ──< (N) ItemChecklist  │
                                                                                         └─── (1) VisitaDestino (1) ─── (1) RegistroPesaje
                                                                                                      │
                                                                                                      └─── (1) AntecedenteSIDREP
```

## Risks / Trade-offs

- **Riesgo: Conectividad intermitente en faenas mineras o rurales.**
  - *Mitigación MVP*: La PWA del conductor implementa guardado temporal en `localStorage`/`IndexedDB` para registrar timestamps y firmas, sincronizando con el backend al recuperar señal.
- **Riesgo: Crecimiento exponencial del volumen de archivos y tickets de pesaje en el VPS.**
  - *Mitigación*: Validación estricta de peso máximo (fotos comprimidas a máximo 2 MB en cliente antes de subida), límite de cuota en volumen y monitoreo de espacio en EasyPanel con backup diario a almacenamiento externo.
- **Riesgo: Resistencia de conductores al uso del checklist digital.**
  - *Mitigación*: Interfaz móvil táctil con SATEM Design System, botones grandes (≥ 38px) y preguntas de respuesta binaria rápida con soporte de toma de fotografía directa.

## Open Questions (Preguntas Abiertas Priorizadas para el Dueño)

1. **Protocolo y Emisión SIDREP**: ¿En qué momento exacto y quién emite formalmente el documento SIDREP (el cliente generador, Zion como transportista o la planta destinataria)? ¿Requiere firma electrónica avanzada en plataforma gubernamental externa o basta con adjuntar el comprobante emitido?
2. **Criterios de Agrupación para Facturación**: ¿Se factura cada Orden de Servicio de forma individual, o se agrupan quincenal/mensualmente por cliente en un único Estado de Pago consolidado?
3. **Flujo de Camiones Fuera de Santiago**: Cuando un camión viaja a regiones y pernocta fuera sin regresar a la Planta Zion, ¿cómo se valida el inicio y término de la jornada? ¿Se registra una "pernoctación en ruta" manteniendo la jornada abierta o se abren jornadas sucesivas con origen en faena/hotel?
4. **Política de Manejo de Residuos Discrepantes**: Si el peso o el residuo retirado en faena no coincide con lo declarado originalmente en la solicitud, ¿cuál es el margen de tolerancia permitido antes de exigir una autorización comercial especial?
