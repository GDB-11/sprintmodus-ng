import { Component, inject, signal } from '@angular/core';
import { form, FormRoot, required } from '@angular/forms/signals';
import { AvatarGroup } from '../../shared/ui/avatar-group/avatar-group';
import { Avatar } from '../../shared/ui/avatar/avatar';
import { Badge } from '../../shared/ui/badge/badge';
import { Banner, BannerKind } from '../../shared/ui/banner/banner';
import { Button } from '../../shared/ui/button/button';
import { Chip, ChipTone } from '../../shared/ui/chip/chip';
import { ConfirmInline } from '../../shared/ui/confirm-inline/confirm-inline';
import { DataTable, DataTableColumn } from '../../shared/ui/data-table/data-table';
import { DisabledReason } from '../../shared/ui/disabled-reason/disabled-reason';
import { Disclosure } from '../../shared/ui/disclosure/disclosure';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { ErrorState } from '../../shared/ui/error-state/error-state';
import { FilterChip } from '../../shared/ui/filter-chip/filter-chip';
import { ICON_SHAPES } from '../../shared/ui/icon/icon-shapes';
import { Icon, IconName } from '../../shared/ui/icon/icon';
import { Logo } from '../../shared/ui/logo/logo';
import { Meter } from '../../shared/ui/meter/meter';
import { Panel } from '../../shared/ui/panel/panel';
import { SearchField } from '../../shared/ui/search-field/search-field';
import { SegmentedControl, SegmentedOption } from '../../shared/ui/segmented-control/segmented-control';
import { SelectField, SelectOption } from '../../shared/ui/select-field/select-field';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { TextareaField } from '../../shared/ui/textarea-field/textarea-field';
import { TextField } from '../../shared/ui/text-field/text-field';
import { ThemeService } from '../../shared/theme/theme.service';

interface SprintRow {
  code: string;
  name: string;
  points: number;
}

const SPRINT_COLUMNS: DataTableColumn<SprintRow>[] = [
  { header: 'Sprint', cell: (r) => r.name },
  { header: 'Puntos', cell: (r) => `${r.points}`, numeric: true },
];

/** Every shared/ui primitive with its variants and states, in light and dark. Dev-only (see app.routes.ts). */
@Component({
  selector: 'app-design-gallery',
  imports: [
    Avatar,
    AvatarGroup,
    Badge,
    Banner,
    Button,
    Chip,
    ConfirmInline,
    DataTable,
    DisabledReason,
    Disclosure,
    EmptyState,
    ErrorState,
    FilterChip,
    FormRoot,
    Icon,
    Logo,
    Meter,
    Panel,
    SearchField,
    SegmentedControl,
    SelectField,
    Skeleton,
    TextareaField,
    TextField,
  ],
  templateUrl: './design-gallery.html',
})
export class DesignGallery {
  protected readonly theme = inject(ThemeService);

  protected readonly iconNames = Object.keys(ICON_SHAPES) as IconName[];
  protected readonly buttonVariants = ['primary', 'secondary', 'destructive'] as const;
  protected readonly chipTones: ChipTone[] = ['neutral', 'error', 'warning', 'info', 'success'];
  protected readonly bannerKinds: BannerKind[] = ['error', 'success', 'info', 'warning'];

  protected readonly filterPressed = signal(false);
  protected readonly confirmBusy = signal(false);

  protected readonly view = signal<'tree' | 'overview' | 'list'>('tree');
  protected readonly viewOptions: readonly SegmentedOption<'tree' | 'overview' | 'list'>[] = [
    { value: 'tree', label: 'Árbol' },
    { value: 'overview', label: 'Vista general' },
    { value: 'list', label: 'Lista' },
  ];

  protected readonly sprintRows: SprintRow[] = [
    { code: 'SP-1', name: 'Sprint 1', points: 20 },
    { code: 'SP-2', name: 'Sprint 2', points: 18 },
  ];
  protected readonly sprintColumns = SPRINT_COLUMNS;
  protected readonly sprintTrackBy = (row: SprintRow) => row.code;

  private readonly demoModel = signal({ title: '', description: '', priority: 'MEDIUM' });
  protected readonly demoForm = form(this.demoModel, (path) => {
    required(path.title, { message: 'Ingresa un título.' });
  });
  protected readonly priorityOptions: SelectOption[] = [
    { value: 'LOW', label: 'Baja' },
    { value: 'MEDIUM', label: 'Media' },
    { value: 'HIGH', label: 'Alta' },
    { value: 'CRITICAL', label: 'Crítica' },
  ];
}
