# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
