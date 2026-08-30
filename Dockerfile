FROM node:22-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM rust:1-alpine AS backend
ARG BUILD_SHA=dev
ENV BUILD_SHA=${BUILD_SHA}
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY Cargo.toml Cargo.lock* build.rs ./
COPY src ./src
COPY migrations ./migrations
COPY migrations-postgres ./migrations-postgres
RUN cargo build --release

FROM alpine:3.22
RUN addgroup -S app && adduser -S -G app -u 10001 app && mkdir -p /app /data && chown -R app:app /app /data
WORKDIR /app
COPY --from=backend /app/target/release/in-class-draft-ticket /app/server
COPY --from=frontend /app/dist /app/dist
USER app
ENV PORT=8080
EXPOSE 8080
CMD ["/app/server"]
