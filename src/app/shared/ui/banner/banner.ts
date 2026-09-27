import { Component, computed, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

export type BannerKind = 'error' | 'success' | 'info' | 'warning';

const KIND_CLASSES: Record<BannerKind, string> = {
  error: 'bg-error-100 text-error-900',
  success: 'bg-success-100 text-success-900',
  info: 'bg-info-100 text-info-900',
  warning: 'bg-warning-100 text-warning-900',
};
const KIND_ICON: Record<BannerKind, IconName> = {
  error: 'circle-alert',
  success: 'check-circle',
  info: 'info',
  warning: 'triangle-alert',
};
const KIND_ROLE: Record<BannerKind, 'alert' | 'status'> = {
  error: 'alert',
  warning: 'alert',
  success: 'status',
  info: 'status',
};

/** An inline message banner, coloured and roled by kind. `role="alert"` interrupts (error/warning); `role="status"` doesn't (success/info). */
@Component({
  selector: 'app-banner',
  imports: [Icon],
  templateUrl: './banner.html',
})
export class Banner {
  readonly kind = input<BannerKind>('info');

  protected readonly classes = computed(() => `flex items-start gap-2 rounded-md p-3 text-sm font-medium ${KIND_CLASSES[this.kind()]}`);
  protected readonly icon = computed(() => KIND_ICON[this.kind()]);
  protected readonly role = computed(() => KIND_ROLE[this.kind()]);
}
