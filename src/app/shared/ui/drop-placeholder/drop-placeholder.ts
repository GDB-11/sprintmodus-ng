import { Component } from '@angular/core';

/** The dashed box left where a dragged card will land. */
@Component({
  selector: 'div[appDropPlaceholder]',
  templateUrl: './drop-placeholder.html',
  host: { class: 'min-h-16 rounded-[10px] border-2 border-dashed border-text-muted' },
})
export class DropPlaceholder {}
