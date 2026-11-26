# =============================================================
# DOCKERFILE MULTI-STAGE: ZION SERVICES (BACKEND + FRONTEND)
# =============================================================

# Etapa 1: Build de Backend y Frontend
FROM node:22-alpine AS builder
WORKDIR /app

# Copiar paquetes y lockfile
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Instalar dependencias
RUN npm install

# Copiar fuentes y schema prisma
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Generar cliente Prisma y compilar
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
RUN cd backend && npx prisma generate && npm run build
RUN cd frontend && npm run build

# Etapa 2: Runtime Backend API
FROM node:22-alpine AS backend-runner
WORKDIR /app
ENV NODE_ENV=production
ENV STORAGE_PATH=/app/uploads

# Asegurar existencia de directorio de almacenamiento para EasyPanel
RUN mkdir -p /app/uploads

COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm install --omit=dev --workspace=backend

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

VOLUME ["/app/uploads"]

EXPOSE 3000
CMD ["node", "backend/dist/index.js"]
