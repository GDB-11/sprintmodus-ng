import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { Project } from '../../models/project.models';
import { project } from '../../projects.testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { ProjectCreate } from './project-create';

const URL = `${environment.apiUrl}/api/projects`;

describe('ProjectCreate', () => {
  let fixture: ComponentFixture<ProjectCreate>;
  let http: HttpTestingController;
  let created: Project[];

  beforeEach(async () => {
    created = [];
    await TestBed.configureTestingModule({
      imports: [ProjectCreate],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProjectCreate);
    fixture.componentInstance.created.subscribe((value) => created.push(value));
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const root = () => fixture.nativeElement as HTMLElement;
  const type = (id: string, value: string) => {
    const el = root().querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;
    el.value = value;
    el.dispatchEvent(new Event('input'));
  };
  const submit = () =>
    root()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));

  it('creates a project with what was typed and leaves out what was not', async () => {
    type('project-name', '  Web App  ');
    submit();

    const request = await vi.waitFor(() => http.expectOne(URL));
    expect(request.request.body).toEqual({
      name: 'Web App',
      key: undefined,
      description: undefined,
    });
    request.flush(project({ name: 'Web App' }), { status: 201, statusText: 'Created' });

    await vi.waitFor(() => expect(created.length).toBe(1));
  });

  it('shows the backend message when the plan limit is reached', async () => {
    type('project-name', 'Another');
    submit();

    const request = await vi.waitFor(() => http.expectOne(URL));
    request.flush(
      { code: 'PROJECT_LIMIT', message: 'Limit reached' },
      { status: 402, statusText: 'Payment Required' },
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('Limit reached');
    });
    expect(created).toEqual([]);
  });

  it('does not send a project without a name', () => {
    submit();
    http.expectNone(URL);
  });

  it('has no accessibility violations', async () => {
    await expectNoAxeViolations(root());
  });
});
