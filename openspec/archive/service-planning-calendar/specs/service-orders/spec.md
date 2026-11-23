# Spec Delta: service-orders

## ADDED Requirements

### Requirement: Generación y Vinculación de Orden de Servicio por Atención Programada
El sistema SHALL generar una Orden de Servicio individual e independiente para cada ItemAtencionProgramada una vez que dicha atención sea confirmada y agendada por el área comercial, manteniendo la referencia al folio de la solicitud origen.

#### Scenario: Emisión automática de Orden de Servicio al confirmar atención
- **GIVEN** un ítem de atención programada en estado `PENDIENTE_CONFIRMACION` perteneciente a una solicitud multi-atención
- **WHEN** el área comercial confirma la asignación de recursos y fecha en el calendario
- **THEN** el sistema emite una `OrdenServicio` individual asociada a dicha atención conservando la relación con la `SolicitudServicio` padre.

### Requirement: Asignación de Atención Programada a Jornada Operativa
El sistema SHALL vincular la Orden de Servicio generada a partir de una atención programada a la Jornada de ruta correspondiente al camión y conductor asignados para la fecha del servicio.

#### Scenario: Incorporación de la orden en la jornada diaria del conductor
- **GIVEN** una atención programada confirmada con conductor y camión asignados
- **WHEN** se genera o actualiza la jornada operativa del día programado
- **THEN** el sistema asocia la `OrdenServicio` resultante a la `Jornada` correspondiente para su despacho y ejecución secuencial.

### Requirement: Sincronización de Especificaciones de Servicio en Orden de Terreno
El sistema SHALL incorporar en la Orden de Servicio generada la lista de servicios del catálogo seleccionados, los requerimientos técnicos y la planta de destino autorizada para su ejecución y verificación en la aplicación de terreno del conductor.

#### Scenario: Disponibilidad de catálogo de servicios y planta en la orden
- **GIVEN** una orden de servicio originada desde una atención con servicios de hidrojet y succión RILes
- **WHEN** el conductor sincroniza la jornada en su dispositivo de terreno
- **THEN** la orden de servicio presenta el detalle de servicios a prestar y la planta de destino autorizada para la descarga de residuos.
