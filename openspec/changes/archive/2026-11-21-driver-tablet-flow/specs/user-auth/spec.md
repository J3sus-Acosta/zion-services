# Spec Delta

## Purpose
Provee autenticación unificada, control de acceso basado en roles jerárquicos (SUPERADMIN, ADMIN, JEFE_OPERACIONES, CONDUCTOR, CLIENTE) y un panel administrativo para gestión y habilitación de usuarios y cuentas de clientes.

## ADDED Requirements

### Requirement: Autenticación Unificada y Control de Acceso RBAC
El sistema SHALL proveer una pantalla de inicio de sesión única que autentique a los usuarios mediante credenciales seguras, emita tokens JWT almacenados en cookies HTTP-only con protección CSRF y aplique control de acceso basado en los roles `SUPERADMIN`, `ADMIN`, `JEFE_OPERACIONES`, `CONDUCTOR` y `CLIENTE`, direccionando al usuario a su interfaz correspondiente.

#### Scenario: Inicio de sesión exitoso con redirección contextual por rol
- **GIVEN** un usuario registrado y activo en el sistema con credenciales válidas
- **WHEN** ingresa su correo electrónico y contraseña en la pantalla de inicio de sesión
- **THEN** el sistema valida las credenciales, establece la cookie de sesión segura y redirige al usuario a la vista correspondiente a su rol.

#### Scenario: Bloqueo de inicio de sesión para cuenta inactiva o deshabilitada
- **GIVEN** un usuario cuyas credenciales son correctas pero su cuenta ha sido deshabilitada (`activo = false`)
- **WHEN** intenta iniciar sesión en la pantalla de login
- **THEN** el sistema rechaza la autenticación, deniega la emisión del token e informa que la cuenta se encuentra desactivada y requiere contacto con el Administrador.

#### Scenario: Protección de rutas y recursos por rol insuficiente
- **GIVEN** un usuario autenticado con rol `CONDUCTOR` o `CLIENTE`
- **WHEN** intenta acceder a un endpoint o vista administrativa exclusiva de `SUPERADMIN` o `ADMIN`
- **THEN** el sistema responde con error 403 Forbidden y bloquea el acceso en el cliente y en el servidor.

### Requirement: Panel de Gestión y Habilitación de Usuarios
El sistema SHALL proveer un panel de administración accesible únicamente para los roles `SUPERADMIN` y `ADMIN` para listar, crear, editar, asignar roles y habilitar o deshabilitar cuentas de acceso de usuarios internos y de usuarios asociados a empresas clientes.

#### Scenario: Creación y habilitación de usuario para empresa cliente
- **GIVEN** un usuario autenticado con rol `SUPERADMIN` o `ADMIN` en el panel de gestión de usuarios
- **WHEN** crea un nuevo usuario con rol `CLIENTE`, ingresa sus datos (nombre, RUT, correo) y lo asocia a una empresa cliente con estado habilitado
- **THEN** el sistema persiste el usuario en la base de datos, lo asocia a la empresa cliente correspondiente y habilita su acceso inmediato al Portal del Cliente.

#### Scenario: Deshabilitación de acceso por Superadmin o Admin
- **GIVEN** un usuario activo en el sistema que finaliza su relación contractual o comercial
- **WHEN** el Superadmin o Admin conmuta el estado de su cuenta a inactivo en el panel de usuarios
- **THEN** el sistema actualiza el registro a `activo = false`, revoca las sesiones activas del usuario y bloquea cualquier intento posterior de inicio de sesión.
