/**
 * The scheme and host the board WebSocket connects to. A configured `wsUrl` (development, the gateway directly) wins; with none
 * (production is same-origin behind nginx) it is this page's own address, secure when the page is.
 */
export function websocketBase(wsUrl: string, page: { protocol: string; host: string }): string {
  if (wsUrl) {
    return wsUrl;
  }
  return `${page.protocol === 'https:' ? 'wss' : 'ws'}://${page.host}`;
}
