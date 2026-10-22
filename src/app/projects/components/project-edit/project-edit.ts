import { Component, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { form, FormRoot, maxLength, required } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { Project } from '../../models/project.models';
import { ProjectService } from '../../services/project.service';
import { apiErrorMessage } from '../../../shared/http-errors';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { notBlank } from '../../../shared/not-blank';
import { Banner } from '../../../shared/ui/banner/banner';
import { Button } from '../../../shared/ui/button/button';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { TextareaField } from '../../../shared/ui/textarea-field/textarea-field';

/** Renames a project or rewrites its description in a dialog. The key is fixed once created (work item keys depend on it). */
@Component({
  selector: 'app-project-edit',
  imports: [Dialog, FormRoot, TextField, TextareaField, Banner, Button],
  templateUrl: './project-edit.html',
})
export class ProjectEdit {
  private readonly projects = inject(ProjectService);
  private readonly notifications = inject(NotificationService);

  readonly project = input<Project | null>(null);
  readonly open = model(false);
  readonly saved = output<Project>();

  protected readonly errorMessage = signal<string | null>(null);

  private readonly model = signal({ name: '', description: '' });

  protected readonly editForm = form(
    this.model,
    (path) => {
      required(path.name, { message: 'Ingresa un nombre.' });
      notBlank(path.name, 'Ingresa un nombre.');
      maxLength(path.name, 255, { message: 'Usa como máximo 255 caracteres.' });
      maxLength(path.description, 4000, { message: 'Usa como máximo 4000 caracteres.' });
    },
    {
      submission: {
        action: async () => {
          const target = this.project();
          if (!target) {
            return undefined;
          }
          this.errorMessage.set(null);
          const { name, description } = this.model();
          try {
            const updated = await firstValueFrom(
              this.projects.update(target.projectCode, {
                name: name.trim(),
                description: description.trim() || undefined,
              }),
            );
            this.notifications.success(`Se guardaron los cambios de ${updated.name}.`);
            this.saved.emit(updated);
            this.open.set(false);
          } catch (error) {
            this.errorMessage.set(apiErrorMessage(error, 'No se pudo guardar el proyecto.'));
          }
          return undefined;
        },
      },
    },
  );

  constructor() {
    // every time the dialog opens it starts from the project as it is now, not from a previous, abandoned edit
    effect(() => {
      const target = this.project();
      if (this.open() && target) {
        untracked(() => {
          this.model.set({ name: target.name, description: target.description ?? '' });
          this.editForm().reset();
          this.errorMessage.set(null);
        });
      }
    });
  }
}
