import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
import { TenantContextService } from '../tenant/services/tenant-context.service';

/** Landing page for signed-in users. */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  protected readonly authService = inject(AuthService);
  protected readonly tenant = inject(TenantContextService).tenant;
}
