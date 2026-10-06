import { Component, computed, inject } from '@angular/core';
import { Icon, IconName } from '../../ui/icon/icon';
import { Theme, ThemeService } from '../../theme/theme.service';

const ORDER: readonly Theme[] = ['claro', 'oscuro', 'sistema'];
const ICONS: Record<Theme, IconName> = { claro: 'sun', oscuro: 'moon', sistema: 'monitor' };

/** One icon button that cycles claro → oscuro → sistema; the label always says the current theme and the next one. */
@Component({
  selector: 'app-theme-toggle',
  imports: [Icon],
  templateUrl: './theme-toggle.html',
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);

  private readonly next = computed(() => ORDER[(ORDER.indexOf(this.theme.theme()) + 1) % ORDER.length]);
  protected readonly icon = computed(() => ICONS[this.theme.theme()]);
  protected readonly label = computed(() => `Tema: ${this.theme.theme()}. Cambiar a ${this.next()}`);

  protected cycle(): void {
    this.theme.setTheme(this.next());
  }
}
