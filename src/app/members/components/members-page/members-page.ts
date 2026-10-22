import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { SUBSCRIPTION_PLAN_LABELS } from '../../../auth/models/auth.models';
import { AuthService } from '../../../auth/services/auth.service';
import { Permissions } from '../../../auth/services/permissions.service';
import { apiErrorMessage } from '../../../shared/http-errors';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { valueOf } from '../../../shared/resource-value';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { ErrorState } from '../../../shared/ui/error-state/error-state';
import { Meter } from '../../../shared/ui/meter/meter';
import { NotAllowed } from '../../../shared/ui/not-allowed/not-allowed';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Panel } from '../../../shared/ui/panel/panel';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { Member, MemberPage } from '../../models/member.models';
import { MembersService } from '../../services/members.service';
import { MemberCreate } from '../member-create/member-create';
import { MemberPasswordReset } from '../member-password-reset/member-password-reset';
import { MemberList } from '../member-list/member-list';

/**
 * "Miembros": who is in the organization, how many seats of the plan are used, and a form to add someone. A member who
 * opens it is told why they cannot (never redirected, and nothing is fetched); the backend refuses the same calls.
 */
@Component({
  selector: 'app-members-page',
  imports: [PageHeader, Panel, Meter, Skeleton, ErrorState, EmptyState, NotAllowed, MemberList, MemberCreate, MemberPasswordReset, ConfirmDialog],
  templateUrl: './members-page.html',
  host: { class: 'mx-auto flex max-w-5xl flex-col gap-4' },
})
export class MembersPage {
  private readonly service = inject(MembersService);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);

  protected readonly canManage = inject(Permissions).canAddUsers;

  private readonly refreshes = signal(0);

  protected readonly page = rxResource({
    params: () => (this.canManage() ? this.refreshes() : undefined),
    stream: () => this.service.list(),
  });

  /** The last answer, kept while a reload runs, so the form (and its confirmation) is not torn down and rebuilt. */
  protected readonly data = linkedSignal<MemberPage | undefined, MemberPage | undefined>({
    source: () => valueOf(this.page),
    computation: (next, previous) => next ?? previous?.value,
  });
  /** The list's seat count is the authority; the session's `maxUsers` only stands in until the list answers. */
  protected readonly used = computed(() => this.data()?.count ?? 0);
  protected readonly max = computed(() => this.data()?.maxUsers ?? this.auth.currentUser()?.subscription.maxUsers ?? 0);
  protected readonly planLabel = computed(() => {
    const plan = this.auth.currentUser()?.subscription.plan;
    return plan ? SUBSCRIPTION_PLAN_LABELS[plan] : '';
  });

  protected readonly resetTarget = signal<Member | null>(null);
  protected readonly resetOpen = signal(false);

  protected readonly deactivateTarget = signal<Member | null>(null);
  protected readonly deactivateOpen = signal(false);
  protected readonly changingActive = signal(false);

  /** Deactivating asks first (the person is locked out); reactivating is harmless and happens at once. */
  protected askToggleActive(member: Member): void {
    if (member.isActive) {
      this.deactivateTarget.set(member);
      this.deactivateOpen.set(true);
    } else {
      this.setActive(member, true);
    }
  }

  protected confirmDeactivate(): void {
    const target = this.deactivateTarget();
    if (target) {
      this.setActive(target, false);
    }
  }

  private setActive(member: Member, active: boolean): void {
    this.changingActive.set(true);
    this.service.setActive(member.userCode, active).subscribe({
      next: () => {
        this.changingActive.set(false);
        this.deactivateOpen.set(false);
        this.notifications.success(active ? `${member.fullName} puede volver a iniciar sesión.` : `${member.fullName} ya no puede iniciar sesión.`);
        this.refresh();
      },
      error: (error: unknown) => {
        this.changingActive.set(false);
        this.deactivateOpen.set(false);
        this.notifications.error(apiErrorMessage(error, 'No se pudo cambiar el acceso de la persona.'));
        this.refresh();
      },
    });
  }

  protected askReset(member: Member): void {
    this.resetTarget.set(member);
    this.resetOpen.set(true);
  }

  protected refresh(): void {
    this.refreshes.update((n) => n + 1);
  }
}
