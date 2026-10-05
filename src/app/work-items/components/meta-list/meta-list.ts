import { Component, input } from '@angular/core';

export interface MetaRow {
  label: string;
  value: string;
}

/** A short list of "Asignado", "Relaciones", "Creado"-style key/value facts, the metadata rail's own recipe. */
@Component({
  selector: 'app-meta-list',
  templateUrl: './meta-list.html',
})
export class MetaList {
  readonly rows = input.required<readonly MetaRow[]>();
}
