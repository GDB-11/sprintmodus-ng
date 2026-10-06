import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { ColumnTabs } from './column-tabs';

describe('ColumnTabs', () => {
  let fixture: ComponentFixture<ColumnTabs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ColumnTabs] }).compileComponents();
    fixture = TestBed.createComponent(ColumnTabs);
    fixture.componentRef.setInput('tabs', [
      { code: 'NEW', label: 'Por hacer', count: 3 },
      { code: 'DONE', label: 'Hecho', count: 2 },
    ]);
    fixture.componentRef.setInput('selected', 'NEW');
    fixture.detectChanges();
  });

  const buttons = () => [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];

  it('says each column and how many cards it holds, and which one is shown', () => {
    expect(buttons().map((b) => b.textContent!.trim())).toEqual(['Por hacer · 3', 'Hecho · 2']);
    expect(buttons().map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
  });

  it('picks another column', () => {
    buttons()[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selected()).toBe('DONE');
  });

  it('is free of accessibility violations', async () => {
    await expectNoAxeViolations(fixture.nativeElement);
  });
});
