FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY app/package.json app/
RUN pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.base.json ./
COPY shared/ shared/
COPY app/ app/

# Build shared package
RUN pnpm --filter shared build

EXPOSE 5173
CMD ["pnpm", "--filter", "app", "dev", "--", "--host", "0.0.0.0"]
