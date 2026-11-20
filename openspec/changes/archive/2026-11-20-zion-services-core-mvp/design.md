# Design: Arquitectura Técnica y Estrategia de Implementación Zion Services (Actualizado v3)

## Context

Zion Services gestiona el retiro y transporte de residuos peligrosos mediante camiones cisterna equipados con equipos de hidrojet y succión. La operación actual se basa en carpetas físicas con documentos en papel:
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
- Implementar la captura obligatoria de **4 fotos perimetrales 360°** (Frontal, Lateral Izq, Trasera, Lateral Der) en Salida y Retorno a Planta Zion, permitiendo comparativa visual lado a lado para auditoría de integridad vehicular.
- Implementar el **Autochecklist Diario de Ruta** para viajes interregionales fuera de Santiago con alertas remotas en el panel de Santiago.
- Implementar el flujo estricto de faena en cliente: Marcado de hora de llegada -> Firma digital de Orden de Trabajo -> Desbloqueo y captura de **fotos del trabajo en proceso y uso de EPP** de la cuadrilla -> Firma de recepción conforme/observada.
- Diferenciar el enrutamiento: modalidad `LOCAL_SANTIAGO` (invariante estricta: retiro -> descarga) vs. `VIAJE_INTERREGIONAL` (traslados y servicios consecutivos en campaña regional).
- Integrar la descarga del documento oficial SIDREP emitido por el generador desde la plataforma de Ventanilla Única ambiental.
- Eliminar la digitación manual de pesajes de camión por parte de Zion: la planta de destino certifica el residuo timbrando el SIDREP y entregando su ticket de pesaje, los cuales el conductor fotografía en el acto.
- Implementar la entidad `EstadoDePago` (EDP) para consolidar periódicamente (quincenal o mensualmente) múltiples órdenes de servicio de un cliente antes de facturar.
- Almacenar archivos en volumen persistente de EasyPanel/VPS mediante la abstracción `FileStoragePort` y permitir la descarga del expediente consolidado en archivo ZIP.

### Non-Goals
- No implementar balanzas digitales IoT propias de Zion (se adopta la romana certificada de la planta de destino).
- No implementar rastreo satelital GPS continuo por segundo en el MVP (el tracking es por hitos y firmas).
- No emitir facturas electrónicas directamente ante el SII en esta primera fase (el sistema habilita y genera el Estado de Pago con OC para que Facturación emita la factura en su sistema contable).

## Decisions

### 1. PWA Tablet Android: Flujo Secuencial de Operación
1. **Paso 1: Salida de Planta Zion**:
   - Checklist F-GMT-MAN-004 (80 ítems evaluados).
   - Captura guiada de 4 fotos (Frontal, Lateral Izq, Trasera, Lateral Der).
   - Firma presencial Conductor + Supervisor.
2. **Paso 2: En Faena del Cliente**:
   - Botón `Marcar Llegada` (estampa hora exacta).
   - Presentación de Orden de Trabajo al cliente y firma digital en pantalla.
   - Activación inmediata del módulo de cámara: captura obligatoria de fotos del trabajo en ejecución y verificación de EPPs en operarios.
   - Carga fotográfica de Guía de Despacho entregada por el cliente.
   - Firma digital de recepción conforme o registro de disconformidad/sin firma.
3. **Paso 3: En Planta de Destino**:
   - Descarga de residuo en destino.
   - Captura con cámara del documento SIDREP con timbre húmedo/sello de romana de destino y del ticket oficial de pesaje.
4. **Paso 4: Retorno a Planta Zion**:
   - Checklist de retorno vehicular.
   - Captura de las 4 fotos finales (Frontal, Lateral Izq, Trasera, Lateral Der).
   - Vista comparativa de fotos de salida vs. retorno en panel de Operaciones.

### 2. Arquitectura de Viajes Fuera de Santiago
- `Modalidad: VIAJE_INTERREGIONAL`:
  - No exige retorno diario a Planta Zion; el camión puede pernoctar en faena u hotel en región.
  - Cada mañana, el conductor realiza el "Autochecklist Diario de Ruta" (revisión rápida de frenos, luces, estanque y fugas) y firma en su tablet.
  - El resultado se transmite a Santiago; si todo está conforme, la tablet habilita operar. Si hay falla crítica, salta alerta en panel de Santiago.
  - La inspección presencial completa de retorno con sus 4 fotos se ejecuta al concluir la campaña y regresar físicamente a Planta Zion.
  - Se autoriza la ejecución de traslados y servicios consecutivos en la zona geográfica asignada.

### 3. Modelo de Entidades y Expediente con Fotografías

```
EmpresaCliente (1) ───< (N) ContratoCliente
      │                        │ (1)
      │ (1)                    └───< (N) EstadoDePago (1) ───< (N) OrdenServicio
      └───< (N) SucursalFaena (1) ───< (N) SolicitudServicio (1) ───┘
                                                                │ (1)
Conductor (1) ───┐                                              ├─── (1) ExpedienteDocumental (1) ──< (N) ArchivoExpediente
                 ├───< (N) Jornada (Modalidad: LOCAL/REGIONAL)  │                                            │ (Tipo: DOC/FOTO_CAMION/FOTO_FAENA)
Vehiculo (1) ────┘            │                                 ├─── (1) CicloTransporte
                              ├─── (1) InspeccionSalida_F_GMT   │           ├─── (1) HitoLlegada (timestamp)
                              │           └─── (4) Fotos360_Sal │           ├─── (1) AutorizacionInicioFaena (Firma OT)
                              ├─── (N) AutochecklistRuta        │           ├─── (N) FotosTrabajoYEPP
                              └─── (1) InspeccionRetornoPlanta  │           └─── (1) ActaRecepcionServicio (Firma)
                                          └─── (4) Fotos360_Ret └─── (1) VisitaDestino
                                                                            ├─── (1) SIDREP_VentanillaUnica (PDF)
                                                                            ├─── (1) SIDREP_SelladoRomana (Foto)
                                                                            └─── (1) TicketPesajeRomana (Foto)
```

## Risks / Trade-offs

- **Riesgo: Demoras en faena por captura de múltiples fotos.**
  - *Mitigación*: Interfaz guiada tipo "asistente paso a paso" con previsualizaciones rápidas y compresión en background en la tablet para no bloquear la pantalla del conductor.
- **Riesgo: Resistencia de operarios a ser fotografiados con EPP.**
  - *Mitigación*: Enfoque protocolar de seguridad y prevención de riesgos respaldado por la Jefatura de Operaciones y establecido en los contratos de servicio con clientes.
