# Spec Delta: transport-cycle

## MODIFIED Requirements

### Requirement: Registro de Llegada a Faena y Firma de Orden de Trabajo
Al arribar a la dirección del cliente, el conductor SHALL registrar la hora exacta de llegada en la tablet con coordenadas GPS verificadas, y solicitar al encargado del cliente la autorización de inicio de faena capturando su firma táctil corta manuscrita, Nombre, Apellido y RUT. El backend SHALL persistir transaccionalmente estos datos en la tabla `ciclos_transporte` mediante Prisma, guardando el archivo de la firma táctil en el volumen de disco persistente (`/app/uploads/ciclo-transporte/firmas/`) y almacenando solo su ruta relativa corta (< 191 caracteres).

#### Scenario: Registro persistente de llegada con coordenadas GPS en base de datos
- **GIVEN** un camión posicionado en la instalación del cliente y una orden de servicio activa
- **WHEN** el conductor pulsa `Marcar Llegada` en la tablet enviando `cicloTransporteId`, hora y coordenadas GPS
- **THEN** el sistema actualiza en MySQL el registro `CicloTransporte` con la fecha y hora de llegada, actualiza el estado a `EN_FAENA`, y responde confirmando la habilitación de la firma de inicio.

#### Scenario: Persistencia de firma táctil y autorización de faena en disco y MySQL
- **GIVEN** un ciclo de transporte en estado `EN_FAENA`
- **WHEN** el conductor envía el formulario de autorización con el Nombre, Apellido, RUT y la firma táctil en Base64/Data URL
- **THEN** el sistema decodifica y almacena la firma física en `/app/uploads/ciclo-transporte/firmas/`, guarda la ruta relativa corta y los datos del encargado en el modelo `CicloTransporte`, cambia el estado a `FAENA_AUTORIZADA` y desbloquea la captura de evidencias fotográficas de faena y EPP.

### Requirement: Evidencia Fotográfica de Trabajo en Proceso y Uso de EPP
Inmediatamente después de autorizada la faena, el sistema SHALL permitir al conductor cargar fotografías del trabajo en ejecución y de la verificación de EPP de la cuadrilla. El backend SHALL decodificar las imágenes, escribirlas físicamente en el volumen persistente de disco (`/app/uploads/ciclo-transporte/fotos/`), indexarlas de inmediato en el `ExpedienteDocumental` bajo las categorías `FOTO_FAENA_PROCESO` y `FOTO_EPP_SEGURIDAD`, y registrar la ruta corta en MySQL.

#### Scenario: Persistencia física de fotos de faena y EPP e indexación en expediente
- **GIVEN** un servicio con estado de ciclo `FAENA_AUTORIZADA`
- **WHEN** el conductor captura y envía fotografías de la succión en proceso o del uso de EPP con su descripción
- **THEN** el sistema almacena las imágenes binarias en el disco persistente, crea las entradas correspondientes en `documentos_expediente` asociadas a la orden de servicio, y retorna la confirmación con la URL relativa accesible.

#### Scenario: Bloqueo de carga de evidencias si la faena no ha sido autorizada
- **GIVEN** una orden de servicio en la que aún no se ha completado la firma de autorización de inicio
- **WHEN** se intenta enviar una fotografía de faena o EPP
- **THEN** el sistema rechaza la solicitud con código HTTP 400 y mensaje de error indicando que la Orden de Trabajo debe ser autorizada antes de registrar evidencias.

### Requirement: Acta de Recepción Conforme y Cierre de Faena en Tablet
Al concluir la extracción y limpieza, el cliente SHALL validar el trabajo firmando en la tablet el acta de recepción conforme, o registrando observaciones detalladas o constancia de negativa de firma sin falsear conformidad. El backend SHALL persistir el registro en la tabla `actas_recepcion`, almacenar la firma y/o foto de respaldo en disco persistente, indexar el documento en el expediente documental y actualizar la `OrdenServicio` al estado correspondiente (`RETIRO_COMPLETADO` o `RECEPCION_OBSERVADA`).

#### Scenario: Firma digital de recepción conforme persistida en pantalla
- **GIVEN** la faena concluida con fotos cargadas en el expediente
- **WHEN** el cliente valida los trabajos e ingresa su nombre, RUT y firma manuscrita en la tablet con tipo `CONFORME`
- **THEN** el sistema guarda la firma como archivo físico en disco, crea el registro en `ActaRecepcion` con la ruta relativa de la firma, actualiza el `CicloTransporte` y la `OrdenServicio` al estado `RETIRO_COMPLETADO`, e indexa el acta en el expediente documental.

#### Scenario: Registro de recepción observada o con negativa de firma
- **GIVEN** una discrepancia o negativa del encargado a firmar la recepción
- **WHEN** el conductor registra la causa en la tablet adjuntando una foto de respaldo del lugar o libro de novedades
- **THEN** el sistema almacena la foto de respaldo físicamente en disco, crea el registro `ActaRecepcion` con tipo `CON_OBSERVACIONES` o `RECHAZADA`, graba el estado como `RECEPCION_OBSERVADA` y notifica a Operaciones.
