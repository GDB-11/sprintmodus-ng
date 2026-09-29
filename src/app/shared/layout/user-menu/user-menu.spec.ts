import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideFakeAuth } from '../../../auth/auth.testing';
import { AuthService } from '../../../auth/services/auth.service';
import { expectNoAxeViolations } from '../../../testing/axe';
import { UserMenu } from './user-menu';

describe('UserMenu', () => {
  let fixture: ComponentFixture<UserMenu>;
  let overlayContainerElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserMenu],
      providers: [provideRouter([]), provideFakeAuth()],
    }).compileComponents();
    overlayContainerElement = TestBed.inject(OverlayContainer).getContainerElement();
    fixture = TestBed.createComponent(UserMenu);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(OverlayContainer).ngOnDestroy());

  const root = () => fixture.nativeElement as HTMLElement;
  const trigger = () => root().querySelector('button')!;
  const menu = () => overlayContainerElement.querySelector('[role="dialog"]');

  it('is a labelled trigger with the initials of the signed-in user', () => {
    expect(trigger().getAttribute('aria-label')).toBe('Cuenta de Yo Mismo');
    expect(trigger().textContent?.trim()).toBe('YM');
  });

  it('opens with the name, role, organization, plan and a way to sign out', () => {
    trigger().click();
    fixture.detectChanges();

    const text = menu()!.textContent ?? '';
    expect(text).toContain('Yo Mismo');
    expect(text).toContain('Propietario');
    expect(text).toContain('Acme');
    expect(text).toContain('Pro');
    expect(menu()!.querySelector('button')?.textContent).toContain('Cerrar sesión');
  });

  it('signing out closes the menu and calls AuthService.logout()', () => {
    const auth = TestBed.inject(AuthService);
    const logout = vi.spyOn(auth, 'logout');
    trigger().click();
    fixture.detectChanges();

    Array.from(menu()!.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Cerrar sesión'))!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(logout).toHaveBeenCalled();
    expect(menu()).toBeNull();
  });

  it('passes axe, closed and open', async () => {
    await expectNoAxeViolations(root());

    trigger().click();
    fixture.detectChanges();
    await expectNoAxeViolations(overlayContainerElement);
  });
});
