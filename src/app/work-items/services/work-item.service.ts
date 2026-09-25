import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../shared/notifications/notification.service';
import {
  AssignmentRole,
  CreateWorkItemRequest,
  ItemType,
  Link,
  LinkType,
  UpdateWorkItemRequest,
  WorkItem,
  WorkItemPage,
  WorkItemQuery,
} from '../models/work-item.models';

export interface Workflow {
  itemType: ItemType;
  statuses: { code: string; displayName: string; order: number; isTerminal: boolean }[];
  transitions: { from: string; to: string; allowedBackward: boolean; requiredRole?: AssignmentRole | null }[];
}

/**
 * Work items through the gateway. The backend accepts a non-standard parent (an Epic under a Task, say) and answers with a
 * warning instead of an error: every change that returns the item hands those warnings to {@link NotificationService}.
 */
@Service()
export class WorkItemService {
  private readonly http = inject(HttpClient);
  private readonly notifications = inject(NotificationService);

  private readonly baseUrl = `${environment.apiUrl}/api/work-items`;

  list(query: WorkItemQuery = {}): Observable<WorkItemPage> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<WorkItemPage>(this.baseUrl, { params });
  }

  get(workItemCode: string): Observable<WorkItem> {
    return this.http.get<WorkItem>(`${this.baseUrl}/${workItemCode}`);
  }

  create(request: CreateWorkItemRequest): Observable<WorkItem> {
    return this.http.post<WorkItem>(this.baseUrl, request).pipe(tap((item) => this.surfaceWarnings(item)));
  }

  update(workItemCode: string, request: UpdateWorkItemRequest): Observable<WorkItem> {
    return this.http
      .put<WorkItem>(`${this.baseUrl}/${workItemCode}`, request)
      .pipe(tap((item) => this.surfaceWarnings(item)));
  }

  /** Soft delete. */
  delete(workItemCode: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${workItemCode}`);
  }

  /** Sets the parent, or removes it when `parentCode` is `null`. A non-recommended parent still succeeds, with a warning. */
  updateParent(workItemCode: string, parentCode: string | null): Observable<WorkItem> {
    const url = `${this.baseUrl}/${workItemCode}/parent`;
    const request =
      parentCode === null
        ? this.http.delete<WorkItem>(url)
        : this.http.put<WorkItem>(url, { parentCode });
    return request.pipe(tap((item) => this.surfaceWarnings(item)));
  }

  changeStatus(workItemCode: string, status: string): Observable<WorkItem> {
    return this.http
      .post<WorkItem>(`${this.baseUrl}/${workItemCode}/status`, { status })
      .pipe(tap((item) => this.surfaceWarnings(item)));
  }

  /**
   * Puts the item right before `beforeCode` among the cards of its column that share its priority, or last when `null`.
   * Owners and admins only. The other cards of the group are renumbered by the server.
   */
  reorder(workItemCode: string, beforeCode: string | null): Observable<WorkItem> {
    return this.http.put<WorkItem>(`${this.baseUrl}/${workItemCode}/rank`, { beforeCode });
  }

  /** Moves the item to a sprint, or back to the backlog when `sprintCode` is `null`. */
  moveToSprint(workItemCode: string, sprintCode: string | null): Observable<WorkItem> {
    const url = `${this.baseUrl}/${workItemCode}/sprint`;
    const request =
      sprintCode === null
        ? this.http.delete<WorkItem>(url)
        : this.http.put<WorkItem>(url, { sprintCode });
    return request.pipe(tap((item) => this.surfaceWarnings(item)));
  }

  /** Links the item to another one (possibly in another project). The target's warnings, if any, are not part of this. */
  createLink(workItemCode: string, targetCode: string, type: LinkType): Observable<Link> {
    return this.http.post<Link>(`${this.baseUrl}/${workItemCode}/links`, { targetCode, type });
  }

  removeLink(workItemCode: string, linkCode: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${workItemCode}/links/${linkCode}`);
  }

  /** The workflow of an item type: its statuses in order and the transitions between them. */
  workflow(itemType: ItemType): Observable<Workflow> {
    return this.http.get<Workflow>(`${environment.apiUrl}/api/status-workflows/${itemType}`);
  }

  /** Replaces the whole workflow of `workflow.itemType`. Owners and admins only; the backend rejects anyone else. */
  upsertWorkflow(workflow: Workflow): Observable<Workflow> {
    return this.http.post<Workflow>(`${environment.apiUrl}/api/admin/status-workflows`, workflow);
  }

  private surfaceWarnings(item: WorkItem): void {
    for (const warning of item.warnings ?? []) {
      this.notifications.warning(warning.message);
    }
  }
}
