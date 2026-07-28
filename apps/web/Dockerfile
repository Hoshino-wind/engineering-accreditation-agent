FROM node:24-alpine AS build

RUN corepack enable
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/api-client-generated/package.json packages/api-client-generated/package.json
RUN pnpm install --frozen-lockfile

COPY apps/web apps/web
COPY packages/api-client-generated packages/api-client-generated
RUN pnpm --filter @engineering-accreditation/web build

FROM nginx:1.29-alpine

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html

EXPOSE 80
