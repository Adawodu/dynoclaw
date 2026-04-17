FROM node:22-slim AS builder

WORKDIR /app

# Copy package files and install all deps (including dev)
COPY package.json ./
RUN npm install --no-audit --no-fund

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Remove dev dependencies for a smaller runtime image
RUN npm prune --omit=dev

FROM node:22-slim AS runtime

WORKDIR /app

# Copy only production artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Cloud Run injects PORT env var (default 8080)
ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "dist/index.js"]
