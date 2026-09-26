# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:22-alpine AS deps
WORKDIR /usr/src/app

# Instalar pnpm globalmente
RUN npm install -g pnpm

# Copiar solo archivos de dependencias
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Instalar las dependencias (para build y desarrollo)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ============================================
# Stage 2: Builder
# ============================================
FROM deps AS builder
WORKDIR /usr/src/app

# Copiar lo necesario para compilar
COPY --chown=node:node . .

# Compilar
RUN pnpm run build

# ============================================
# Stage 3: Production (solo archivos finales)
# ============================================
FROM node:22-alpine AS production
WORKDIR /usr/src/app

ENV NODE_ENV=prod

# Instalar pnpm y SOLO dependencias de producción
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-store-prod,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod
COPY --from=builder --chown=node:node /usr/src/app/dist ./dist
COPY scripts/entrypoint.prod.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
USER node
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]

# ============================================
# Stage 4: Development (con hot-reload)
# ============================================
FROM deps AS development
WORKDIR /usr/src/app

ENV NODE_ENV=dev

# Copiar TODO el código fuente (para desarrollo con montaje de volumen)
COPY --chown=node:node . .

# Compilar una vez
RUN pnpm run build

# Script de entrada para desarrollo
COPY scripts/entrypoint.dev.sh /entrypoint.dev.sh
RUN chmod +x /entrypoint.dev.sh

RUN chown -R node:node /usr/src/app/node_modules

USER node
EXPOSE 3000
CMD ["sh", "/entrypoint.dev.sh"]