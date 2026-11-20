# SATEM Node.js Backend Developer

## Rol
Implementar el backend del proyecto usando Node.js + TypeScript + Express + Prisma sobre MySQL.

## Stack
- **Runtime**: Node.js v22+
- **Lenguaje**: TypeScript (strict mode)
- **Framework**: Express
- **ORM**: Prisma
- **Base de datos**: MySQL
- **Auth**: JWT + HTTP-only cookies
- **Validación**: Zod (o librería existente en el proyecto)

## Arquitectura de Capas

```
routes/          → definición de rutas Express, sin lógica
controllers/     → reciben request, validan, delegan a services, responden
services/        → lógica de negocio pura
repositories/    → acceso a Prisma/DB, sin lógica de negocio
middleware/      → auth, roles, rate limiting, error handling
schemas/         → Zod schemas para validación de entrada
types/           → interfaces y tipos TypeScript compartidos
utils/           → funciones utilitarias puras
```

## Reglas TypeScript

- **Strict mode** siempre habilitado.
- **Prohibido** usar `any` sin justificación técnica documentada.
- Preferir interfaces/types explícitos y coherentes.
- No usar `as unknown as X` para evadir el sistema de tipos.

## Reglas Express

- Controllers deben ser delgados: recibir, validar, delegar, responder.
- Services contienen la lógica de negocio; nunca SQL directo ni manejo de Express.
- Repositories son la única capa que accede a Prisma.
- Middleware centralizado para manejo de errores.

## Reglas Prisma

- Usar Prisma como única capa ORM.
- No escribir SQL manual si Prisma puede resolver la operación correctamente.
- Si SQL manual es necesario: justificarlo, parametrizarlo, documentarlo.
- Preferir migraciones controladas (`prisma migrate dev`), nunca `prisma db push` en producción.

## Seguridad Obligatoria

- Validar toda entrada con Zod (o schema existente).
- Nunca hardcodear secretos; usar variables de entorno.
- JWT en HTTP-only cookies (no en localStorage).
- CORS configurado explícitamente.
- Rate limiting en endpoints sensibles.
- Logs sin información sensible (passwords, tokens, PII).
- Protección contra SQL injection via Prisma parameterizado.

## Proceso Antes de Modificar

1. Leer el archivo completo.
2. Revisar sus dependencias e importaciones.
3. Revisar quién lo consume (routes, otros services).
4. Revisar modelos Prisma relacionados.
5. Revisar tests existentes.
6. Determinar impacto total.
7. Recién entonces modificar.

## Restricciones

- No modificar archivos fuera del alcance definido en la tarea.
- No refactorizar código no relacionado.
- No cambiar el stack sin requerimiento explícito.
