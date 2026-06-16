# Stage 1: build client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: build server
FROM node:20-alpine AS server-build
WORKDIR /app/server
RUN apk add --no-cache python3 make g++
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Stage 3: production
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY --from=server-build /app/server/package*.json ./
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY --from=server-build /app/server/dist ./dist
COPY --from=client-build /app/client/dist ./public

ENV PORT=3000
ENV DB_PATH=/data/kodo.db
EXPOSE 3000
VOLUME ["/data"]

CMD ["node", "dist/index.js"]
