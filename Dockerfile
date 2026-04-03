# --- Build stage ---
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# --- Production stage ---
FROM node:18-alpine
WORKDIR /app

# OKD runs containers as a random non-root UID.
# Ensure the app directory is world-readable/executable so it works.
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# OKD convention: expose 8080
EXPOSE 8080

# Run as non-root (OKD requirement)
USER 1001

CMD ["node", "server.js"]
