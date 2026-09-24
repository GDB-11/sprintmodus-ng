import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WorkItemComment } from '../models/work-item.models';

/** Comments of a work item: read and add only, they cannot be edited or deleted. */
@Service()
export class CommentService {
  private readonly http = inject(HttpClient);

  list(workItemCode: string): Observable<WorkItemComment[]> {
    return this.http.get<WorkItemComment[]>(this.url(workItemCode));
  }

  add(workItemCode: string, content: string): Observable<WorkItemComment> {
    return this.http.post<WorkItemComment>(this.url(workItemCode), { content });
  }

  private url(workItemCode: string): string {
    return `${environment.apiUrl}/api/work-items/${workItemCode}/comments`;
  }
}
