# Spec Delta

## ADDED Requirements

### Requirement: Seguimiento GPS del Camión en Portal Cliente durante Ventana Activa
El Portal de Clientes SHALL mostrar en tiempo real la ubicación geográfica del camión asignado a una Orden de Servicio de su empresa, exclusivamente durante la ventana activa en que la unidad se encuentra en trayecto hacia la faena o ejecutando la faena, aplicando aislamiento estricto (Tenant Isolation).

#### Scenario: Visualización de camión en camino a la faena del cliente
- **GIVEN** un cliente autenticado en el portal con una Orden de Servicio en estado de despacho o tránsito hacia su sucursal
- **WHEN** el cliente ingresa a la sección de seguimiento de su servicio
- **THEN** el portal despliega un mapa con la ubicación geográfica actual y última lectura GPS del camión asignado, sin visibilidad sobre camiones o servicios de otras empresas.

#### Scenario: Bloqueo de visualización de GPS fuera de la ventana de servicio activa
- **GIVEN** un servicio que ya ha culminado o un camión que se encuentra en ruta hacia otro cliente o hacia Planta Zion
- **WHEN** el cliente consulta el detalle de la atención en el portal
- **THEN** el sistema oculta la telemetría en vivo del vehículo y muestra únicamente el registro histórico de las horas y coordenadas de llegada y salida de su propia faena.

### Requirement: Visualización y Descarga de Expediente y Evidencias en Tiempo Real
El Portal de Clientes SHALL poner a disposición del cliente las fotografías perimetrales, fotografías de faena, firmas de recepción conforme y documentación asociada de forma inmediata a medida que el conductor las carga y sincroniza desde la tablet en terreno.

#### Scenario: Visualización instantánea de fotografías de faena cargadas por el conductor
- **GIVEN** un servicio en ejecución en las instalaciones del cliente
- **WHEN** el conductor captura y sincroniza las fotografías de faena y EPP desde la tablet
- **THEN** el cliente puede visualizar inmediatamente las imágenes en la galería del servicio en su portal antes de que concluya la jornada.

#### Scenario: Descarga de expediente completo y evidencias en tiempo real
- **GIVEN** un servicio completado con toda la documentación y firmas registradas
- **WHEN** el cliente solicita la descarga de los antecedentes
- **THEN** el portal permite descargar individualmente cada documento o generar un paquete consolidado con todas las evidencias, firmas y certificados asociados.
