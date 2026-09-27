import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { DataTable, DataTableColumn } from './data-table';

interface Row {
  code: string;
  name: string;
  points: number;
}

const columns: DataTableColumn<Row>[] = [
  { header: 'Clave', cell: (r) => r.code },
  { header: 'Nombre', cell: (r) => r.name },
  { header: 'Puntos', cell: (r) => `${r.points}`, numeric: true },
];
const rows: Row[] = [
  { code: 'S-1', name: 'Sprint 1', points: 20 },
  { code: 'S-2', name: 'Sprint 2', points: 15 },
];

describe('DataTable', () => {
  let fixture: ComponentFixture<DataTable<Row>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DataTable] }).compileComponents();
    fixture = TestBed.createComponent(DataTable<Row>);
    fixture.componentRef.setInput('caption', 'Sprints del proyecto');
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('trackBy', (r: Row) => r.code);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it('names what it lists via an sr-only caption', () => {
    expect(root().querySelector('caption')?.textContent).toBe('Sprints del proyecto');
    expect(root().querySelector('caption')?.className).toContain('sr-only');
  });

  it('renders one header per column and one row per data row, on the table', () => {
    const table = root().querySelector('table')!;
    expect(Array.from(table.querySelectorAll('th')).map((th) => th.textContent)).toEqual(['Clave', 'Nombre', 'Puntos']);
    expect(table.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('right-aligns the numeric column only', () => {
    const table = root().querySelector('table')!;
    const headers = Array.from(table.querySelectorAll('th'));
    expect(headers[2].className).toContain('text-right');
    expect(headers[0].className).not.toContain('text-right');
  });

  it('renders the same rows as stacked cards for the phone layout', () => {
    const cards = root().querySelectorAll('ul > li:not(.sr-only)');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('S-1');
    expect(cards[0].textContent).toContain('20');
  });

  it('passes axe', async () => {
    await expectNoAxeViolations(root());
  });
});
