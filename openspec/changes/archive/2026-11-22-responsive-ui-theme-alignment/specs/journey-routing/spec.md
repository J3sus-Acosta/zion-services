# Spec Delta

## ADDED Requirements

### Requirement: Monitoreo de Flota Operativa con Coherencia Temática y Superficies Adaptativas
El visualizador cartográfico del módulo de operaciones (`OperationsFleetMap`) SHALL sincronizar dinámicamente sus superficies, fondo cartográfico, trazas de ruta, popovers informativos y widgets flotantes de telemetría con los tokens del SATEM Design System según el tema activo (Modo Claro o Modo Oscuro), manteniendo paridad visual con el Portal de Clientes y garantizando una relación de contraste accesible de al menos 4.5:1 (WCAG AA).

#### Scenario: Visualización de mapa operativo bajo Modo Claro con superficies y tokens claros
- **GIVEN** un Jefe de Operaciones o Administrador navegando en el módulo de Monitoreo GPS con el tema configurado en Modo Claro
- **WHEN** inspecciona el visualizador de mapa y la lista de camiones en servicio
- **THEN** el lienzo cartográfico despliega un fondo claro adaptable (`--bg-surface` / `bg-muted/30`), la cuadrícula cartográfica utiliza trazas sutiles sobre fondo luminoso, y los contenedores de telemetría y marcadores adoptan tarjetas de alto contraste legibles bajo luz diurna sin fondos negros opacos forzados.

#### Scenario: Visualización de mapa operativo bajo Modo Oscuro con Dark Mode Premium SATEM
- **GIVEN** un usuario en el módulo de operaciones con el tema configurado en Modo Oscuro
- **WHEN** inspecciona el visualizador de mapa de flota
- **THEN** el sistema conserva la estética oficial Dark Mode Premium SATEM con fondo pizarra oscuro (`bg-slate-950`), cuadrícula cartográfica cian/azul, indicadores radar luminosos y paneles de telemetría translúcidos con bordes contrastados.

#### Scenario: Marcadores de unidades y widgets de telemetría adaptativos con contraste WCAG AA
- **GIVEN** una unidad operativa seleccionada con telemetría activa en el mapa
- **WHEN** se visualiza la tarjeta flotante de telemetría, el marcador del camión y los hitos de Planta Zion y Faena Cliente
- **THEN** los textos, velocidades, precisión GPS e identificadores presentan contraste accesible superior a 4.5:1 en ambos temas, utilizando variables semánticas (`text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`) sin perder legibilidad al alternar el modo.

#### Scenario: Transición fluida al alternar temas en vivo sin pérdida de estado operacional
- **GIVEN** un operador monitoreando activamente una unidad en el mapa de operaciones
- **WHEN** conmuta entre Modo Claro y Modo Oscuro mediante el conmutador de la cabecera
- **THEN** el mapa y todos sus componentes adaptan sus superficies de manera instantánea y reactiva sin deseleccionar la unidad activa, sin reiniciar el intervalo de sondeo de telemetría y sin requerir recarga de página.
