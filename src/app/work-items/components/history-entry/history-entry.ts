import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Disclosure } from '../../../shared/ui/disclosure/disclosure';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import { describeChange, SprintNames } from '../../models/history-description';
import { HistoryEntry } from '../../models/work-item.models';

/** One change of a work item's history: who, what they did (in words), when, and for a long text, what it said before and after. */
@Component({
  selector: 'app-history-entry',
  imports: [DatePipe, RouterLink, TextLink, Disclosure],
  templateUrl: './history-entry.html',
})
export class HistoryEntryView {
  readonly entry = input.required<HistoryEntry>();
  readonly sprintNames = input<SprintNames>({});

  protected readonly change = computed(() => describeChange(this.entry(), this.sprintNames()));
}
