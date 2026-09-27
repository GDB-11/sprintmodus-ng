import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HistoryPage } from '../models/work-item.models';

/** The history of a work item: read only. The backend writes it, in the transaction of each change. */
@Service()
export class HistoryService {
  private readonly http = inject(HttpClient);

  /** One page of the history, newest change first. */
  list(workItemCode: string, page: number, size: number): Observable<HistoryPage> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<HistoryPage>(`${environment.apiUrl}/api/work-items/${workItemCode}/history`, { params });
  }
}
