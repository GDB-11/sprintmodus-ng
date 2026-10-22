import { Component, inject, input, output } from '@angular/core';
import { Permissions } from '../../../auth/services/permissions.service';
import { ORGANIZATION_ROLE_LABELS } from '../../../auth/models/auth.models';
import { Button } from '../../../shared/ui/button/button';
import { Chip, ChipTone } from '../../../shared/ui/chip/chip';
import { DataTable, DataTableCell, DataTableColumn } from '../../../shared/ui/data-table/data-table';
import { Member, ROLE_TONES } from '../../models/member.models';

const LAST_LOGIN = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' });

/** The people of the organization: name, e-mail, role, whether they are active and when they last signed in. */
@Component({
  selector: 'app-member-list',
  imports: [DataTable, DataTableCell, Chip, Button],
  templateUrl: './member-list.html',
})
export class MemberList {
  private readonly permissions = inject(Permissions);

  readonly members = input.required<readonly Member[]>();
  /** Someone asked to set this person's password. */
  readonly resetRequested = output<Member>();
  /** Someone asked to deactivate (or, for a deactivated person, reactivate) this person. */
  readonly activeToggleRequested = output<Member>();

  protected readonly columns: readonly DataTableColumn<Member>[] = [
    { header: 'Nombre' },
    { header: 'Correo' },
    { header: 'Rol' },
    { header: 'Estado' },
    { header: 'Último acceso' },
    { header: 'Contraseña' },
    { header: 'Acceso' },
  ];

  protected readonly trackBy = (member: Member) => member.userCode;
  protected lastAccess(member: Member): string {
    return member.lastLoginAt ? LAST_LOGIN.format(new Date(member.lastLoginAt)) : 'Nunca';
  }

  protected canReset(member: Member): boolean {
    return this.permissions.canResetPasswordOf(member);
  }

  /** Why the button is disabled, so it is shown rather than hidden. */
  protected resetBlockedReason(member: Member): string {
    return member.userCode === this.permissions.userCode()
      ? 'Cambia tu propia contraseña desde el menú de tu cuenta.'
      : 'No tienes permiso para cambiar la contraseña de este rol.';
  }

  protected canSetActive(member: Member): boolean {
    return this.permissions.canSetActiveOf(member);
  }

  protected setActiveBlockedReason(member: Member): string {
    return member.userCode === this.permissions.userCode()
      ? 'No puedes desactivar tu propia cuenta.'
      : 'No tienes permiso para cambiar el acceso de este rol.';
  }

  protected roleLabel(member: Member): string {
    return ORGANIZATION_ROLE_LABELS[member.role];
  }

  protected roleTone(member: Member): ChipTone {
    return ROLE_TONES[member.role];
  }
}
