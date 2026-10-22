import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { form, FormRoot, maxLength, minLength, required, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../../shared/http-errors';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { Banner } from '../../../shared/ui/banner/banner';
import { Button } from '../../../shared/ui/button/button';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Panel } from '../../../shared/ui/panel/panel';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { WRONG_CURRENT_PASSWORD } from '../../../members/models/member.models';
import { AccountService } from '../../services/account.service';

interface PasswordModel {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const EMPTY: PasswordModel = { currentPassword: '', newPassword: '', confirmPassword: '' };

/**
 * "Cambiar contraseña": the signed-in user sets a new password, proving they know the current one (there are no emails
 * to recover a password with). The session stays valid afterwards.
 */
@Component({
  selector: 'app-change-password-page',
  imports: [FormRoot, PageHeader, Panel, TextField, Banner, Button],
  templateUrl: './change-password-page.html',
  host: { class: 'mx-auto flex max-w-2xl flex-col gap-4' },
})
export class ChangePasswordPage {
  private readonly account = inject(AccountService);
  private readonly notifications = inject(NotificationService);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly changed = signal(false);

  private readonly model = signal<PasswordModel>({ ...EMPTY });

  protected readonly passwordForm = form(
    this.model,
    (path) => {
      required(path.currentPassword, { message: 'Ingresa tu contraseña actual.' });
      required(path.newPassword, { message: 'Ingresa la nueva contraseña.' });
      minLength(path.newPassword, 8, { message: 'Usa al menos 8 caracteres.' });
      maxLength(path.newPassword, 72, { message: 'Usa como máximo 72 caracteres.' });
      validate(path.newPassword, ({ value, valueOf }) =>
        value() === '' || value() !== valueOf(path.currentPassword)
          ? null
          : { kind: 'same', message: 'La nueva contraseña debe ser distinta de la actual.' },
      );
      required(path.confirmPassword, { message: 'Repite la nueva contraseña.' });
      validate(path.confirmPassword, ({ value, valueOf }) =>
        value() === '' || value() === valueOf(path.newPassword)
          ? null
          : { kind: 'mismatch', message: 'Las contraseñas no coinciden.' },
      );
    },
    {
      submission: {
        action: async () => {
          this.errorMessage.set(null);
          this.changed.set(false);
          const { currentPassword, newPassword } = this.model();
          try {
            await firstValueFrom(this.account.changePassword(currentPassword, newPassword));
            this.notifications.success('Se cambió tu contraseña.');
            this.changed.set(true);
            this.model.set({ ...EMPTY });
            this.passwordForm().reset();
          } catch (error) {
            this.errorMessage.set(
              error instanceof HttpErrorResponse && (error.error as { code?: string } | null)?.code === WRONG_CURRENT_PASSWORD
                ? 'La contraseña actual no es correcta.'
                : apiErrorMessage(error, 'No se pudo cambiar la contraseña.'),
            );
          }
          return undefined;
        },
      },
    },
  );
}
