import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** The signed-in user's own account (`/auth/change-password`). Any role may change their own password. */
@Service()
export class AccountService {
  private readonly http = inject(HttpClient);

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/change-password`, { currentPassword, newPassword });
  }
}
