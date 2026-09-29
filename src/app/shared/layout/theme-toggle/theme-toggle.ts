import { Component, inject } from '@angular/core';
import { SegmentedControl, SegmentedOption } from '../../ui/segmented-control/segmented-control';
import { Theme, ThemeService } from '../../theme/theme.service';

const OPTIONS: readonly SegmentedOption<Theme>[] = [
  { value: 'claro', label: 'Claro' },
  { value: 'oscuro', label: 'Oscuro' },
  { value: 'sistema', label: 'Sistema' },
];

/** Claro / oscuro / sistema, as a three-way toggle. */
@Component({
  selector: 'app-theme-toggle',
  imports: [SegmentedControl],
  templateUrl: './theme-toggle.html',
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
  protected readonly options = OPTIONS;
}
