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
import { AuthCard } from '../../components/auth-card';
import { TextField } from '../../components/text-field';
import {
  OrganizationCodeAvailability,
  RegisterOrganizationRequest,
} from '../../models/auth.models';
import {
  normalizeOrganizationCode,
  ORGANIZATION_CODE_PATTERN,
} from '../../models/organization-code';
import { AuthService } from '../../services/auth.service';

const CODE_TAKEN_MESSAGE = 'This organization code is already taken.';
const CODE_FORMAT_MESSAGE =
  'Use 3 to 30 letters, digits or hyphens, without a hyphen at the start or end.';

/** What to tell the user for each reason the availability check can give. */
const UNAVAILABLE_MESSAGES: Record<NonNullable<OrganizationCodeAvailability['reason']>, string> = {
  ORGANIZATION_CODE_TAKEN: CODE_TAKEN_MESSAGE,
  ORGANIZATION_CODE_RESERVED: 'This organization code is reserved. Choose another one.',
  INVALID_ORGANIZATION_CODE: CODE_FORMAT_MESSAGE,
};

function registrationErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Cannot reach the server. Check your connection and try again.';
    }
    if (error.status === 400) {
      return 'Some of the details were rejected. Review the form and try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}

@Component({
  selector: 'app-register-organization',
  imports: [AuthCard, TextField, FormRoot, RouterLink],
  template: `
    <app-auth-card
      heading="Register your organization"
      subheading="Create the organization and its owner account."
    >
      <form [formRoot]="registerForm" class="flex flex-col gap-4">
        @if (errorMessage(); as message) {
          <p role="alert" class="rounded-md bg-error-100 p-3 text-sm font-medium text-error-900">
            {{ message }}
          </p>
        }
        <app-text-field
          [field]="registerForm.organizationName"
          inputId="organizationName"
          label="Organization name"
          autocomplete="organization"
        />
        <app-text-field
          [field]="registerForm.organizationCode"
          inputId="organizationCode"
          label="Organization code"
          [hint]="codeHint()"
        />
        <app-text-field
          [field]="registerForm.fullName"
          inputId="fullName"
          label="Your full name"
          autocomplete="name"
        />
        <app-text-field
          [field]="registerForm.email"
          inputId="email"
          label="Email"
          type="email"
          autocomplete="email"
        />
        <app-text-field
          [field]="registerForm.password"
          inputId="password"
          label="Password"
          type="password"
          autocomplete="new-password"
          hint="At least 8 characters."
        />
        <button
          type="submit"
          [disabled]="registerForm().submitting()"
          class="rounded-md bg-primary-500 px-4 py-2.5 font-semibold text-neutral-900 hover:bg-primary-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 disabled:opacity-60 dark:focus-visible:outline-secondary-400"
        >
          {{ registerForm().submitting() ? 'Creating organization…' : 'Create organization' }}
        </button>
      </form>
      <p class="mt-6 text-sm">
        Already registered?
        <a
          routerLink="/login"
          class="font-medium text-secondary-900 underline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-secondary-400"
          >Sign in</a
        >
      </p>
    </app-auth-card>
  `,
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
      required(path.organizationName, { message: 'Enter the organization name.' });
      required(path.fullName, { message: 'Enter your full name.' });
      required(path.email, { message: 'Enter your email.' });
      email(path.email, { message: 'Enter a valid email address.' });
      required(path.password, { message: 'Choose a password.' });
      minLength(path.password, 8, { message: 'Use at least 8 characters.' });

      required(path.organizationCode, { message: 'Choose an organization code.' });
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
      return 'Checking availability…';
    }
    const normalized = normalizeOrganizationCode(code.value());
    return normalized
      ? `Members sign in with: ${normalized}`
      : 'Short and easy to remember, for example acme. Letters are shown in lowercase.';
  });
}
