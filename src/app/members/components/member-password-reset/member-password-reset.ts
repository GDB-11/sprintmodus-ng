import { Component, inject, input, model, signal } from '@angular/core';
import { form, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../../shared/http-errors';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { Banner } from '../../../shared/ui/banner/banner';
import { Button } from '../../../shared/ui/button/button';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { Member } from '../../models/member.models';
import { MembersService } from '../../services/members.service';
import { generatePassword } from '../member-create/member-create';

/**
 * An owner or admin sets a new password for someone else and hands it over out of band (there is no mail). Like the
 * add form it can generate one and show it; nothing repeats it afterwards.
 */
@Component({
  selector: 'app-member-password-reset',
  imports: [Dialog, FormRoot, TextField, Banner, Button],
  templateUrl: './member-password-reset.html',
})
export class MemberPasswordReset {
  private readonly members = inject(MembersService);
  private readonly notifications = inject(NotificationService);

  readonly member = input<Member | null>(null);
  readonly open = model(false);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  private readonly model = signal({ password: '' });

  protected readonly resetForm = form(
    this.model,
    (path) => {
      required(path.password, { message: 'Ingresa la nueva contraseña.' });
      minLength(path.password, 8, { message: 'Usa al menos 8 caracteres.' });
      maxLength(path.password, 72, { message: 'Usa como máximo 72 caracteres.' });
    },
    {
      submission: {
        action: async () => {
          const target = this.member();
          if (!target) {
            return undefined;
          }
          this.errorMessage.set(null);
          try {
            await firstValueFrom(this.members.resetPassword(target.userCode, this.model().password));
            this.notifications.success(
              `Se cambió la contraseña de ${target.fullName}. Entrégasela por un canal seguro: no se volverá a mostrar.`,
            );
            this.close();
          } catch (error) {
            this.errorMessage.set(apiErrorMessage(error, 'No se pudo cambiar la contraseña.'));
          }
          return undefined;
        },
      },
    },
  );

  protected toggleShowPassword(): void {
    this.showPassword.update((shown) => !shown);
  }

  protected generate(): void {
    this.resetForm.password().value.set(generatePassword());
    this.showPassword.set(true);
  }

  private close(): void {
    this.model.set({ password: '' });
    this.resetForm().reset();
    this.showPassword.set(false);
    this.open.set(false);
  }
}
