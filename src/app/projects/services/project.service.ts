import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Burndown,
  CreateProjectRequest,
  CreateSprintRequest,
  Project,
  Sprint,
  UpdateProjectRequest,
  SprintConfig,
  VelocityHistory,
} from '../models/project.models';

/** project-service, which owns projects and sprints: reading them, and (for owners and admins) planning sprints. */
@Service()
export class ProjectService {
  private readonly http = inject(HttpClient);

  list(): Observable<Project[]> {
    return this.http.get<Project[]>(`${environment.apiUrl}/api/projects`);
  }

  /** Any member may; the plan's `maxProjects` is enforced by the backend (`402`). */
  create(request: CreateProjectRequest): Observable<Project> {
    return this.http.post<Project>(`${environment.apiUrl}/api/projects`, request);
  }

  /** Name and description only: the key stays what it was. */
  update(projectCode: string, request: UpdateProjectRequest): Observable<Project> {
    return this.http.put<Project>(`${environment.apiUrl}/api/projects/${projectCode}`, request);
  }

  /** Owners and admins only. Deletes the project and its sprints; its key stays reserved. */
  delete(projectCode: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/projects/${projectCode}`);
  }

  sprints(projectCode: string): Observable<Sprint[]> {
    const params = new HttpParams().set('projectCode', projectCode);
    return this.http.get<Sprint[]>(`${environment.apiUrl}/api/sprints`, { params });
  }

  /** Owners and admins only (the backend answers `403` to anyone else). */
  createSprint(request: CreateSprintRequest): Observable<Sprint> {
    return this.http.post<Sprint>(`${environment.apiUrl}/api/sprints`, request);
  }

  /** PLANNED → ACTIVE, owners and admins only. A project has at most one active sprint. Also begins the sprint's burndown. */
  startSprint(sprintCode: string): Observable<Sprint> {
    return this.http.post<Sprint>(`${environment.apiUrl}/api/sprints/${sprintCode}/start`, null);
  }

  /** ACTIVE → CLOSED, owners and admins only. Locks the sprint's velocity and burndown. */
  closeSprint(sprintCode: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/api/sprints/${sprintCode}/close`, null);
  }

  sprintConfig(): Observable<SprintConfig> {
    return this.http.get<SprintConfig>(`${environment.apiUrl}/api/sprints/config`);
  }

  /** Owners and admins only. Affects the sprints created afterwards. */
  updateSprintConfig(config: SprintConfig): Observable<SprintConfig> {
    return this.http.put<SprintConfig>(`${environment.apiUrl}/api/sprints/config`, config);
  }

  burndown(sprintCode: string): Observable<Burndown> {
    return this.http.get<Burndown>(`${environment.apiUrl}/api/sprints/${sprintCode}/burndown`);
  }

  /** The velocity of a project's last closed sprints (oldest first) and their average. */
  velocityHistory(projectCode: string, limit?: number): Observable<VelocityHistory> {
    let params = new HttpParams().set('projectCode', projectCode);
    if (limit !== undefined) {
      params = params.set('limit', limit);
    }
    return this.http.get<VelocityHistory>(`${environment.apiUrl}/api/sprints/velocity-history`, { params });
  }
}
