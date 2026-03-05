FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY server/package.json server/
RUN pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.base.json ./
COPY shared/ shared/
COPY server/ server/

# Build shared package
RUN pnpm --filter shared build

EXPOSE 3000
CMD ["pnpm", "--filter", "server", "dev"]
