# Proposal

## Why
Actualmente la plataforma carece de un sistema unificado de autenticación y autorización basado en roles (`SUPERADMIN`, `ADMIN`, `JEFE_OPERACIONES`, `CONDUCTOR`, `CLIENTE`), de una pantalla de inicio de sesión y de un panel centralizado para gestionar y habilitar cuentas de usuarios (internos y clientes). Además, la vista de la tablet del conductor presenta formularios simulados que impiden la completitud autónoma de los checklists preoperacionales de 80 ítems y de retorno, la captura perimetral mediante cámara en cualquier navegador o sistema operativo, y el seguimiento de ubicación en tiempo real. Finalmente, los clientes requieren visibilidad del seguimiento GPS del camión asignado a su servicio durante la faena y acceso inmediato a la visualización y descarga de evidencias y expedientes conforme el conductor los registra en terreno.

Unificar el sistema de login y roles, incorporar el panel de gestión y habilitación de usuarios, robustecer el flujo móvil del conductor en terreno y dotar al Portal de Clientes y al panel de Operaciones de visibilidad de ruta y expedientes en tiempo real consolida la trazabilidad y seguridad operacional de Zion Services.

## What Changes
- **Sistema de Login Único y RBAC**: Pantalla de inicio de sesión unificada con roles jerárquicos: `SUPERADMIN` (control total de la plataforma), `ADMIN` (gestión administrativa/usuarios), `JEFE_OPERACIONES` (despacho, monitoreo y auditoría), `CONDUCTOR` (terminal móvil tablet) y `CLIENTE` (portal con tracking de sus servicios). Emisión de JWT mediante cookies HTTP-only seguras.
- **Panel Administrativo de Gestión de Usuarios**: Interfaz exclusiva para `SUPERADMIN` y `ADMIN` para crear, editar, asignar roles, vincular a empresas clientes y habilitar/deshabilitar cuentas de acceso de usuarios.
- **Checklist de Salida (80 ítems) y Retorno para Conductores**: Asignación exclusiva del flujo de inspección al conductor en la tablet, organizado en 5 categorías funcionales con marcado ágil "Todo Conforme", reporte de anomalías y bloqueo ante fallas críticas; más checklist de retorno a Planta Zion.
- **Módulo de Cámara Universal Multiplataforma**: Integración de captura fotográfica en navegador compatible con cualquier SO (Android, iOS) y navegador (Chrome, Safari, Firefox), con visor WebRTC (`getUserMedia`) y fallback automático a cámara nativa (`<input capture="environment">`), con compresión en cliente.
- **Seguimiento GPS del Camión en Operaciones y Portal Cliente**: Georreferenciación continua de la tablet con registro de coordenadas en hitos operacionales clave (Salida, Llegada a Cliente, Fin de Faena, Planta Destino, Retorno). Visibilidad en vivo en el panel del Jefe de Operaciones y en el Portal del Cliente (restringido con Tenant Isolation a la ventana de servicio de la orden activa).
- **Disponibilidad y Descarga de Expediente en Tiempo Real para el Cliente**: Acceso instantáneo en el Portal del Cliente para visualizar y descargar las fotografías, firmas y documentos conforme el conductor los carga en terreno.
- **Persistencia Offline-First**: Almacenamiento local seguro en IndexedDB para la tablet ante pérdida de cobertura móvil, con cola de sincronización automática al recuperar red.

## Capabilities

### New Capabilities
- `user-auth`: Sistema de autenticación unificado con pantalla de login, sesión segura basada en JWT/cookies HTTP-only, control de acceso basado en roles (`SUPERADMIN`, `ADMIN`, `JEFE_OPERACIONES`, `CONDUCTOR`, `CLIENTE`) y panel de gestión y habilitación de usuarios para Superadmin y Admin.

### Modified Capabilities
- `fleet-inspection`: Actualiza los requisitos del checklist preoperacional de salida F-GMT-MAN-004 y checklist de retorno a Planta Zion asignados al conductor en la tablet con experiencia por categorías ágiles, integración de cámara universal multiplataforma y almacenamiento/sincronización offline-first.
- `journey-routing`: Incorpora el requisito de seguimiento continuo de ubicación del camión mediante el sensor GPS de la tablet durante todo el ciclo del servicio, con visualización de estado en tiempo real y registro de geolocalización en hitos operacionales.
- `client-portal`: Incorpora el requisito de visualización del seguimiento GPS del camión asignado a la orden en tránsito o faena activa (con Tenant Isolation) y la disponibilidad inmediata para visualización y descarga de expedientes y evidencias fotográficas a medida que el conductor las carga en terreno.

## Impact
- **Modelos de datos (Prisma)**: Actualización del enum `RolUsuario` a `SUPERADMIN`, `ADMIN`, `JEFE_OPERACIONES`, `CONDUCTOR`, `CLIENTE` en `schema.prisma`.
- **Backend & APIs**: Endpoints de autenticación (`/api/auth/login`, `/api/auth/logout`, `/api/auth/me`), endpoints de administración de usuarios (`/api/usuarios`), endpoints de inspecciones y fotos, y endpoints de tracking y expedientes en tiempo real para clientes (`/api/clientes/ordenes/:id/tracking`, `/api/clientes/ordenes/:id/expediente-en-vivo`).
- **Frontend**: Componente `LoginScreen`, `UserManagementPanel`, refactorización modular de la vista de la tablet (`CameraCaptureModal`, `ChecklistSalidaModal`, `ChecklistRetornoModal`), mapa de tracking para Operaciones y para el Portal de Clientes, y visor de expedientes en tiempo real.
- **Seguridad**: Autenticación estricta con rotación de tokens, autorización RBAC en backend y aislamiento estricto de clientes (Tenant Isolation).
