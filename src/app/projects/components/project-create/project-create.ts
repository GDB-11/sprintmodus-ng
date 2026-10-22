import { Component, inject, output, signal } from '@angular/core';
import { form, FormRoot, maxLength, pattern, required } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { Project } from '../../models/project.models';
import { ProjectService } from '../../services/project.service';
import { apiErrorMessage } from '../../../shared/http-errors';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { notBlank } from '../../../shared/not-blank';
import { Banner } from '../../../shared/ui/banner/banner';
import { Button } from '../../../shared/ui/button/button';
import { Panel } from '../../../shared/ui/panel/panel';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { TextareaField } from '../../../shared/ui/textarea-field/textarea-field';

interface ProjectModel {
  name: string;
  key: string;
  description: string;
}

const EMPTY: ProjectModel = { name: '', key: '', description: '' };

/** Creates a project. The key is optional (the backend derives it from the name); the plan's project limit is the backend's to enforce. */
@Component({
  selector: 'app-project-create',
  imports: [FormRoot, TextField, TextareaField, Panel, Banner, Button],
  templateUrl: './project-create.html',
})
export class ProjectCreate {
  private readonly projects = inject(ProjectService);
  private readonly notifications = inject(NotificationService);

  readonly created = output<Project>();

  protected readonly errorMessage = signal<string | null>(null);

  private readonly model = signal<ProjectModel>({ ...EMPTY });

  protected readonly projectForm = form(
    this.model,
    (path) => {
      required(path.name, { message: 'Ingresa un nombre.' });
      notBlank(path.name, 'Ingresa un nombre.');
      maxLength(path.name, 255, { message: 'Usa como máximo 255 caracteres.' });
      pattern(path.key, /^$|^[A-Za-z][A-Za-z0-9]{1,9}$/, {
        message: 'Usa de 2 a 10 letras o números, empezando por una letra.',
      });
      maxLength(path.description, 4000, { message: 'Usa como máximo 4000 caracteres.' });
    },
    {
      submission: {
        action: async () => {
          this.errorMessage.set(null);
          const model = this.model();
          try {
            const project = await firstValueFrom(
              this.projects.create({
                name: model.name.trim(),
                key: model.key.trim() || undefined,
                description: model.description.trim() || undefined,
              }),
            );
            this.notifications.success(`Se creó ${project.name}.`);
            this.model.set({ ...EMPTY });
            this.projectForm().reset();
            this.created.emit(project);
          } catch (error) {
            this.errorMessage.set(apiErrorMessage(error, 'No se pudo crear el proyecto.'));
          }
          return undefined;
        },
      },
    },
  );
}
