# client-portal Specification

## Purpose
TBD - created by archiving change zion-services-core-mvp. Update Purpose after archive.

## Requirements

### Requirement: Consolidación Periódica en Estados de Pago (EDP)
Gestión Comercial SHALL consolidar múltiples Órdenes de Servicio completadas de un mismo cliente en un único Estado de Pago periódico (quincenal o mensual) para su revisión y habilitación a facturación.

#### Scenario: Generación exitosa de Estado de Pago consolidado
GIVEN un conjunto de Órdenes de Servicio ejecutadas con expedientes completos para un cliente durante una quincena o mes
WHEN Gestión Comercial genera el corte de liquidación
THEN el sistema agrupa las atenciones en un `EstadoDePago` consolidado, detalla cantidades y montos acordados en contrato, y emite la prefactura para aprobación del cliente.

#### Scenario: Validación de Orden de Compra previa a facturación
GIVEN un cliente contractual que exige Orden de Compra (OC) para emitir factura
WHEN el Estado de Pago se encuentra aprobado
THEN el sistema exige adjuntar la OC correspondiente antes de habilitar el botón de facturación formal.

### Requirement: Portal de Clientes con Tenant Isolation Estricto
El cliente SHALL acceder únicamente a sus datos, sus solicitudes de retiro, sus órdenes de servicio y a sus Estados de Pago consolidados, sin visibilidad alguna sobre otros clientes.

#### Scenario: Consulta de Estado de Pago y expedientes por el cliente
GIVEN un cliente autenticado en el portal
WHEN consulta sus atenciones del período
THEN visualiza el Estado de Pago emitido y puede descargar con un clic el paquete ZIP consolidado con todos los respaldos (SIDREP sellado, guías de despacho y actas firmadas en tablet).

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
El Portal de Clientes SHALL centralizar en el expediente documental las fotos perimetrales, evidencias de faena, firmas táctiles y documentos, manteniéndolos disponibles para previsualización y descarga individual o consolidada desde el instante exacto en que el conductor los sincroniza desde la tablet.

#### Scenario: Visualización instantánea de fotografías de faena cargadas por el conductor
- **GIVEN** un servicio en ejecución en las instalaciones del cliente
- **WHEN** el conductor captura y sincroniza cualquier fotografía de faena, EPP o perimetral desde la tablet
- **THEN** la imagen queda inmediatamente indexada y visible para descarga dentro del expediente documental del servicio en el portal de clientes en tiempo real.

#### Scenario: Descarga de expediente completo y evidencias en tiempo real
- **GIVEN** un servicio completado con toda la documentación y firmas registradas
- **WHEN** el cliente solicita la descarga de los antecedentes
- **THEN** el portal permite descargar individualmente cada documento o generar un paquete consolidado con todas las evidencias, firmas y certificados asociados.

#### Scenario: Actualización reactiva sin recarga completa ante nuevas evidencias
- **GIVEN** un cliente con la vista del expediente documental abierta en el portal
- **WHEN** se completa la sincronización de un nuevo documento, checklist o firma desde terreno
- **THEN** la interfaz actualiza la lista de evidencias disponibles en tiempo real reflejando el nuevo ítem sin obligar a una recarga manual del navegador.

### Requirement: Contraste Dinámico y Modo Claro Accesible en Portal Cliente
El Portal de Clientes SHALL implementar soporte visual accesible para Modo Claro y Modo Oscuro utilizando exclusivamente tokens del SATEM Design System, asegurando que textos, fondos, bordes y badges cumplan un contraste mínimo de 4.5:1 (WCAG AA).

#### Scenario: Visualización en Modo Claro con contraste WCAG AA cumplido
- **GIVEN** un cliente navegando en el Portal de Clientes con el tema visual configurado en Modo Claro (Light Mode)
- **WHEN** inspecciona tarjetas de servicio, expedientes documentales, botones de acción y badges de estado
- **THEN** la interfaz aplica las variables semánticas del SATEM Design System garantizando un contraste superior a 4.5:1, eliminando textos de baja visibilidad o ilegibles.

#### Scenario: Alternancia y persistencia de preferencia de tema visual
- **GIVEN** un usuario en el portal que conmuta su preferencia visual entre Modo Oscuro y Modo Claro
- **WHEN** el usuario navega entre diferentes secciones o recarga el navegador
- **THEN** el portal conserva la preferencia seleccionada y aplica dinámicamente las variables de diseño correspondientes sin parpadeos de estilo.
