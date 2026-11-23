# Design: zion-branding-and-fleet-ui-harmonization

## Context

El sistema fue concebido para Zion Services SpA. Durante etapas previas de desarrollo, se usaron plantillas y nombres de clases o constantes asociadas a "SATEM". Además, la interfaz del módulo Flota (`FleetManagementPanel.tsx`) quedó implementada con estilos CSS locales e inline que se apartan del patrón visual minimalista utilizado en `ClientManagementView.tsx` y `UserManagementPanel.tsx`.

## Goals / Non-Goals

**Goals:**
- Armonizar el módulo Flota adoptando la misma estructura visual de componentes minimalistas (`Card`, `CardHeader`, `CardTitle`, `Badge`, `Button`, selectores nativos elegantes y tablas responsivas con `.table-container`).
- Eliminar de manera absoluta y verificable el vocablo "SATEM" de cualquier texto, mensaje, modal, comentario de código, log, plantilla PDF y cookie en toda la aplicación.
- Migrar el nombre de la cookie de autenticación a `zion_auth_token` con retrocompatibilidad controlada en middleware.
- Modificar el pie de página de los documentos oficiales PDF a: `DOCUMENTO ELECTRÓNICO OFICIAL - ZION SERVICES`.

**Non-Goals:**
- No alterar la lógica de negocio ni las reglas de validación operacional de la flota (checklist obligatorio, estados `HABILITADO` / `DESHABILITADO`, transferencias de faena).
- No cambiar la arquitectura de autenticación JWT (solo se renombra la clave de cookie y textos auxiliares).

## Decisions

### 1. Adopción del Diseño Minimalista en el Módulo Flota
Se reestructura `FleetManagementPanel.tsx` para emplear los componentes canónicos de `../ui/card`, `../ui/badge`, `../ui/button` ya usados con éxito en `ClientManagementView`:
- Encabezado con título limpio `Gestión de Flota Operacional` y subtítulo descriptivo.
- Tarjetas superiores de KPIs con números claros y badges discretos (`Total Unidades`, `Habilitadas`, `En Mantenimiento/Bloqueadas`).
- Barra de herramientas con buscador predictivo y selectores minimalistas en un bloque `CardContent`.
- Tabla moderna con bordes tenues, tipografía `text-sm`, alineación cuidada y acciones en botones icono discretos.

### 2. Renombrado y Desacople de Marca en Backend y Frontend
- En backend:
  - Cambiar `satem_auth_token` por `zion_auth_token`. En `auth.middleware.ts`, leer `req.cookies?.zion_auth_token || req.cookies?.satem_auth_token` para no desconectar abruptamente a usuarios con sesiones activas previas.
  - En `document-generator.service.ts`: renombrar `SATEM_COLORS` a `ZION_COLORS` y textos de footer a `ZION SERVICES`.
  - En `documentos.routes.ts`: cambiar mensaje a `Documento no encontrado o no registrado en Zion Services`.
- En frontend:
  - Reemplazar en `App.tsx`: "Cargando sesión Zion Services...", "Cerrar sesión segura de Zion Services".
  - En `ClientManagementView.tsx`: "Directorio de Clientes Zion Services".
  - En `ClientPortalView.tsx`: "Certificado Auténtico Zion Services".
  - En `CommercialManagementView.tsx`: "Módulo de Gestión Comercial".
  - En `OverrideWarningDialog.tsx`: "Margen de Tiempo Inferior al Estándar Operacional (4 Horas)".
  - En `index.css`: `.satem-table` → `.table` y `.zion-table`.

## Risks / Trade-offs

- **[Riesgo]** Fallos en tests automatizados que esperaban el nombre de cookie anterior `satem_auth_token`.
  - *Mitigación*: Actualizar la suite de pruebas unitarias y de integración (`auth.security.test.ts`, etc.) para verificar explícitamente `zion_auth_token`.
- **[Riesgo]** Ruptura de estilos visuales en pantallas que consumían la clase `.satem-table`.
  - *Mitigación*: Mantener en `index.css` un alias de compatibilidad de `.table, .zion-table, .satem-table` mientras se migran las referencias en los componentes.
