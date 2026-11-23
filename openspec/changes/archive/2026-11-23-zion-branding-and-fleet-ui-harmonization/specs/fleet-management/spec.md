# Spec Delta: fleet-management

## MODIFIED Requirements

### Requirement: Módulo Flota en la interfaz
El frontend SHALL ofrecer un módulo «Flota» con ruta propia e ítem de navegación visible solo a los roles autorizados, que liste equipos y permita crear, editar y habilitar/deshabilitar, con estados `loading`, `error`, `empty` y datos, siguiendo el diseño minimalista de la plataforma Zion Services y eliminando cualquier referencia a marcas ajenas.

#### Scenario: Acceso por rol
- **GIVEN** un usuario `JEFE_OPERACIONES`, `ADMIN` o `SUPERADMIN`
- **WHEN** ingresa a la aplicación
- **THEN** ve el ítem «Flota» y puede abrir su ruta; otros roles son redirigidos

#### Scenario: Estados de carga, error y vacío
- **WHEN** el listado está cargando, falla la API o no hay equipos
- **THEN** la UI muestra respectivamente un indicador de carga, un mensaje de error con reintento y un estado vacío

#### Scenario: Confirmación de deshabilitación con operaciones activas
- **GIVEN** un equipo con operaciones activas
- **WHEN** el usuario pulsa deshabilitar
- **THEN** la UI exige motivo, lista operaciones afectadas y permite confirmar solo tras elegir un equipo habilitado de reemplazo
