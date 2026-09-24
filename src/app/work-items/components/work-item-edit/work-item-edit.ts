import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { form, FormRoot, maxLength, required } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../../shared/http-errors';
import { notBlank } from '../../../shared/not-blank';
import { SelectField, SelectOption } from '../../../shared/ui/select-field/select-field';
import { TextareaField } from '../../../shared/ui/textarea-field/textarea-field';
import { TextField } from '../../../shared/ui/text-field/text-field';
import {
  EFFORT_POINTS_RULE,
  HOURS_RULE,
  optionalNumber,
  parseOptionalNumber,
} from '../../models/number-fields';
import {
  PRIORITIES,
  PRIORITY_LABELS,
  Priority,
  UpdateWorkItemRequest,
  WorkItem,
} from '../../models/work-item.models';
import { WorkItemService } from '../../services/work-item.service';

interface EditModel {
  title: string;
  description: string;
  acceptanceCriteria: string;
  priority: Priority;
  effortPoints: string;
  estimatedHours: string;
  remainingHours: string;
}

const PRIORITY_OPTIONS: SelectOption[] = PRIORITIES.map((priority) => ({
  value: priority,
  label: PRIORITY_LABELS[priority],
}));

function toModel(item: WorkItem): EditModel {
  return {
    title: item.title,
    description: item.description ?? '',
    acceptanceCriteria: item.acceptanceCriteria ?? '',
    priority: item.priority,
    effortPoints: String(item.effortPoints),
    estimatedHours: item.estimatedHours?.toString() ?? '',
    remainingHours: item.remainingHours?.toString() ?? '',
  };
}

/** Edits the plain fields of a work item. Status, sprint and parent have their own controls on the detail page. */
@Component({
  selector: 'app-work-item-edit',
  imports: [FormRoot, TextField, TextareaField, SelectField],
  templateUrl: './work-item-edit.html',
})
export class WorkItemEdit {
  private readonly workItems = inject(WorkItemService);

  readonly item = input.required<WorkItem>();
  readonly saved = output<WorkItem>();
  readonly cancelled = output<void>();

  protected readonly priorityOptions = PRIORITY_OPTIONS;
  protected readonly errorMessage = signal<string | null>(null);

  private readonly model = linkedSignal(() => toModel(this.item()));

  protected readonly editForm = form(
    this.model,
    (path) => {
      required(path.title, { message: 'Enter a title.' });
      notBlank(path.title, 'Enter a title.');
      maxLength(path.title, 255, { message: 'Use at most 255 characters.' });
      optionalNumber(path.effortPoints, EFFORT_POINTS_RULE);
      optionalNumber(path.estimatedHours, HOURS_RULE);
      optionalNumber(path.remainingHours, HOURS_RULE);
    },
    {
      submission: {
        action: async () => {
          this.errorMessage.set(null);
          try {
            const updated = await firstValueFrom(
              this.workItems.update(this.item().workItemCode, this.toRequest()),
            );
            this.saved.emit(updated);
          } catch (error) {
            this.errorMessage.set(apiErrorMessage(error, 'The changes could not be saved.'));
          }
          return undefined;
        },
      },
    },
  );

  private toRequest(): UpdateWorkItemRequest {
    const model = this.model();
    return {
      title: model.title.trim(),
      // A blank description or acceptance criteria clears it.
      description: model.description.trim(),
      acceptanceCriteria: model.acceptanceCriteria.trim(),
      priority: model.priority,
      effortPoints: parseOptionalNumber(model.effortPoints),
      estimatedHours: parseOptionalNumber(model.estimatedHours),
      remainingHours: parseOptionalNumber(model.remainingHours),
    };
  }
}
