FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /usr/app
COPY --chown=node:node ./ ./

RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm ci

RUN npm run build

FROM node:20-alpine

USER root
RUN npm install --global --no-update-notifier --no-fund serve@14.2.4

USER node
WORKDIR /usr/app

COPY --from=builder --chown=node:node /usr/app/dist/ ./dist/

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
