export interface JwtPayload {
  exp?: number;
}

/** Decodes the payload of a JWT without verifying it (the backend is the authority). */
export function decodeJwtPayload(token: string): JwtPayload | null {
  const payload = token.split('.')[1];
  if (!payload) {
    return null;
  }

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/** A token that cannot be decoded or has no `exp` claim counts as expired. */
export function isJwtExpired(token: string, now: number = Date.now()): boolean {
  const exp = decodeJwtPayload(token)?.exp;
  return exp === undefined || now >= exp * 1000;
}
