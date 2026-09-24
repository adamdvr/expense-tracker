# Контекст сборки — корень монорепозитория: lockfile npm workspaces лежит только там.
FROM node:20.20-alpine

# Prisma 5 на Alpine 3.21+ не находит libssl без пакета openssl
RUN apk add --no-cache openssl

WORKDIR /app
RUN chown node:node /app
USER node

# Слой зависимостей: пересобирается только при изменении package.json / lockfile
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node apps/backend/package.json apps/backend/
RUN npm ci -w apps/backend

COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node apps/backend apps/backend

WORKDIR /app/apps/backend
RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "run", "dev"]
