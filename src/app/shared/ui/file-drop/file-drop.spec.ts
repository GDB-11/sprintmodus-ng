import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { FileDrop } from './file-drop';

@Component({
  imports: [FileDrop],
  template: `<app-file-drop
    label="Elige un archivo .md o arrástralo aquí"
    accept=".md"
    hint="Solo texto Markdown"
    [fileName]="name()"
    (fileSelected)="picked.push($event)"
  />`,
})
class Host {
  readonly name = signal<string | undefined>(undefined);
  readonly picked: File[] = [];
}

describe('FileDrop', () => {
  let fixture: ComponentFixture<Host>;
  const root = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('is a native file input named by the zone text, with the hint until a file is loaded', async () => {
    expect(root().querySelector('input[type="file"]')?.getAttribute('accept')).toBe('.md');
    expect(root().textContent).toContain('Solo texto Markdown');

    fixture.componentInstance.name.set('plan.md');
    fixture.detectChanges();

    expect(root().textContent).toContain('Archivo cargado: plan.md');
    expect(root().textContent).not.toContain('Solo texto Markdown');
    await expectNoAxeViolations(root());
  });

  it('hands over a dropped file', () => {
    const file = new File(['# Épica'], 'plan.md');
    const drop = new Event('drop', { cancelable: true }) as DragEvent;
    Object.defineProperty(drop, 'dataTransfer', { value: { files: { item: () => file } } });

    root().querySelector('label')!.dispatchEvent(drop);

    expect(fixture.componentInstance.picked).toEqual([file]);
  });
});
