# syntax=docker/dockerfile:1

# ---- Build: the production bundle
FROM node:26-alpine AS build
WORKDIR /app
# Node no longer ships corepack, so pnpm is installed at the version package.json pins (packageManager)
RUN npm install --global pnpm@11.2.2
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
COPY . .
# environment.prod.ts is swapped in: same-origin API and WebSocket, so no address is baked into the bundle
RUN pnpm exec ng build --configuration production

# ---- Runtime: nginx as the single browser-facing origin. Unprivileged (uid 101, port 8080); no secrets, no build-time address.
FROM nginxinc/nginx-unprivileged:1.29-alpine
# The entrypoint renders /etc/nginx/templates/*.template with the container's environment
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/sprintmodus-ng/browser /usr/share/nginx/html
ENV GATEWAY_URL=http://api-gateway:8090
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"]
