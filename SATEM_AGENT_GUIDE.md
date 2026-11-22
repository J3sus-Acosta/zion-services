# SATEM — Manual Multi-Agente + OpenSpec
## Zion Services

Este documento es el **manual permanente del equipo**. Define la arquitectura de desarrollo multi-agente, los agentes disponibles, el flujo de trabajo y las reglas que todos los agentes deben respetar.

---

## Arquitectura del Ecosistema

```
Zion Services
      │
      ▼
  Antigravity (Main Agent)
      │
      ▼ (define_subagent + invoke_subagent)
  SATEM Orchestrator
      │
  ┌───┴───────────┐
  │               │
Planning       Tasks
  │               │
  └───────┬───────┘
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

## Mandato Multi-Agente Antigravity (CRÍTICO)

En el ecosistema SATEM, **Antigravity nunca opera como un agente monolítico individual** en tareas de desarrollo o flujos OpenSpec. 

Cada comando OpenSpec (`/openspec-propose`, `/openspec-explore`, `/openspec-update-change`, `/openspec-apply-change`, `/openspec-sync-specs`, `/openspec-archive-change`) activa una skill que **define e invoca obligatoriamente al `satem-orchestrator`** (`.agents/subagents/orchestrator.md`) con herramientas de subagentes habilitadas (`EnableSubagentTools: true`). A su vez, el orquestador delega cada fase en los subagentes especializados correspondientes.

### Skills OpenSpec Multi-Agente Integradas (.agents/skills/)

| Skill | Comando Slash | Subagentes Involucrados | Objetivo |
|-------|---------------|-------------------------|----------|
| `openspec-explore` | `/openspec-explore` | `orchestrator` → `requirements-analyst`, `solution-architect` | Explorar ideas, requisitos y viabilidad técnica previa |
| `openspec-propose` | `/openspec-propose` | `orchestrator` → `requirements-analyst`, `solution-architect` | Generar proposal, delta specs y tasks estructurados |
| `openspec-update-change` | `/openspec-update-change` | `orchestrator` → `requirements-analyst`, `solution-architect` | Actualizar artefactos de cambio manteniéndolos coherentes |
| `openspec-apply-change` | `/openspec-apply-change` | `orchestrator` → `backend-node`, `frontend-react`, `database-prisma`, `tester`, `security-reviewer`, `code-reviewer`, `devops` | Implementar tareas secuenciales con pipeline de testing y revisión |
| `openspec-sync-specs` | `/openspec-sync-specs` | `orchestrator` → `requirements-analyst` | Sincronizar deltas aprobadas con las especificaciones base |
| `openspec-archive-change` | `/openspec-archive-change` | `orchestrator` → `tester`, `requirements-analyst`, `documentation` | Auditar tests, sync de specs y archivar cambio |
| `satem-code-review` | N/A | `code-reviewer`, `security-reviewer` | Revisión estricta de estándares y seguridad |
| `satem-design-system` | N/A | `frontend-react` | Sistema visual Dark Mode, CSS Variables y componentes |

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

### Feature Compleja (Flujo OpenSpec Multi-Agente)

```
1.  /openspec-propose       → define_subagent(orchestrator)
                               └── invoke_subagent(requirements-analyst)  (proposal + deltas)
                               └── invoke_subagent(solution-architect)    (design.md)
                               └── orquestador genera tasks.md
2.  Validación y Acuerdo    → usuario revisa y aprueba proposal/specs/tasks
3.  /openspec-apply-change  → define_subagent(orchestrator, EnableSubagentTools: true)
                               ├── Tarea N:
                               │   ├── invoke_subagent(backend-node / frontend-react / database-prisma)
                               │   ├── invoke_subagent(tester)
                               │   ├── invoke_subagent(security-reviewer)
                               │   └── invoke_subagent(code-reviewer)
                               └── Todas las tareas completadas
4.  /openspec-sync-specs    → define_subagent(orchestrator)
                               └── invoke_subagent(requirements-analyst) (actualiza openspec/specs/)
5.  /openspec-archive-change→ define_subagent(orchestrator)
                               └── invoke_subagent(tester + requirements-analyst + documentation)
                               └── cambio archivado en openspec/changes/archive/
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
