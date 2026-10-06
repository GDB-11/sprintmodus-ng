import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ORGANIZATION_ROLE_LABELS, SUBSCRIPTION_PLAN_LABELS } from '../auth/models/auth.models';
import { AuthService } from '../auth/services/auth.service';
import { ProjectContextService } from '../projects/services/project-context.service';
import { ProjectService } from '../projects/services/project.service';
import { valueOf } from '../shared/resource-value';
import { Chip } from '../shared/ui/chip/chip';
import { LineSparkline } from '../shared/ui/line-sparkline/line-sparkline';
import { Meter } from '../shared/ui/meter/meter';
import { PageHeader } from '../shared/ui/page-header/page-header';
import { Panel } from '../shared/ui/panel/panel';
import { TextLink } from '../shared/ui/text-link/text-link';
import { sprintPace } from '../sprints/models/sprint-pace';
import { TenantContextService } from '../tenant/services/tenant-context.service';
import { UserService } from '../users/services/user.service';
import { PriorityChip } from '../work-items/components/priority-chip/priority-chip';
import { WorkItemTypeIcon } from '../work-items/components/work-item-type-icon/work-item-type-icon';
import { WorkItemService } from '../work-items/services/work-item.service';

const ASSIGNED_SHOWN = 5;

/** Landing page for signed-in users: the active sprint at a glance, what is assigned to them, the organization's usage. */
@Component({
  selector: 'app-dashboard',
  imports: [PageHeader, Panel, Chip, Meter, LineSparkline, TextLink, PriorityChip, WorkItemTypeIcon, RouterLink],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly auth = inject(AuthService);
  private readonly projects = inject(ProjectService);
  private readonly workItems = inject(WorkItemService);
  private readonly users = inject(UserService);
  private readonly projectContext = inject(ProjectContextService);
  protected readonly tenant = inject(TenantContextService).tenant;

  protected readonly user = computed(() => this.auth.currentUser()?.user ?? null);
  protected readonly firstName = computed(() => this.user()?.fullName.split(/\s+/)[0] ?? '');
  protected readonly roleLabel = computed(() => {
    const role = this.user()?.role;
    return role ? ORGANIZATION_ROLE_LABELS[role] : '';
  });
  protected readonly planLabel = computed(() => {
    const plan = this.tenant()?.plan;
    return plan ? SUBSCRIPTION_PLAN_LABELS[plan] : '';
  });

  private readonly sprints = rxResource({
    params: () => this.projectContext.current()?.projectCode,
    stream: ({ params }) => this.projects.sprints(params),
  });
  protected readonly activeSprint = computed(() => valueOf(this.sprints)?.find((sprint) => sprint.status === 'ACTIVE') ?? null);

  private readonly burndown = rxResource({
    params: () => this.activeSprint()?.sprintCode,
    stream: ({ params }) => this.projects.burndown(params),
  });
  protected readonly sprintChart = computed(() => {
    const burndown = valueOf(this.burndown);
    const pace = burndown ? sprintPace(burndown) : null;
    if (!burndown || !pace) {
      return null;
    }
    return {
      pace,
      ideal: burndown.points.map((point) => point.idealRemainingHours),
      actual: burndown.points.map((point) => point.remainingHours),
      label: `Quedan ${pace.remainingHours} h de ${pace.baselineHours} h.`,
    };
  });

  private readonly assigned = rxResource({
    params: () => this.user()?.id,
    stream: ({ params }) => this.workItems.list({ assignee: params, sort: 'board', size: 50 }),
  });
  protected readonly assignedItems = computed(() =>
    (valueOf(this.assigned)?.items ?? []).filter((item) => !item.status.isTerminal).slice(0, ASSIGNED_SHOWN),
  );

  private readonly usersCount = rxResource({ stream: () => this.users.count() });
  protected readonly usersUsed = computed(() => valueOf(this.usersCount)?.count ?? 0);
  protected readonly projectsUsed = computed(() => valueOf(this.projectContext.projects)?.length ?? 0);
}
