import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { form, FormRoot, maxLength, minLength, required, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { OrganizationRole, ORGANIZATION_ROLE_LABELS } from '../../../auth/models/auth.models';
import { Permissions } from '../../../auth/services/permissions.service';
import { apiErrorMessage } from '../../../shared/http-errors';
import { notBlank } from '../../../shared/not-blank';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { Banner } from '../../../shared/ui/banner/banner';
import { Button } from '../../../shared/ui/button/button';
import { DisabledReason } from '../../../shared/ui/disabled-reason/disabled-reason';
import { Panel } from '../../../shared/ui/panel/panel';
import { SelectField, SelectOption } from '../../../shared/ui/select-field/select-field';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { USER_LIMIT_REACHED } from '../../models/member.models';
import { MembersService } from '../../services/members.service';

const PASSWORD_ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GENERATED_LENGTH = 16;
const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface MemberModel {
  fullName: string;
  email: string;
  role: string;
  password: string;
}

/** A random password drawn with the browser's CSPRNG (rejection-free: the alphabet is only a bias of < 1/4 bit per char). */
export function generatePassword(length = GENERATED_LENGTH): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]).join('');
}

/**
 * Adds a person to the organization. The admin sets the initial password and hands it over out of band (there is no mail
 * yet), so the form can show it and generate one, and the confirmation never repeats it. The roles offered are only what
 * the signed-in user may grant (`Permissions.grantableRoles`). With no seat left the submit is disabled, with the reason.
 */
@Component({
  selector: 'app-member-create',
  imports: [FormRoot, TextField, SelectField, Panel, Banner, Button, DisabledReason],
  templateUrl: './member-create.html',
})
export class MemberCreate {
  private readonly members = inject(MembersService);
  private readonly notifications = inject(NotificationService);
  private readonly permissions = inject(Permissions);

  /** Active users and the plan's limit, as the list last said; `planLabel` names the plan in the reason. */
  readonly used = input.required<number>();
  readonly max = input.required<number>();
  readonly planLabel = input.required<string>();

  readonly created = output<void>();
  /** The server found no seat left (someone else took the last one): the page should reload the count. */
  readonly limitReached = output<void>();

  protected readonly atLimit = computed(() => this.used() >= this.max());
  protected readonly limitReason = computed(
    () => `Tu plan ${this.planLabel()} permite ${this.max()} usuarios y ya los tienes todos.`,
  );
  protected readonly roleOptions = computed<SelectOption[]>(() =>
    this.permissions.grantableRoles().map((role) => ({ value: role, label: ORGANIZATION_ROLE_LABELS[role] })),
  );

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly addedName = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  private readonly model = signal<MemberModel>({ fullName: '', email: '', role: 'MEMBER', password: '' });

  protected readonly memberForm = form(
    this.model,
    (path) => {
      required(path.fullName, { message: 'Ingresa el nombre completo.' });
      notBlank(path.fullName, 'Ingresa el nombre completo.');
      maxLength(path.fullName, 255, { message: 'Usa como máximo 255 caracteres.' });
      required(path.email, { message: 'Ingresa el correo.' });
      validate(path.email, ({ value }) =>
        value().trim() === '' || EMAIL_SHAPE.test(value().trim())
          ? null
          : { kind: 'email', message: 'Ingresa un correo válido.' },
      );
      required(path.role, { message: 'Elige un rol.' });
      required(path.password, { message: 'Ingresa una contraseña inicial.' });
      minLength(path.password, 8, { message: 'Usa al menos 8 caracteres.' });
      maxLength(path.password, 72, { message: 'Usa como máximo 72 caracteres.' });
    },
    {
      submission: {
        action: async () => {
          this.errorMessage.set(null);
          this.addedName.set(null);
          if (this.atLimit()) {
            this.errorMessage.set(this.limitReason());
            return undefined;
          }
          const model = this.model();
          try {
            const member = await firstValueFrom(
              this.members.create({
                fullName: model.fullName,
                email: model.email,
                role: model.role as OrganizationRole,
                password: model.password,
              }),
            );
            this.notifications.success(`Se agregó a ${member.fullName}.`);
            this.addedName.set(member.fullName);
            this.model.set({ fullName: '', email: '', role: 'MEMBER', password: '' });
            this.showPassword.set(false);
            this.memberForm().reset();
            this.created.emit();
          } catch (error) {
            if (error instanceof HttpErrorResponse && (error.error as { code?: string } | null)?.code === USER_LIMIT_REACHED) {
              this.errorMessage.set(this.limitReason());
              this.limitReached.emit();
            } else {
              this.errorMessage.set(apiErrorMessage(error, 'No se pudo agregar a la persona.'));
            }
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
    this.memberForm.password().value.set(generatePassword());
    this.showPassword.set(true);
  }
}
