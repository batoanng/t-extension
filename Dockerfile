FROM node:20-alpine AS builder

ARG PNPM_VERSION=10.12.3

RUN apk add --no-cache libc6-compat

WORKDIR /usr/app
COPY --chown=node:node ./ ./

RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    npm i --global --no-update-notifier --no-fund pnpm@${PNPM_VERSION}

RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    npm install

RUN npm run build

FROM node:20-alpine

USER root
RUN npm install --global --no-update-notifier --no-fund serve@14.2.4

USER node
WORKDIR /usr/app

COPY --from=builder --chown=node:node /usr/app/dist/ ./dist/

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
