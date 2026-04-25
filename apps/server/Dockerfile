FROM node:20-alpine AS builder

ARG PNPM_VERSION=10.12.3

RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/app
COPY --chown=node:node ./ ./

RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    npm i --global --no-update-notifier --no-fund pnpm@${PNPM_VERSION}

RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    pnpm install

RUN pnpm run prisma:generate
RUN pnpm run build

FROM node:20-alpine

USER root
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV API_PORT=3001

USER node
WORKDIR /usr/app

COPY --from=builder --chown=node:node /usr/app/package*.json ./
COPY --from=builder --chown=node:node /usr/app/node_modules/ ./node_modules/
COPY --from=builder --chown=node:node /usr/app/prisma/ ./prisma/
COPY --from=builder --chown=node:node /usr/app/dist/ ./dist/

EXPOSE 3001

CMD ["node", "dist/server.js"]
