import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { Disclosure } from './disclosure';

@Component({
  imports: [Disclosure],
  template: `
    <details appDisclosure summary="Historial">
      <p>Cuerpo</p>
    </details>
  `,
})
class Host {}

describe('Disclosure (details[appDisclosure])', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const details = () => root().querySelector('details')!;

  it('is a real native details/summary, closed by default', () => {
    expect(details().tagName).toBe('DETAILS');
    expect(details().open).toBe(false);
    expect(details().querySelector('summary')?.textContent).toContain('Historial');
  });

  it('opens with the native toggle behaviour and shows the projected body', () => {
    details().open = true;
    fixture.detectChanges();

    expect(details().querySelector('p')?.textContent).toBe('Cuerpo');
  });

  it('passes axe open and closed', async () => {
    await expectNoAxeViolations(root());
    details().open = true;
    fixture.detectChanges();
    await expectNoAxeViolations(root());
  });
});
