# Контекст сборки — корень монорепозитория: lockfile npm workspaces лежит только там.
FROM node:20.20-alpine

WORKDIR /app
RUN chown node:node /app
USER node

# Слой зависимостей: пересобирается только при изменении package.json / lockfile
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node apps/frontend/package.json apps/frontend/
RUN npm ci -w apps/frontend

COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node apps/frontend apps/frontend

WORKDIR /app/apps/frontend

EXPOSE 3000

CMD ["npm", "run", "dev"]
