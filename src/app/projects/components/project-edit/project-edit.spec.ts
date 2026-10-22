import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { expectNoAxeViolations } from '../../../testing/axe';
import { Project } from '../../models/project.models';
import { project } from '../../projects.testing';
import { ProjectEdit } from './project-edit';

@Component({
  imports: [ProjectEdit],
  template: `<app-project-edit [project]="target" [(open)]="open" (saved)="saved.set($event)" />`,
})
class Host {
  target: Project = project({ description: 'Antes' });
  readonly open = signal(false);
  readonly saved = signal<Project | null>(null);
}

describe('ProjectEdit', () => {
  let fixture: ComponentFixture<Host>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('starts from the project and says the key is fixed', () => {
    expect((root().querySelector('#project-edit-name') as HTMLInputElement).value).toBe('Warehouse');
    expect((root().querySelector('#project-edit-description') as HTMLTextAreaElement).value).toBe('Antes');
    expect(root().textContent).toContain('WAR');
  });

  it('saves the new name with PUT, tells the user and closes', async () => {
    const messages: string[] = [];
    vi.spyOn(TestBed.inject(NotificationService), 'success').mockImplementation((m: string) => void messages.push(m));
    const name = root().querySelector('#project-edit-name') as HTMLInputElement;
    name.value = '  Almacén  ';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    root().querySelector('form')!.dispatchEvent(new Event('submit'));
    const request = http.expectOne(`${environment.apiUrl}/api/projects/p1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ name: 'Almacén', description: 'Antes' });
    request.flush(project({ name: 'Almacén' }));
    await fixture.whenStable();

    expect(fixture.componentInstance.saved()?.name).toBe('Almacén');
    expect(fixture.componentInstance.open()).toBe(false);
    expect(messages).toEqual(['Se guardaron los cambios de Almacén.']);
  });

  it('does not submit an empty name', async () => {
    const name = root().querySelector('#project-edit-name') as HTMLInputElement;
    name.value = '   ';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    root().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    http.expectNone(`${environment.apiUrl}/api/projects/p1`);
  });

  it('has no axe violations', async () => {
    await expectNoAxeViolations(root());
  });
});
