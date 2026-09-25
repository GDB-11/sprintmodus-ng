import { Component, inject, input, output, signal } from '@angular/core';
import { form, FormRoot, maxLength, required, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { Permissions } from '../../../auth/services/permissions.service';
import { Sprint } from '../../../projects/models/project.models';
import { ProjectService } from '../../../projects/services/project.service';
import { apiErrorMessage } from '../../../shared/http-errors';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { notBlank } from '../../../shared/not-blank';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { optionalNumber, parseOptionalNumber } from '../../../work-items/models/number-fields';

const PLANNED_POINTS_RULE = { min: 0, max: 100000, decimals: 0, message: 'Ingresa un número entero de 0 a 100000.' };
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface SprintModel {
  name: string;
  startDate: string;
  plannedVelocity: string;
}

/**
 * Creates a sprint in a project. Its length is the organization's configured one and the end date follows from it. Only
 * owners and admins plan sprints: for anyone else the form is replaced by a disabled button and the reason.
 */
@Component({
  selector: 'app-sprint-create',
  imports: [FormRoot, TextField],
  templateUrl: './sprint-create.html',
})
export class SprintCreate {
  private readonly projects = inject(ProjectService);
  private readonly notifications = inject(NotificationService);

  readonly projectCode = input.required<string>();
  readonly created = output<Sprint>();

  protected readonly canAdminister = inject(Permissions).canAdminister;
  protected readonly errorMessage = signal<string | null>(null);

  private readonly model = signal<SprintModel>({ name: '', startDate: '', plannedVelocity: '' });

  protected readonly sprintForm = form(
    this.model,
    (path) => {
      required(path.name, { message: 'Ingresa un nombre.' });
      notBlank(path.name, 'Ingresa un nombre.');
      maxLength(path.name, 255, { message: 'Usa como máximo 255 caracteres.' });
      validate(path.startDate, ({ value }) =>
        value() === '' || ISO_DATE.test(value()) ? null : { kind: 'date', message: 'Ingresa una fecha válida.' },
      );
      optionalNumber(path.plannedVelocity, PLANNED_POINTS_RULE);
    },
    {
      submission: {
        action: async () => {
          this.errorMessage.set(null);
          const model = this.model();
          try {
            const sprint = await firstValueFrom(
              this.projects.createSprint({
                projectCode: this.projectCode(),
                name: model.name.trim(),
                startDate: model.startDate || undefined,
                plannedVelocity: parseOptionalNumber(model.plannedVelocity),
              }),
            );
            this.notifications.success(`Se creó ${sprint.name}.`);
            this.model.set({ name: '', startDate: '', plannedVelocity: '' });
            this.sprintForm().reset();
            this.created.emit(sprint);
          } catch (error) {
            this.errorMessage.set(apiErrorMessage(error, 'No se pudo crear el sprint.'));
          }
          return undefined;
        },
      },
    },
  );
}
