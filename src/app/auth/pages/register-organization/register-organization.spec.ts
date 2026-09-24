import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { RegisterOrganization } from './register-organization';

describe('RegisterOrganization', () => {
  let fixture: ComponentFixture<RegisterOrganization>;
  let registerOrganization: ReturnType<typeof vi.fn>;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    registerOrganization = vi.fn();
    await TestBed.configureTestingModule({
      imports: [RegisterOrganization],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            registerOrganization,
            organizationCodeAvailabilityUrl: (code: string) =>
              `${environment.apiUrl}/auth/organization-code-available?code=${code.toLowerCase()}`,
          },
        },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(RegisterOrganization);
    await fixture.whenStable();
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const alerts = () =>
    [...root().querySelectorAll('[role="alert"]')].map((el) => el.textContent?.trim());

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

  /** Types a well-formed code and answers the debounced availability request it triggers. */
  async function fillCode(
    code: string,
    available = true,
    reason?: 'ORGANIZATION_CODE_RESERVED',
  ): Promise<void> {
    const filled = fill('organizationCode', code);
    const request = await vi.waitFor(
      () => http.expectOne((req) => req.url.includes('organization-code-available')),
      { timeout: 2000 },
    );
    request.flush({ available, reason });
    await filled;
  }

  async function fillValid(code = 'acme'): Promise<void> {
    await fill('organizationName', 'Acme Inc');
    await fillCode(code);
    await fill('fullName', 'Ana Diaz');
    await fill('email', 'ana@acme.io');
    await fill('password', 'correct-horse');
  }

  it('rejects a malformed organization code without querying availability', async () => {
    await fill('organizationCode', '-bad-');

    expect(alerts()).toContain(
      'Use 3 to 30 letters, digits or hyphens, without a hyphen at the start or end.',
    );
    http.expectNone((req) => req.url.includes('organization-code-available'));
  });

  it('accepts uppercase input and previews the lowercase code', async () => {
    await fillCode('ACME');

    expect(root().textContent).toContain('Members sign in with: acme');
    expect(alerts()).toEqual([]);
  });

  it('requires a password of at least 8 characters', async () => {
    await fill('password', 'short');

    expect(alerts()).toContain('Use at least 8 characters.');
  });

  it('registers and sends the user to sign in with the code prefilled', async () => {
    registerOrganization.mockReturnValue(of(undefined));
    await fillValid('Acme');
    await submit();

    expect(registerOrganization).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { organizationCode: 'acme' } });
  });

  it('flags a code the availability check reports as taken', async () => {
    await fillCode('acme', false);

    expect(alerts()).toContain('This organization code is already taken.');
  });

  it('tells the user when the availability check reports a reserved code', async () => {
    await fillCode('billing-team', false, 'ORGANIZATION_CODE_RESERVED');

    expect(alerts()).toContain('This organization code is reserved. Choose another one.');
  });

  it('shows a 409 as an error on the organization code field', async () => {
    registerOrganization.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    await fillValid();
    await submit();

    expect(alerts()).toContain('This organization code is already taken.');
    expect(navigate).not.toHaveBeenCalled();
  });
});
