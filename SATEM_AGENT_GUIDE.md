# SATEM — Manual Multi-Agente + OpenSpec
## Zion Services

Este documento es el **manual permanente del equipo**. Define la arquitectura de desarrollo multi-agente, los agentes disponibles, el flujo de trabajo y las reglas que todos los agentes deben respetar.

---

## Arquitectura del Ecosistema

```
Zion Services
      │
      ▼
  Antigravity
      │
      ▼
  OpenSpec
      │
  ┌───┴───────────┐
  │               │
Planning       Tasks
  │               │
  └───────┬───────┘
          ▼
     Orchestrator
          │
  ┌───────┼─────────────┐
  │       │             │
Backend  Frontend    Database
  │       │             │
  └───────┼─────────────┘
          ▼
        Tests
          │
          ▼
       Security
          │
          ▼
        Review
          │
          ▼
       Approved
          │
          ▼
   OpenSpec archive
```

---

## Stack del Proyecto

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js v22+ · TypeScript · Express |
| ORM | Prisma |
| Base de datos | MySQL |
| Frontend | React · TypeScript · SATEM Design System |
| Iconos | Lucide React |
| Auth | JWT · HTTP-only cookies |
| Infraestructura | Docker · EasyPanel · VPS |

---

## Agentes Disponibles

| Agente | Archivo | Responsabilidad |
|--------|---------|-----------------|
| `orchestrator` | `.agents/subagents/orchestrator.md` | Coordina todo el proceso |
| `requirements-analyst` | `.agents/subagents/requirements-analyst.md` | Analiza y documenta requisitos |
| `solution-architect` | `.agents/subagents/solution-architect.md` | Diseña la arquitectura técnica |
| `backend-node` | `.agents/subagents/backend-node.md` | Node.js / Express / TypeScript / Prisma |
| `frontend-react` | `.agents/subagents/frontend-react.md` | React + SATEM Design System |
| `frontend-angular` | `.agents/subagents/frontend-angular.md` | Angular (módulos futuros) |
| `database-prisma` | `.agents/subagents/database-prisma.md` | Prisma / MySQL / migraciones |
| `api-architect` | `.agents/subagents/api-architect.md` | Contratos REST |
| `tester` | `.agents/subagents/tester.md` | Testing automatizado |
| `debugger` | `.agents/subagents/debugger.md` | Diagnóstico de errores |
| `security-reviewer` | `.agents/subagents/security-reviewer.md` | Auditoría de seguridad |
| `code-reviewer` | `.agents/subagents/code-reviewer.md` | Calidad de código |
| `performance-reviewer` | `.agents/subagents/performance-reviewer.md` | Rendimiento |
| `devops` | `.agents/subagents/devops.md` | Docker · EasyPanel · VPS |
| `documentation` | `.agents/subagents/documentation.md` | Documentación técnica |

---

## Flujos de Trabajo

### Feature Pequeña

```
Usuario
   ↓
Antigravity
   ↓
Orchestrator
   ↓
Implementación (backend / frontend / database)
   ↓
Tests
   ↓
Review
   ↓
Merge
```

### Feature Compleja (OpenSpec completo)

```
1.  openspec proposal          → definir objetivo y scope
2.  requirements-analyst       → requisitos técnicos claros
3.  solution-architect         → diseño técnico
4.  openspec spec              → especificación técnica formal
5.  openspec tasks             → desglose en tareas
6.  orchestrator               → coordina implementación
7.  backend-node               → implementar API y lógica
    frontend-react             → implementar UI
    database-prisma            → schema y migraciones
8.  tester                     → validar comportamiento
9.  security-reviewer          → auditar seguridad
10. code-reviewer              → revisar calidad
11. performance-reviewer       → revisar rendimiento
12. devops                     → validar deploy
13. Marcar tareas completadas
14. openspec archive
```

---

## Pipeline OpenSpec por Tarea

```
OpenSpec task
     ↓
Requirements
     ↓
Architecture
     ↓
Implementation
     ↓
Tests
     ↓
Security Review
     ↓
Code Review
     ↓
Performance Review
     ↓
  APPROVED?
   /      \
 NO        YES
 ↓          ↓
FIX      [x] task → NEXT
 │
 └─→ (máx. 2 ciclos, luego PAUSE + REPORT)
```

---

## Reglas Universales para Todos los Agentes

1. **Leer antes de modificar**: Leer el archivo completo, sus dependencias y quién lo consume.
2. **Respetar OpenSpec**: No inventar requisitos ni contradecir la especificación.
3. **Respetar el stack existente**: Node.js + React + MySQL. No cambiar sin requerimiento explícito.
4. **Alcance estricto**: No modificar archivos fuera del alcance definido en la tarea.
5. **Sin dependencias injustificadas**: Revisar si ya existe solución antes de instalar un paquete.
6. **Sin secretos en código**: Usar `.env` o EasyPanel. `.env` siempre en `.gitignore`.
7. **Sin cambios destructivos en producción**: Sin autorización explícita del usuario.
8. **Ejecutar pruebas**: Validar antes y después de cada cambio.
9. **Reportar**: Dejar evidencia de qué se hizo, qué se probó y qué queda pendiente.

---

## Reglas de Corrección

Cuando un reviewer encuentra `CRITICAL` o `HIGH`:

```
Problem:
Expected:
Current:
File:
Line:
Required correction:
Out of scope:
```

**Máximo 2 ciclos de corrección por tarea.**

Después de 2 ciclos sin resolución → `PAUSE` → `REPORT` → `WAIT FOR USER`

---

## Comandos de Referencia

```bash
# Node.js
npm install
npm run build
npm run dev
npm test
npm run lint
npm run typecheck

# Prisma
npx prisma validate
npx prisma generate
npx prisma migrate dev --name <nombre>
npx prisma migrate status
npx prisma migrate deploy

# OpenSpec
npx openspec list
npx openspec init
npx openspec apply

# Git
git status
git log --oneline -10
```

---

## Reglas de Base de Datos

```
NUNCA ejecutar sin autorización explícita:
  DROP DATABASE
  DROP TABLE
  TRUNCATE
  DELETE masivo
  prisma db push → producción
  migraciones destructivas
```

La existencia de credenciales en `.env` **NO** es autorización para operaciones destructivas.

---

## Reglas de Git

- Verificar `git status` antes de modificaciones importantes.
- Nunca sobrescribir cambios preexistentes del usuario.
- No ejecutar `git reset --hard`, `git clean -fd` ni `git checkout -- .` automáticamente.

---

## Formato de Reporte por Agente

```
## Agent Report

### Objective
Qué debía realizar.

### Files analyzed
Archivos revisados.

### Files modified
Archivos modificados.

### Changes
Qué cambió y por qué.

### Validation
Qué pruebas/comandos se ejecutaron.

### Problems
Problemas encontrados.

### Remaining work
Trabajo pendiente.
```

---

## Formato de Reporte Final del Orchestrator

```
# SATEM Implementation Report

## Change
<nombre del cambio>

## Objective
<objetivo>

## Tasks
<completadas>/<total>

## Files modified
<lista>

## Database
<impacto en schema y migraciones>

## API
<endpoints nuevos/modificados>

## Frontend
<pantallas/componentes nuevos/modificados>

## Security
PASS / FINDINGS: <lista>

## Tests
PASS / FAIL: <detalle>

## Build
PASS / FAIL

## Code Review
APPROVED / NEEDS FIXES: <lista>

## Performance
PASS / FINDINGS: <lista>

## Deployment
PASS / NOT REQUIRED

## OpenSpec
COMPLETE / INCOMPLETE

## Remaining risks
<lista>

## Recommendation
<resultado final y próximos pasos>
```
