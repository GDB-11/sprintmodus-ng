import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { HistoryService } from './history.service';

describe('HistoryService', () => {
  let service: HistoryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(HistoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks for one page of the history of the work item', () => {
    let total = 0;
    service.list('item-1', 2, 20).subscribe((page) => (total = page.total));

    const request = http.expectOne((r) => r.url === `${environment.apiUrl}/api/work-items/item-1/history`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('20');
    request.flush({ items: [], total: 41, page: 2, size: 20 });

    expect(total).toBe(41);
  });
});
