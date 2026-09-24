import { Component, input } from '@angular/core';

/** Page shell shared by the login and registration pages. */
@Component({
  selector: 'app-auth-card',
  template: `
    <main class="flex min-h-screen items-center justify-center bg-light-bg p-4 text-neutral-900 dark:bg-dark-bg dark:text-neutral-100">
      <div class="w-full max-w-md rounded-xl bg-light-surface-secondary p-6 shadow-sm sm:p-8 dark:bg-dark-surface-secondary">
        <h1 class="text-2xl font-semibold">{{ heading() }}</h1>
        <p class="mt-1 mb-6 text-neutral-800 dark:text-neutral-300">{{ subheading() }}</p>
        <ng-content />
      </div>
    </main>
  `,
})
export class AuthCard {
  readonly heading = input.required<string>();
  readonly subheading = input.required<string>();
}
