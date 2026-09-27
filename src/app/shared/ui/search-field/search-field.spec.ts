import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { SearchField } from './search-field';

describe('SearchField', () => {
  let fixture: ComponentFixture<SearchField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SearchField] }).compileComponents();
    fixture = TestBed.createComponent(SearchField);
    fixture.componentRef.setInput('label', 'Buscar');
    fixture.componentRef.setInput('inputId', 'q');
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const input = () => root().querySelector('input')!;

  it('is labelled', () => {
    expect(root().querySelector('label')?.getAttribute('for')).toBe('q');
    expect(input().id).toBe('q');
  });

  it('updates the value model on input', () => {
    input().value = 'sprint';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe('sprint');
  });

  it('reflects an externally set value', () => {
    fixture.componentRef.setInput('value', 'restored');
    fixture.detectChanges();
    expect(input().value).toBe('restored');
  });

  it('passes axe', async () => {
    await expectNoAxeViolations(root());
  });
});
