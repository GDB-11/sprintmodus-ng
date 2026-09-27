// Production is served from ONE origin: the nginx in this repo's image serves the app and proxies /auth, /api and /ws to the
// api-gateway. So both bases are empty (same origin) and no deployed address is baked into the build; the WebSocket address is
// derived from the page's own (see websocketBase).
export const environment = {
  production: true,
  apiUrl: '',
  wsUrl: '',
};
