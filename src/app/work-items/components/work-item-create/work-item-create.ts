import { Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { form, FormRoot, maxLength, required } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProjectService } from '../../../projects/services/project.service';
import { apiErrorMessage } from '../../../shared/http-errors';
import { notBlank } from '../../../shared/not-blank';
import { valueOf } from '../../../shared/resource-value';
import { Page } from '../../../shared/ui/page/page';
import { SelectField, SelectOption } from '../../../shared/ui/select-field/select-field';
import { TextareaField } from '../../../shared/ui/textarea-field/textarea-field';
import { TextField } from '../../../shared/ui/text-field/text-field';
import {
  CreateWorkItemRequest,
  ITEM_TYPE_LABELS,
  ITEM_TYPES,
  ItemType,
  PRIORITIES,
  PRIORITY_LABELS,
  Priority,
} from '../../models/work-item.models';
import {
  EFFORT_POINTS_RULE,
  HOURS_RULE,
  optionalNumber,
  parseOptionalNumber,
} from '../../models/number-fields';
import { WorkItemService } from '../../services/work-item.service';

interface CreateModel {
  projectCode: string;
  type: ItemType;
  title: string;
  description: string;
  acceptanceCriteria: string;
  priority: Priority;
  parentCode: string;
  effortPoints: string;
  estimatedHours: string;
}

const TYPE_OPTIONS: SelectOption[] = ITEM_TYPES.map((type) => ({
  value: type,
  label: ITEM_TYPE_LABELS[type],
}));
const PRIORITY_OPTIONS: SelectOption[] = PRIORITIES.map((priority) => ({
  value: priority,
  label: PRIORITY_LABELS[priority],
}));

/** Creates a work item of any type in a project. A non-standard parent is accepted; the backend's warning is shown. */
@Component({
  selector: 'app-work-item-create',
  imports: [Page, FormRoot, TextField, TextareaField, SelectField],
  templateUrl: './work-item-create.html',
})
export class WorkItemCreate {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workItems = inject(WorkItemService);
  private readonly projectService = inject(ProjectService);

  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly priorityOptions = PRIORITY_OPTIONS;
  protected readonly errorMessage = signal<string | null>(null);

  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  private readonly projects = rxResource({ stream: () => this.projectService.list() });

  private readonly model = signal<CreateModel>({
    projectCode: '',
    type: 'PBI',
    title: '',
    description: '',
    acceptanceCriteria: '',
    priority: 'MEDIUM',
    parentCode: '',
    effortPoints: '',
    estimatedHours: '',
  });

  protected readonly createForm = form(
    this.model,
    (path) => {
      required(path.projectCode, { message: 'Elige el proyecto.' });
      required(path.title, { message: 'Ingresa un título.' });
      notBlank(path.title, 'Ingresa un título.');
      maxLength(path.title, 255, { message: 'Usa como máximo 255 caracteres.' });
      optionalNumber(path.effortPoints, EFFORT_POINTS_RULE);
      optionalNumber(path.estimatedHours, HOURS_RULE);
    },
    {
      submission: {
        action: async () => {
          this.errorMessage.set(null);
          try {
            const created = await firstValueFrom(this.workItems.create(this.toRequest()));
            await this.router.navigate(['/work-items', created.workItemCode]);
          } catch (error) {
            this.errorMessage.set(apiErrorMessage(error, 'No se pudo crear el elemento de trabajo.'));
          }
          return undefined;
        },
      },
    },
  );

  protected readonly projectOptions = computed<SelectOption[]>(() =>
    (valueOf(this.projects) ?? []).map((project) => ({
      value: project.projectCode,
      label: `${project.name} (${project.key})`,
    })),
  );

  /** Its own signal, so that editing other fields does not reload what depends on the project. */
  private readonly projectCode = computed(() => this.model().projectCode);

  /** The items of the chosen project that can become the parent. */
  private readonly parentCandidates = rxResource({
    params: () => this.projectCode() || undefined,
    stream: ({ params }) => this.workItems.list({ projectCode: params, size: 200 }),
  });

  protected readonly parentOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Sin elemento superior' },
    ...(valueOf(this.parentCandidates)?.items ?? []).map((item) => ({
      value: item.workItemCode,
      label: `${item.displayKey} · ${item.title} (${ITEM_TYPE_LABELS[item.type]})`,
    })),
  ]);

  constructor() {
    // Preselect the project from the URL, or the first one, and the parent when arriving from an item.
    effect(() => {
      const projects = valueOf(this.projects);
      if (!projects || projects.length === 0 || this.model().projectCode) {
        return;
      }
      const wanted = this.queryParams().get('project');
      const project = projects.find((p) => p.projectCode === wanted) ?? projects[0];
      this.model.update((model) => ({
        ...model,
        projectCode: project.projectCode,
        parentCode: this.queryParams().get('parent') ?? '',
      }));
    });
  }

  private toRequest(): CreateWorkItemRequest {
    const model = this.model();
    return {
      projectCode: model.projectCode,
      type: model.type,
      title: model.title.trim(),
      description: model.description.trim() || undefined,
      acceptanceCriteria: model.acceptanceCriteria.trim() || undefined,
      priority: model.priority,
      parentCode: model.parentCode || undefined,
      effortPoints: parseOptionalNumber(model.effortPoints),
      estimatedHours: parseOptionalNumber(model.estimatedHours),
    };
  }
}
