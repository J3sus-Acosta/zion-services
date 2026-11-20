# Design: Arquitectura Técnica y Estrategia de Implementación Zion Services (Actualizado)

## Context

Zion Services gestiona el retiro y transporte de residuos peligrosos mediante camiones equipados con estanques de succión y bombas de hidrojet. La operación actual se basa en carpetas físicas con documentos en papel:
- Checklist de camión en papel (`F-GMT-MAN-004`).
- Declaración de Residuos Peligrosos (SIDREP) emitida por el generador en Ventanilla Única.
- Guía de Despacho electrónica impresa del cliente generador.
- Ticket de pesaje de romana de la planta de destino autorizada.
- Orden de Servicio física de Zion firmada a mano.

El objetivo central de la plataforma es la **digitalización progresiva y eliminación total del papel (Zero-Paper)** mediante tablets Android entregadas a los conductores, donde los clientes firman en pantalla la autorización de inicio de faena y el acta de recepción, y los conductores fotografían inmediatamente los documentos timbrados en destino.

El sistema se basa en los principios del **Manifiesto Zion Services**:
- *Excelencia Operativa*: Procesos estandarizados y sin retrasos de oficina.
- *Ética e Integridad*: Trazabilidad ambiental fidedigna, sin falsas firmas ni alteraciones de documentos.
- *Adaptabilidad Resiliente*: Capacidad de operar en viajes interregionales y tolerar desconexiones temporales en faena.

## Goals / Non-Goals

### Goals
- Proveer una PWA responsive optimizada para tablets con Android OS con soporte de firma táctil y cámara web/móvil.
- Digitalizar el checklist preoperacional corporativo oficial `F-GMT-MAN-004` (80 ítems en 4 categorías: Partes Mecánicas, Cabina, Equipamiento del Estanque y Señalética/Documentos) con bloqueo automático por fallas críticas.
- Implementar un **Checklist de Retorno a Planta** que audite la integridad mecánica, herramientas y faltantes tras culminar la jornada local o el viaje fuera de Santiago.
- Integrar la descarga del documento oficial SIDREP emitido por el generador desde la plataforma de Ventanilla Única ambiental.
- Imponer la **invariante física estricta** en el backend: prohibir dos retiros consecutivos sin visita, descarga y certificación intermedia en planta de destino.
- Eliminar la digitación manual de pesajes de camión por parte de Zion: la planta de destino certifica el residuo timbrando el SIDREP y entregando su ticket de pesaje, los cuales el conductor fotografía en el acto.
- Implementar la entidad `EstadoDePago` (EDP) para consolidar periódicamente (quincenal o mensualmente) múltiples órdenes de servicio de un cliente antes de facturar.
- Almacenar archivos en volumen persistente de EasyPanel/VPS mediante la abstracción `FileStoragePort` y permitir la descarga del expediente consolidado en archivo ZIP.

### Non-Goals
- No implementar balanzas digitales IoT propias de Zion (se adopta la romana certificada de la planta de destino).
- No implementar rastreo satelital GPS continuo por segundo en el MVP (el tracking es por hitos y firmas).
- No emitir facturas electrónicas directamente ante el SII en esta primera fase (el sistema habilita y genera el Estado de Pago con OC para que Facturación emita la factura en su sistema contable).

## Decisions

### 1. Aplicación Tablet Android para Conductores (PWA Táctil)
- **Canvas de Firma Digital**: Componente React con soporte de touch events (`pointerdown`, `pointermove`, `pointerup`) para firma fluida con lápiz stylus o dedo.
  - Firma 1: Autorización de inicio de trabajo por el cliente en faena.
  - Firma 2: Recepción conforme o disconforme con observaciones.
- **Acceso a Cámara Nativa**: Uso de `<input type="file" accept="image/*" capture="environment">` y API MediaDevices para toma directa de fotografías de documentos timbrados (Guía de Despacho, SIDREP sellado por romana de destino, ticket de pesaje de destino).
- **Compresión en Cliente**: Reducción de imágenes a máximo 1600px y compresión WebP/JPEG antes de subir al servidor para optimizar ancho de banda en faena.

### 2. Motor de Inspecciones Bipolares (Salida y Retorno)
Se modelan dos checklists estructurados en el sistema:
1. `InspeccionPreoperacionalSalida` (`F-GMT-MAN-004`):
   - **Partes Mecánicas** (26 ítems): Motor, transmisión, frenos de servicio/mano/motor, suspensión, neumáticos, luces, fugas.
   - **Cabina** (20 ítems): Cinturones, espejos, vidrios, aire, bocinas, botiquín, kit de contención de derrames.
   - **Equipamiento del Estanque** (18 ítems): Bombas hidrojet y vacío, válvulas primaria/secundaria/seguridad, manómetro, mangueras de succión 3" y descarga 4", compuertas y seguros hidráulicos.
   - **Documentos y Señalética** (16 ítems): Padrón, revisión técnica, gases, seguro obligatorio, certificado de hermeticidad y lugar de lavado, resolución sanitaria, rombos y UN reflectantes NCH 2190, letreros de residuos peligrosos, extintores y conos.
   - *Regla de Bloqueo*: Cualquier ítem marcado como `MALO` en la categoría crítica impide el despacho del vehículo.
2. `InspeccionRetornoPlanta`:
   - Se ejecuta únicamente cuando el camión regresa físicamente a la Planta Zion (al término de la jornada diaria o al regresar de un viaje fuera de Santiago).
   - Audita estado de carrocería, mangueras, herramientas y registra incidentes ocurridos en ruta.

### 3. Flujo SIDREP y Destino (Ventanilla Única + Romana Certificada)
1. El cliente generador emite la Declaración SIDREP en Ventanilla Única.
2. El sistema Zion Services obtiene y almacena el PDF original del SIDREP asociándolo a la Orden de Servicio.
3. El conductor viaja con el residuo hacia la planta de destino autorizada.
4. En destino, la planta recibe el camión, pesa en su romana, descarga el residuo, emite el ticket de pesaje y estampa su timbre/sello húmedo y firma en el documento SIDREP.
5. El conductor toma foto del SIDREP sellado y del ticket de romana con la tablet Android y lo sube al sistema.
6. El backend valida la existencia de la certificación y habilita el siguiente tramo o retiro.

### 4. Modelo de Liquidación Comercial (Estados de Pago Consolidados)
```
[OrdenServicio #1] ──┐
[OrdenServicio #2] ──┼──> [EstadoDePago (EDP) #2026-11-Q1] ──> [Validación OC] ──> [Habilitado para Facturar]
[OrdenServicio #3] ──┘
```
- Cada cliente contractual tiene una periodicidad de corte: `QUINCENAL` o `MENSUAL`.
- Al cierre del período, Gestión Comercial genera el EDP agrupando todas las OS completadas con expediente cerrado.
- Si el cliente requiere Orden de Compra (OC), el sistema exige registrar el número y PDF de la OC antes de habilitar la facturación.

### 5. Invariante Física en Viajes Locales e Interregionales
- La regla física `Planta Zion -> Retiro A -> Destino/Descarga -> [Retiro B]` es inviolable.
- En viajes interregionales (fuera de Santiago):
  - El camión puede pernoctar fuera sin volver a Planta Zion.
  - Pero dentro de la región, no puede retirar en un segundo cliente sin haber descargado en la planta de destino autorizada de esa zona.
  - La inspección de retorno vehicular se mantiene pendiente hasta el arribo final a Planta Zion.

## Modelo Conceptual de Entidades Actualizado

```
EmpresaCliente (1) ───< (N) ContratoCliente
      │                        │ (1)
      │ (1)                    └───< (N) EstadoDePago (1) ───< (N) OrdenServicio
      └───< (N) SucursalFaena (1) ───< (N) SolicitudServicio (1) ───┘
                                                                │ (1)
Conductor (1) ───┐                                              ├─── (1) ExpedienteDocumental (1) ──< (N) Documento
                 ├───< (N) Jornada (1) ─── (1) HojaDeRuta       ├─── (1) CicloTransporte
Vehiculo (1) ────┘            │                                 │           │ (1)
                              ├─── (1) InspeccionSalida_F_GMT   │           ├─── (1) AutorizacionInicioFaena (Firma)
                              └─── (1) InspeccionRetornoPlanta  │           └─── (1) ActaRecepcionServicio (Firma)
                                                                └─── (1) VisitaDestino
                                                                            ├─── (1) DeclaracionSIDREP_VU (PDF original)
                                                                            ├─── (1) SIDREP_SelladoRomana (Foto)
                                                                            └─── (1) TicketPesajeRomana (Foto)
```

## Risks / Trade-offs

- **Riesgo: Fragilidad de tablets en faena pesada (lodo, químicos).**
  - *Mitigación*: Uso de fundas industriales rugerizadas anti-impacto con grado de protección IP68 y correa para mano.
- **Riesgo: Mala calidad o ilegibilidad de las fotos tomadas por el conductor.**
  - *Mitigación*: Previsualización en pantalla con confirmación obligatoria del conductor ("¿La foto es legible y se aprecia el timbre?") antes del envío final.
- **Riesgo: Intermitencia de Ventanilla Única gubernamental.**
  - *Mitigación*: Soporte dual: descarga automatizada por API/scraping o carga manual del PDF del SIDREP por Gestión Comercial en caso de caída del portal estatal.
