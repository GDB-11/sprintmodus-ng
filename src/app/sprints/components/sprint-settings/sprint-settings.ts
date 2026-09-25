import { Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormField, form, FormRoot, required } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { Permissions } from '../../../auth/services/permissions.service';
import { SprintConfig, WEEK_DAYS, WEEK_DAY_LABELS, WeekDay } from '../../../projects/models/project.models';
import { ProjectService } from '../../../projects/services/project.service';
import { apiErrorMessage } from '../../../shared/http-errors';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { valueOf } from '../../../shared/resource-value';
import { SelectField, SelectOption } from '../../../shared/ui/select-field/select-field';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { optionalNumber } from '../../../work-items/models/number-fields';

const DAYS_RULE = { min: 1, max: 90, decimals: 0, message: 'Ingresa un número entero de 1 a 90.' };
const DAY_OPTIONS: SelectOption[] = WEEK_DAYS.map((day) => ({ value: day, label: WEEK_DAY_LABELS[day] }));

interface SettingsModel {
  defaultSprintDays: string;
  sprintStartDay: WeekDay;
  velocityTrackingEnabled: boolean;
}

/**
 * How the organization plans its sprints: how long they last, the day they start, and whether velocity is recorded. Owners
 * and admins change it (for sprints created afterwards); everyone else sees the values, read-only, with the reason.
 */
@Component({
  selector: 'app-sprint-settings',
  imports: [FormRoot, FormField, TextField, SelectField],
  templateUrl: './sprint-settings.html',
})
export class SprintSettings {
  private readonly projects = inject(ProjectService);
  private readonly notifications = inject(NotificationService);

  protected readonly canAdminister = inject(Permissions).canAdminister;
  protected readonly dayOptions = DAY_OPTIONS;
  protected readonly dayLabels = WEEK_DAY_LABELS;
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly config = rxResource({ stream: () => this.projects.sprintConfig() });
  protected readonly loaded = computed(() => valueOf(this.config));

  private readonly model = signal<SettingsModel>({ defaultSprintDays: '', sprintStartDay: 'MONDAY', velocityTrackingEnabled: true });

  protected readonly settingsForm = form(
    this.model,
    (path) => {
      required(path.defaultSprintDays, { message: 'Ingresa la duración en días.' });
      optionalNumber(path.defaultSprintDays, DAYS_RULE);
    },
    {
      submission: {
        action: async () => {
          this.errorMessage.set(null);
          const model = this.model();
          try {
            const saved = await firstValueFrom(
              this.projects.updateSprintConfig({
                defaultSprintDays: Number(model.defaultSprintDays),
                sprintStartDay: model.sprintStartDay,
                velocityTrackingEnabled: model.velocityTrackingEnabled,
              }),
            );
            this.fill(saved);
            this.notifications.success('Se guardó la configuración de sprints.');
          } catch (error) {
            this.errorMessage.set(apiErrorMessage(error, 'No se pudo guardar la configuración.'));
          }
          return undefined;
        },
      },
    },
  );

  constructor() {
    effect(() => {
      const config = this.loaded();
      if (config) {
        this.fill(config);
      }
    });
  }

  private fill(config: SprintConfig): void {
    this.model.set({
      defaultSprintDays: String(config.defaultSprintDays),
      sprintStartDay: config.sprintStartDay,
      velocityTrackingEnabled: config.velocityTrackingEnabled,
    });
  }
}
