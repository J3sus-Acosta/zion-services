# Spec Delta: customer-management

## Purpose

Proporciona capacidades integrales para la administración de empresas clientes, sucursales de faena, contactos y condiciones comerciales para Zion Services.

## ADDED Requirements

### Requirement: Registro y Actualización de Empresas Clientes
El sistema SHALL permitir a los usuarios con rol COMERCIAL, ADMIN y SUPERADMIN registrar y modificar empresas clientes, validando la unicidad del RUT mediante el algoritmo Módulo 11 chileno, la razón social y el tipo de cliente.

#### Scenario: Registro exitoso de una nueva empresa cliente
- **GIVEN** un usuario con rol COMERCIAL autenticado en el sistema
- **WHEN** envía los datos de una nueva empresa con RUT válido y razón social
- **THEN** el sistema persiste la empresa cliente, le asigna estado activo y retorna un código 201.

#### Scenario: Rechazo por RUT inválido o duplicado
- **GIVEN** un intento de registro de empresa cliente
- **WHEN** el RUT no cumple el formato o dígito verificador Módulo 11, o ya existe en el sistema
- **THEN** el sistema rechaza la operación con código 400 y mensaje de error específico.

### Requirement: Gestión de Sucursales y Puntos de Faena por Empresa
El sistema SHALL permitir asociar una o múltiples sucursales a cada empresa cliente, incluyendo nombre del establecimiento, dirección, comuna, ciudad, coordenadas GPS y datos de contacto de faena.

#### Scenario: Creación de sucursal vinculada a una empresa
- **GIVEN** una empresa cliente existente en el sistema
- **WHEN** el usuario registra una sucursal con dirección, comuna y contacto
- **THEN** el sistema asocia la sucursal a la empresa cliente y la habilita para solicitudes de servicio.

### Requirement: Consulta y Búsqueda Predictiva de Clientes y Faenas
El sistema SHALL proveer endpoints y selectores optimizados con búsqueda predictiva por RUT, razón social o nombre de sucursal, aplicando paginación y filtros de estado activo.

#### Scenario: Búsqueda predictiva desde formulario de solicitud
- **GIVEN** un operador comercial planificando una atención
- **WHEN** ingresa 3 o más caracteres del RUT o razón social en el selector
- **THEN** el sistema retorna las empresas y sus sucursales activas coincidentes en tiempo inferior a 200 ms.
