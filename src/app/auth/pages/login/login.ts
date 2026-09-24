import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { email, form, FormRoot, required } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthCard } from '../../components/auth-card';
import { TextField } from '../../components/text-field';
import { LoginRequest } from '../../models/auth.models';
import { AuthService } from '../../services/auth.service';

const DEFAULT_REDIRECT = '/dashboard';

function loginErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    switch (error.status) {
      case 0:
        return 'Cannot reach the server. Check your connection and try again.';
      case 401:
        return 'Invalid email, password or organization code.';
      case 402:
        return "This organization's subscription is inactive or has expired. Contact your organization's owner.";
    }
  }
  return 'Something went wrong. Please try again.';
}

/** Only follow same-app paths, so `returnUrl` cannot redirect to another site. */
function safeReturnUrl(url: string | null): string {
  return url?.startsWith('/') && !url.startsWith('//') ? url : DEFAULT_REDIRECT;
}

@Component({
  selector: 'app-login',
  imports: [AuthCard, TextField, FormRoot, RouterLink],
  template: `
    <app-auth-card heading="Sign in" subheading="Use your email and your organization code.">
      <form [formRoot]="loginForm" class="flex flex-col gap-4">
        @if (errorMessage(); as message) {
          <p role="alert" class="rounded-md bg-error-100 p-3 text-sm font-medium text-error-900">
            {{ message }}
          </p>
        }
        <app-text-field
          [field]="loginForm.organizationCode"
          inputId="organizationCode"
          label="Organization code"
          hint="The short code your organization chose, for example acme."
        />
        <app-text-field
          [field]="loginForm.email"
          inputId="email"
          label="Email"
          type="email"
          autocomplete="username"
        />
        <app-text-field
          [field]="loginForm.password"
          inputId="password"
          label="Password"
          type="password"
          autocomplete="current-password"
        />
        <button
          type="submit"
          [disabled]="loginForm().submitting()"
          class="rounded-md bg-primary-500 px-4 py-2.5 font-semibold text-neutral-900 hover:bg-primary-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 disabled:opacity-60 dark:focus-visible:outline-secondary-400"
        >
          {{ loginForm().submitting() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
      <p class="mt-6 text-sm">
        New to Sprintmodus?
        <a
          routerLink="/register"
          class="font-medium text-secondary-900 underline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-secondary-400"
          >Register your organization</a
        >
      </p>
    </app-auth-card>
  `,
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly errorMessage = signal<string | null>(null);

  private readonly model = signal<LoginRequest>({
    email: '',
    password: '',
    organizationCode: this.route.snapshot.queryParamMap.get('organizationCode') ?? '',
  });

  protected readonly loginForm = form(
    this.model,
    (path) => {
      required(path.organizationCode, { message: 'Enter your organization code.' });
      required(path.email, { message: 'Enter your email.' });
      email(path.email, { message: 'Enter a valid email address.' });
      required(path.password, { message: 'Enter your password.' });
    },
    {
      submission: {
        action: async () => {
          this.errorMessage.set(null);
          try {
            await firstValueFrom(this.authService.login(this.model()));
          } catch (error) {
            this.errorMessage.set(loginErrorMessage(error));
            return;
          }
          await this.router.navigateByUrl(
            safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')),
          );
        },
      },
    },
  );
}
