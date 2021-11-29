FROM node:14 AS builder

COPY . /app
WORKDIR /app

# Pass 1 - compile TypeScript
RUN npm ci
RUN npm run build
RUN rm -rf src

# Pass 2 - get runtime dependencies
RUN rm -rf node_modules
RUN npm ci --only=production

FROM gcr.io/distroless/nodejs:16
COPY --from=builder /app /app
WORKDIR /app
CMD ["dist/entrypoint.js"]