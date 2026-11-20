# Proposal: Zion Services — Plataforma CORE & Operaciones MVP

## Why

Zion Services gestiona el retiro y transporte de residuos y materiales peligrosos desde instalaciones de clientes hacia plantas de destino autorizado. Actualmente, la operación depende de canales informales (principalmente WhatsApp), registros en papel para inspecciones vehiculares y hojas de ruta, y un seguimiento fragmentado que dificulta la trazabilidad en tiempo real, el control de expedientes documentales y la liquidación comercial oportuna.

Se requiere digitalizar y estructurar integralmente el ciclo de vida del servicio: desde la solicitud del cliente hasta el cierre documental y comercial, garantizando el cumplimiento estricto de las regulaciones ambientales y de seguridad operativa, con especial énfasis en la invariante física de no transportar residuos acumulados de múltiples clientes sin descarga intermedia.

## What Changes

Esta propuesta establece la arquitectura fundacional y el alcance funcional del **MVP de Zion Services**, compuesto por un monolito modular con separación estricta de dominios, backend en Node.js/TypeScript (Express + Prisma + MySQL 8), frontend en React/TypeScript con SATEM Design System, y despliegue en VPS Linux con EasyPanel y Docker.

### Capacidades Nuevas
- **Solicitudes de Servicio Estructuradas (`service-requests`)**: Digitalización de solicitudes para clientes con contrato fijo y clientes spot, reemplazando WhatsApp por canal formal vía portal web y notificaciones por email.
- **Órdenes de Servicio y Aprobación Comercial (`service-orders`)**: Validación comercial de solicitudes, emisión de Órdenes de Servicio (OS) formales y vinculación contractual.
- **Flota e Inspección Preoperacional (`fleet-inspection`)**: Registro de camiones y conductores, ejecución digital de checklist de inspección previa a la salida de planta, con bloqueo automático del despacho ante incumplimientos críticos.
- **Planificación de Jornadas y Rutas con Invariante Operacional (`journey-routing`)**: Planificación de jornadas de trabajo, secuenciación de hojas de ruta y validación a nivel de motor de backend de la regla física estricta: `Planta Zion -> Retiro A -> Destino/Pesaje/Descarga -> [Siguiente Retiro] -> Planta Zion`.
- **Ciclo de Transporte y Ejecución de Retiro (`transport-cycle`)**: Registro móvil de hitos operativos (salida, llegada a cliente, retiro), acta de recepción conforme, observaciones o registro de negativa de firma sin inventar conformidad.
- **Visita a Planta de Destino, Pesajes y SIDREP (`destination-weighing`)**: Registro de pesaje inicial (bruto/entrada), pesaje final (tara/salida), cálculo de cantidad neta descargada preservando siempre los valores originales de pesaje y tickets, y vinculación de antecedentes del Sistema de Declaración y Seguimiento de Residuos Peligrosos (SIDREP).
- **Expediente Digital Unificado y Descarga ZIP (`document-dossier`)**: Repositorio centralizado de documentos por atención (OS, checklist, guías, hojas de seguridad, tickets de pesaje, recepción conforme, antecedentes SIDREP), control de versiones, metadatos y exportación comprimida en ZIP con permisos granulares.
- **Portal de Clientes y Seguimiento Multi-Estado (`client-portal`)**: Acceso diferenciado para clientes con aislamiento estricto de datos (tenant isolation), seguimiento de estado por hitos (sin GPS continuo en MVP) y descarga de documentación autorizada.
- **Gestión Multi-Estado Desacoplada**: Separación explícita de máquinas de estado independientes para Solicitud, Operación, Ciclo de Transporte, Documentación y Comercial/Facturación.

## Capabilities

### New Capabilities
- `service-requests`: Gestión de clientes (contractuales y spot), catálogo de servicios/residuos y ciclo de vida de solicitudes de atención.
- `service-orders`: Aprobación comercial, reglas de validación y emisión formal de órdenes de servicio vinculadas a contratos.
- `fleet-inspection`: Maestro de vehículos, conductores, plantillas de inspección preoperacional y reglas de bloqueo por fallas críticas de seguridad.
- `journey-routing`: Programación de jornadas, asignación de recursos y secuenciación de hojas de ruta con imposición backend de la invariante física de no retiros consecutivos sin descarga previa en destino.
- `transport-cycle`: Control de tramos de ruta, registro de hitos en terreno, interfaz responsive para conductores y acta de entrega/recepción con manejo explícito de excepciones y firmas.
- `destination-weighing`: Protocolo de ingreso a planta de destino, pesaje de entrada, pesaje de salida, cálculo de residuo neto, almacenamiento inmutable de comprobantes y relación de antecedentes SIDREP.
- `document-dossier`: Abstracción de almacenamiento de archivos en VPS local (migrable a S3/Object Storage en el futuro), metadatos, clasificación, empaquetado ZIP y auditoría documental.
- `client-portal`: Interfaz externa y endpoints autorizados para clientes, respetando estricto control de acceso y visibilidad documental parametrizada.

### Modified Capabilities
*(Ninguna: este es el proyecto fundacional y primer change del repositorio).*

## Impact

- **Código y Arquitectura**: Monolito modular en TypeScript con separación en capas (`routes`, `controllers`, `services`, `repositories`, `schemas/Zod`, `types`).
- **Base de Datos**: MySQL 8 administrada exclusivamente a través de Prisma ORM, con migraciones estructuradas (`prisma migrate dev/deploy`).
- **Frontend**: SPA en React + TypeScript + SATEM Design System (Dark Mode Premium, CSS variables nativas, sin Tailwind ni frameworks pesados).
- **Infraestructura**: EasyPanel sobre VPS, servicios contenerizados con Docker, persistencia en volúmenes montados (datos MySQL y archivos `/uploads`).
- **Seguridad**: Autenticación JWT con HTTP-only cookies, RBAC server-side, rate limiting, validación exhaustiva de payloads con Zod y auditoría de transiciones de estado y pesajes.
