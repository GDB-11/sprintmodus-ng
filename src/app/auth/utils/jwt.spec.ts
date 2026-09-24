import { decodeJwtPayload, isJwtExpired } from './jwt';
import { fakeJwt } from './testing';

describe('jwt utils', () => {
  it('decodes a base64url payload', () => {
    expect(decodeJwtPayload(fakeJwt({ exp: 123, note: '>>>???' }))).toEqual({
      exp: 123,
      note: '>>>???',
    });
  });

  it('returns null for malformed tokens', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('a.!!!.c')).toBeNull();
  });

  it('detects expiry from the exp claim', () => {
    const now = 1_000_000;
    expect(isJwtExpired(fakeJwt({ exp: now / 1000 + 60 }), now)).toBe(false);
    expect(isJwtExpired(fakeJwt({ exp: now / 1000 - 1 }), now)).toBe(true);
  });

  it('treats a token without exp or a malformed one as expired', () => {
    expect(isJwtExpired(fakeJwt({}))).toBe(true);
    expect(isJwtExpired('garbage')).toBe(true);
  });
});
