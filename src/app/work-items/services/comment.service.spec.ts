import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CommentService } from './comment.service';

describe('CommentService', () => {
  const url = `${environment.apiUrl}/api/work-items/item-1/comments`;
  let service: CommentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CommentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the comments of a work item', () => {
    let count = 0;
    service.list('item-1').subscribe((comments) => (count = comments.length));

    const request = http.expectOne(url);
    expect(request.request.method).toBe('GET');
    request.flush([{ commentCode: 'c1' }, { commentCode: 'c2' }]);

    expect(count).toBe(2);
  });

  it('adds a comment by posting its content', () => {
    service.add('item-1', 'Looks good').subscribe();

    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ content: 'Looks good' });
    request.flush({ commentCode: 'c1', content: 'Looks good' });
  });
});
