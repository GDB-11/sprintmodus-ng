import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { expectNoAxeViolations } from '../../../testing/axe';
import { Assignee } from '../../models/work-item.models';
import { WorkItemAssignees } from './work-item-assignees';

const ITEM = 'w-1';
const ANA: Assignee = { assignmentCode: 'a-1', userCode: 'u-1', fullName: 'Ana Pérez', role: 'DEV' };

describe('WorkItemAssignees', () => {
  let fixture: ComponentFixture<WorkItemAssignees>;
  let http: HttpTestingController;
  const changed = vi.fn();

  beforeEach(async () => {
    changed.mockClear();
    await TestBed.configureTestingModule({
      imports: [WorkItemAssignees],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(WorkItemAssignees);
    fixture.componentRef.setInput('workItemCode', ITEM);
    fixture.componentRef.setInput('assignees', [ANA]);
    fixture.componentInstance.changed.subscribe(changed);
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${environment.apiUrl}/api/users` && r.params.get('limit') === '50').flush([{ userCode: 'u-2', fullName: 'Bruno Manrique' }]);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const root = () => fixture.nativeElement as HTMLElement;
  const button = (label: string) => Array.from(root().querySelectorAll('button')).find((b) => b.textContent!.includes(label))!;

  it('lists the assignees with their role', () => {
    expect(root().textContent).toContain('Ana Pérez');
    expect(root().textContent).toContain('Desarrollo');
  });

  it('keeps Asignar disabled until a person is chosen', () => {
    expect(button('Asignar').disabled).toBe(true);
  });

  it('assigns the chosen person and asks the page to reload', () => {
    (fixture.componentInstance as unknown as { userChoice: { set(v: string): void } }).userChoice.set('u-2');
    fixture.detectChanges();
    button('Asignar').click();
    const req = http.expectOne(`${environment.apiUrl}/api/work-items/${ITEM}/assignments`);
    expect(req.request.body).toEqual({ userCode: 'u-2', role: 'DEV' });
    req.flush({ assignmentCode: 'a-2', userCode: 'u-2', fullName: 'Bruno Manrique', role: 'DEV' }, { status: 201, statusText: 'Created' });
    expect(changed).toHaveBeenCalled();
  });

  it('removes an assignment', () => {
    button('Quitar').click();
    http.expectOne(`${environment.apiUrl}/api/work-items/${ITEM}/assignments/a-1`).flush(null, { status: 204, statusText: 'No Content' });
    expect(changed).toHaveBeenCalled();
  });

  it('has no axe violations', async () => {
    await expectNoAxeViolations(root());
  });
});
