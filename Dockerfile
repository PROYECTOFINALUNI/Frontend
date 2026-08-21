# syntax=docker/dockerfile:1

# Construcción en varias etapas con dos modos:
# desarrollo con Vite y producción con nginx.
# Ambos utilizan el puerto 3000, permitido por la configuración CORS del backend.

# ---------------------------------------------------------------------------
# Layer compartido
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# ---------------------------------------------------------------------------
# Development: Vite dev server
# ---------------------------------------------------------------------------
FROM node:22-alpine AS dev

WORKDIR /app
ENV NODE_ENV=development

# En macOS y Windows se utiliza polling para detectar cambios en los archivos durante el desarrollo.
ENV VITE_USE_POLLING=true

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

# `--host` permite acceder al servidor desde fuera del contenedor.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---------------------------------------------------------------------------
# Build: compila el bundle de produccion
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Vite incorpora las variables `VITE_*` durante la construcción,
# por lo que la URL de la API debe definirse en esta etapa.
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ---------------------------------------------------------------------------
# Production: nginx serving static assets
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# nginx se ejecuta con un usuario sin privilegios, evitando el uso de root dentro del contenedor.
RUN touch /var/run/nginx.pid \
    && chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /usr/share/nginx/html

USER nginx

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
