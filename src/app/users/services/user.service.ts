import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserRef } from '../../work-items/models/work-item.models';

/** The people of the organization, as much as the screens need: a name to find, and a code to point at them by. */
@Service()
export class UserService {
  private readonly http = inject(HttpClient);

  /** Active users whose name, or any word of it, starts with `query`, by name. Only code and name come back, never an e-mail. */
  search(query: string, limit = 8): Observable<UserRef[]> {
    const params = new HttpParams().set('q', query).set('limit', limit);
    return this.http.get<UserRef[]>(`${environment.apiUrl}/api/users`, { params });
  }
}
