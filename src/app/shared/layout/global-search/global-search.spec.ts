import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { expectNoAxeViolations } from '../../../testing/axe';
import { summary } from '../../../work-items/work-items.testing';
import { GlobalSearch } from './global-search';

@Component({ template: '' })
class Dummy {}

describe('GlobalSearch', () => {
  let fixture: ComponentFixture<GlobalSearch>;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalSearch],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'dashboard', component: Dummy },
          { path: 'work-items', component: Dummy },
          { path: 'work-items/new', component: Dummy },
          { path: 'work-items/:code', component: Dummy },
        ]),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(GlobalSearch);
    fixture.detectChanges();
  });

  const dialog = () => (fixture.nativeElement as HTMLElement).querySelector('dialog') as HTMLDialogElement;
  const input = () => dialog().querySelector('input') as HTMLInputElement;
  const options = () => Array.from(dialog().querySelectorAll('li[role="option"]'));

  it('is closed until opened', () => {
    expect(dialog().open).toBe(false);
  });

  it('opens on Ctrl+K (and Cmd+K)', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    fixture.detectChanges();
    expect(dialog().open).toBe(true);
  });

  it('shows "ir a…" entries from NAV_ITEMS plus "Nuevo elemento de trabajo" when the query is empty', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const labels = options().map((li) => li.textContent?.trim());
    expect(labels).toContain('Panel');
    expect(labels).toContain('Elementos de trabajo');
    expect(labels[labels.length - 1]).toBe('Nuevo elemento de trabajo');
  });

  it('filters "ir a…" entries as the query narrows, without hitting the network', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    input().value = 'sprint';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const labels = options().map((li) => li.textContent?.trim());
    expect(labels).toEqual(['Sprints', 'Nuevo elemento de trabajo']);
    http.expectNone((r) => r.url === `${environment.apiUrl}/api/work-items`);
  });

  it('searches work items (debounced) and lists them first', async () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    input().value = 'pay';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const request = await vi.waitFor(() =>
      http.expectOne((r) => r.url === `${environment.apiUrl}/api/work-items` && r.params.get('q') === 'pay'),
    );
    request.flush({ items: [summary({ displayKey: 'WAR-1000', title: 'Pay by card' })], total: 1, page: 0, size: 8 });
    await Promise.resolve();
    TestBed.tick();
    fixture.detectChanges();

    const first = options()[0];
    expect(first.textContent).toContain('WAR-1000');
    expect(first.textContent).toContain('Pay by card');
  });

  it('arrow keys move the highlighted option and Enter navigates to it', async () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    expect(options()[1].getAttribute('aria-selected')).toBe('true');

    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(dialog().open).toBe(false);
    await vi.waitFor(() => expect(router.url).toBe(NAV_ITEMS_SECOND_ROUTE));
  });

  it('clicking an entry navigates and closes the palette', async () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    options()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(dialog().open).toBe(false);
    await vi.waitFor(() => expect(router.url).toBe('/dashboard'));
  });

  it('closes on navigation', async () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    await router.navigateByUrl('/dashboard');
    fixture.detectChanges();

    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('passes axe while open with results', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return expectNoAxeViolations(dialog());
  });
});

// The second NAV_ITEMS entry (index 1) is "Elementos de trabajo" -> /work-items
const NAV_ITEMS_SECOND_ROUTE = '/work-items';
