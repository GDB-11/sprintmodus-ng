import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { disabled, form, FormRoot, maxLength, required, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { Sprint } from '../../../projects/models/project.models';
import { ProjectService } from '../../../projects/services/project.service';
import { apiErrorMessage } from '../../../shared/http-errors';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { notBlank } from '../../../shared/not-blank';
import { Banner } from '../../../shared/ui/banner/banner';
import { Button } from '../../../shared/ui/button/button';
import { Panel } from '../../../shared/ui/panel/panel';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { optionalNumber, parseOptionalNumber } from '../../../work-items/models/number-fields';

const PLANNED_POINTS_RULE = { min: 0, max: 100000, decimals: 0, message: 'Ingresa un número entero de 0 a 100000.' };
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 90;

interface SprintEditModel {
  name: string;
  startDate: string;
  endDate: string;
  plannedVelocity: string;
}

function daysBetween(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
}

/**
 * Edits a sprint that is not closed: its name and planned points always, its end date while it is planned or running, its
 * start date only while it is planned. The server refuses dates that overlap another sprint of the project.
 */
@Component({
  selector: 'app-sprint-edit',
  imports: [FormRoot, TextField, Panel, Banner, Button],
  templateUrl: './sprint-edit.html',
})
export class SprintEdit {
  private readonly projects = inject(ProjectService);
  private readonly notifications = inject(NotificationService);

  readonly sprint = input.required<Sprint>();
  readonly saved = output<Sprint>();
  readonly cancelled = output<void>();

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly started = computed(() => this.sprint().status !== 'PLANNED');

  private readonly model = linkedSignal<SprintEditModel>(() => {
    const sprint = this.sprint();
    return {
      name: sprint.name,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      plannedVelocity: String(sprint.plannedVelocity),
    };
  });

  protected readonly sprintForm = form(
    this.model,
    (path) => {
      required(path.name, { message: 'Ingresa un nombre.' });
      notBlank(path.name, 'Ingresa un nombre.');
      maxLength(path.name, 255, { message: 'Usa como máximo 255 caracteres.' });
      disabled(path.startDate, () => this.started());
      validate(path.startDate, ({ value }) =>
        ISO_DATE.test(value()) ? null : { kind: 'date', message: 'Ingresa una fecha válida.' },
      );
      validate(path.endDate, ({ value, valueOf }) => {
        if (!ISO_DATE.test(value())) {
          return { kind: 'date', message: 'Ingresa una fecha válida.' };
        }
        const start = valueOf(path.startDate);
        if (!ISO_DATE.test(start)) {
          return null;
        }
        const days = daysBetween(start, value());
        return days >= 1 && days <= MAX_DAYS
          ? null
          : { kind: 'range', message: `Debe terminar después del inicio y durar como máximo ${MAX_DAYS} días.` };
      });
      optionalNumber(path.plannedVelocity, PLANNED_POINTS_RULE);
    },
    {
      submission: {
        action: async () => {
          this.errorMessage.set(null);
          const model = this.model();
          const current = this.sprint();
          try {
            const sprint = await firstValueFrom(
              this.projects.updateSprint(current.sprintCode, {
                name: model.name.trim(),
                startDate: this.started() ? undefined : model.startDate,
                endDate: model.endDate,
                plannedVelocity: parseOptionalNumber(model.plannedVelocity),
              }),
            );
            this.notifications.success(`Se guardaron los cambios de ${sprint.name}.`);
            this.saved.emit(sprint);
          } catch (error) {
            this.errorMessage.set(apiErrorMessage(error, 'No se pudo guardar el sprint.'));
          }
          return undefined;
        },
      },
    },
  );

  protected readonly endHint = computed(() =>
    this.started()
      ? 'Puedes cambiarla mientras el sprint corre; no debe cruzarse con otro sprint del proyecto.'
      : 'No debe cruzarse con otro sprint del proyecto. Puede coincidir con el inicio del siguiente.',
  );
  protected readonly startHint = computed(() =>
    this.started() ? 'Un sprint iniciado ya no cambia de fecha de inicio.' : 'Solo se puede cambiar antes de iniciar el sprint.',
  );
}
