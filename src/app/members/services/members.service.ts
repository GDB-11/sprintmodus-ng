import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateMemberRequest, Member, MemberPage } from '../models/member.models';

/** The organization's people, kept by auth-service (`/auth/users`). Owners and admins only; the backend enforces it. */
@Service()
export class MembersService {
  private readonly http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/auth/users`;

  list(page = 0, size = 50): Observable<MemberPage> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<MemberPage>(this.url, { params });
  }

  /** An owner or admin sets someone else's password; the backend enforces who may reset whom. */
  resetPassword(userCode: string, newPassword: string): Observable<void> {
    return this.http.put<void>(`${this.url}/${userCode}/password`, { newPassword });
  }

  /** Deactivating stops the person from signing in; reactivating needs a free seat in the plan (`402 USER_LIMIT_REACHED`). */
  setActive(userCode: string, active: boolean): Observable<void> {
    return this.http.put<void>(`${this.url}/${userCode}/active`, { active });
  }

  create(request: CreateMemberRequest): Observable<Member> {
    return this.http.post<Member>(this.url, { ...request, email: request.email.trim(), fullName: request.fullName.trim() });
  }
}
