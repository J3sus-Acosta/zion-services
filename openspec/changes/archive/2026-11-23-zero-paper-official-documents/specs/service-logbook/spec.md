# Spec Delta: service-logbook

## Purpose

Registra cronológicamente eventos, avances e incidencias operativas en terreno con georreferenciación y fotografías para reemplazar los canales de comunicación informal por WhatsApp.

## ADDED Requirements

### Requirement: Registro de Incidencias y Novedades de Ruta en 1 Clic
El sistema SHALL proveer a los conductores botones de reporte rápido en la tablet para registrar incidencias estandarizadas (tráfico, acceso denegado, desperfecto mecánico, diferencia de volumen) capturando coordenadas GPS y fotografía opcional.

#### Scenario: Reporte de portón cerrado o acceso impedido desde terreno
- **GIVEN** un camión posicionado fuera del recinto del cliente con acceso bloqueado
- **WHEN** el conductor presiona "Acceso Denegado" y toma una foto de la entrada
- **THEN** el sistema registra el evento en la bitácora de la orden y notifica de inmediato a Operaciones y al Cliente.

### Requirement: Timeline Operacional en Vivo para Operaciones y Clientes
El sistema SHALL consolidar y desplegar cronológicamente todos los hitos y novedades de la atención en un timeline interactivo accesible en tiempo real por el equipo comercial y el cliente.

#### Scenario: Visualización del estado del servicio por el cliente
- **GIVEN** un cliente con una orden de servicio en curso
- **WHEN** consulta la sección de seguimiento en su portal
- **THEN** visualiza la secuencia de hitos (salida de planta, llegada, inicio de faena, novedades) en orden cronológico sin necesidad de comunicarse por mensajería externa.
