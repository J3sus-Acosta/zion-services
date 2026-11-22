# user-auth Specification

## Purpose
Provee autenticación unificada, control de acceso basado en roles jerárquicos (SUPERADMIN, ADMIN, JEFE_OPERACIONES, CONDUCTOR, CLIENTE) y un panel administrativo para gestión y habilitación de usuarios y cuentas de clientes.

## Requirements

### Requirement: Autenticación Unificada y Control de Acceso RBAC
El sistema SHALL autenticar usuarios mediante credenciales seguras, emitir tokens JWT en cookies HTTP-only, proveer una acción explícita de cierre de sesión en la cabecera unificada y aplicar control de acceso RBAC con roles SUPERADMIN, ADMIN, COMERCIAL, JEFE_OPERACIONES, CONDUCTOR y CLIENTE, direccionando a cada usuario según su perfil y restringiendo accesos no autorizados.

#### Scenario: Inicio de sesión exitoso con redirección contextual por rol
- **GIVEN** un usuario registrado y activo en el sistema con credenciales válidas
- **WHEN** ingresa su correo electrónico y contraseña en la pantalla de inicio de sesión
- **THEN** el sistema valida las credenciales, establece la cookie de sesión segura y redirige al usuario a la vista correspondiente a su rol.

#### Scenario: Cierre de sesión explícito desde la cabecera del sistema
- **GIVEN** un usuario autenticado en cualquier módulo de la aplicación
- **WHEN** presiona el botón 'Cerrar Sesión' visible en la cabecera principal
- **THEN** el sistema invalida la sesión, destruye la cookie HTTP-only, limpia el estado de autenticación en el cliente y redirige a la pantalla de login.

#### Scenario: Acceso restringido y permisos del rol Comercial en RBAC
- **GIVEN** un usuario autenticado con rol `COMERCIAL`
- **WHEN** interactúa con solicitudes, órdenes de servicio o consolidación de estados de pago
- **THEN** el sistema autoriza la gestión comercial correspondiente pero bloquea cualquier intento de acceso a configuraciones de sistema o checklists de conductor con error 403.

#### Scenario: Bloqueo de inicio de sesión para cuenta inactiva o deshabilitada
- **GIVEN** un usuario cuyas credenciales son correctas pero su cuenta ha sido deshabilitada (`activo = false`)
- **WHEN** intenta iniciar sesión en la pantalla de login
- **THEN** el sistema rechaza la autenticación, deniega la emisión del token e informa que la cuenta se encuentra desactivada y requiere contacto con el Administrador.

#### Scenario: Protección de rutas y recursos por rol insuficiente
- **GIVEN** un usuario autenticado con rol `CONDUCTOR`, `COMERCIAL` o `CLIENTE`
- **WHEN** intenta acceder a un endpoint o vista administrativa exclusiva de `SUPERADMIN` o `ADMIN`
- **THEN** el sistema responde con error 403 Forbidden y bloquea el acceso en el cliente y en el servidor.

### Requirement: Panel de Gestión y Habilitación de Usuarios
El sistema SHALL proveer un panel de administración para roles SUPERADMIN y ADMIN para listar usuarios mostrando explícitamente su correo electrónico, crear, habilitar o deshabilitar cuentas, restablecer contraseñas de acceso y actualizar la asignación de roles de usuarios internos y clientes.

#### Scenario: Visualización de correo electrónico en listado de usuarios
- **GIVEN** un usuario autenticado como `SUPERADMIN` o `ADMIN` en el panel de gestión de usuarios
- **WHEN** consulta la tabla de usuarios registrados
- **THEN** el sistema presenta el listado incluyendo visiblemente la columna de correo electrónico junto con nombre, RUT, rol y estado.

#### Scenario: Restablecimiento administrativo de contraseña de usuario
- **GIVEN** un administrador en el panel de usuarios gestionando una cuenta existente
- **WHEN** ingresa una nueva contraseña para el usuario seleccionado y confirma la acción
- **THEN** el sistema valida los requisitos de seguridad, persiste la nueva credencial encriptada en la base de datos y notifica el éxito del cambio.

#### Scenario: Modificación y reasignación de rol de usuario
- **GIVEN** un administrador modificando los privilegios de un usuario interno
- **WHEN** cambia el rol asignado a `COMERCIAL` o `JEFE_OPERACIONES` y guarda los cambios
- **THEN** el sistema actualiza el rol en la base de datos y aplica los nuevos permisos en la siguiente verificación de autorización del usuario.

#### Scenario: Creación y habilitación de usuario para empresa cliente
- **GIVEN** un usuario autenticado con rol `SUPERADMIN` o `ADMIN` en el panel de gestión de usuarios
- **WHEN** crea un nuevo usuario con rol `CLIENTE`, ingresa sus datos (nombre, RUT, correo) y lo asocia a una empresa cliente con estado habilitado
- **THEN** el sistema persiste el usuario en la base de datos, lo asocia a la empresa cliente correspondiente y habilita su acceso inmediato al Portal del Cliente.

#### Scenario: Deshabilitación de acceso por Superadmin o Admin
- **GIVEN** un usuario activo en el sistema que finaliza su relación contractual o comercial
- **WHEN** el Superadmin o Admin conmuta el estado de su cuenta a inactivo en el panel de usuarios
- **THEN** el sistema actualiza el registro a `activo = false`, revoca las sesiones activas del usuario y bloquea cualquier intento posterior de inicio de sesión.
