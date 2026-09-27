import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { AvatarGroup } from './avatar-group';

describe('AvatarGroup', () => {
  let fixture: ComponentFixture<AvatarGroup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AvatarGroup] }).compileComponents();
    fixture = TestBed.createComponent(AvatarGroup);
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it('shows every avatar up to max, with no overflow pill', () => {
    fixture.componentRef.setInput('names', ['Ana García', 'Beto Ruiz']);
    fixture.componentRef.setInput('max', 4);
    fixture.detectChanges();

    expect(root().querySelectorAll('app-avatar').length).toBe(2);
    expect(root().textContent).not.toContain('+');
  });

  it('caps at max and shows an overflow pill', () => {
    fixture.componentRef.setInput('names', ['A A', 'B B', 'C C', 'D D', 'E E']);
    fixture.componentRef.setInput('max', 3);
    fixture.detectChanges();

    expect(root().querySelectorAll('app-avatar').length).toBe(3);
    expect(root().textContent).toContain('+2');
  });

  it('passes axe', async () => {
    fixture.componentRef.setInput('names', ['Ana García', 'Beto Ruiz', 'Cora Díaz', 'Dan Soto', 'Eva Luz']);
    fixture.detectChanges();
    await expectNoAxeViolations(root());
  });
});
