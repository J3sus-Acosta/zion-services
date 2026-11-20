---
name: satem-code-review
description: Revisión integral del código SATEM. Analiza arquitectura, backend Node.js/TypeScript, base de datos Prisma/MySQL, frontend React, seguridad, testing e infraestructura. Clasifica hallazgos en CRITICAL, HIGH, MEDIUM, LOW y SUGGESTIONS.
---

# SATEM Code Review

Realiza una revisión integral del proyecto SATEM.

## 1. Arquitectura

Revisar:

- separación de responsabilidades (routes / controllers / services / repositories)
- duplicación de lógica de negocio
- acoplamiento excesivo entre capas
- dependencias innecesarias o circulares
- código muerto

## 2. Backend

Revisar:

- Node.js, TypeScript, Express
- controllers (deben ser delgados)
- services (contienen lógica de negocio)
- middleware (auth, error handling, rate limiting)
- validaciones (Zod u otro schema existente)
- manejo de errores
- APIs REST

## 3. Database

Revisar:

- Prisma schema
- modelos y relaciones
- índices en campos usados en WHERE frecuente
- migraciones históricas
- campos sin uso
- queries innecesarias o N+1

## 4. Frontend

React:

- componentes (tamaño, cohesión)
- hooks (dependencias correctas, cleanup en useEffect)
- estado (innecesario o mal gestionado)
- responsive (overflow, touch targets ≥ 38px)
- accesibilidad básica

## 5. Seguridad

Revisar:

- autenticación (JWT, cookies HTTP-only)
- autorización (RBAC server-side)
- secretos hardcodeados
- CORS, CSRF
- injection (SQL via Prisma parameterizado)
- IDOR
- validación de entrada

## 6. Testing

Revisar:

- cobertura de happy path
- cobertura de errores y edge cases
- tests de API (status codes, formatos)
- regresiones para bugs corregidos

## 7. Infraestructura

Revisar:

- Dockerfile y docker-compose
- variables de entorno (.env.example completo)
- health checks
- logs sin información sensible
- migraciones en proceso de deploy

## 8. Código Sin Uso

Buscar (con cuidado de verificar referencias indirectas):

- variables sin uso
- imports sin uso
- funciones sin referencias
- endpoints sin consumidores
- componentes sin referencias en rutas o páginas
- modelos Prisma sin referencias en servicios
- dependencias npm instaladas pero no importadas

## Resultado

### CRITICAL

Problemas que pueden provocar:
- vulnerabilidad de seguridad explotable
- pérdida o corrupción de datos
- caída del sistema
- incumplimiento de principios fundamentales SATEM

### HIGH

Problemas importantes que deben corregirse antes de merge.

### MEDIUM

Problemas de arquitectura, mantenibilidad o calidad que deben corregirse en el ciclo actual.

### LOW

Mejoras menores de legibilidad o consistencia.

### SUGGESTIONS

Mejoras opcionales, no bloqueantes.

---

**Regla fundamental**: Nunca modificar código durante una revisión, salvo que el usuario lo solicite explícitamente.
