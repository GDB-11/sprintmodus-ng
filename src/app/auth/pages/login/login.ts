import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { email, form, FormRoot, required } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthCard } from '../../components/auth-card/auth-card';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { LoginRequest } from '../../models/auth.models';
import { AuthService } from '../../services/auth.service';

const DEFAULT_REDIRECT = '/dashboard';

function loginErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    switch (error.status) {
      case 0:
        return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
      case 401:
        return 'Correo electrónico, contraseña o código de organización incorrectos.';
      case 402:
        return 'La suscripción de tu organización está inactiva o venció. Contacta al propietario de tu organización.';
    }
  }
  return 'Ocurrió un error. Inténtalo de nuevo.';
}

/** Only follow same-app paths, so `returnUrl` cannot redirect to another site. */
function safeReturnUrl(url: string | null): string {
  return url?.startsWith('/') && !url.startsWith('//') ? url : DEFAULT_REDIRECT;
}

@Component({
  selector: 'app-login',
  imports: [AuthCard, TextField, FormRoot, RouterLink],
  templateUrl: './login.html',
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
      required(path.organizationCode, { message: 'Ingresa el código de tu organización.' });
      required(path.email, { message: 'Ingresa tu correo electrónico.' });
      email(path.email, { message: 'Ingresa un correo electrónico válido.' });
      required(path.password, { message: 'Ingresa tu contraseña.' });
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
