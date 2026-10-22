import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { expectNoAxeViolations } from '../../../testing/axe';
import { ChangePasswordPage } from './change-password-page';

const URL = `${environment.apiUrl}/auth/change-password`;

describe('ChangePasswordPage', () => {
  let fixture: ComponentFixture<ChangePasswordPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangePasswordPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ChangePasswordPage);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent!.replace(/\s+/g, ' ');
  const submit = () => root().querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));

  function type(id: string, value: string): void {
    const input = root().querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function fill(current: string, next: string, confirm: string): void {
    type('current-password', current);
    type('new-password', next);
    type('confirm-password', confirm);
  }

  it('has no accessibility violations', async () => {
    await expectNoAxeViolations(root());
  });

  it('sends nothing while the confirmation does not match', async () => {
    fill('old-password', 'brand-new-pw', 'other-new-pw');
    submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text()).toContain('Las contraseñas no coinciden.');
  });

  it('changes the password and clears the form', async () => {
    fill('old-password', 'brand-new-pw', 'brand-new-pw');
    submit();
    const request = http.expectOne(URL);
    expect(request.request.body).toEqual({ currentPassword: 'old-password', newPassword: 'brand-new-pw' });
    request.flush(null);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text()).toContain('Tu contraseña se cambió');
    expect(root().querySelector<HTMLInputElement>('#current-password')!.value).toBe('');
  });

  it('says in Spanish when the current password is wrong', async () => {
    fill('wrong', 'brand-new-pw', 'brand-new-pw');
    submit();
    http.expectOne(URL).flush({ code: 'WRONG_CURRENT_PASSWORD', message: 'The current password is not correct.' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text()).toContain('La contraseña actual no es correcta.');
  });
});
