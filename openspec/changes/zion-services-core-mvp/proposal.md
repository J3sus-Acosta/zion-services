# Proposal: Zion Services — Plataforma CORE & Operaciones MVP (Actualizado)

## Why

Zion Services gestiona el retiro y transporte de residuos y materiales peligrosos desde instalaciones de clientes generadores hacia plantas de destino autorizadas. Actualmente, el flujo depende de múltiples documentos físicos en papel (Checklist F-GMT-MAN-004, Orden de Servicio física, Declaración SIDREP en papel, Guía de Despacho electrónica impresa, Comprobante de pesaje de destino) y de canales informales como WhatsApp. Esto genera pérdida de trazabilidad, retrasos en la liquidación comercial porque los papeles tardan días en llegar a oficina para ser escaneados, y riesgo operacional.

Se requiere digitalizar y estructurar integralmente el ciclo de vida del servicio: desde la solicitud del cliente hasta la liquidación en Estados de Pago consolidados, dotando a los conductores de tablets Android para operar sin papel en terreno (captura con cámara de documentos timbrados, firma digital de inicio de faena y de recepción en pantalla), control de camiones con checklist de salida y retorno a planta, y observando estrictamente los principios de Excelencia Operativa, Ética e Integridad del Manifiesto de Zion.

## What Changes

Esta propuesta actualiza la arquitectura y el alcance funcional del **MVP de Zion Services**, alineándolo con las operaciones reales observadas en la documentación oficial de la empresa:

### Capacidades Nuevas y Refinadas
- **Solicitudes de Servicio Estructuradas (`service-requests`)**: Formalización de solicitudes de retiro para clientes contractuales y spot, reemplazando WhatsApp por el portal web y notificaciones por correo electrónico.
- **Órdenes de Servicio y Autorización de Faena (`service-orders`)**: Emisión de Orden de Servicio formal y digitalización de la autorización de inicio de trabajo (firma del cliente en tablet antes de comenzar la faena).
- **Inspección de Flota Bipolar (`fleet-inspection`)**: 
  - **Checklist Preoperacional de Salida** basado en el formato corporativo oficial `F-GMT-MAN-004` (Partes mecánicas, Cabina, Equipamiento del estanque hidrojet/vacío y Documentos/Señalética reglamentaria) con bloqueo por fallas críticas.
  - **Checklist de Retorno a Planta** para validar integridad mecánica, equipos, faltantes o percances tras culminar la jornada local o el viaje fuera de Santiago.
- **Planificación de Jornadas con Invariante Operacional (`journey-routing`)**: Secuenciación de rutas locales e interregionales imponiendo la regla física ineludible: `Planta Zion -> Retiro A -> Destino/Descarga/Sello SIDREP -> [Siguiente Retiro] -> Planta Zion`.
- **Ejecución en Terreno con Tablet Android (`transport-cycle`)**: Flujo sin papel en dispositivo móvil táctil: captura de firma del cliente para inicio de labores, registro de hitos en faena, firma de recepción conforme/desconforme o constancia de rechazo, y captura inmediata con cámara de Guías de Despacho y documentos emitidos en terreno.
- **Destino y Certificación SIDREP con Ventanilla Única (`destination-weighing`)**: 
  - Integración/descarga del documento SIDREP emitido por el generador desde Ventanilla Única.
  - El conductor no calcula pesajes de camión manualmente: en planta de destino se descarga y la planta certifica, firma y sella el SIDREP y emite ticket de pesaje.
  - El conductor captura el SIDREP timbrado/sellado y el comprobante de pesaje usando la cámara de la tablet.
- **Expediente Digital Progresivo Zero-Paper (`document-dossier`)**: Carga en tiempo real de cada documento durante la atención (sin escaneo tardío en oficina), metadatos, clasificación, empaquetado ZIP y almacenamiento desacoplado (`FileStoragePort`).
- **Estados de Pago Consolidados y Portal de Clientes (`client-portal`)**: Agrupación quincenal o mensual de órdenes de servicio por cliente en un único Estado de Pago (EDP), seguimiento de hitos operacionales y aislamiento de datos (Tenant Isolation).

## Capabilities

### New Capabilities
- `service-requests`: Gestión de clientes, contratos y ciclo de vida de solicitudes de retiro.
- `service-orders`: Aprobación comercial, órdenes de servicio digitales y autorización de faena en terreno.
- `fleet-inspection`: Inspección preoperacional de salida (`F-GMT-MAN-004`) e inspección de retorno a planta con bloqueo por fallas críticas.
- `journey-routing`: Programación de jornadas locales e interregionales con validación estricta de descarga previa obligatoria antes de un nuevo retiro.
- `transport-cycle`: Aplicación para tablet Android, firma digital en pantalla (inicio y recepción), y captura en vivo con cámara.
- `destination-weighing`: Gestión documental de SIDREP (Ventanilla Única), captura de timbre/sello de destino y ticket de pesaje certificado.
- `document-dossier`: Expediente digital alimentado en tiempo real en terreno, descarga ZIP y auditoría de documentos.
- `client-portal`: Portal para clientes, seguimiento por hitos y consulta de Estados de Pago periódicos consolidados.

### Modified Capabilities
*(Ninguna)*

## Impact

- **Dispositivos de Conductor**: Tablets Android dedicadas, con interfaz responsive táctil SATEM Design System optimizada para firma táctil en pantalla y uso de la API de cámara HTML5/PWA.
- **Eliminación de Procesos Manuales**: Se elimina la digitación manual de pesajes brutos por parte de Zion y el escaneo tardío de carpetas en oficina; los documentos entran digitalizados desde el momento exacto en que se generan.
- **Integración Regulatoria**: Conexión/descarga con Ventanilla Única para antecedentes SIDREP emitidos por el generador.
- **Modelo de Liquidación**: Se incorpora la entidad `EstadoDePago` consolidando múltiples órdenes de servicio por cliente (quincenal o mensual).
- **Cultura Zion**: Apego a los manifiestos de *Excelencia Operativa*, *Ética e Integridad* y *Adaptabilidad Resiliente*.
