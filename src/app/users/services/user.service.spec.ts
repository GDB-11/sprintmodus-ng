import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('searches by the text typed, with a limit', () => {
    let found: string[] = [];
    service.search('an d').subscribe((users) => (found = users.map((user) => user.fullName)));

    const request = http.expectOne((r) => r.url === `${environment.apiUrl}/api/users`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('q')).toBe('an d');
    expect(request.request.params.get('limit')).toBe('8');
    request.flush([{ userCode: 'u1', fullName: 'Ana Diaz' }]);

    expect(found).toEqual(['Ana Diaz']);
  });
});
