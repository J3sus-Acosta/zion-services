# Spec Delta: local-storage

## ADDED Requirements

### Requirement: Almacenamiento Persistente en Volumen Local Docker
El sistema SHALL almacenar todos los archivos binarios (fotografías, documentos PDF oficiales y firmas capturadas) exclusivamente en el disco local persistente del contenedor definido por la variable de entorno `STORAGE_PATH` (por defecto `/app/uploads`), prohibiendo terminantemente el uso de servicios externos en la nube como AWS S3 o Azure Blob Storage.

#### Scenario: Guardado físico de archivos binarios en ruta configurada
- **GIVEN** una solicitud de persistencia de un archivo binario o imagen en el backend
- **WHEN** el servicio de almacenamiento recibe el contenido y la categoría correspondiente
- **THEN** el sistema escribe el archivo físicamente en el volumen persistente montado en `STORAGE_PATH` y devuelve la ruta relativa interna para su acceso.

#### Scenario: Creación automática de estructura de directorios
- **GIVEN** una categoría o subdirectorio que aún no existe en el sistema de archivos (ej. `inspecciones`, `ciclo-transporte`, `bitacora`, `documentos`)
- **WHEN** se procede a almacenar el primer archivo en dicha ubicación
- **THEN** el sistema crea de manera recursiva la jerarquía de carpetas necesaria antes de escribir el archivo, sin arrojar errores de sistema de archivos.

### Requirement: Pipeline de Decodificación y Persistencia de Data URLs y Base64
El sistema SHALL aceptar cadenas en formato Data URL / Base64 (`data:image/<mime>;base64,<data>`), decodificarlas atómicamente a buffers binarios, almacenarlas como archivos físicos en el sistema de archivos local y devolver una ruta URI relativa normalizada.

#### Scenario: Decodificación exitosa de fotografía en Data URL
- **GIVEN** una cadena Data URL válida con formato `data:image/jpeg;base64,...` o `data:image/png;base64,...`
- **WHEN** el servicio de procesamiento de archivos procesa la cadena
- **THEN** el sistema decodifica el payload a un buffer binario, genera un nombre de archivo único con la extensión correspondiente, lo escribe en el directorio asignado y retorna la ruta URI relativa (ej. `/uploads/inspecciones/salida-frontal-uuid.jpg`).

#### Scenario: Rechazo de formatos no permitidos o contenido corrupto
- **GIVEN** una cadena Data URL con un tipo MIME no soportado o con datos Base64 no decodificables
- **WHEN** el servicio intenta procesar la carga
- **THEN** el sistema rechaza la operación con un error explícito de validación (`INVALID_FILE_PAYLOAD`) sin crear archivos vacíos ni guardar registros huérfanos en la base de datos.

### Requirement: Servicio Estático Seguro de Archivos Multimedia
El sistema Express SHALL publicar la ruta `/uploads` mapeada al directorio `STORAGE_PATH` para servir de manera segura imágenes y documentos almacenados, implementando prevención estricta contra ataques de Directory Traversal.

#### Scenario: Entrega HTTP de imagen almacenada
- **GIVEN** un archivo previamente almacenado en el volumen persistente (ej. `/app/uploads/inspecciones/foto1.jpg`)
- **WHEN** un cliente HTTP autenticado solicita el recurso mediante la URL `GET /uploads/inspecciones/foto1.jpg`
- **THEN** el servidor Express entrega el archivo con el código de estado HTTP 200 y el encabezado `Content-Type` correspondiente.

#### Scenario: Prevención de Directory Traversal en peticiones estáticas
- **GIVEN** una solicitud maliciosa que incluye secuencias `..` o caracteres de escape para acceder a archivos fuera de `STORAGE_PATH` (ej. `/uploads/../../etc/passwd`)
- **WHEN** el servidor Express evalúa la petición
- **THEN** el sistema deniega el acceso y responde con código HTTP 403 Forbidden o 404 Not Found, impidiendo la lectura de archivos ajenos al volumen de uploads.

### Requirement: Restricción de Longitud de Rutas en MySQL (< 191 caracteres)
El sistema SHALL garantizar que toda ruta o URL guardada en columnas de texto de la base de datos MySQL (`archivoUrl`, `rutaAlmacenamiento`, `fotoRespaldoUrl`, `qrUrl`) corresponda a una ruta relativa URI acotada cuya longitud sea estrictamente menor a 191 caracteres, prohibiendo el guardado de Base64 crudo en columnas relacionales.

#### Scenario: Almacenamiento de ruta relativa corta en base de datos
- **GIVEN** una fotografía procesada y guardada físicamente en el disco
- **WHEN** el modelo Prisma correspondiente inserta o actualiza el registro en MySQL
- **THEN** el valor asignado al campo de URL contiene exclusivamente la ruta relativa (ej. `/uploads/inspecciones/salida-frontal-1699999999.jpg`), manteniéndose en menos de 191 caracteres y previniendo el error `ER_DATA_TOO_LONG`.
