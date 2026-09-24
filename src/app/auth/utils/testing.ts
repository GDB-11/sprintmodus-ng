/** Test helper: builds an unsigned token whose payload is base64url-encoded, as real JWTs are. */
export function fakeJwt(payload: object): string {
  const encoded = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${encoded}.signature`;
}

/**
 * Replaces the global `localStorage` with an in-memory one. Node 26 defines its own broken
 * `localStorage` global that shadows jsdom's, so specs cannot rely on the environment's.
 */
export function stubLocalStorage(): void {
  const items = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
    clear: () => items.clear(),
  });
}
