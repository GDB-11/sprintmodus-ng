import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginResponse } from '../../models/auth.models';
import { AuthService } from '../../services/auth.service';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let login: ReturnType<typeof vi.fn>;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    login = vi.fn();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: AuthService, useValue: { login } }],
    }).compileComponents();

    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  async function fill(id: string, value: string): Promise<void> {
    const input = root().querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    root().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  async function fillValid(): Promise<void> {
    await fill('organizationCode', 'acme');
    await fill('email', 'ana@acme.io');
    await fill('password', 'secret');
  }

  it('does not call the API and shows validation messages when the form is empty', async () => {
    await submit();

    expect(login).not.toHaveBeenCalled();
    const alerts = [...root().querySelectorAll('[role="alert"]')].map((el) => el.textContent?.trim());
    expect(alerts).toEqual([
      'Enter your organization code.',
      'Enter your email.',
      'Enter your password.',
    ]);
    expect(root().querySelector('#email')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('signs in and navigates to the dashboard', async () => {
    login.mockReturnValue(of({} as LoginResponse));
    await fillValid();
    await submit();

    expect(login).toHaveBeenCalledWith({
      email: 'ana@acme.io',
      password: 'secret',
      organizationCode: 'acme',
    });
    expect(navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('shows the generic credentials error on 401 without revealing which field was wrong', async () => {
    login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    await fillValid();
    await submit();

    expect(root().querySelector('[role="alert"]')?.textContent).toContain(
      'Invalid email, password or organization code.',
    );
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('explains an inactive or expired subscription on 402', async () => {
    login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 402 })));
    await fillValid();
    await submit();

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('subscription');
  });
});
