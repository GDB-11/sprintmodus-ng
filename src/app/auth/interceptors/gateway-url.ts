/**
 * Whether a request goes to the api-gateway (and so carries the session token). With a configured `apiUrl` that is a prefix
 * match; with none (production is same-origin) it is any path on this origin, never an absolute or protocol-relative URL, so
 * the token cannot leak to another site.
 */
export function isGatewayUrl(url: string, apiUrl: string): boolean {
  if (apiUrl) {
    return url.startsWith(apiUrl);
  }
  return url.startsWith('/') && !url.startsWith('//');
}
