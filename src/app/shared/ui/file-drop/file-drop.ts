import { Component, input, output, signal } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * A file picker shaped as a drop zone: click it (or Enter/Space on the focused native input), or drag a file onto it. One
 * file at a time; the chosen file is handed to `fileSelected` and the native input is cleared so the same file can be
 * picked again. What to do with the file (read it, upload it) is the caller's business.
 */
@Component({
  selector: 'app-file-drop',
  imports: [Icon],
  templateUrl: './file-drop.html',
})
export class FileDrop {
  readonly label = input.required<string>();
  readonly accept = input('');
  readonly hint = input<string>();
  /** Name of the file the caller is currently using, shown inside the zone. */
  readonly fileName = input<string>();
  readonly fileSelected = output<File>();

  protected readonly dragging = signal(false);

  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    if (file) {
      this.fileSelected.emit(file);
    }
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files.item(0);
    if (file) {
      this.fileSelected.emit(file);
    }
  }
}
