# syntax=docker/dockerfile:1

FROM node:22.23.5-alpine3.24 AS build
WORKDIR /app

# Install from the lockfile before copying frequently changing application files.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM ghcr.io/nginx/nginx-unprivileged:1.30.6-alpine3.24 AS runtime
USER 101
COPY --from=build /app/dist/ /usr/share/nginx/html/
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
