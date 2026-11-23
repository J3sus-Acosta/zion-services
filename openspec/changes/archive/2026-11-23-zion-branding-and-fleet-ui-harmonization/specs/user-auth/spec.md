# Spec Delta: user-auth

## MODIFIED Requirements

### Requirement: Autenticación Unificada y Control de Acceso RBAC
El sistema SHALL autenticar usuarios mediante credenciales seguras, emitir tokens JWT en cookies HTTP-only denominadas `zion_auth_token`, proveer una cabecera de navegación responsive universal resiliente al desbordamiento en cualquier resolución (asegurando la visibilidad y operatividad incondicional del botón 'Cerrar Sesión', branding y conmutador de tema) y aplicar control de acceso RBAC con roles SUPERADMIN, ADMIN, COMERCIAL, JEFE_OPERACIONES, CONDUCTOR y CLIENTE, direccionando a cada usuario según su perfil y restringiendo accesos no autorizados con mensajes exclusivos de Zion Services.

#### Scenario: Inicio de sesión exitoso con redirección contextual por rol
- **GIVEN** un usuario registrado y activo en el sistema con credenciales válidas
- **WHEN** ingresa su correo electrónico y contraseña en la pantalla de inicio de sesión
- **THEN** el sistema valida las credenciales, establece la cookie de sesión segura y redirige al usuario a la vista correspondiente a su rol.

#### Scenario: Cierre de sesión explícito desde la cabecera del sistema
- **GIVEN** un usuario autenticado en cualquier módulo de la aplicación
- **WHEN** presiona el botón 'Cerrar Sesión' visible en la cabecera principal
- **THEN** el sistema invalida la sesión, destruye la cookie HTTP-only, limpia el estado de autenticación en el cliente y redirige a la pantalla de login.

#### Scenario: Navegación responsive y prevención de desbordamiento horizontal en perfiles multirrol
- **GIVEN** un usuario autenticado con rol `SUPERADMIN` o con acceso simultáneo a todos los módulos del sistema
- **WHEN** visualiza la cabecera del sistema en pantallas con ancho inferior a 1200px o dispositivos móviles
- **THEN** el sistema adapta la barra de navegación agrupando módulos secundarios en un menú desplegable o selector compacto, garantizando que el branding institucional, los enlaces operativos, el conmutador de tema y el botón de 'Cerrar Sesión' permanezcan totalmente visibles y accesibles sin generar scroll horizontal en el viewport.

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
