import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  debounce,
  email,
  form,
  FormRoot,
  minLength,
  required,
  validate,
  validateHttp,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthCard } from '../../components/auth-card/auth-card';
import { TextField } from '../../../shared/ui/text-field/text-field';
import {
  OrganizationCodeAvailability,
  RegisterOrganizationRequest,
} from '../../models/auth.models';
import {
  normalizeOrganizationCode,
  ORGANIZATION_CODE_PATTERN,
} from '../../models/organization-code';
import { AuthService } from '../../services/auth.service';

const CODE_TAKEN_MESSAGE = 'Este código de organización ya está en uso.';
const CODE_FORMAT_MESSAGE =
  'Usa de 3 a 30 letras, dígitos o guiones, sin un guion al inicio o al final.';

/** What to tell the user for each reason the availability check can give. */
const UNAVAILABLE_MESSAGES: Record<NonNullable<OrganizationCodeAvailability['reason']>, string> = {
  ORGANIZATION_CODE_TAKEN: CODE_TAKEN_MESSAGE,
  ORGANIZATION_CODE_RESERVED: 'Este código de organización está reservado. Elige otro.',
  INVALID_ORGANIZATION_CODE: CODE_FORMAT_MESSAGE,
};

function registrationErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
    }
    if (error.status === 400) {
      return 'Algunos datos no fueron aceptados. Revisa el formulario e inténtalo de nuevo.';
    }
  }
  return 'Ocurrió un error. Inténtalo de nuevo.';
}

@Component({
  selector: 'app-register-organization',
  imports: [AuthCard, TextField, FormRoot, RouterLink],
  templateUrl: './register-organization.html',
})
export class RegisterOrganization {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly errorMessage = signal<string | null>(null);

  private readonly model = signal<RegisterOrganizationRequest>({
    organizationName: '',
    organizationCode: '',
    fullName: '',
    email: '',
    password: '',
  });

  protected readonly registerForm = form(
    this.model,
    (path) => {
      required(path.organizationName, { message: 'Ingresa el nombre de la organización.' });
      required(path.fullName, { message: 'Ingresa tu nombre completo.' });
      required(path.email, { message: 'Ingresa tu correo electrónico.' });
      email(path.email, { message: 'Ingresa un correo electrónico válido.' });
      required(path.password, { message: 'Elige una contraseña.' });
      minLength(path.password, 8, { message: 'Usa al menos 8 caracteres.' });

      required(path.organizationCode, { message: 'Elige un código de organización.' });
      validate(path.organizationCode, ({ value }) =>
        ORGANIZATION_CODE_PATTERN.test(normalizeOrganizationCode(value()))
          ? null
          : {
              kind: 'organizationCodeFormat',
              message: CODE_FORMAT_MESSAGE,
            },
      );
      // Runs only once the checks above pass, so it never queries malformed codes.
      debounce(path.organizationCode, 400);
      validateHttp<string, OrganizationCodeAvailability>(path.organizationCode, {
        request: ({ value }) => this.authService.organizationCodeAvailabilityUrl(value()),
        onSuccess: ({ available, reason }) =>
          available
            ? null
            : {
                kind: 'organizationCodeUnavailable',
                message: UNAVAILABLE_MESSAGES[reason ?? 'ORGANIZATION_CODE_TAKEN'],
              },
        // If the check itself fails, the server still rejects a taken code on submit.
        onError: () => null,
      });
    },
    {
      submission: {
        action: async (field) => {
          this.errorMessage.set(null);
          const request = this.model();
          try {
            await firstValueFrom(this.authService.registerOrganization(request));
          } catch (error) {
            if (error instanceof HttpErrorResponse && error.status === 409) {
              return {
                kind: 'organizationCodeTaken',
                fieldTree: field.organizationCode,
                message: CODE_TAKEN_MESSAGE,
              };
            }
            this.errorMessage.set(registrationErrorMessage(error));
            return undefined;
          }
          await this.router.navigate(['/login'], {
            queryParams: { organizationCode: normalizeOrganizationCode(request.organizationCode) },
          });
          return undefined;
        },
      },
    },
  );

  protected readonly codeHint = computed(() => {
    const code = this.registerForm.organizationCode();
    if (code.pending()) {
      return 'Verificando disponibilidad…';
    }
    const normalized = normalizeOrganizationCode(code.value());
    return normalized
      ? `Los miembros inician sesión con: ${normalized}`
      : 'Corto y fácil de recordar, por ejemplo acme. Las letras se muestran en minúsculas.';
  });
}
