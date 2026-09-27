import { isGatewayUrl } from './gateway-url';

describe('isGatewayUrl', () => {
  describe('with a configured api URL (development)', () => {
    const apiUrl = 'http://localhost:8090';

    it('matches the gateway and nothing else', () => {
      expect(isGatewayUrl('http://localhost:8090/api/projects', apiUrl)).toBe(true);
      expect(isGatewayUrl('https://example.com/api/projects', apiUrl)).toBe(false);
      expect(isGatewayUrl('/assets/logo.svg', apiUrl)).toBe(false);
    });
  });

  describe('same-origin (production, no api URL)', () => {
    it('matches paths on this origin', () => {
      expect(isGatewayUrl('/api/projects', '')).toBe(true);
      expect(isGatewayUrl('/auth/login', '')).toBe(true);
    });

    it('never matches another site, so the token cannot leak', () => {
      expect(isGatewayUrl('https://example.com/api/projects', '')).toBe(false);
      expect(isGatewayUrl('//example.com/api/projects', '')).toBe(false);
      expect(isGatewayUrl('relative/path', '')).toBe(false);
    });
  });
});
