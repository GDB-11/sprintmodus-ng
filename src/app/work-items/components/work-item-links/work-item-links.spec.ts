import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { expectNoAxeViolations } from '../../../testing/axe';
import { NEW_STATUS, summary } from '../../work-items.testing';
import { WorkItemLinks } from './work-item-links';

const API = environment.apiUrl;

const LINK = {
  linkCode: 'link-1',
  type: 'BLOCKS' as const,
  item: { workItemCode: 'item-2', workItemNumber: 1001, displayKey: 'WAR-1001', type: 'PBI' as const, title: 'Refund', status: NEW_STATUS },
};

describe('WorkItemLinks', () => {
  let fixture: ComponentFixture<WorkItemLinks>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkItemLinks],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(WorkItemLinks);
    fixture.componentRef.setInput('workItemCode', 'item-1');
    fixture.componentRef.setInput('links', []);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const root = () => fixture.nativeElement as HTMLElement;
  const buttonWithText = (text: string) =>
    [...root().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === text)!;

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('says so when there are no links', () => {
    expect(root().textContent).toContain('Sin relaciones.');
  });

  it('lists the current links with their type and the linked item', () => {
    fixture.componentRef.setInput('links', [LINK]);
    fixture.detectChanges();

    expect(root().textContent).toContain('Bloquea a');
    expect(root().querySelector('a[href="/work-items/item-2"]')?.textContent).toContain('WAR-1001');
  });

  it('searches, picks a candidate and links it', async () => {
    const emitted = vi.fn();
    fixture.componentInstance.changed.subscribe(emitted);
    buttonWithText('Agregar relación').click();
    fixture.detectChanges();

    const search = root().querySelector<HTMLInputElement>('#link-search')!;
    search.value = 'checkout';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const request = await vi.waitFor(() => http.expectOne((req) => req.url === `${API}/api/work-items`));
    expect(request.request.params.get('q')).toBe('checkout');
    request.flush({ items: [summary({ workItemCode: 'item-2', displayKey: 'WAR-1001', title: 'Checkout flow' })], total: 1, page: 0, size: 20 });
    await settle();

    buttonWithText('WAR-1001 · Checkout flow').click();
    fixture.detectChanges();
    expect(root().textContent).toContain('WAR-1001 · Checkout flow');

    buttonWithText('Vincular').click();
    const create = await vi.waitFor(() => http.expectOne(`${API}/api/work-items/item-1/links`));
    expect(create.request.body).toEqual({ targetCode: 'item-2', type: 'RELATED_TO' });
    create.flush(LINK);
    await settle();

    expect(emitted).toHaveBeenCalledOnce();
    expect(buttonWithText('Agregar relación')).toBeTruthy();
  });

  it('does not offer the item itself as a candidate', async () => {
    buttonWithText('Agregar relación').click();
    fixture.detectChanges();
    const search = root().querySelector<HTMLInputElement>('#link-search')!;
    search.value = 'it';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const request = await vi.waitFor(() => http.expectOne((req) => req.url === `${API}/api/work-items`));
    request.flush({
      items: [summary({ workItemCode: 'item-1', displayKey: 'WAR-1000' }), summary({ workItemCode: 'item-2', displayKey: 'WAR-1001' })],
      total: 2,
      page: 0,
      size: 20,
    });
    await settle();

    expect(root().textContent).not.toContain('WAR-1000');
    expect(root().textContent).toContain('WAR-1001');
  });

  it('shows why a link was refused', async () => {
    fixture.componentRef.setInput('links', [LINK]);
    fixture.detectChanges();
    buttonWithText('Agregar relación').click();
    fixture.detectChanges();
    const search = root().querySelector<HTMLInputElement>('#link-search')!;
    search.value = 'checkout';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (await vi.waitFor(() => http.expectOne((req) => req.url === `${API}/api/work-items`))).flush({
      items: [summary({ workItemCode: 'item-3', displayKey: 'WAR-1002' })],
      total: 1,
      page: 0,
      size: 20,
    });
    await settle();
    [...root().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim().startsWith('WAR-1002'))!.click();
    fixture.detectChanges();
    buttonWithText('Vincular').click();

    (await vi.waitFor(() => http.expectOne(`${API}/api/work-items/item-1/links`))).flush(
      { code: 'CYCLIC_LINK', message: 'This link would create a cycle.' },
      { status: 409, statusText: 'Conflict' },
    );
    await settle();

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('This link would create a cycle.');
  });

  it('removes a link', async () => {
    fixture.componentRef.setInput('links', [LINK]);
    fixture.detectChanges();

    [...root().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim().startsWith('Quitar'))!.click();
    const request = await vi.waitFor(() => http.expectOne(`${API}/api/work-items/item-1/links/link-1`));
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    await settle();
  });

  it('has no accessibility violations, with links shown and while adding one', async () => {
    fixture.componentRef.setInput('links', [LINK]);
    fixture.detectChanges();
    await expectNoAxeViolations(root());

    buttonWithText('Agregar relación').click();
    fixture.detectChanges();
    await expectNoAxeViolations(root());
  });
});
