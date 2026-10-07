import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { NotAllowed } from './not-allowed';

describe('NotAllowed', () => {
  let fixture: ComponentFixture<NotAllowed>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [NotAllowed] }).compileComponents();
    fixture = TestBed.createComponent(NotAllowed);
    fixture.componentRef.setInput('message', 'Requiere rol propietario o administrador.');
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it('says it is restricted and why', () => {
    expect(root().querySelector('h2')?.textContent).toBe('Acceso restringido');
    expect(root().textContent).toContain('Requiere rol propietario o administrador.');
  });

  it('has no accessibility violations', async () => {
    await expectNoAxeViolations(root());
  });
});
