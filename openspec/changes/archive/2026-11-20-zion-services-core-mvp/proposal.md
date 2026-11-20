# Proposal: Zion Services — Plataforma CORE & Operaciones MVP (Actualizado v3)

## Why

Zion Services gestiona el retiro y transporte de residuos y materiales peligrosos mediante camiones cisterna con equipos de hidrojet y succión. La operación actual depende de carpetas de papel que se escanean días después de terminado el servicio, canales informales como WhatsApp y falta de evidencia gráfica en terreno.

Se requiere digitalizar y estructurar integralmente el ciclo de vida de la atención: tablets Android en terreno para conductores, registro fotográfico 360° del camión (4 ángulos), inspecciones diferenciadas (Planta Zion vs. Autochecklist en ruta para viajes fuera de Santiago), registro estricto de hitos en faena (llegada, firma previa de inicio por el cliente, evidencia fotográfica de faena y EPPs), descarga de SIDREP oficial vía Ventanilla Única y consolidación de Estados de Pago periódicos, garantizando la Excelencia Operativa y la Seguridad que exige el Manifiesto de Zion.

## What Changes

### Capacidades Nuevas y Refinadas
- **Inspección Bipolar con Registro Fotográfico 360° y Autocontrol en Ruta (`fleet-inspection`)**:
  - **Salida de Planta Zion**: Checklist `F-GMT-MAN-004` (80 ítems) presencial (Conductor + Supervisor) + **4 fotografías obligatorias** (Frontal, Lateral Izquierda, Trasera, Lateral Derecha). Bloqueo automático ante fallas críticas.
  - **Viajes Fuera de Santiago**: Autochecklist diario de ruta en tablet (frenos, luces, estanque) con supervisión y alertas remotas en el panel de Santiago.
  - **Retorno a Planta Zion**: Checklist de retorno vehicular presencial + **4 fotografías de cierre** para comparativa visual de integridad del camión y control de inventario/percances.
- **Flujo de Faena con Evidencia de Seguridad y EPP (`transport-cycle`)**:
  - Registro de hora exacta de llegada a la dirección del cliente.
  - Firma en tablet de la **Orden de Trabajo** por el cliente autorizando el inicio de faena.
  - Captura y carga inmediata de **fotografías del trabajo en proceso** y del uso obligatorio de implementos de seguridad/EPP por los operarios.
  - Firma final de recepción (conforme, con observaciones o rechazo justificado).
- **Enrutamiento por Modalidad: Local Santiago vs. Viaje Interregional (`journey-routing`)**:
  - `LOCAL_SANTIAGO`: Imposición estricta de la invariante física: *Retiro Cliente -> Destino/Descarga/Sello SIDREP -> Siguiente Retiro*.
  - `VIAJE_INTERREGIONAL`: Permite traslados y servicios consecutivos en la zona durante la campaña regional, coordinando la descarga en planta autorizada de destino según la logística regional.
- **Destino y Certificación SIDREP (`destination-weighing`)**:
  - Descarga inicial de la Declaración SIDREP emitida por el generador desde Ventanilla Única.
  - En planta de destino autorizada se descarga el residuo y el conductor fotografía el SIDREP sellado por la romana de destino y el ticket de pesaje emitido por la planta.
- **Expediente Digital Zero-Paper y Descarga ZIP (`document-dossier`)**: Compilación progresiva en tiempo real de todos los documentos, actas y fotos (360° camión + fotos de trabajo/EPP + guías + SIDREP sellado).
- **Consolidación de Estados de Pago y Portal de Clientes (`client-portal`)**: Corte quincenal o mensual de órdenes de servicio en un único Estado de Pago (EDP) y validación de Orden de Compra (OC).

## Capabilities

### New Capabilities
- `fleet-inspection`: Checklist preoperacional `F-GMT-MAN-004`, 4 fotos 360° en salida y retorno, y autochecklist diario en ruta para viajes fuera de Santiago.
- `transport-cycle`: Hito de llegada, firma de Orden de Trabajo, fotos de faena y EPPs, y acta de recepción final.
- `journey-routing`: Enrutamiento diferenciado (local con descarga obligatoria intermedia vs. viaje interregional con traslados consecutivos).
- `destination-weighing`: Integración Ventanilla Única y captura de certificación/sello de romana de destino.
- `service-requests`: Catálogo de servicios, contratos y solicitudes formales.
- `service-orders`: Emisión de Órdenes de Servicio y trazabilidad.
- `document-dossier`: Expediente digital unificado y empaquetado ZIP.
- `client-portal`: Portal de clientes, seguimiento por hitos y gestión de Estados de Pago.

### Modified Capabilities
*(Ninguna)*

## Impact
- **Tablets Android**: Flujo móvil estructurado en pasos secuenciales: Checklist -> Fotos 360° -> Salida -> Llegada cliente -> Firma Orden de Trabajo -> Fotos Faena/EPP -> Firma Recepción -> Destino -> Retorno.
- **Evidencia Gráfica**: Mayor resguardo jurídico y de seguridad ante inspecciones laborales, ambientales o siniestros.
