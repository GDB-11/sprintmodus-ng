import { websocketBase } from './websocket-base';

describe('websocketBase', () => {
  it('uses the configured address when there is one', () => {
    expect(websocketBase('ws://localhost:8090', { protocol: 'http:', host: 'localhost:4200' })).toBe('ws://localhost:8090');
  });

  it('derives it from the page when the app is served from one origin', () => {
    expect(websocketBase('', { protocol: 'https:', host: 'app.example.com' })).toBe('wss://app.example.com');
    expect(websocketBase('', { protocol: 'http:', host: 'localhost:8080' })).toBe('ws://localhost:8080');
  });
});
