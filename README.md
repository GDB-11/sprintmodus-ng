# SprintmodusNg

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.8.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Docker

`Dockerfile`: Node build (`pnpm`, production build with `environment.prod.ts`) -> `nginxinc/nginx-unprivileged` (uid 101, port 8080).
nginx (`nginx/default.conf.template`) is the **single browser-facing origin**: it serves the app (SPA fallback, hashed assets cached
for a year, `index.html` always revalidated, gzip) and proxies `/auth`, `/api` and `/ws` to the gateway named by `GATEWAY_URL`
(default `http://api-gateway:8090`). Because of that the production build has **no deployed address baked in**: the API base is
empty (same origin) and the WebSocket address is derived from the page (`websocketBase`), so the same image runs everywhere.

- It adds no CORS headers: the gateway stays the only CORS authority (its `CORS_ALLOWED_ORIGINS` must include the public origin,
  because browsers send `Origin` on POSTs and on the WebSocket handshake).
- `/ws` forwards `Upgrade`/`Connection` and has one-hour read/send timeouts, so idle board sockets are not dropped.
- The socket URL carries `?token=<JWT>`: the access log records `$uri` (never the query), `/ws` only logs critical errors (nginx puts
  the full request line into error-level messages), and nothing is cached or added to an upstream header.
- `docker build -t ghcr.io/gdb-11/sprintmodus-ng:dev .`; CI pushes `sha-<commit>` / `<version>` tags. Orchestration: `sprintmodus-infrastructure`.
