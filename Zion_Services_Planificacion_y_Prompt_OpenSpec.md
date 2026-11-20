# Zion Services --- Visión, alcance y planificación del sistema

**Versión:** 1.0\
**Fecha:** 20 de noviembre de 2026\
**Estado:** Documento base para iniciar OpenSpec (`propose`)\
**Stack objetivo:** Node.js + TypeScript, React + TypeScript, MySQL\
**Despliegue inicial:** VPS administrado con EasyPanel; crecimiento
vertical y/o separación progresiva de servicios según demanda.

------------------------------------------------------------------------

## 1. Propósito del documento

Este documento consolida el levantamiento inicial realizado con el dueño
de Zion Services y las decisiones de diseño aclaradas posteriormente.
Sirve como contexto de negocio y técnico para iniciar el proyecto
mediante OpenSpec.

El objetivo es construir una plataforma modular que digitalice y permita
trazar el ciclo completo de una atención: desde la solicitud del cliente
y la planificación, pasando por inspección del vehículo, retiro,
transporte, pesaje y descarga, hasta la gestión documental, comercial,
facturación y pagos.

Este documento contiene una propuesta inicial. Los puntos marcados como
**Por confirmar** no deben convertirse en reglas definitivas ni
implementarse mediante supuestos. OpenSpec debe identificarlos como
preguntas, decisiones pendientes o requisitos sujetos a validación.

## 2. Visión del producto

**Zion Services** será una plataforma centralizada de gestión
operacional y trazabilidad documental para una empresa que retira y
transporta residuos/materiales peligrosos desde instalaciones de
clientes hacia plantas de destino autorizadas.

La plataforma debe permitir:

-   Digitalizar el proceso completo de cada atención.
-   Reemplazar WhatsApp como canal de recepción y coordinación
    operacional por flujos estructurados en el sistema y notificaciones
    por correo electrónico.
-   Mantener visibilidad del estado de cada atención para Zion y para el
    cliente, según sus permisos.
-   Digitalizar inspecciones preoperacionales de camiones.
-   Planificar jornadas y hojas de ruta respetando el flujo físico
    obligatorio de retiro, descarga y pesaje.
-   Mantener un expediente documental por atención, con historial y
    descarga ZIP.
-   Formalizar la entrega de antecedentes desde Operaciones hacia
    Gestión Comercial.
-   Controlar estados de pago, órdenes de compra, habilitación para
    facturar, facturas y pagos.
-   Permitir la evolución modular sin reconstruir el sistema.

### 2.1 Principios de diseño

1.  **Trazabilidad de extremo a extremo:** registrar quién hizo qué,
    cuándo, desde dónde y con qué resultado.
2.  **Separación de estados:** operación, documentación, comercial,
    facturación y pago tienen ciclos de vida diferentes.
3.  **Seguridad por rol y por cliente:** ningún cliente puede acceder a
    información de otro cliente.
4.  **Evidencia auditable:** conservar documentos, firmas, fotografías,
    observaciones e historial.
5.  **Mobile-first para conductores:** las tareas en terreno deben
    funcionar cómodamente desde teléfonos.
6.  **Conectividad intermitente:** evaluar operación offline limitada
    para capturar eventos y sincronizarlos posteriormente.
7.  **Modularidad pragmática:** comenzar con un monolito modular, no con
    microservicios.
8.  **Reglas configurables cuando corresponda:** evitar codificar como
    constantes reglas que pueden variar por contrato, cliente, tipo de
    residuo o procedimiento.

------------------------------------------------------------------------

## 3. Arquitectura modular del producto

### 3.1 CORE

El CORE debe proporcionar capacidades transversales:

-   Autenticación y sesiones.
-   Usuarios, roles y permisos.
-   Auditoría.
-   Parámetros y catálogos.
-   Notificaciones.
-   Gestión de archivos y documentos.
-   Historial de eventos.
-   Configuración general.

### 3.2 Módulos iniciales

  -----------------------------------------------------------------------
  Módulo                              Responsabilidad
  ----------------------------------- -----------------------------------
  Clientes y contratos                Clientes, sucursales, contactos,
                                      contratos y condiciones

  Solicitudes                         Recepción, revisión y aprobación de
                                      solicitudes

  Órdenes de servicio                 Creación y administración de
                                      órdenes

  Planificación y operaciones         Jornadas, vehículos, conductores y
                                      hojas de ruta

  Inspecciones                        Checklist preoperacional

  Ejecución en terreno                Hitos del retiro, recepción,
                                      incidencias y evidencias

  Transporte y destino                Ciclos de transporte, visitas a
                                      planta, pesajes y descarga

  Gestión documental                  Expedientes, tipos documentales,
                                      versiones y ZIP

  Gestión comercial                   Revisión, estados de pago y órdenes
                                      de compra

  Facturación y pagos                 Registro y conciliación de facturas
                                      y pagos

  Portal de clientes                  Solicitudes, seguimiento y acceso
                                      documental autorizado
  -----------------------------------------------------------------------

### 3.3 Módulos futuros

-   Finanzas ampliadas.
-   Learning / capacitación.
-   Gestión y reportería avanzada.
-   GPS y telemetría.
-   Integraciones con sistemas externos, ERP o contabilidad.

Los módulos futuros deben considerarse en el diseño de extensibilidad,
pero no ampliar el alcance del primer lanzamiento sin aprobación
explícita.

------------------------------------------------------------------------

## 4. Actores y perfiles

Perfiles iniciales propuestos, sujetos a validación:

  -----------------------------------------------------------------------
  Actor                               Responsabilidades principales
  ----------------------------------- -----------------------------------
  Administrador del sistema           Configuración, usuarios, roles y
                                      parámetros

  Gestión Comercial                   Clientes, solicitudes, condiciones,
                                      revisión documental, estados de
                                      pago y habilitación para facturar

  Jefe de Operaciones                 Planificación, asignaciones,
                                      supervisión, revisión de
                                      incidencias y documentos

  Conductor                           Inspección, consulta de jornada,
                                      registro de hitos, observaciones y
                                      evidencias

  Administración / Finanzas           Registro y seguimiento de facturas
                                      y pagos

  Cliente                             Solicitudes, consulta de atenciones
                                      y descarga de documentos
                                      autorizados

  Responsable de planta/destino       Registro o incorporación de datos
                                      de recepción y pesaje, si
                                      corresponde
  -----------------------------------------------------------------------

La matriz de permisos debe definirse por acción y recurso. No basta con
ocultar botones en el frontend: toda autorización debe validarse también
en backend.

------------------------------------------------------------------------

## 5. Proceso operacional y regla crítica de transporte

### 5.1 Flujo físico obligatorio

La operación aclarada por el dueño es la siguiente:

1.  El camión inicia la jornada en la planta de Zion Services.
2.  Se realiza la inspección preoperacional del vehículo.
3.  El camión sale hacia un cliente.
4.  En el cliente se ejecuta el retiro de residuos.
5.  El camión se dirige a la planta de destino correspondiente.
6.  En destino se realiza el pesaje del camión antes de descargar.
7.  Se descarga el residuo.
8.  Se realiza el pesaje del camión después de descargar.
9.  Se obtiene la cantidad retirada mediante la diferencia de pesajes,
    conforme al procedimiento aplicable.
10. Se gestiona la certificación/registro SIDREP y sus documentos
    asociados según el procedimiento real y las responsabilidades
    legales de cada participante.
11. Solo después de completar el ciclo operativo requerido, el camión
    puede dirigirse a otro cliente para un nuevo retiro.
12. Al terminar todas las atenciones, el camión regresa a la planta de
    Zion Services para cerrar la jornada.

**Regla de negocio esencial:** no se puede retirar residuos de un
segundo cliente antes de haber realizado el paso por la planta de
destino y el proceso de pesaje/descarga correspondiente al retiro
anterior.

Esta restricción debe implementarse en backend y validarse también al
planificar la hoja de ruta. No debe depender exclusivamente de
instrucciones al conductor.

El sistema debe admitir varias atenciones durante una jornada, pero cada
retiro debe estar seguido por su correspondiente visita a destino antes
del siguiente retiro.

### 5.2 Modelo conceptual de la jornada

-   **Jornada:** período de trabajo de un conductor y vehículo (la
    asignación exacta puede variar según la operación).
-   **Hoja de ruta:** secuencia ordenada de desplazamientos y paradas de
    la jornada.
-   **Atención / orden de servicio:** solicitud de retiro asociada a un
    cliente y establecimiento.
-   **Ciclo de transporte:** vincula un retiro concreto con su
    transporte y descarga en una planta de destino.
-   **Visita a destino:** registro de llegada, pesaje, descarga, pesaje
    posterior y salida.
-   **Tramo de ruta:** desplazamiento entre dos ubicaciones.

Relación conceptual:

``` text
JORNADA
  └── HOJA DE RUTA
      ├── Salida desde planta Zion
      ├── Atención A (retiro en Cliente A)
      │   └── Ciclo de transporte A
      │       └── Planta de destino
      │           ├── Pesaje antes de descarga
      │           ├── Descarga
      │           ├── Pesaje después de descarga
      │           └── Antecedentes SIDREP
      ├── Atención B (retiro en Cliente B)
      │   └── Ciclo de transporte B
      │       └── Planta de destino
      │           ├── Pesaje antes de descarga
      │           ├── Descarga
      │           ├── Pesaje después de descarga
      │           └── Antecedentes SIDREP
      └── Regreso a planta Zion y cierre de jornada
```

No asumir que todas las jornadas tienen exactamente dos o tres
atenciones. La cantidad debe ser variable y depender de la planificación
y capacidad operacional.

### 5.3 Pesajes

Para cada visita a destino se deben registrar, como mínimo:

-   Planta de destino.
-   Fecha y hora de llegada.
-   Peso de entrada (camión antes de descargar).
-   Fecha y hora del pesaje de entrada.
-   Peso de salida (camión después de descargar).
-   Fecha y hora del pesaje de salida.
-   Unidad de medida.
-   Identificador o número de ticket de pesaje.
-   Documento o fotografía de respaldo.
-   Fecha y hora de descarga.
-   Responsable que registra o valida.
-   Observaciones e incidencias.

Cálculo propuesto:

`cantidad_descargada = peso_entrada - peso_salida`

Guardar siempre los valores originales; no almacenar únicamente el
resultado calculado. Validar unidades y diferencias anómalas. El sistema
debe permitir registrar excepciones justificadas y auditadas.

**Por confirmar:** si el pesaje se realiza siempre con el mismo vehículo
y configuración, si existen tara conocida, pesajes por residuo o por
compartimento, y qué procedimiento se aplica ante diferencias o rechazo
de carga.

### 5.4 SIDREP

En la entrevista se mencionó "SIDRE"; se entiende que se refiere a
**SIDREP**, el Sistema de Declaración y Seguimiento de Residuos
Peligrosos.

El sistema Zion debe registrar y asociar los antecedentes SIDREP
pertinentes al ciclo de transporte y a la atención relacionada. No debe
asumir que Zion emite o certifica por sí misma el documento oficial.
Debe reflejar el rol real de Zion, del generador, del transportista y
del destinatario, y el procedimiento vigente.

Datos candidatos:

-   Número o identificador SIDREP.
-   Estado del documento.
-   Fecha de emisión/validación/certificación, según aplique.
-   Generador.
-   Transportista.
-   Destinatario.
-   Residuo declarado.
-   Cantidad declarada.
-   Documento digital o comprobante.
-   Relación con atención y ciclo de transporte.

**Por confirmar con Zion y asesoría de cumplimiento:** quién genera el
SIDREP, quién lo certifica, qué evento constituye la certificación, cómo
se obtiene el documento, qué datos deben almacenarse y qué documentos
acompañan físicamente el transporte.

------------------------------------------------------------------------

## 6. Ciclo completo de una atención

### 6.1 Solicitud

Los clientes pueden tener contrato fijo o ser clientes spot.

-   Cliente contractual: puede solicitar servicios bajo condiciones de
    su contrato.
-   Cliente spot: solicitud esporádica que puede requerir validación
    comercial.

El cliente podrá solicitar desde un portal o un usuario interno podrá
registrar la solicitud por cuenta del cliente. La aprobación automática
o manual depende de reglas contractuales aún por confirmar.

Datos candidatos:

-   Cliente y sucursal.
-   Contacto solicitante.
-   Fecha y ventana horaria solicitada.
-   Tipo de residuo.
-   Cantidad estimada y unidad.
-   Ubicación de retiro.
-   Requisitos/documentos.
-   Observaciones.
-   Adjuntos.

### 6.2 Validación y orden de servicio

Una vez aprobada la solicitud:

-   Generar un identificador único de atención.
-   Crear la orden de servicio.
-   Asociar cliente, sucursal, residuo y condiciones comerciales.
-   Crear el expediente documental.
-   Habilitar planificación.
-   Mantener historial de aprobación y modificaciones.

Zion indicó que existe o podría existir un formato de orden de servicio
en PDF/Excel. Se debe obtener el formato real y confirmar si se replica
o modifica.

### 6.3 Planificación

Operaciones debe poder:

-   Consultar atenciones aprobadas y pendientes.
-   Asignar jornada, vehículo y conductor.
-   Definir planta de destino.
-   Construir hoja de ruta con secuencia de paradas.
-   Validar capacidad y restricciones.
-   Reprogramar y reasignar con auditoría.
-   Enviar la hoja de ruta por correo cuando corresponda.

La validación de ruta debe impedir dos retiros consecutivos sin la
visita de destino y descarga correspondiente.

### 6.4 Inspección preoperacional

Actualmente existe un checklist en papel. Debe digitalizarse.

El conductor:

1.  Inicia sesión desde el teléfono.
2.  Selecciona la jornada y vehículo asignado.
3.  Completa el checklist.
4.  Registra kilometraje y datos requeridos.
5.  Adjunta fotografías y observaciones cuando corresponda.
6.  Firma o confirma la inspección según el mecanismo aprobado.
7.  Envía el resultado.

La inspección debe tener plantillas configurables y versionadas. Cada
respuesta debe poder ser Conforme, No conforme o No aplica, según la
naturaleza del ítem.

Las condiciones críticas no conformes deben bloquear la habilitación del
vehículo hasta que exista resolución o autorización de una persona
habilitada. Los criterios de criticidad deben ser configurables y
validados por Zion.

### 6.5 Ejecución del retiro en cliente

El conductor debe poder registrar:

-   Llegada al cliente.
-   Inicio y término del retiro/carga.
-   Cantidad estimada retirada, si corresponde.
-   Tipo de residuo y observaciones.
-   Fotografías.
-   Documentos recibidos.
-   Datos de quien recibe.
-   Resultado de recepción conforme.

Escenarios de recepción:

1.  Cliente recibe conforme.
2.  Cliente recibe conforme con observaciones.
3.  Cliente no firma o no recibe conforme.

En caso de ausencia de firma o disconformidad, el conductor debe
registrar motivo, observaciones y evidencia. El sistema no debe forzar
una firma inexistente ni permitir que el conductor declare una
aceptación que no ocurrió. La atención puede quedar marcada para
revisión de Operaciones.

La captura de firma en pantalla debe considerarse evidencia operativa;
no asumir que sustituye toda formalidad de firma electrónica exigible
legalmente.

### 6.6 Transporte y recepción en destino

El conductor registra el desplazamiento y llegada a la planta de
destino. Se capturan pesajes, descarga, comprobantes y antecedentes
SIDREP según el procedimiento acordado.

La aplicación debe impedir iniciar el siguiente retiro mientras no se
cumplan las condiciones de cierre del ciclo anterior. Debe existir un
mecanismo de excepción autorizado, solo si el dueño define escenarios
excepcionales reales; cada excepción requiere motivo, usuario
autorizante y auditoría.

### 6.7 Cierre de jornada

Al terminar la secuencia de atenciones, el camión regresa a la planta
Zion Services.

Registrar:

-   Llegada de regreso.
-   Kilometraje final, si corresponde.
-   Hora de término.
-   Observaciones e incidencias.
-   Documentos pendientes.
-   Responsable de cierre.

Una jornada puede quedar operacionalmente cerrada con documentos
pendientes, si las reglas de negocio lo permiten; ese estado no debe
confundirse con el cierre documental o comercial.

------------------------------------------------------------------------

## 7. Estados independientes

No utilizar un único estado global para representar todo el ciclo.
Separar al menos estas dimensiones:

  -----------------------------------------------------------------------
  Dimensión                           Estados iniciales propuestos
  ----------------------------------- -----------------------------------
  Solicitud                           Recibida, en revisión, aprobada,
                                      rechazada, requiere antecedentes

  Operación                           Pendiente de planificación,
                                      programada, asignada, en ejecución,
                                      terminada, con incidencia

  Ciclo de transporte                 Pendiente, retiro realizado, en
                                      tránsito, en destino, pesaje
                                      registrado, descarga registrada,
                                      ciclo completado, observado

  Documentación                       Pendiente, incompleta, completa,
                                      observada

  Comercial                           Pendiente de revisión, en revisión,
                                      observada, pendiente OC, habilitada
                                      para facturar

  Facturación                         No habilitada, habilitada,
                                      facturada, anulada

  Pago                                Pendiente, parcial, pagado
  -----------------------------------------------------------------------

Los nombres finales y transiciones válidas deben confirmarse durante el
análisis funcional.

Cada transición relevante debe guardar:

-   Entidad y registro afectado.
-   Estado anterior y nuevo.
-   Usuario o proceso responsable.
-   Fecha y hora.
-   Observación/motivo.
-   Canal de origen.
-   Datos de auditoría.

------------------------------------------------------------------------

## 8. Gestión documental y expediente digital

Cada atención tendrá un expediente que se completa durante todo su ciclo
de vida.

Tipos documentales candidatos:

-   Solicitud del cliente.
-   Orden de servicio.
-   Hoja de ruta.
-   Checklist preoperacional.
-   Documentos de transporte.
-   Hoja(s) de seguridad.
-   SIDREP y comprobantes relacionados.
-   Guía de despacho, cuando aplique.
-   Comprobante de retiro.
-   Recepción conforme o registro de disconformidad.
-   Fotografías.
-   Tickets de pesaje.
-   Comprobante de descarga/recepción en destino.
-   Estado de pago.
-   Orden de compra.
-   Factura.
-   Documentación adicional.

No todos los documentos aplican a todas las atenciones. La
obligatoriedad debe depender de reglas configurables según cliente,
contrato, tipo de residuo, operación y etapa.

Funcionalidades:

-   Carga desde escritorio y móvil.
-   Captura mediante cámara.
-   Clasificación por tipo.
-   Metadatos y relación con atención, jornada o ciclo.
-   Usuario y fecha de carga.
-   Versiones y reemplazos auditados.
-   Estados de revisión.
-   Documentos pendientes.
-   Descarga individual.
-   Descarga de expediente completo en ZIP.
-   Control de acceso a cada documento.
-   Registro de descargas relevantes.

El ZIP se debe generar bajo demanda, con nombres de archivo legibles y
estructura de carpetas consistente. Si el proceso tarda, usar un
worker/cola. Validar permisos antes de generar y descargar. No exponer
rutas físicas ni URLs públicas permanentes.

### Almacenamiento inicial en VPS

Como no se utilizará AWS inicialmente, se propone almacenamiento
persistente en volumen del VPS, administrado cuidadosamente desde
EasyPanel o Docker. La implementación debe encapsularse detrás de una
interfaz de almacenamiento para permitir migrar a S3, almacenamiento
compatible con S3 u otro proveedor más adelante.

Requisitos:

-   Archivos fuera del filesystem efímero del contenedor.
-   Límites de tamaño y tipos MIME permitidos.
-   Nombres internos no controlados por el usuario.
-   Antivirus/escaneo si la infraestructura lo permite.
-   Backups consistentes de archivos y base de datos.
-   Cifrado en tránsito y protección de acceso.
-   Política de retención y eliminación por definir.

------------------------------------------------------------------------

## 9. Portal de clientes y seguimiento

Cada cliente tendrá acceso a sus propias solicitudes, atenciones y
documentos autorizados.

Funcionalidades:

-   Crear solicitudes.
-   Consultar solicitudes anteriores.
-   Ver órdenes de servicio.
-   Consultar estados e hitos.
-   Consultar fecha programada.
-   Ver observaciones que Zion decida compartir.
-   Descargar documentos autorizados.
-   Recibir correos de cambios relevantes.

El seguimiento inicial puede realizarse mediante hitos y estados
registrados por el conductor y el personal de Zion. No afirmar que
existe ubicación GPS en tiempo real si no se implementa una integración
GPS.

La visibilidad de documentos debe configurarse por tipo documental y
perfil. No asumir que el cliente puede ver todo el expediente interno.

La interfaz de conductor debe ser responsive/PWA. La capacidad offline
debe definirse con alcance explícito: qué datos se pueden consultar, qué
eventos se pueden capturar y cómo resolver conflictos de sincronización.

------------------------------------------------------------------------

## 10. Gestión comercial, facturación y pagos

Flujo propuesto:

1.  Operaciones entrega digitalmente el expediente.
2.  Gestión Comercial revisa documentos y datos de la atención.
3.  Se registran observaciones o se valida.
4.  Se prepara el estado de pago.
5.  Se relacionan una o varias atenciones con el estado de pago, según
    el modelo comercial.
6.  Se registra la orden de compra cuando sea requerida.
7.  Gestión Comercial habilita para facturar.
8.  Se registra la factura.
9.  Se registran pagos y abonos.
10. Se asignan pagos a facturas y se calcula saldo.

Estados comerciales candidatos:

-   Pendiente de revisión.
-   En revisión.
-   Documentación observada.
-   Pendiente de orden de compra.
-   Habilitado para facturar.
-   Facturado.
-   Pago parcial.
-   Pagado.

El sistema debe soportar, si el negocio lo confirma:

-   Una orden de compra que cubra varias atenciones.
-   Un estado de pago que agrupe varias atenciones.
-   Una factura que agrupe varios servicios.
-   Pagos parciales.
-   Un pago distribuido entre varias facturas.
-   Notas de crédito o anulaciones, si se incorporan al alcance.

No implementar emisión tributaria electrónica sin definir previamente si
se integrará con un proveedor/ERP o si solo se registrarán facturas
emitidas externamente.

------------------------------------------------------------------------

## 11. Dashboard y reportes

### Dashboard de Operaciones

-   Atenciones solicitadas.
-   Atenciones pendientes de planificación.
-   Atenciones programadas.
-   Atenciones en ejecución.
-   Camiones y conductores asignados.
-   Jornadas activas.
-   Ciclos de transporte pendientes de descarga.
-   Incidencias.
-   Jornadas no cerradas.

### Dashboard Documental

-   Expedientes incompletos.
-   Documentos pendientes por atención.
-   Documentos observados.
-   Documentos pendientes de recepción/certificación.
-   Antigüedad de pendientes.

### Dashboard Comercial/Financiero

-   Atenciones pendientes de revisión.
-   Estados de pago en preparación.
-   Órdenes de compra pendientes.
-   Atenciones habilitadas para facturar.
-   Facturas registradas.
-   Saldos pendientes.
-   Pagos parciales y vencimientos.

Filtros por fecha, cliente, sucursal, conductor, vehículo, residuo,
destino y estado, según permisos.

------------------------------------------------------------------------

## 12. Arquitectura técnica propuesta

### 12.1 Stack

  -----------------------------------------------------------------------
  Capa                                Tecnología
  ----------------------------------- -----------------------------------
  Frontend                            React + TypeScript

  UI                                  Material UI u otra librería
                                      acordada

  Backend                             Node.js + TypeScript

  API                                 REST

  Framework backend                   Express (propuesta inicial)

  Base de datos                       MySQL 8

  ORM                                 Prisma (propuesta inicial)

  Validación                          Zod u otra solución consistente

  Autenticación                       Sesiones seguras o JWT con refresh
                                      token, decisión por arquitectura

  Archivos                            Volumen persistente del VPS detrás
                                      de una abstracción de storage

  Correo                              SMTP o proveedor transaccional

  Procesos asíncronos                 Worker; Redis/BullMQ cuando sea
                                      necesario

  Despliegue                          Docker + EasyPanel

  Proxy/HTTPS                         EasyPanel y/o Nginx según
                                      configuración

  Versionamiento                      Git

  Pruebas                             Unitarias, integración y E2E
  -----------------------------------------------------------------------

Las tecnologías son una propuesta y deben confirmarse en el `propose`
según las restricciones del entorno, experiencia del desarrollador y
compatibilidad de versiones.

### 12.2 Estilo arquitectónico

Comenzar con un **monolito modular**. No crear microservicios en la
primera versión.

Separar módulos por dominio y responsabilidades. Los módulos deben
comunicarse mediante servicios/casos de uso internos y contratos claros,
evitando dependencias circulares.

Estructura orientativa:

``` text
zion-services/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── config/
│   │       ├── common/
│   │       ├── middleware/
│   │       ├── modules/
│   │       │   ├── auth/
│   │       │   ├── users/
│   │       │   ├── clients/
│   │       │   ├── contracts/
│   │       │   ├── requests/
│   │       │   ├── service-orders/
│   │       │   ├── operations/
│   │       │   ├── shifts/
│   │       │   ├── routes/
│   │       │   ├── vehicles/
│   │       │   ├── inspections/
│   │       │   ├── transport-cycles/
│   │       │   ├── weighings/
│   │       │   ├── sidrep/
│   │       │   ├── documents/
│   │       │   ├── commercial/
│   │       │   ├── invoicing/
│   │       │   └── notifications/
│   │       ├── jobs/
│   │       └── server.ts
│   └── web/
│       └── src/
│           ├── app/
│           ├── components/
│           ├── modules/
│           ├── layouts/
│           ├── routes/
│           └── services/
├── packages/
│   └── shared/          # Tipos y contratos compartidos, si aplica
├── prisma/
├── tests/
├── infra/
│   ├── docker/
│   └── easypanel/
├── docs/
└── openspec/
```

Cada módulo backend puede organizarse con:

``` text
module-name/
├── module.routes.ts
├── module.controller.ts
├── module.service.ts
├── module.repository.ts
├── module.schema.ts
└── module.types.ts
```

No es obligatorio imponer esta estructura si OpenSpec o el repositorio
existente establecen convenciones distintas. Primero inspeccionar el
proyecto real.

### 12.3 Despliegue VPS + EasyPanel

Servicios iniciales candidatos:

-   Frontend React compilado y servido estáticamente.
-   API Node.js.
-   MySQL.
-   Volumen persistente para archivos.
-   Worker para tareas pesadas, cuando se necesite.

Consideraciones:

-   No guardar documentos en capas efímeras de contenedores.
-   Volúmenes persistentes para MySQL y documentos.
-   Backups automáticos y pruebas periódicas de restauración.
-   Copia externa al VPS.
-   HTTPS.
-   Firewall y acceso restringido a la base de datos.
-   Secretos en variables de entorno seguras, nunca en Git.
-   Logs con rotación y sin exponer información sensible.
-   Monitoreo de CPU, RAM, disco, base de datos y procesos.
-   Límites de subida y almacenamiento.
-   Plan de actualización y rollback.
-   Separar servicios progresivamente cuando la carga lo justifique.

El dimensionamiento inicial del VPS queda **por confirmar** tras conocer
usuarios concurrentes, atenciones diarias, volumen promedio de
documentos, retención y necesidades de disponibilidad.

------------------------------------------------------------------------

## 13. Modelo de datos conceptual inicial

Este listado no sustituye el ERD ni el diccionario de datos. Es una guía
para el análisis de OpenSpec.

### Maestros

-   `clients`
-   `client_branches`
-   `client_contacts`
-   `contracts`
-   `contract_rates`
-   `users`
-   `roles`
-   `permissions`
-   `user_roles`
-   `vehicles`
-   `drivers`
-   `waste_types`
-   `destinations`

### Solicitudes y servicios

-   `service_requests`
-   `service_request_items` (si una solicitud puede contener varios
    residuos/ítems; por confirmar)
-   `service_orders`
-   `service_order_items` (si aplica)
-   `service_status_history`

### Jornadas y rutas

-   `work_shifts`
-   `route_sheets`
-   `route_stops`
-   `transport_legs`
-   `shift_assignments` o tablas de asignación equivalentes

### Inspecciones

-   `inspection_templates`
-   `inspection_template_versions`
-   `inspection_items`
-   `vehicle_inspections`
-   `vehicle_inspection_answers`

### Ejecución y transporte

-   `service_executions`
-   `service_receptions`
-   `transport_cycles`
-   `destination_visits`
-   `weighings`
-   `sidrep_documents`
-   `service_incidents`

### Documentos

-   `document_types`
-   `documents`
-   `document_links` o relaciones específicas con las entidades
-   `document_versions`
-   `document_audit_logs`

### Comercial y financiero

-   `payment_statements`
-   `payment_statement_details`
-   `purchase_orders`
-   `invoices`
-   `invoice_details`
-   `payments`
-   `payment_allocations`

### Transversales

-   `audit_logs`
-   `notifications`
-   `email_logs`
-   `sessions`
-   `system_parameters`

**Decisiones de modelado pendientes:**

-   Si una orden representa un solo retiro o puede incluir múltiples
    residuos.
-   Si una jornada asigna siempre un vehículo y un conductor o admite
    relevos.
-   Si una hoja de ruta es única por jornada o puede haber varias.
-   Cómo se modela una visita a destino cuando la planta recibe residuos
    de distintos tipos o compartimentos.
-   Si SIDREP se relaciona uno a uno o uno a varios con los ciclos de
    transporte.
-   Si los documentos se vinculan mediante relaciones explícitas por
    entidad o una tabla polimórfica controlada.
-   Cómo se gestionan anulaciones, reprogramaciones, retiros parciales y
    viajes fallidos.

------------------------------------------------------------------------

## 14. Seguridad, auditoría y calidad

Requisitos transversales:

-   Control de acceso por rol, cliente y recurso.
-   Validación de permisos en backend.
-   Contraseñas con hash seguro.
-   Protección de sesiones y tokens.
-   Validación de entradas y archivos.
-   Prevención de acceso horizontal entre clientes.
-   Auditoría de cambios críticos.
-   Historial de estados.
-   Registro de descargas sensibles.
-   Protección de secretos.
-   Backups y restauración probada.
-   Manejo centralizado de errores.
-   Logs sin credenciales ni datos sensibles innecesarios.
-   Pruebas automatizadas para reglas críticas.

Reglas críticas que deben tener pruebas:

1.  No iniciar un segundo retiro sin cerrar el ciclo de transporte
    anterior.
2.  No habilitar salida si la inspección tiene un incumplimiento crítico
    no resuelto.
3.  No permitir que un cliente consulte información de otro.
4.  No habilitar facturación si faltan validaciones requeridas.
5.  No permitir que un usuario sin permiso altere pesajes o
    certificaciones.
6.  Mantener historial de cambios y excepciones.
7.  Calcular la cantidad descargada a partir de pesajes válidos y
    unidades compatibles.
8.  No permitir modificar silenciosamente documentos o datos auditables.

------------------------------------------------------------------------

## 15. Fases de implementación propuestas

El orden debe ajustarse luego de validar dependencias y prioridades.

### Fase 0 --- Descubrimiento y definición

-   Inspección del repositorio y convenciones OpenSpec.
-   Validación de procesos con Zion.
-   Recolección de formatos actuales.
-   Confirmación de actores y permisos.
-   Definición de estados y reglas.
-   ERD inicial.
-   Riesgos y decisiones pendientes.

### Fase 1 --- CORE

-   Autenticación.
-   Usuarios, roles y permisos.
-   Clientes, sucursales y contactos.
-   Contratos y catálogos.
-   Auditoría.
-   Configuración.

### Fase 2 --- Solicitudes y órdenes

-   Portal de clientes.
-   Registro de solicitudes internas y externas.
-   Validaciones contractuales/comerciales.
-   Aprobación.
-   Orden de servicio.
-   Hoja de ruta.
-   Notificaciones por correo.

### Fase 3 --- Jornadas y ejecución

-   Vehículos y conductores.
-   Jornadas.
-   Asignaciones.
-   Inspección preoperacional.
-   PWA de conductores.
-   Registro de llegada y retiro.
-   Recepción conforme/observada.
-   Incidencias.

### Fase 4 --- Transporte, destino y SIDREP

-   Ciclos de transporte.
-   Secuencia obligatoria de paradas.
-   Visitas a destino.
-   Pesaje de entrada y salida.
-   Descarga.
-   Registro documental SIDREP.
-   Validaciones para habilitar el siguiente retiro.

### Fase 5 --- Expediente documental

-   Carga y clasificación.
-   Versiones.
-   Reglas de documentos obligatorios.
-   Revisión documental.
-   Descarga ZIP.
-   Almacenamiento persistente y backups.

### Fase 6 --- Gestión comercial y financiera

-   Revisión comercial.
-   Estados de pago.
-   Órdenes de compra.
-   Habilitación para facturar.
-   Registro de facturas.
-   Pagos y asignaciones.
-   Reportes de saldos.

### Fase 7 --- Evolución

-   GPS, si se confirma.
-   Operación offline avanzada.
-   Integraciones.
-   Learning.
-   Finanzas ampliadas.
-   Gestión y analítica.

------------------------------------------------------------------------

## 16. Preguntas abiertas que requieren respuesta de Zion

No asumir respuestas. Mantenerlas como decisiones pendientes en
OpenSpec.

### Solicitudes

-   ¿Los clientes contractuales tienen aprobación automática, aprobación
    de Zion o reglas por contrato?
-   ¿Qué validaciones debe cumplir una solicitud spot?
-   ¿Qué usuarios internos pueden registrar solicitudes en nombre del
    cliente?

### Orden de servicio

-   ¿Cuál es el formato actual PDF/Excel?
-   ¿Qué campos son obligatorios?
-   ¿Quién puede aprobar, modificar o anular una orden?

### Hojas de ruta y jornadas

-   ¿Una hoja de ruta contiene varias atenciones y ciclos de transporte?
-   ¿Puede cambiar la planta de destino entre ciclos?
-   ¿Qué ocurre si la planta de destino rechaza una carga o no puede
    recibirla?
-   ¿Cómo se autorizan excepciones al flujo normal?
-   ¿Qué datos marcan el inicio y cierre de jornada?

### Seguimiento

-   ¿Seguimiento por actualización de estados o GPS además de estados?
-   ¿Qué hitos se muestran al cliente?
-   ¿Qué información debe ser exclusivamente interna?

### Documentos

-   ¿Existe checklist documental obligatorio?
-   ¿Qué documentos dependen del cliente, residuo o destino?
-   ¿Quién entrega cada documento?
-   ¿Quién valida la documentación?
-   ¿Qué documentos puede ver el cliente?

### Comercial y facturación

-   ¿Los estados de pago se generan por atención, cliente/período o
    grupo de atenciones?
-   ¿Una OC puede cubrir múltiples atenciones?
-   ¿Una factura puede agrupar varios estados de pago?
-   ¿Se registrarán facturas emitidas externamente o se integrará con un
    sistema de facturación?
-   ¿Cómo se asignan pagos parciales?

### Clientes y acceso

-   ¿El cliente ve todos los documentos o solo documentos autorizados?
-   ¿Puede haber varios usuarios por cliente con distintos permisos?
-   ¿Quién administra los usuarios del portal?

### Operación e infraestructura

-   Cantidad de camiones, conductores y usuarios.
-   Atenciones promedio y máximas por día.
-   Tamaño y cantidad promedio de documentos.
-   Retención documental requerida.
-   Disponibilidad y horarios de operación.
-   Conectividad móvil habitual de los conductores.
-   Datos del VPS disponible y política de backup.

------------------------------------------------------------------------

## 17. Alcance recomendado del primer lanzamiento

Para evitar un proyecto demasiado grande, se recomienda acordar un MVP
que permita completar un ciclo operacional real y demostrar
trazabilidad.

**MVP sugerido:**

1.  Usuarios, roles y clientes.
2.  Solicitud y aprobación.
3.  Orden de servicio.
4.  Jornada y hoja de ruta.
5.  Asignación de camión y conductor.
6.  Checklist preoperacional.
7.  Registro del retiro y recepción del cliente.
8.  Ciclo obligatorio de transporte a destino.
9.  Pesajes antes y después de descargar.
10. Registro de antecedentes SIDREP.
11. Expediente documental y ZIP.
12. Seguimiento por estados para Zion y cliente.

La gestión comercial, estados de pago, OC, facturas y pagos puede
implementarse en una fase posterior, salvo que el dueño la defina como
indispensable para el primer piloto.

------------------------------------------------------------------------

# 18. Prompt para iniciar el primer `openspec propose`

El siguiente prompt está diseñado para ejecutarse en el asistente de
desarrollo que tenga acceso al repositorio y a OpenSpec. Se recomienda
pegarlo como primera solicitud del proyecto.

``` text
Actúa como arquitecto de software senior, analista funcional y líder técnico.
Debes iniciar el diseño de un sistema empresarial llamado ZION SERVICES
utilizando el flujo de trabajo OpenSpec.

OBJETIVO DE ESTA TAREA
Ejecutar el primer OpenSpec PROPOSE para definir la propuesta inicial del
producto, su arquitectura, dominios, alcance del MVP, reglas críticas,
requerimientos funcionales y no funcionales, riesgos y preguntas abiertas.

IMPORTANTE: EN ESTA ETAPA NO IMPLEMENTES CÓDIGO.
No crees tablas reales, endpoints, componentes ni migraciones todavía.
Primero analiza el repositorio y las convenciones existentes de OpenSpec.
Luego prepara una propuesta coherente, verificable y suficientemente
detallada para revisión humana.

CONTEXTO DEL NEGOCIO
Zion Services es una empresa que retira y transporta residuos/materiales
peligrosos desde instalaciones de clientes hacia plantas de destino.
Necesita digitalizar el proceso desde la solicitud de atención hasta el
cierre operacional, documental y comercial.

La plataforma debe reemplazar procesos informales basados principalmente
en WhatsApp por solicitudes estructuradas, seguimiento y notificaciones
por correo electrónico.

STACK E INFRAESTRUCTURA
- Frontend: React + TypeScript.
- Backend: Node.js + TypeScript.
- API: REST.
- Base de datos: MySQL 8.
- Despliegue inicial: VPS administrado con EasyPanel.
- Contenedores Docker.
- Archivos en almacenamiento persistente del VPS inicialmente.
- Diseñar una abstracción de almacenamiento que permita migrar a otro
  proveedor en el futuro.
- No utilizar AWS como requisito ni como infraestructura inicial.
- Comenzar con un monolito modular; no proponer microservicios para el MVP.
- Las tecnologías concretas (Express, Prisma, librería UI, colas) deben
  contrastarse con el repositorio y justificarse antes de fijarse.

REGLA OPERACIONAL CRÍTICA — NO ALTERAR
El flujo físico de cada jornada es obligatorio:

PLANTA ZION
  -> CLIENTE A (retiro)
  -> PLANTA DE DESTINO (pesaje antes de descargar, descarga, pesaje
     después de descargar y gestión de antecedentes SIDREP)
  -> CLIENTE B (si existe otra atención)
  -> PLANTA DE DESTINO (mismo proceso)
  -> CLIENTE C (si existe otra atención)
  -> PLANTA DE DESTINO (mismo proceso)
  -> PLANTA ZION (fin de jornada).

Un camión NUNCA puede retirar residuos de dos clientes consecutivos sin
pasar primero por una planta de destino y completar el proceso de pesaje
y descarga correspondiente al retiro anterior.

Esta regla debe ser una invariante de negocio validada en backend y en
la planificación de rutas. No basta con validarla en el frontend.

CONCEPTOS QUE DEBEN DISTINGUIRSE
- Jornada: período de trabajo del conductor y vehículo.
- Hoja de ruta: secuencia ordenada de desplazamientos y paradas.
- Atención/orden de servicio: retiro solicitado por un cliente.
- Ciclo de transporte: vincula un retiro específico con su transporte
  y descarga en destino.
- Visita a destino: llegada, pesaje de entrada, descarga, pesaje de
  salida y salida de la planta.
- Tramo de ruta: desplazamiento entre ubicaciones.

Una jornada puede incluir varias atenciones, pero cada atención debe
tener su ciclo de transporte y descarga antes de la siguiente atención.

PESAJE
En la planta de destino se pesa el camión antes de descargar y después
de descargar. La cantidad descargada se calcula como:

cantidad descargada = peso de entrada - peso de salida.

Conservar los dos pesajes originales, unidades, fechas, horas y
comprobantes. No almacenar únicamente el resultado calculado.
Contemplar validaciones de unidades y excepciones auditadas.

SIDREP
La entrevista menciona SIDRE; se entiende que se refiere a SIDREP
(Sistema de Declaración y Seguimiento de Residuos Peligrosos).
El sistema debe registrar y relacionar los antecedentes/documentos
SIDREP con el ciclo de transporte y la atención.

NO asumir que Zion genera o certifica por sí misma el SIDREP.
Debe quedar como pregunta abierta quién genera, valida o certifica
el documento en cada etapa, qué rol tiene cada participante y cómo
se obtiene el documento oficial.

PROCESO FUNCIONAL
1. Cliente contractual o spot solicita un retiro.
2. Se valida la solicitud según las reglas comerciales.
3. Se aprueba y genera una orden de servicio.
4. Operaciones planifica jornada, vehículo, conductor y hoja de ruta.
5. Conductor realiza checklist preoperacional.
6. Se registra salida desde Zion.
7. Se registra llegada y retiro en el cliente.
8. Se registra recepción conforme, observaciones o ausencia de firma.
9. Se dirige a planta de destino.
10. Se registran pesajes antes y después de descarga.
11. Se registra descarga y antecedentes SIDREP aplicables.
12. Se habilita el siguiente retiro de la jornada.
13. Al terminar, el camión regresa a Zion y se cierra la jornada.
14. Operaciones completa/revisa el expediente documental.
15. Gestión Comercial revisa antecedentes y prepara estado de pago.
16. Se espera OC cuando corresponda.
17. Gestión Comercial habilita para facturar.
18. Se registra factura y se relacionan pagos/abonos.

DOCUMENTOS
Cada atención tendrá expediente digital, con documentos que pueden
incorporarse durante todo el ciclo.
Candidatos: solicitud, orden de servicio, hoja de ruta, checklist,
documentos de transporte, hojas de seguridad, SIDREP, guía de despacho
cuando aplique, recepción conforme, fotografías, tickets de pesaje,
comprobante de descarga, estado de pago, OC, factura y otros.

Los documentos obligatorios dependen posiblemente del cliente, contrato,
residuo, destino y etapa. No asumir que todos aplican siempre.
Debe existir carga, clasificación, metadatos, historial/versiones,
control de permisos y descarga ZIP del expediente.

CLIENTES
Existen clientes contractuales y clientes spot.
Debe existir portal de clientes para solicitudes, consulta de estados
y descarga de documentos autorizados.
La visibilidad documental debe controlarse por permisos.
No asumir que los clientes pueden ver todos los documentos internos.

CONDUCTORES
Interfaz responsive/PWA para teléfonos.
Debe permitir consultar jornada y ruta, completar checklist,
registrar hitos, observaciones, fotografías, recepción y documentos.
Evaluar conectividad intermitente y sincronización offline como decisión
de alcance, sin prometer GPS.
El seguimiento inicial es por hitos/estados. GPS es una funcionalidad
futura salvo confirmación expresa.

ESTADOS
Separar estados de:
- Solicitud.
- Operación.
- Ciclo de transporte.
- Documentación.
- Gestión comercial.
- Facturación.
- Pago.

No utilizar un único estado global para toda la atención.
Toda transición relevante debe guardar estado anterior/nuevo,
responsable, fecha/hora, observación y origen.

COMERCIAL Y FINANZAS
El jefe de Operaciones entrega documentos digitalmente.
Gestión Comercial revisa, genera/prepara estado de pago, valida OC
cuando corresponda y habilita para facturar.
Luego se registra factura y se relacionan pagos.
Dejar abiertas las reglas de agrupación: por atención, cliente/período
o grupo de atenciones. Contemplar potencialmente pagos parciales,
pero validar el alcance.

MÓDULOS
CORE:
- autenticación, usuarios, roles, permisos, auditoría, parámetros,
  notificaciones y documentos.
MVP:
- clientes y contratos;
- solicitudes;
- órdenes de servicio;
- jornadas y hojas de ruta;
- vehículos y conductores;
- inspecciones;
- ejecución de retiro;
- ciclos de transporte, destino y pesajes;
- antecedentes SIDREP;
- expediente documental y ZIP;
- portal de clientes y seguimiento por estados.
Fases posteriores:
- gestión comercial completa;
- estados de pago, OC, facturación y pagos;
- GPS;
- Learning;
- Finanzas ampliadas;
- Gestión y analítica;
- integraciones externas.

ARQUITECTURA
Proponer monolito modular con límites claros por dominio.
Evaluar módulos:
auth, users, roles, clients, contracts, requests, service-orders,
operations, shifts, routes, vehicles, drivers, inspections,
service-executions, transport-cycles, destinations, weighings,
sidrep, documents, commercial, invoicing, payments, notifications.

Separar responsabilidades:
- routes;
- controllers;
- services/use cases;
- repositories;
- schemas/validators;
- types/contracts.

Evitar dependencias circulares.
Definir auditoría y autorización en backend.
No diseñar microservicios para el MVP.

INFRAESTRUCTURA
Diseñar para VPS + EasyPanel + Docker.
Frontend, API, MySQL y worker pueden ser servicios/contendedores separados.
MySQL y archivos deben usar almacenamiento persistente.
No depender de filesystem efímero de contenedores.
Considerar backups externos al VPS, restauración probada, HTTPS,
secretos, firewall, logs con rotación, monitoreo y rollback.
El dimensionamiento del VPS debe quedar pendiente de métricas reales.

SEGURIDAD Y CALIDAD
Incluir requisitos para:
- autorización por rol, cliente y recurso;
- aislamiento de datos entre clientes;
- validación de archivos;
- protección de credenciales y sesiones;
- auditoría de cambios críticos;
- historial de documentos y estados;
- backups y recuperación;
- logs sin secretos;
- pruebas unitarias, integración y E2E.

CASOS CRÍTICOS QUE DEBEN QUEDAR EXPLÍCITOS
1. No permitir un segundo retiro sin completar el ciclo de transporte
   y descarga del retiro anterior.
2. No habilitar salida del vehículo con incumplimiento crítico de
   inspección no resuelto.
3. Un cliente no puede consultar datos de otro cliente.
4. No habilitar facturación sin las validaciones comerciales requeridas.
5. No permitir modificar pesajes/documentos auditables sin historial.
6. Registrar excepciones con motivo y usuario autorizante.
7. Validar pesajes y unidades.
8. Registrar recepción no conforme o sin firma sin inventar aceptación.

INSTRUCCIONES DE TRABAJO PARA OPENSPEC
1. Inspecciona primero el repositorio, estructura, archivos de configuración,
   documentación y convenciones actuales de OpenSpec.
2. Comprueba la versión y el formato de OpenSpec disponibles en el proyecto.
   No inventes nombres de comandos, carpetas ni formatos.
3. Revisa si ya existen specs, changes o decisiones previas. No sobrescribas
   trabajo existente.
4. Identifica qué capacidades deben crearse o modificarse.
5. Formula una propuesta inicial de alto nivel, separando capacidades
   funcionales y requisitos transversales.
6. Crea el change mediante el flujo `openspec propose` y genera los artefactos
   que correspondan a la versión instalada de OpenSpec.
7. No implementes código ni modifiques archivos de aplicación.
8. No inventes respuestas a las preguntas abiertas.
9. Si faltan datos, registra preguntas concretas y sus consecuencias.
10. Evita convertir todo el roadmap futuro en alcance del MVP.
11. Mantén trazabilidad entre objetivos, requisitos, escenarios de aceptación,
    reglas de negocio y riesgos.
12. Asegúrate de que la regla de secuencia retiro -> destino/pesaje/descarga
    -> siguiente retiro esté expresada como requisito verificable.

ENTREGABLES DEL PROPOSE
- Resumen del problema y objetivos del producto.
- Alcance del MVP y exclusiones.
- Capacidades/dominios propuestos.
- Requisitos funcionales.
- Requisitos no funcionales.
- Reglas de negocio e invariantes.
- Escenarios de aceptación verificables.
- Arquitectura lógica inicial y límites modulares.
- Modelo conceptual de entidades y relaciones, sin fijar prematuramente
  detalles que dependan de respuestas pendientes.
- Estrategia de seguridad, auditoría y documentos.
- Estrategia de despliegue VPS + EasyPanel.
- Riesgos y dependencias.
- Preguntas abiertas priorizadas.
- Plan de fases sugerido.

CRITERIOS DE CALIDAD
La propuesta debe ser específica para Zion Services, no una plantilla
genérica de CRUD.
Debe reflejar fielmente el flujo físico de los camiones.
Debe separar atención, jornada, hoja de ruta y ciclo de transporte.
Debe separar estados operacionales, documentales y comerciales.
Debe distinguir hechos confirmados de supuestos y preguntas pendientes.
Debe poder revisarse con el dueño antes de comenzar la implementación.

Al finalizar:
- Resume los artefactos OpenSpec creados y sus rutas.
- Indica qué decisiones requieren validación del dueño.
- Indica qué requisitos críticos quedaron cubiertos.
- No comiences la implementación hasta recibir aprobación explícita
  de la propuesta.
```

------------------------------------------------------------------------

## 19. Cómo utilizar el prompt

1.  Crea o abre el repositorio de Zion Services.
2.  Inicializa OpenSpec según la versión y las instrucciones oficiales
    que estés utilizando.
3.  Abre el proyecto en tu IDE con el agente que utilizarás para
    desarrollar.
4.  Pega el prompt anterior como primera solicitud.
5.  Revisa el `proposal` generado y valida especialmente el flujo de
    transporte, las entidades y los estados.
6.  No apruebes la propuesta hasta revisar las preguntas abiertas con el
    dueño.

**Recomendación:** no le pidas al agente que implemente el sistema en la
misma solicitud. Primero queremos que OpenSpec produzca una propuesta
que podamos revisar y corregir. La implementación debe comenzar después
de aprobar los requisitos y escenarios de aceptación.
