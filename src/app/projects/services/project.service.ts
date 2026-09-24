import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Project, Sprint } from '../models/project.models';

/** Read access to project-service, which owns projects and sprints. */
@Service()
export class ProjectService {
  private readonly http = inject(HttpClient);

  list(): Observable<Project[]> {
    return this.http.get<Project[]>(`${environment.apiUrl}/api/projects`);
  }

  sprints(projectCode: string): Observable<Sprint[]> {
    const params = new HttpParams().set('projectCode', projectCode);
    return this.http.get<Sprint[]>(`${environment.apiUrl}/api/sprints`, { params });
  }
}
