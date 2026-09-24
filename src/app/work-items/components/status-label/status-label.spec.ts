import { ComponentFixture, TestBed } from '@angular/core/testing';
import { APPROVED_STATUS, DONE_STATUS, NEW_STATUS } from '../../work-items.testing';
import { WorkItemStatus } from '../../models/work-item.models';
import { StatusLabel } from './status-label';

describe('StatusLabel', () => {
  let fixture: ComponentFixture<StatusLabel>;

  function render(status: WorkItemStatus): HTMLElement {
    fixture = TestBed.createComponent(StatusLabel);
    fixture.componentRef.setInput('status', status);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const icon = (root: HTMLElement) => root.querySelector('svg')!;

  it('shows the name as text and hides the icon from assistive technology', () => {
    const root = render(APPROVED_STATUS);

    expect(root.textContent?.trim()).toBe('Approved');
    expect(icon(root).getAttribute('aria-hidden')).toBe('true');
  });

  it('gives each stage its own shape, so colour is never the only cue', () => {
    const initial = render(NEW_STATUS);
    expect(icon(initial).querySelectorAll('path, circle')).toHaveLength(1);

    const inProgress = render(APPROVED_STATUS);
    expect(icon(inProgress).querySelectorAll('path')).toHaveLength(1);
    expect(icon(inProgress).querySelectorAll('circle')).toHaveLength(1);

    const done = render(DONE_STATUS);
    expect(icon(done).querySelectorAll('circle')).toHaveLength(2);
    expect(icon(done).querySelectorAll('path')).toHaveLength(1);
  });

  it('picks a light and a dark colour for every stage, from the theme tokens', () => {
    const [initial, inProgress, done] = [NEW_STATUS, APPROVED_STATUS, DONE_STATUS].map(
      (status) => icon(render(status)).classList,
    );

    expect([...initial]).toEqual(expect.arrayContaining(['text-neutral-700', 'dark:text-neutral-400']));
    expect([...inProgress]).toEqual(expect.arrayContaining(['text-info-800', 'dark:text-info-300']));
    expect([...done]).toEqual(expect.arrayContaining(['text-success-800', 'dark:text-success-300']));
  });

  it('never applies a colour it was given by the backend', () => {
    const root = render({ ...APPROVED_STATUS, color: '#ff0000' } as WorkItemStatus);

    expect(root.innerHTML).not.toContain('#ff0000');
    expect(root.querySelector('[style]')).toBeNull();
  });
});
